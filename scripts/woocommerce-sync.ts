/**
 * Script para sincronizar datos con WooCommerce
 * Este script se encargará de:
 * 1. Sincronizar productos entre el CRM y WooCommerce
 * 2. Sincronizar pedidos nuevos desde WooCommerce
 * 3. Actualizar inventario en WooCommerce cuando cambia en el CRM
 * 
 * Requiere las siguientes variables de entorno:
 * - WOOCOMMERCE_URL: URL del sitio WooCommerce
 * - WOOCOMMERCE_CONSUMER_KEY: Clave de consumidor de la API de WooCommerce
 * - WOOCOMMERCE_CONSUMER_SECRET: Secreto de consumidor de la API de WooCommerce
 */

import { db, pool } from '../db';
import * as schema from '../db/schema';
import { eq, and, isNull, desc, like } from 'drizzle-orm';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Configuración de WooCommerce
const WOO_URL = process.env.WOOCOMMERCE_URL || '';
const WOO_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
const WOO_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';

// Verificar configuración
if (!WOO_URL || !WOO_KEY || !WOO_SECRET) {
  console.error('Error: Faltan variables de entorno para WooCommerce');
  console.error('Por favor configure WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY y WOOCOMMERCE_CONSUMER_SECRET');
  process.exit(1);
}

// Función para generar cabeceras de autenticación OAuth para WooCommerce
function getWooCommerceHeaders(method: string, endpoint: string): { [key: string]: string } {
  // Implementación básica de OAuth 1.0a para WooCommerce
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Parámetros OAuth estándar
  const oauthParams = {
    oauth_consumer_key: WOO_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp.toString(),
    oauth_version: '1.0'
  };
  
  // Ordenar y convertir parámetros a string
  const paramString = Object.keys(oauthParams)
    .sort()
    .map(key => `${key}=${oauthParams[key as keyof typeof oauthParams]}`)
    .join('&');
  
  // Crear string base para firmar
  const baseString = `${method}&${encodeURIComponent(endpoint)}&${encodeURIComponent(paramString)}`;
  
  // Generar firma
  const signingKey = `${WOO_SECRET}&`;
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');
  
  // Crear cabecera de autorización
  const authHeader = `OAuth ${Object.keys(oauthParams)
    .map(key => `${key}="${oauthParams[key as keyof typeof oauthParams]}"`)
    .join(', ')}, oauth_signature="${encodeURIComponent(signature)}"`;
  
  return {
    Authorization: authHeader,
    'Content-Type': 'application/json'
  };
}

// Función para hacer peticiones a la API de WooCommerce
async function wooCommerceRequest(
  method: string,
  endpoint: string,
  body?: any
): Promise<any> {
  const url = `${WOO_URL}/wp-json/wc/v3${endpoint}`;
  const headers = getWooCommerceHeaders(method, url);
  
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`Error en petición a WooCommerce: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error en petición a WooCommerce (${method} ${endpoint}):`, error);
    throw error;
  }
}

