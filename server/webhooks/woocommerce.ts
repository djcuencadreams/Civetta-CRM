import { Request, Response } from 'express';
import { db, dbNew } from '../../db';
import * as schema from '../../db/schema';  // Importamos el esquema original para las tablas existentes
import * as newSchema from '../../db/schema-new';  // Importamos el nuevo esquema para las nuevas tablas
import { eq, and, isNull } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Verifica la firma de un webhook de WooCommerce
 * @param payload Contenido del webhook
 * @param signature Firma del webhook (X-WC-Webhook-Signature)
 * @param secret Secreto compartido para webhooks
 * @returns true si la firma es válida, false en caso contrario
 */
export function verifyWooCommerceSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  
  try {
    // WooCommerce firma con HMAC SHA256
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedSignature = hmac.update(payload).digest('base64');
    
    // Comparar firmas (usando comparación de tiempo constante para evitar timing attacks)
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(signature)
    );
  } catch (error) {
    console.error('Error verificando firma de webhook:', error);
    return false;
  }
}

/**
 * Mapea estados de WooCommerce a nuestro sistema
 * @param wooStatus Estado de WooCommerce
 * @returns Estado del sistema CRM
 */
function mapWooStatus(wooStatus: string): string {
  switch (wooStatus) {
    case 'pending':
      return 'new';
    case 'processing':
      return 'preparing';
    case 'on-hold':
      return 'pending';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'refunded':
      return 'cancelled';
    case 'failed':
      return 'cancelled';
    default:
      return 'new';
  }
}

/**
 * Determina la marca basada en el contenido del pedido
 * @param wooOrder Pedido de WooCommerce
 * @returns Marca asociada al pedido
 */
function determineBrandFromOrder(wooOrder: any): string {
  // Por defecto
  let brand = 'sleepwear';
  
  // Verificar categorías de productos
  if (wooOrder.line_items && wooOrder.line_items.length > 0) {
    // Si algún producto es de la categoría "bride", marcar como bride
    const hasBrideProduct = wooOrder.line_items.some((item: any) => {
      return item.name.toLowerCase().includes('bride') || 
             item.name.toLowerCase().includes('novia');
    });
    
    if (hasBrideProduct) {
      brand = 'bride';
    }
  }
  
  return brand;
}

/**
 * Procesa un evento de orden creada/actualizada de WooCommerce
 * @param order Datos de la orden de WooCommerce
 * @returns Objeto con el resultado del procesamiento
 */
