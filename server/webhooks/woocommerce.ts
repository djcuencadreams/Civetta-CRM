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
      `SELECT * FROM orders WHERE "wooCommerceId" = $1 LIMIT 1`,
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
        WHERE "wooCommerceId" = $3`,
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
    // Buscar o crear cliente usando lógica avanzada de verificación
    let customerId: number | null = null;
    
    if (wooOrder.billing) {
      // Crear un objeto de cliente a partir de los datos de facturación del pedido
      const wooCustomer = {
        id: wooOrder.customer_id || null,
        email: wooOrder.billing.email || null,
        first_name: wooOrder.billing.first_name || '',
        last_name: wooOrder.billing.last_name || '',
        billing: wooOrder.billing,
        meta_data: wooOrder.meta_data || []
      };
      
      // Utilizar la misma lógica de procesamiento de clientes para evitar duplicados
      const customerResult = await processWooCommerceCustomer(wooCustomer);
      
      if (customerResult.success && customerResult.customerId) {
        customerId = customerResult.customerId;
        console.log(`Cliente identificado para el pedido: ${customerResult.message}`);
      } else {
        return { 
          success: false, 
          message: `No se pudo crear el pedido: ${customerResult.message || 'error al procesar cliente'}`
        };
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
          } else {
            // Si el producto no existe en el CRM pero sí en WooCommerce, lo sincronizamos
            try {
              console.log(`Sincronizando producto de WooCommerce que no existe en el CRM: ${item.name} (ID: ${item.product_id})`);
              
              // Obtener datos completos del producto desde WooCommerce
              const wooProduct = await fetch(
                `${process.env.WOOCOMMERCE_URL}/wp-json/wc/v3/products/${item.product_id}?consumer_key=${process.env.WOOCOMMERCE_CONSUMER_KEY}&consumer_secret=${process.env.WOOCOMMERCE_CONSUMER_SECRET}`
              ).then(res => res.json());
              
              if (wooProduct && wooProduct.id) {
                // Procesar el producto para crearlo en el CRM
                const result = await processWooCommerceProduct(wooProduct);
                if (result.success && result.productId) {
                  productId = result.productId;
                  console.log(`Producto de WooCommerce sincronizado exitosamente: ${item.name} (CRM ID: ${productId})`);
                }
              }
            } catch (error) {
              console.error(`Error al sincronizar producto desde WooCommerce:`, error);
            }
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
    
    // Soporte para productos variables y simples
    const isVariable = wooProduct.type === 'variable';
    const isVariation = wooProduct.type === 'variation';
    const isSimple = wooProduct.type === 'simple';
    
    if (!isSimple && !isVariable && !isVariation) {
      return { 
        success: false, 
        message: `Producto ${wooProduct.name} (ID: ${wooProduct.id}) omitido por ser de tipo no soportado: ${wooProduct.type}`
      };
    }
    
    // Buscar la categoría principal del producto
    let categoryId = null;
    let brand = 'sleepwear'; // Valor predeterminado
    
    // Solo procesar categorías para productos principales (no variaciones)
    if ((isSimple || isVariable) && wooProduct.categories && wooProduct.categories.length > 0) {
      const mainCategory = wooProduct.categories[0];
      const categoryName = typeof mainCategory === 'string' ? mainCategory : mainCategory.name;
      
      // Intentar buscar la categoría por nombre
      const categoryResult = await db.$client.query(
        `SELECT * FROM product_categories WHERE name ILIKE $1 LIMIT 1`,
        [categoryName]
      );
      
      if (categoryResult.rows.length > 0) {
        const category = categoryResult.rows[0];
        categoryId = category.id;
        brand = category.brand;
      } else {
        // Si no encontramos una categoría existente, creemos una nueva
        console.log(`Creando nueva categoría para WooCommerce: ${categoryName}`);
        try {
          const newCategoryResult = await db.$client.query(
            `INSERT INTO product_categories (name, brand) VALUES ($1, $2) RETURNING *`,
            [categoryName, brand]
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
    
    // Preparar los atributos - procesar correctamente los formatos de atributos de WooCommerce
    const attributes: {[key: string]: string} = {};
    
    if (wooProduct.attributes && Array.isArray(wooProduct.attributes)) {
      wooProduct.attributes.forEach((attr: any) => {
        // Manejar diferentes formatos de atributos
        const attrName = attr.name || attr.attribute_name || '';
        let attrValues: string[] = [];
        
        if (attr.options && Array.isArray(attr.options)) {
          attrValues = attr.options;
        } else if (attr.option) {
          // Para variaciones individuales
          attrValues = [attr.option];
        }
        
        if (attrName && attrValues.length > 0) {
          attributes[attrName] = attrValues.join(', ');
        }
      });
    }
    
    // Agregar atributos de talla y color si están presentes en la variación
    if (isVariation) {
      if (wooProduct.attributes) {
        for (const attr of wooProduct.attributes) {
          if (attr.name === 'Talla' || attr.name === 'Color' || attr.name === 'Tallas' || attr.name === 'Colores') {
            attributes[attr.name] = attr.option || '';
          }
        }
      }
    }
    
    // Normalizar el precio (convertir de formato europeo a decimal si es necesario)
    let price = 0;
    if (wooProduct.price) {
      // Reemplazar coma por punto si el precio usa formato europeo (42,99)
      const priceStr = String(wooProduct.price).replace(',', '.');
      price = parseFloat(priceStr);
    }
    
    // Obtener parent_id para variaciones
    let parentId = null;
    if (isVariation && wooProduct.parent_id) {
      parentId = wooProduct.parent_id;
    }
    
    // Verificar si el producto ya existe en nuestro sistema usando SQL nativo
    const existingProductQuery = await db.$client.query(
      `SELECT * FROM products WHERE "wooCommerceId" = $1 LIMIT 1`,
      [wooProduct.id]
    );
    
    const existingProduct = existingProductQuery.rows.length > 0 ? existingProductQuery.rows[0] : null;
    
    // Datos comunes para inserción y actualización
    const productName = wooProduct.name;
    const productSku = wooProduct.sku || `WOO-${wooProduct.id}`;
    const productDesc = wooProduct.description || wooProduct.short_description || null;
    const productStock = isVariable ? null : (wooProduct.stock_quantity || 0);
    const isActive = wooProduct.status === 'publish';
    const productUrl = wooProduct.permalink || null;
    const productType = isVariable ? 'variable' : (isVariation ? 'variation' : 'simple');
    
    if (!existingProduct) {
      // Crear el producto en nuestro sistema usando SQL nativo
      const sql = `
        INSERT INTO products (
          name, sku, description, category_id, 
          price, stock, brand, "wooCommerceId",
          "wooCommerceParentId", product_type,
          "wooCommerceUrl", active, images, attributes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const result = await db.$client.query(sql, [
        productName,
        productSku,
        productDesc,
        categoryId,
        price,
        productStock,
        brand,
        wooProduct.id,
        parentId,
        productType,
        productUrl,
        isActive,
        JSON.stringify(images),
        JSON.stringify(attributes)
      ]);
      
      const newProduct = result.rows[0];
      
      return { 
        success: true, 
        productId: newProduct.id,
        message: `Producto ${productName} (ID: ${wooProduct.id}, Tipo: ${productType}) creado correctamente`
      };
    } else {
      // Actualizar el producto existente usando SQL nativo
      const sql = `
        UPDATE products 
        SET name = $1, 
            sku = $2, 
            description = $3, 
            category_id = $4, 
            price = $5, 
            stock = $6, 
            brand = $7,
            "wooCommerceParentId" = $8,
            product_type = $9,
            "wooCommerceUrl" = $10, 
            active = $11, 
            images = $12, 
            attributes = $13,
            updated_at = NOW()
        WHERE "wooCommerceId" = $14
        RETURNING *
      `;
      
      const result = await db.$client.query(sql, [
        productName,
        productSku,
        productDesc,
        categoryId,
        price,
        productStock,
        brand,
        parentId,
        productType,
        productUrl,
        isActive,
        JSON.stringify(images),
        JSON.stringify(attributes),
        wooProduct.id
      ]);
      
      return { 
        success: true, 
        productId: existingProduct.id,
        message: `Producto ${productName} (ID: ${wooProduct.id}, Tipo: ${productType}) actualizado correctamente`
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
 * Procesa un evento de cliente creado/actualizado de WooCommerce
 * Verifica si el cliente ya existe por cédula, email o teléfono antes de crear un duplicado
 * 
 * @param wooCustomer Datos del cliente de WooCommerce
 * @returns Objeto con el resultado del procesamiento
 */
export async function processWooCommerceCustomer(wooCustomer: any): Promise<{ success: boolean, customerId?: number, message?: string }> {
  try {
    if (!wooCustomer || !wooCustomer.id) {
      return { success: false, message: 'Datos de cliente inválidos' };
    }
    
    // Extraer información relevante del cliente
    const email = wooCustomer.email || null;
    const firstName = wooCustomer.first_name || '';
    const lastName = wooCustomer.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    const phone = wooCustomer.billing?.phone || null;
    
    // Verificar cédula/DNI del cliente (puede estar en meta_data o en atributos específicos)
    let cedula: string | null = null;
    let ruc: string | null = null;
    
    // Buscar documentos de identidad en meta_data si existe
    if (wooCustomer.meta_data && Array.isArray(wooCustomer.meta_data)) {
      // Buscar campo de cédula
      const cedulaField = wooCustomer.meta_data.find((meta: any) => 
        meta.key === 'cedula' || 
        meta.key === 'dni' || 
        meta.key === 'identification' ||
        meta.key === 'tax_id' ||
        meta.key === 'documento_identidad'
      );
      
      if (cedulaField && cedulaField.value) {
        cedula = String(cedulaField.value).trim();
      }
      
      // Buscar campo de RUC
      const rucField = wooCustomer.meta_data.find((meta: any) => 
        meta.key === 'ruc' || 
        meta.key === 'nit' || 
        meta.key === 'registro_contribuyente' ||
        meta.key === 'tax_identification' ||
        meta.key === 'business_id'
      );
      
      if (rucField && rucField.value) {
        ruc = String(rucField.value).trim();
      }
    }
    
    // También podría estar en billing.tax_id o fields específicos según la configuración de WooCommerce
    // En Ecuador, a veces el tax_id puede ser cédula o RUC dependiendo del tipo de cliente
    if (wooCustomer.billing && wooCustomer.billing.tax_id) {
      const taxIdValue = String(wooCustomer.billing.tax_id).trim();
      
      // En Ecuador, RUC tiene 13 dígitos y cédula tiene 10 dígitos
      if (taxIdValue.length === 13) {
        ruc = taxIdValue;
      } else if (taxIdValue.length === 10) {
        cedula = taxIdValue;
      } else {
        // Si no cumple con las longitudes esperadas, guardarlo como cédula por defecto
        cedula = taxIdValue;
      }
    }
    
    // Verificar si el cliente ya existe usando múltiples criterios
    // Primero buscamos por ID de WooCommerce
    const existingByWooId = await db.$client.query(
      `SELECT * FROM customers WHERE "wooCommerceId" = $1 LIMIT 1`,
      [wooCustomer.id]
    );
    
    // Si encontramos por ID de WooCommerce, actualizamos los datos
    if (existingByWooId.rows.length > 0) {
      const existingCustomer = existingByWooId.rows[0];
      
      await db.$client.query(
        `UPDATE customers SET 
          name = $1,
          first_name = $2,
          last_name = $3,
          email = $4,
          phone = $5,
          street = $6,
          city = $7,
          province = $8,
          delivery_instructions = $9,
          address = $10,
          id_number = $11,
          ruc = $12,
          updated_at = NOW()
        WHERE id = $13`,
        [
          fullName,
          firstName,
          lastName,
          email,
          phone,
          wooCustomer.billing?.address_1 || null,
          wooCustomer.billing?.city || null,
          wooCustomer.billing?.state || null,
          wooCustomer.billing?.postcode || null,
          wooCustomer.billing?.country || null,
          cedula,
          ruc,
          existingCustomer.id
        ]
      );
      
      return {
        success: true,
        customerId: existingCustomer.id,
        message: `Cliente #${wooCustomer.id} actualizado correctamente`
      };
    }
    
    // Si no encontramos por ID de WooCommerce, verificamos por cédula, RUC, email y teléfono
    let existingCustomer = null;
    
    // 1. Primero buscar por cédula (si está disponible)
    if (cedula) {
      const result = await db.$client.query(
        `SELECT * FROM customers WHERE id_number = $1 OR tax_id = $1 LIMIT 1`,
        [cedula]
      );
      
      if (result.rows.length > 0) {
        existingCustomer = result.rows[0];
      }
    }
    
    // 2. Buscar por RUC (si está disponible)
    if (!existingCustomer && ruc) {
      const result = await db.$client.query(
        `SELECT * FROM customers WHERE ruc = $1 LIMIT 1`,
        [ruc]
      );
      
      if (result.rows.length > 0) {
        existingCustomer = result.rows[0];
      }
    }
    
    // 3. Si no encontramos por documentos, buscar por email (si está disponible)
    if (!existingCustomer && email) {
      const result = await db.$client.query(
        `SELECT * FROM customers WHERE email = $1 LIMIT 1`,
        [email]
      );
      
      if (result.rows.length > 0) {
        existingCustomer = result.rows[0];
      }
    }
    
    // 4. Si aún no encontramos, buscar por teléfono (si está disponible)
    if (!existingCustomer && phone) {
      const result = await db.$client.query(
        `SELECT * FROM customers WHERE phone = $1 LIMIT 1`,
        [phone]
      );
      
      if (result.rows.length > 0) {
        existingCustomer = result.rows[0];
      }
    }
    
    // Si encontramos un cliente existente por cualquiera de los criterios, actualizamos y vinculamos
    if (existingCustomer) {
      await db.$client.query(
        `UPDATE customers SET 
          name = $1,
          first_name = $2,
          last_name = $3,
          email = COALESCE($4, email),
          phone = COALESCE($5, phone),
          street = COALESCE($6, street),
          city = COALESCE($7, city),
          province = COALESCE($8, province),
          delivery_instructions = COALESCE($9, delivery_instructions),
          address = COALESCE($10, address),
          id_number = COALESCE($11, id_number),
          ruc = COALESCE($12, ruc),
          wooCommerceId = $13,
          updated_at = NOW()
        WHERE id = $14`,
        [
          fullName,
          firstName,
          lastName,
          email,
          phone,
          wooCustomer.billing?.address_1 || null,
          wooCustomer.billing?.city || null,
          wooCustomer.billing?.state || null,
          wooCustomer.billing?.postcode || null,
          wooCustomer.billing?.country || null,
          cedula,
          ruc,
          wooCustomer.id,
          existingCustomer.id
        ]
      );
      
      return {
        success: true,
        customerId: existingCustomer.id,
        message: `Cliente existente vinculado con WooCommerce #${wooCustomer.id}`
      };
    }
    
    // Si no existe, creamos un nuevo cliente
    const brand = wooCustomer.role === 'bride' ? 'bride' : 'sleepwear';
    
    const newCustomerResult = await db.$client.query(
      `INSERT INTO customers (
        name, first_name, last_name, email, phone, 
        street, city, province, delivery_instructions, address,
        id_number, ruc, source, brand, "wooCommerceId"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
      RETURNING id`,
      [
        fullName,
        firstName,
        lastName,
        email,
        phone,
        wooCustomer.billing?.address_1 || null,
        wooCustomer.billing?.city || null,
        wooCustomer.billing?.state || null,
        wooCustomer.billing?.postcode || null,
        wooCustomer.billing?.country || null,
        cedula,
        ruc,
        'woocommerce',
        brand,
        wooCustomer.id
      ]
    );
    
    return { 
      success: true, 
      customerId: newCustomerResult.rows[0].id,
      message: `Cliente #${wooCustomer.id} creado correctamente`
    };
    
  } catch (error) {
    console.error('Error procesando cliente de WooCommerce:', error);
    return { 
      success: false, 
      message: `Error procesando cliente: ${(error as Error).message}`
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
      
      case 'customer.created':
      case 'customer.updated':
        // Procesar creación/actualización de cliente asíncronamente
        processWooCommerceCustomer(req.body)
          .then((result: { success: boolean, customerId?: number, message?: string }) => {
            console.log(`Procesamiento de cliente: ${result.message}`);
          })
          .catch((error: Error) => {
            console.error('Error en procesamiento asíncrono de cliente:', error);
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