// Función para sincronizar productos de WooCommerce al CRM
async function syncProductsFromWooCommerce() {
  console.log('Sincronizando productos desde WooCommerce...');
  
  try {
    // Obtener todos los productos de WooCommerce
    const wooProducts = await wooCommerceRequest('GET', '/products?per_page=100');
    console.log(`Se encontraron ${wooProducts.length} productos en WooCommerce`);
    
    // Obtener categorías de WooCommerce
    const wooCategories = await wooCommerceRequest('GET', '/products/categories?per_page=100');
    console.log(`Se encontraron ${wooCategories.length} categorías en WooCommerce`);
    
    // Sincronizar categorías primero
    for (const wooCategory of wooCategories) {
      // Verificar si la categoría ya existe en nuestro sistema
      const existingCategory = await db.query.productCategories.findFirst({
        where: eq(schema.productCategories.woocommerceId, wooCategory.id)
      });
      
      if (!existingCategory) {
        // Determinar el brand basado en el nombre o categoría padre
        let brand = 'sleepwear'; // Valor predeterminado
        
        if (wooCategory.name.toLowerCase().includes('bride') || 
            wooCategory.name.toLowerCase().includes('novia')) {
          brand = 'bride';
        }
        
        // Crear la categoría en nuestro sistema
        await db.insert(schema.productCategories).values({
          name: wooCategory.name,
          description: wooCategory.description || null,
          slug: wooCategory.slug,
          brand,
          woocommerceId: wooCategory.id,
          parentCategoryId: wooCategory.parent ? wooCategory.parent : null
        });
        
        console.log(`- Categoría creada: ${wooCategory.name} (WooCommerce ID: ${wooCategory.id})`);
      } else {
        // Actualizar la categoría existente
        await db.update(schema.productCategories)
          .set({
            name: wooCategory.name,
            description: wooCategory.description || null,
            slug: wooCategory.slug,
            updatedAt: new Date()
          })
          .where(eq(schema.productCategories.woocommerceId, wooCategory.id));
        
        console.log(`- Categoría actualizada: ${wooCategory.name} (WooCommerce ID: ${wooCategory.id})`);
      }
    }
    
    // Ahora sincronizar productos
    for (const wooProduct of wooProducts) {
      if (wooProduct.type !== 'simple') {
        console.log(`- Omitiendo producto ${wooProduct.name} (ID: ${wooProduct.id}) por ser de tipo: ${wooProduct.type}`);
        continue;
      }
      
      // Buscar la categoría principal del producto
      let categoryId = null;
      let brand = 'sleepwear'; // Valor predeterminado
      
      if (wooProduct.categories && wooProduct.categories.length > 0) {
        const mainCategory = wooProduct.categories[0];
        
        // Buscar la categoría en nuestro sistema por el ID de WooCommerce
        const category = await db.query.productCategories.findFirst({
          where: eq(schema.productCategories.woocommerceId, mainCategory.id)
        });
        
        if (category) {
          categoryId = category.id;
          brand = category.brand as string;
        }
      }
      
      // Verificar si el producto ya existe en nuestro sistema
      const existingProduct = await db.query.products.findFirst({
        where: eq(schema.products.woocommerceId, wooProduct.id)
      });
      
      // Preparar las imágenes
      const images = wooProduct.images.map((img: any) => ({
        id: img.id,
        src: img.src,
        alt: img.alt || ''
      }));
      
      // Preparar los atributos
      const attributes: {[key: string]: string} = {};
      
      if (wooProduct.attributes && Array.isArray(wooProduct.attributes)) {
        wooProduct.attributes.forEach((attr: any) => {
          if (attr.name && attr.options && attr.options.length > 0) {
            attributes[attr.name] = attr.options.join(', ');
          }
        });
      }
      
      if (!existingProduct) {
        // Crear el producto en nuestro sistema
        await db.insert(schema.products).values({
          name: wooProduct.name,
          sku: wooProduct.sku || `WOO-${wooProduct.id}`,
          description: wooProduct.description || null,
          categoryId,
          price: parseFloat(wooProduct.price || '0'),
          stock: wooProduct.stock_quantity || 0,
          brand,
          woocommerceId: wooProduct.id,
          woocommerceUrl: wooProduct.permalink || null,
          active: wooProduct.status === 'publish',
          images: images as any,
          attributes: attributes as any
        });
        
        console.log(`- Producto creado: ${wooProduct.name} (WooCommerce ID: ${wooProduct.id})`);
      } else {
        // Actualizar el producto existente
        await db.update(schema.products)
          .set({
            name: wooProduct.name,
            sku: wooProduct.sku || `WOO-${wooProduct.id}`,
            description: wooProduct.description || null,
            categoryId,
            price: parseFloat(wooProduct.price || '0'),
            stock: wooProduct.stock_quantity || 0,
            brand,
            woocommerceUrl: wooProduct.permalink || null,
            active: wooProduct.status === 'publish',
            images: images as any,
            attributes: attributes as any,
            updatedAt: new Date()
          })
          .where(eq(schema.products.woocommerceId, wooProduct.id));
        
        console.log(`- Producto actualizado: ${wooProduct.name} (WooCommerce ID: ${wooProduct.id})`);
      }
    }
    
    console.log('Sincronización de productos completada');
    
  } catch (error) {
    console.error('Error sincronizando productos desde WooCommerce:', error);
    throw error;
  }
}