export async function processWooCommerceOrder(wooOrder: any): Promise<{ success: boolean, orderId?: number, message?: string }> {
  try {
    if (!wooOrder || !wooOrder.id) {
      return { success: false, message: 'Datos de orden inválidos' };
    }
    
    // Verificar si el pedido ya existe usando SQL nativo
    const existingOrderResult = await db.$client.query(
      `SELECT * FROM orders WHERE woocommerce_id = $1 LIMIT 1`,
      [wooOrder.id]
    );
    
    const existingOrder = existingOrderResult.rows.length > 0 ? existingOrderResult.rows[0] : null;
    
    if (existingOrder) {
      // Actualizar el pedido existente usando SQL nativo
      await db.$client.query(
        `UPDATE orders SET 
          status = $1, 
          payment_status = $2, 
          updated_at = NOW() 
        WHERE woocommerce_id = $3`,
        [
          mapWooStatus(wooOrder.status),
          wooOrder.payment_method_title ? 'paid' : 'pending',
          wooOrder.id
        ]
      );
      
      return { 
        success: true,
        orderId: existingOrder.id,
        message: `Pedido #${wooOrder.id} actualizado correctamente`
      };
    }
    
    // Si el pedido no existe, crearlo
    // Buscar o crear cliente
    let customerId: number | null = null;
    
    if (wooOrder.billing && wooOrder.billing.email) {
      // Buscar cliente existente por email usando SQL nativo
      const existingCustomerResult = await db.$client.query(
        `SELECT * FROM customers WHERE email = $1 LIMIT 1`,
        [wooOrder.billing.email]
      );
      
      if (existingCustomerResult.rows.length > 0) {
        customerId = existingCustomerResult.rows[0].id;
      } else {
        // Crear nuevo cliente usando SQL nativo
        const firstName = wooOrder.billing.first_name || '';
        const lastName = wooOrder.billing.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        const brand = determineBrandFromOrder(wooOrder);
        
        const newCustomerResult = await db.$client.query(
          `INSERT INTO customers (
            name, first_name, last_name, email, phone, 
            street, city, province, source, brand
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
          RETURNING id`,
          [
            fullName,
            firstName,
            lastName,
            wooOrder.billing.email,
            wooOrder.billing.phone || null,
            wooOrder.billing.address_1 || null,
            wooOrder.billing.city || null,
            wooOrder.billing.state || null,
            'woocommerce',
            brand
          ]
        );
        
        customerId = newCustomerResult.rows[0].id;
      }
    } else {
      return { 
        success: false, 
        message: 'No se pudo crear el pedido: datos de cliente incompletos'
      };
    }
    
    // Crear el pedido usando SQL nativo
    const orderNumber = `WC-${wooOrder.id}`;
    const totalAmount = parseFloat(wooOrder.total || '0');
    const status = mapWooStatus(wooOrder.status);
    const paymentStatus = wooOrder.payment_method_title ? 'paid' : 'pending';
    const paymentMethod = wooOrder.payment_method_title || null;
    const notes = wooOrder.customer_note || null;
    const brand = determineBrandFromOrder(wooOrder);
    
    // Preparar los datos de dirección para guardarlos como JSON
    const shippingAddress = wooOrder.shipping ? JSON.stringify(wooOrder.shipping) : null;
    const billingAddress = wooOrder.billing ? JSON.stringify(wooOrder.billing) : null;
    
    const newOrderResult = await db.$client.query(
      `INSERT INTO orders (
        customer_id, order_number, total_amount, 
        status, payment_status, payment_method, 
        source, woocommerce_id, notes, brand,
        shipping_address, billing_address,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
      RETURNING id`,
      [
        customerId,
        orderNumber,
        totalAmount,
        status,
        paymentStatus,
        paymentMethod,
        'woocommerce',
        wooOrder.id,
        notes,
        brand,
        shippingAddress,
        billingAddress,
        new Date(wooOrder.date_created) || new Date(),
        new Date()
      ]
    );
    
    const newOrderId = newOrderResult.rows[0].id;
    
    // Procesar items del pedido usando SQL nativo
    if (wooOrder.line_items && wooOrder.line_items.length > 0) {
      // Para cada item, intentar encontrar el producto correspondiente en la DB
      for (const item of wooOrder.line_items) {
        let productId = null;
        
        if (item.product_id) {
          const productResult = await db.$client.query(
            `SELECT id FROM products WHERE woocommerce_id = $1 LIMIT 1`,
            [item.product_id]
          );
          
          if (productResult.rows.length > 0) {
            productId = productResult.rows[0].id;
          }
        }
        
        // Preparar los atributos del producto para guardarlos como JSON
        const attributes = item.meta_data ? JSON.stringify(item.meta_data) : null;
        
        // Insertar el ítem del pedido
        await db.$client.query(
          `INSERT INTO order_items (
            order_id, product_id, product_name, 
            quantity, unit_price, subtotal, attributes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newOrderId,
            productId, 
            item.name,
            item.quantity,
            parseFloat(item.price || '0'),
            parseFloat(item.subtotal || '0'),
            attributes
          ]
        );
      }
    }
    
    return { 
      success: true, 
      orderId: newOrderId,
      message: `Pedido #${wooOrder.id} creado correctamente`
    };
  } catch (error) {
    console.error('Error procesando pedido de WooCommerce:', error);
    return { 
      success: false, 
      message: `Error procesando pedido: ${(error as Error).message}`
    };
  }
}

/**
 * Procesa un evento de producto actualizado de WooCommerce
 * @param product Datos del producto de WooCommerce
 * @returns Objeto con el resultado del procesamiento
 */
export async function processWooCommerceProduct(wooProduct: any): Promise<{ success: boolean, productId?: number, message?: string }> {
  try {
    if (!wooProduct || !wooProduct.id) {
      return { success: false, message: 'Datos de producto inválidos' };
    }
    
    // Si el producto no es simple, no procesarlo
    if (wooProduct.type !== 'simple') {
      return { 
        success: false, 
        message: `Producto ${wooProduct.name} (ID: ${wooProduct.id}) omitido por ser de tipo: ${wooProduct.type}`
      };
    }
    
    // Buscar la categoría principal del producto
    let categoryId = null;
    let brand = 'sleepwear'; // Valor predeterminado
    
    if (wooProduct.categories && wooProduct.categories.length > 0) {
      const mainCategory = wooProduct.categories[0];
      
      // Intentar buscar la categoría por nombre, ya que no tenemos woocommerce_category_id
      const categoryResult = await db.$client.query(
        `SELECT * FROM product_categories WHERE name ILIKE $1 LIMIT 1`,
        [mainCategory.name]
      );
      
      if (categoryResult.rows.length > 0) {
        const category = categoryResult.rows[0];
        categoryId = category.id;
        brand = category.brand;
      } else {
        // Si no encontramos una categoría existente, creemos una nueva
        console.log(`Creando nueva categoría para WooCommerce: ${mainCategory.name}`);
        try {
          const newCategoryResult = await db.$client.query(
            `INSERT INTO product_categories (name, brand) VALUES ($1, $2) RETURNING *`,
            [mainCategory.name, brand]
          );
          
          if (newCategoryResult.rows.length > 0) {
            categoryId = newCategoryResult.rows[0].id;
          }
        } catch (error) {
          console.error('Error creando nueva categoría:', error);
        }
      }
    }
    
    // Preparar las imágenes
    const images = wooProduct.images?.map((img: any) => ({
      id: img.id,
      src: img.src,
      alt: img.alt || ''
    })) || [];
    
    // Preparar los atributos
    const attributes: {[key: string]: string} = {};
    
    if (wooProduct.attributes && Array.isArray(wooProduct.attributes)) {
      wooProduct.attributes.forEach((attr: any) => {
        if (attr.name && attr.options && attr.options.length > 0) {
          attributes[attr.name] = attr.options.join(', ');
        }
      });
    }
    
    // Verificar si el producto ya existe en nuestro sistema usando SQL nativo
    const existingProductQuery = await db.$client.query(
      `SELECT * FROM products WHERE woocommerce_id = $1 LIMIT 1`,
      [wooProduct.id]
    );
    
    const existingProduct = existingProductQuery.rows.length > 0 ? existingProductQuery.rows[0] : null;
    
    if (!existingProduct) {
      // Crear el producto en nuestro sistema usando SQL nativo para evitar problemas de esquema
      const sql = `
        INSERT INTO products (
          name, sku, description, category_id, 
          price, stock, brand, woocommerce_id, 
          woocommerce_url, active, images, attributes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      
      const result = await db.$client.query(sql, [
        wooProduct.name,
        wooProduct.sku || `WOO-${wooProduct.id}`,
        wooProduct.description || null,
        categoryId,
        parseFloat(wooProduct.price || '0'),
        wooProduct.stock_quantity || 0,
        brand,
        wooProduct.id,
        wooProduct.permalink || null,
        wooProduct.status === 'publish',
        JSON.stringify(images),
        JSON.stringify(attributes)
      ]);
      
      const newProduct = result.rows[0];
      
      return { 
        success: true, 
        productId: newProduct.id,
        message: `Producto ${wooProduct.name} (ID: ${wooProduct.id}) creado correctamente`
      };
    } else {
      // Actualizar el producto existente usando SQL nativo para evitar problemas de esquema
      const sql = `
        UPDATE products 
        SET name = $1, 
            sku = $2, 
            description = $3, 
            category_id = $4, 
            price = $5, 
            stock = $6, 
            brand = $7, 
            woocommerce_url = $8, 
            active = $9, 
            images = $10, 
            attributes = $11,
            updated_at = NOW()
        WHERE woocommerce_id = $12
        RETURNING *
      `;
      
      const result = await db.$client.query(sql, [
        wooProduct.name,
        wooProduct.sku || `WOO-${wooProduct.id}`,
        wooProduct.description || null,
        categoryId,
        parseFloat(wooProduct.price || '0'),
        wooProduct.stock_quantity || 0,
        brand,
        wooProduct.permalink || null,
        wooProduct.status === 'publish',
        JSON.stringify(images),
        JSON.stringify(attributes),
        wooProduct.id
      ]);
      
      return { 
        success: true, 
        productId: existingProduct.id,
        message: `Producto ${wooProduct.name} (ID: ${wooProduct.id}) actualizado correctamente`
      };
    }
  } catch (error) {
    console.error('Error procesando producto de WooCommerce:', error);
    return { 
      success: false, 
      message: `Error procesando producto: ${(error as Error).message}`
    };
  }
}

/**
 * Manejador principal para webhooks de WooCommerce
 * @param req Solicitud HTTP
 * @param res Respuesta HTTP
 */
export async function handleWooCommerceWebhook(req: Request, res: Response) {
  // Obtener firma y evento del encabezado
  const signature = req.headers['x-wc-webhook-signature'] as string;
  const event = req.headers['x-wc-webhook-event'] as string;
  const source = req.headers['x-wc-webhook-source'] as string;
  const delivery = req.headers['x-wc-webhook-delivery-id'] as string;
  
  try {
    // Registrar la recepción del webhook para depuración
    console.log(`Webhook recibido - Evento: ${event}, ID: ${delivery}, Origen: ${source}`);
    
    // Responder rápidamente con 200 OK para confirmar recepción
    // Esto es importante para WooCommerce que espera respuestas rápidas
    res.status(200).json({ 
      received: true, 
      message: 'Webhook recibido correctamente'
    });
    
    // Obtener la clave secreta para webhooks de WooCommerce (idealmente desde variables de entorno)
    const webhookSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET || '';
    
    // Verificar firma si hay un secreto configurado y la solicitud incluye firma
    if (webhookSecret && signature) {
      const rawBody = JSON.stringify(req.body);
      const isValid = verifyWooCommerceSignature(rawBody, signature, webhookSecret);
      
      if (!isValid) {
        console.error('Firma de webhook inválida');
        return; // No procesamos más, pero ya enviamos 200 OK
      }
    }
    
    // Procesar según el tipo de evento
    switch (event) {
      case 'order.created':
      case 'order.updated':
        // Procesar creación/actualización de orden asíncronamente
        processWooCommerceOrder(req.body)
          .then(result => {
            console.log(`Procesamiento de orden: ${result.message}`);
          })
          .catch(error => {
            console.error('Error en procesamiento asíncrono de orden:', error);
          });
        break;
        
      case 'product.created':
      case 'product.updated':
        // Procesar creación/actualización de producto asíncronamente
        processWooCommerceProduct(req.body)
          .then(result => {
            console.log(`Procesamiento de producto: ${result.message}`);
          })
          .catch(error => {
            console.error('Error en procesamiento asíncrono de producto:', error);
          });
        break;
        
      default:
        console.log(`Evento no manejado: ${event}`);
    }
  } catch (error) {
    // No enviamos error al cliente porque ya respondimos con 200 OK
    console.error('Error procesando webhook de WooCommerce:', error);
  }
}