// Función para sincronizar pedidos de WooCommerce al CRM
async function syncOrdersFromWooCommerce() {
  console.log('Sincronizando pedidos desde WooCommerce...');
  
  try {
    // Obtener la fecha del último pedido sincronizado
    const lastSyncedOrder = await db.query.orders.findFirst({
      where: and(
        isNull(schema.orders.woocommerceId, false),
        eq(schema.orders.source, 'woocommerce')
      ),
      orderBy: [desc(schema.orders.woocommerceId)]
    });
    
    let endpoint = '/orders?per_page=50&status=processing,completed,on-hold&orderby=id&order=asc';
    
    // Si hay un pedido previo, solo traer los nuevos
    if (lastSyncedOrder && lastSyncedOrder.woocommerceId) {
      endpoint += `&after=${lastSyncedOrder.createdAt.toISOString()}`;
      console.log(`Buscando pedidos más recientes que ID: ${lastSyncedOrder.woocommerceId}`);
    }
    
    // Obtener pedidos de WooCommerce
    const wooOrders = await wooCommerceRequest('GET', endpoint);
    console.log(`Se encontraron ${wooOrders.length} pedidos en WooCommerce para sincronizar`);
    
    // Procesar cada pedido
    for (const wooOrder of wooOrders) {
      // Verificar si el pedido ya existe
      const existingOrder = await db.query.orders.findFirst({
        where: eq(schema.orders.woocommerceId, wooOrder.id)
      });
      
      if (existingOrder) {
        console.log(`- Pedido #${wooOrder.id} ya existe en el sistema, actualizando estado...`);
        
        // Actualizar estado
        await db.update(schema.orders)
          .set({
            status: mapWooStatus(wooOrder.status),
            paymentStatus: wooOrder.payment_method_title ? 'paid' : 'pending',
            updatedAt: new Date()
          })
          .where(eq(schema.orders.woocommerceId, wooOrder.id));
          
        continue;
      }
      
      // Buscar o crear cliente
      let customerId = null;
      
      if (wooOrder.billing && wooOrder.billing.email) {
        // Buscar cliente existente por email
        const existingCustomer = await db.query.customers.findFirst({
          where: eq(schema.customers.email, wooOrder.billing.email)
        });
        
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Crear nuevo cliente
          const firstName = wooOrder.billing.first_name || '';
          const lastName = wooOrder.billing.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          
          const [newCustomer] = await db.insert(schema.customers)
            .values({
              name: fullName,
              firstName,
              lastName,
              email: wooOrder.billing.email,
              phone: wooOrder.billing.phone || null,
              street: wooOrder.billing.address_1 || null,
              city: wooOrder.billing.city || null,
              province: wooOrder.billing.state || null,
              source: 'woocommerce',
              brand: determineBrandFromOrder(wooOrder)
            })
            .returning();
          
          customerId = newCustomer.id;
          console.log(`- Nuevo cliente creado: ${fullName} (ID: ${customerId})`);
        }
      }
      
      // Crear el pedido
      const [newOrder] = await db.insert(schema.orders)
        .values({
          customerId,
          orderNumber: `WOO-${wooOrder.id}`,
          totalAmount: parseFloat(wooOrder.total),
          status: mapWooStatus(wooOrder.status),
          paymentStatus: wooOrder.payment_method_title ? 'paid' : 'pending',
          paymentMethod: wooOrder.payment_method_title || null,
          source: 'woocommerce',
          woocommerceId: wooOrder.id,
          brand: determineBrandFromOrder(wooOrder),
          shippingAddress: wooOrder.shipping || null,
          billingAddress: wooOrder.billing || null,
          notes: wooOrder.customer_note || null,
          createdAt: new Date(wooOrder.date_created || Date.now()),
          updatedAt: new Date(wooOrder.date_modified || Date.now())
        })
        .returning();
      
      console.log(`- Nuevo pedido creado: #${wooOrder.id} (Cliente: ${customerId}, Total: ${wooOrder.total})`);
      
      // Añadir items del pedido
      if (wooOrder.line_items && wooOrder.line_items.length > 0) {
        for (const item of wooOrder.line_items) {
          // Buscar el producto por ID de WooCommerce
          let productId = null;
          
          if (item.product_id) {
            const product = await db.query.products.findFirst({
              where: eq(schema.products.woocommerceId, item.product_id)
            });
            
            if (product) {
              productId = product.id;
            }
          }
          
          // Añadir item al pedido
          await db.insert(schema.orderItems)
            .values({
              orderId: newOrder.id,
              productId,
              productName: item.name,
              quantity: item.quantity,
              unitPrice: parseFloat(item.price),
              subtotal: parseFloat(item.subtotal),
              attributes: item.meta_data || null
            });
        }
        
        console.log(`- Añadidos ${wooOrder.line_items.length} productos al pedido #${wooOrder.id}`);
      }
    }
    
    console.log('Sincronización de pedidos completada');
    
  } catch (error) {
    console.error('Error sincronizando pedidos desde WooCommerce:', error);
    throw error;
  }
}

// Función para actualizar el stock en WooCommerce desde el CRM
async function updateStockToWooCommerce() {
  console.log('Actualizando stock en WooCommerce...');
  
  try {
    // Obtener productos que tienen ID de WooCommerce
    const productsToUpdate = await db.query.products.findMany({
      where: isNull(schema.products.woocommerceId, false)
    });
    
    console.log(`Se encontraron ${productsToUpdate.length} productos para actualizar stock en WooCommerce`);
    
    // Actualizar cada producto
    for (const product of productsToUpdate) {
      if (!product.woocommerceId) continue;
      
      try {
        await wooCommerceRequest('PUT', `/products/${product.woocommerceId}`, {
          stock_quantity: product.stock
        });
        
        console.log(`- Stock actualizado para ${product.name} (ID: ${product.id}, WooID: ${product.woocommerceId}): ${product.stock} unidades`);
      } catch (error) {
        console.error(`Error actualizando stock para producto ${product.id}:`, error);
      }
    }
    
    console.log('Actualización de stock completada');
    
  } catch (error) {
    console.error('Error actualizando stock en WooCommerce:', error);
    throw error;
  }
}

// Función para determinar la marca basado en el contenido del pedido
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

// Función para mapear estados de WooCommerce a nuestro sistema
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

// Función principal para ejecutar todas las sincronizaciones
async function syncWithWooCommerce() {
  try {
    // 1. Sincronizar productos desde WooCommerce
    await syncProductsFromWooCommerce();
    
    // 2. Sincronizar pedidos desde WooCommerce
    await syncOrdersFromWooCommerce();
    
    // 3. Actualizar stock en WooCommerce
    await updateStockToWooCommerce();
    
    console.log('Sincronización con WooCommerce completada con éxito');
  } catch (error) {
    console.error('Error durante la sincronización con WooCommerce:', error);
    throw error;
  }
}

// Ejecutar sincronización
if (require.main === module) {
  syncWithWooCommerce()
    .then(() => {
      console.log('Script de sincronización con WooCommerce finalizado');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error en el script de sincronización con WooCommerce:', error);
      process.exit(1);
    });
}

// Exportar funciones para uso en otros scripts
export {
  syncProductsFromWooCommerce,
  syncOrdersFromWooCommerce,
  updateStockToWooCommerce,
  syncWithWooCommerce
};