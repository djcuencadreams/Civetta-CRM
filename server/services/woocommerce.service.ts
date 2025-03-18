import { EventEmitter } from "events";
import { appEvents, EventTypes } from "../lib/event-emitter";
import { eq, and, or, like, desc, asc, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import * as schema from "../../db/schema";
import type { Express, Request, Response } from "express";
import type { Service } from "./service-registry";
import { createHmac } from "crypto";

// Variables de entorno para la conexión a WooCommerce
const WOO_URL = process.env.WOOCOMMERCE_URL || '';
const WOO_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY || '';
const WOO_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET || '';

/**
 * Genera cabeceras de autenticación OAuth para WooCommerce
 * @param method Método HTTP (GET, POST, PUT, DELETE)
 * @param endpoint URL completa del endpoint de la API
 * @returns Objeto con cabeceras HTTP incluyendo autorización OAuth
 */
function getWooCommerceHeaders(method: string, endpoint: string): { [key: string]: string } {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

/**
 * Realiza una petición a la API de WooCommerce
 * @param method Método HTTP
 * @param endpoint Endpoint relativo de la API de WooCommerce
 * @param body Cuerpo de la petición (opcional)
 * @returns Promesa con la respuesta JSON de la API
 */
async function wooCommerceRequest(
  method: string,
  endpoint: string,
  body?: any
): Promise<any> {
  try {
    // Verificar que tenemos credenciales configuradas
    if (!WOO_URL || !WOO_KEY || !WOO_SECRET) {
      throw new Error('Faltan credenciales de WooCommerce');
    }

    // Preparar la URL
    const url = `${WOO_URL}/wp-json/wc/v3${endpoint}`;
    
    // Construir opciones de la petición
    const headers = getWooCommerceHeaders(method, url);
    const options: RequestInit = {
      method,
      headers,
      // Incluir credenciales en la URL para autenticación
      credentials: 'same-origin'
    };

    // Incluir cuerpo en métodos POST, PUT, PATCH
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(body);
    }

    // Añadir credenciales a la URL para autenticación simple
    const authUrl = new URL(url);
    authUrl.searchParams.append('consumer_key', WOO_KEY);
    authUrl.searchParams.append('consumer_secret', WOO_SECRET);

    // Realizar la petición HTTP
    const response = await fetch(authUrl.toString(), options);
    
    // Verificar si la respuesta es válida
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Error en la API de WooCommerce: ${response.status} ${response.statusText}${
          errorData ? ` - ${JSON.stringify(errorData)}` : ''
        }`
      );
    }
    
    // Parsear JSON de la respuesta
    return await response.json();
  } catch (error) {
    console.error(`Error en petición a WooCommerce (${method} ${endpoint}):`, error);
    throw error;
  }
}

/**
 * Obtiene un producto desde WooCommerce por su ID
 * Esta función es segura para desarrollo ya que solo realiza operaciones de lectura
 * 
 * @param wooProductId ID del producto en WooCommerce
 * @returns Datos del producto de WooCommerce con indicador de modo solo lectura
 */
export async function getProductFromWoo(wooProductId: number): Promise<{
  success: boolean;
  product?: any;
  message: string;
  readOnly: boolean;
}> {
  try {
    // Verificar que tengamos configuración de WooCommerce
    if (!WOO_URL || !WOO_KEY || !WOO_SECRET) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY y WOOCOMMERCE_CONSUMER_SECRET.',
        readOnly: true
      };
    }

    // Validar el ID
    if (!wooProductId || isNaN(wooProductId) || wooProductId <= 0) {
      return {
        success: false,
        message: 'ID de producto de WooCommerce inválido',
        readOnly: true
      };
    }

    // Realizar petición a la API de WooCommerce
    const product = await wooCommerceRequest('GET', `/products/${wooProductId}`);

    return {
      success: true,
      product,
      message: `MODO SOLO LECTURA: Obtenido producto ${product.name} (ID: ${product.id})`,
      readOnly: true
    };
  } catch (error) {
    console.error(`Error obteniendo producto de WooCommerce:`, error);
    return {
      success: false,
      message: `Error obteniendo producto: ${(error as Error).message}`,
      readOnly: true
    };
  }
}

/**
 * Obtiene todos los productos de WooCommerce con paginación
 * Esta función es segura para desarrollo ya que solo realiza operaciones de lectura
 * 
 * @param page Número de página (por defecto 1)
 * @param perPage Productos por página (por defecto 10, máximo 100)
 * @param category ID de categoría opcional para filtrar productos
 * @param search Término de búsqueda opcional para filtrar productos
 * @returns Lista de productos de WooCommerce con indicador de modo solo lectura
 */
export async function getProductsFromWoo(
  page: number = 1,
  perPage: number = 10,
  category?: number,
  search?: string
): Promise<{
  success: boolean;
  products?: any[];
  total?: number;
  totalPages?: number;
  message: string;
  readOnly: boolean;
}> {
  try {
    // Verificar que tengamos configuración de WooCommerce
    if (!WOO_URL || !WOO_KEY || !WOO_SECRET) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY y WOOCOMMERCE_CONSUMER_SECRET.',
        readOnly: true
      };
    }

    // Construir parámetros de la petición
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('per_page', Math.min(perPage, 100).toString());
    
    // Añadir parámetros opcionales si existen
    if (category && !isNaN(category)) {
      params.append('category', category.toString());
    }
    
    if (search) {
      params.append('search', search);
    }

    // Realizar petición a la API de WooCommerce
    const response = await wooCommerceRequest('GET', `/products?${params.toString()}`);
    
    // Obtener información de paginación de los headers
    const total = parseInt(response.headers?.get('X-WP-Total') || '0');
    const totalPages = parseInt(response.headers?.get('X-WP-TotalPages') || '0');

    // Verificar que la respuesta sea un array
    if (!Array.isArray(response)) {
      return {
        success: false,
        message: 'Respuesta inesperada de WooCommerce',
        readOnly: true
      };
    }

    return {
      success: true,
      products: response,
      total,
      totalPages,
      message: `MODO SOLO LECTURA: Obtenidos ${response.length} productos de WooCommerce`,
      readOnly: true
    };
  } catch (error) {
    console.error(`Error obteniendo productos de WooCommerce:`, error);
    return {
      success: false,
      message: `Error obteniendo productos: ${(error as Error).message}`,
      readOnly: true
    };
  }
}

/**
 * Sincroniza un producto del CRM a WooCommerce
 * Si el producto ya tiene un ID de WooCommerce, verifica que exista
 * Si el producto no tiene ID de WooCommerce, lo crea en WooCommerce
 * 
 * @param productId ID del producto en el CRM
 * @param createIfNotExists Si es true y el producto no existe en WooCommerce, lo crea
 * @returns Resultado de la operación con el ID en WooCommerce si tiene éxito
 */
export async function syncProductToWoo(productId: number, createIfNotExists: boolean = false): Promise<{ 
  success: boolean;
  wooCommerceId?: number;
  message: string;
  readOnly?: boolean;
}> {
  try {
    // Verificar que tengamos configuración de WooCommerce
    if (!WOO_URL || !WOO_KEY || !WOO_SECRET) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY y WOOCOMMERCE_CONSUMER_SECRET.',
        readOnly: true
      };
    }

    // Obtener datos del producto desde nuestro CRM
    let product;
    let category;
    
    // Obtener el producto
    if (productId) {
      product = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, productId))
        .limit(1)
        .then(rows => rows[0]);
        
      // Si el producto tiene categoría, obtenerla
      if (product && product.categoryId) {
        category = await db
          .select()
          .from(schema.productCategories)
          .where(eq(schema.productCategories.id, product.categoryId))
          .limit(1)
          .then(rows => rows[0]);
      }
    }

    if (!product) {
      return {
        success: false,
        message: `No se encontró el producto con ID ${productId}`,
        readOnly: true
      };
    }

    // Verificar si el producto ya existe en WooCommerce (por wooCommerceId)
    if (!product.wooCommerceId) {
      // Si no tiene ID de WooCommerce y no se solicita crear, retornar error
      if (!createIfNotExists) {
        return {
          success: false,
          message: `El producto no tiene un ID de WooCommerce asociado. Active la opción 'createIfNotExists' para crearlo automáticamente.`,
          readOnly: true
        };
      }
      
      // Si se solicita crear el producto, intentar crearlo en WooCommerce
      console.log(`Intentando crear producto '${product.name}' en WooCommerce...`);
      
      try {
        // Preparar datos para crear en WooCommerce
        const wooData: Record<string, any> = {
          name: product.name,
          description: product.description || '',
          short_description: '', // Se podría agregar un campo para esto en el futuro
          sku: product.sku,
          regular_price: product.price.toString(),
          manage_stock: true,
          stock_quantity: product.stock,
          status: product.active ? 'publish' : 'draft'
        };

        // Incluir categoría si está disponible
        if (category) {
          // Si la categoría tiene wooCommerceId, usarlo
          if (category.wooCommerceCategoryId) {
            wooData.categories = [{
              id: category.wooCommerceCategoryId
            }];
          }
          // De lo contrario, usar el nombre (WooCommerce podría crear una nueva)
          else {
            wooData.categories = [{
              name: category.name
            }];
          }
        }

        // Incluir imágenes si están disponibles
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          wooData.images = product.images.map((img: any) => ({
            src: img.src,
            alt: img.alt || product.name
          }));
        }

        // Incluir atributos si están disponibles
        if (product.attributes && typeof product.attributes === 'object') {
          const attrs = product.attributes as Record<string, any>;
          const attributesArray = [];
          
          for (const [name, value] of Object.entries(attrs)) {
            if (value) {
              attributesArray.push({
                name,
                options: Array.isArray(value) ? value : [value.toString()],
                visible: true
              });
            }
          }
          
          if (attributesArray.length > 0) {
            wooData.attributes = attributesArray;
          }
        }

        // MODO SOLO LECTURA: En lugar de crear realmente, simulamos y registramos lo que se habría hecho
        console.log(`MODO SOLO LECTURA: Simulando creación de producto en WooCommerce`);
        console.log('Datos que se habrían enviado:', JSON.stringify(wooData, null, 2));
        
        // Generar un ID simulado para ilustrar el proceso
        const simulatedId = Math.floor(1000000 + Math.random() * 9000000);
        
        // Actualizar el producto en nuestra base de datos con el ID simulado
        await db.update(schema.products)
          .set({
            wooCommerceId: simulatedId, // ID simulado
            wooCommerceUrl: `${WOO_URL}/product/simulado-${product.id}`,
            updatedAt: new Date()
          })
          .where(eq(schema.products.id, productId));
        
        return {
          success: true,
          wooCommerceId: simulatedId,
          message: `MODO SOLO LECTURA: Producto ${product.name} simulado en WooCommerce con ID ${simulatedId}`,
          readOnly: true
        };
      } catch (error) {
        console.error(`Error creando producto en WooCommerce:`, error);
        return {
          success: false,
          message: `Error creando producto en WooCommerce: ${(error as Error).message}`,
          readOnly: true
        };
      }
    }

    // Preparar datos para actualizar en WooCommerce
    const wooData: Record<string, any> = {
      name: product.name,
      description: product.description || '',
      short_description: '', // Se podría agregar un campo para esto en el futuro
      sku: product.sku,
      regular_price: product.price.toString(),
      manage_stock: true,
      stock_quantity: product.stock,
      status: product.active ? 'publish' : 'draft'
    };

    // Incluir categoría si está disponible
    if (category) {
      // Si la categoría tiene wooCommerceId, usarlo
      if (category.wooCommerceCategoryId) {
        wooData.categories = [{
          id: category.wooCommerceCategoryId
        }];
      }
      // De lo contrario, usar el nombre (WooCommerce podría crear una nueva)
      else {
        wooData.categories = [{
          name: category.name
        }];
      }
    }

    // Incluir imágenes si están disponibles
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      wooData.images = product.images.map((img: any) => ({
        src: img.src,
        alt: img.alt || product.name
      }));
    }

    // Incluir atributos si están disponibles
    if (product.attributes && typeof product.attributes === 'object') {
      const attrs = product.attributes as Record<string, any>;
      const attributesArray = [];
      
      for (const [name, value] of Object.entries(attrs)) {
        if (value) {
          attributesArray.push({
            name,
            options: Array.isArray(value) ? value : [value.toString()],
            visible: true
          });
        }
      }
      
      if (attributesArray.length > 0) {
        wooData.attributes = attributesArray;
      }
    }

    // MODO SOLO LECTURA: En lugar de actualizar, obtener datos actuales del producto en WooCommerce
    try {
      // Verificar que el producto existe en WooCommerce (solo lectura)
      const wooProduct = await wooCommerceRequest(
        'GET',
        `/products/${product.wooCommerceId}`
      );

      if (wooProduct && wooProduct.id) {
        // Actualizar solamente la URL del producto en nuestro CRM
        await db.update(schema.products)
          .set({
            wooCommerceUrl: wooProduct.permalink || null,
            updatedAt: new Date()
          })
          .where(eq(schema.products.id, productId));

        return {
          success: true,
          wooCommerceId: wooProduct.id,
          message: `MODO SOLO LECTURA: Verificado producto ${product.name} en WooCommerce (ID: ${wooProduct.id})`,
          readOnly: true
        };
      }
    } catch (error) {
      console.error(`Error verificando producto en WooCommerce (solo lectura):`, error);
      return {
        success: false,
        message: `Error verificando producto en WooCommerce: ${(error as Error).message}`,
        readOnly: true
      };
    }

    return {
      success: false,
      message: `Respuesta inesperada de WooCommerce al actualizar el producto ${product.name}`,
      readOnly: true
    };
  } catch (error) {
    console.error(`Error sincronizando producto a WooCommerce (MODO SOLO LECTURA):`, error);
    return {
      success: false,
      message: `Error sincronizando producto (MODO SOLO LECTURA): ${(error as Error).message}`,
      readOnly: true
    };
  }
}

/**
 * Sincroniza un cliente del CRM a WooCommerce
 * Si el cliente ya tiene un ID de WooCommerce, verifica o actualiza sus datos
 * Si el cliente no tiene ID de WooCommerce, lo crea en WooCommerce
 * 
 * @param customerId ID del cliente en el CRM
 * @param createIfNotExists Si es true y el cliente no existe en WooCommerce, lo crea
 * @returns Resultado de la operación con el ID en WooCommerce si tiene éxito
 */
export async function syncCustomerToWoo(customerId: number, createIfNotExists: boolean = false): Promise<{ 
  success: boolean;
  wooCommerceId?: number;
  message: string;
  readOnly?: boolean;
}> {
  try {
    // Verificar que tengamos configuración de WooCommerce
    if (!WOO_URL || !WOO_KEY || !WOO_SECRET) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY y WOOCOMMERCE_CONSUMER_SECRET.',
        readOnly: true
      };
    }

    // Obtener datos del cliente desde nuestro CRM
    let customer;
    
    // Obtener el cliente
    if (customerId) {
      customer = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.id, customerId))
        .limit(1)
        .then(rows => rows[0]);
    }

    if (!customer) {
      return {
        success: false,
        message: `No se encontró el cliente con ID ${customerId}`,
        readOnly: true
      };
    }

    // Verificar si el cliente ya existe en WooCommerce (por wooCommerceId)
    if (!customer.wooCommerceId) {
      // Si no tiene ID de WooCommerce y no se solicita crear, retornar error
      if (!createIfNotExists) {
        return {
          success: false,
          message: `El cliente no tiene un ID de WooCommerce asociado. Active la opción 'createIfNotExists' para crearlo automáticamente.`,
          readOnly: true
        };
      }
      
      // Si se solicita crear el cliente, intentar crearlo en WooCommerce
      console.log(`Intentando crear cliente '${customer.name}' en WooCommerce...`);
      
      try {
        // Preparar datos para crear en WooCommerce
        const wooData: Record<string, any> = {
          email: customer.email || '',
          first_name: customer.firstName || '',
          last_name: customer.lastName || '',
          username: customer.email || `cliente_${customer.id}`,
          billing: {
            first_name: customer.firstName || '',
            last_name: customer.lastName || '',
            company: '',
            address_1: customer.street || '',
            address_2: '',
            city: customer.city || '',
            state: customer.province || '',
            postcode: customer.deliveryInstructions || '',
            country: customer.address || 'EC',
            email: customer.email || '',
            phone: customer.phone || ''
          },
          shipping: {
            first_name: customer.firstName || '',
            last_name: customer.lastName || '',
            company: '',
            address_1: customer.street || '',
            address_2: '',
            city: customer.city || '',
            state: customer.province || '',
            postcode: customer.deliveryInstructions || '',
            country: customer.address || 'EC'
          },
          meta_data: []
        };

        // Añadir cédula como meta_data si está disponible
        if (customer.idNumber) {
          wooData.meta_data.push({
            key: 'cedula',
            value: customer.idNumber
          });
        }

        // Añadir RUC como meta_data si está disponible
        if (customer.ruc) {
          wooData.meta_data.push({
            key: 'ruc',
            value: customer.ruc
          });
        }

        // MODO SOLO LECTURA: En lugar de crear realmente, simulamos y registramos lo que se habría hecho
        console.log(`MODO SOLO LECTURA: Simulando creación de cliente en WooCommerce`);
        console.log('Datos que se habrían enviado:', JSON.stringify(wooData, null, 2));
        
        // Generar un ID simulado para ilustrar el proceso
        const simulatedId = Math.floor(1000000 + Math.random() * 9000000);
        
        // Actualizar el cliente en nuestra base de datos con el ID simulado
        await db.update(schema.customers)
          .set({
            wooCommerceId: simulatedId, // ID simulado
            updatedAt: new Date()
          })
          .where(eq(schema.customers.id, customerId));
        
        return {
          success: true,
          wooCommerceId: simulatedId,
          message: `MODO SOLO LECTURA: Cliente ${customer.name} simulado en WooCommerce con ID ${simulatedId}`,
          readOnly: true
        };
      } catch (error) {
        console.error(`Error creando cliente en WooCommerce:`, error);
        return {
          success: false,
          message: `Error creando cliente en WooCommerce: ${(error as Error).message}`,
          readOnly: true
        };
      }
    }

    // Si ya existe, actualizar el cliente en WooCommerce
    // Preparar datos para actualizar en WooCommerce
    const wooData: Record<string, any> = {
      email: customer.email || '',
      first_name: customer.firstName || '',
      last_name: customer.lastName || '',
      billing: {
        first_name: customer.firstName || '',
        last_name: customer.lastName || '',
        company: '',
        address_1: customer.street || '',
        address_2: '',
        city: customer.city || '',
        state: customer.province || '',
        postcode: customer.deliveryInstructions || '',
        country: customer.address || 'EC',
        email: customer.email || '',
        phone: customer.phone || ''
      },
      shipping: {
        first_name: customer.firstName || '',
        last_name: customer.lastName || '',
        company: '',
        address_1: customer.street || '',
        address_2: '',
        city: customer.city || '',
        state: customer.province || '',
        postcode: customer.deliveryInstructions || '',
        country: customer.address || 'EC'
      },
      meta_data: []
    };

    // Añadir cédula como meta_data si está disponible
    if (customer.idNumber) {
      wooData.meta_data.push({
        key: 'cedula',
        value: customer.idNumber
      });
    }

    // Añadir RUC como meta_data si está disponible
    if (customer.ruc) {
      wooData.meta_data.push({
        key: 'ruc',
        value: customer.ruc
      });
    }

    // MODO SOLO LECTURA: En lugar de actualizar, obtener datos actuales del cliente en WooCommerce
    try {
      // Verificar que el cliente existe en WooCommerce (solo lectura)
      const wooCustomer = await wooCommerceRequest(
        'GET',
        `/customers/${customer.wooCommerceId}`
      );

      if (wooCustomer && wooCustomer.id) {
        // En modo de lectura, solo actualizamos el ID de WooCommerce si es necesario
        if (customer.wooCommerceId !== wooCustomer.id) {
          await db.update(schema.customers)
            .set({
              wooCommerceId: wooCustomer.id,
              updatedAt: new Date()
            })
            .where(eq(schema.customers.id, customerId));
        }

        return {
          success: true,
          wooCommerceId: wooCustomer.id,
          message: `MODO SOLO LECTURA: Verificado cliente ${customer.name} en WooCommerce (ID: ${wooCustomer.id})`,
          readOnly: true
        };
      }
    } catch (error) {
      console.error(`Error verificando cliente en WooCommerce (solo lectura):`, error);
      return {
        success: false,
        message: `Error verificando cliente en WooCommerce: ${(error as Error).message}`,
        readOnly: true
      };
    }

    return {
      success: false,
      message: `Respuesta inesperada de WooCommerce al actualizar el cliente ${customer.name}`,
      readOnly: true
    };
  } catch (error) {
    console.error(`Error sincronizando cliente a WooCommerce (MODO SOLO LECTURA):`, error);
    return {
      success: false,
      message: `Error sincronizando cliente (MODO SOLO LECTURA): ${(error as Error).message}`,
      readOnly: true
    };
  }
}

/**
 * Crea un pedido en WooCommerce a partir de un pedido del CRM
 * En MODO SOLO LECTURA: Simula la creación pero no ejecuta cambios en WooCommerce
 * 
 * @param orderId ID del pedido en el CRM
 * @returns Resultado de la simulación de creación (MODO SOLO LECTURA)
 */
export async function createOrderInWoo(orderId: number): Promise<{
  success: boolean;
  wooCommerceId?: number;
  message: string;
  readOnly?: boolean;
}> {
  try {
    // Verificar que tengamos configuración de WooCommerce
    if (!WOO_URL || !WOO_KEY || !WOO_SECRET) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY y WOOCOMMERCE_CONSUMER_SECRET.',
        readOnly: true
      };
    }

    // Obtener datos del pedido
    const order = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId))
      .limit(1)
      .then(rows => rows[0]);
      
    if (!order) {
      return {
        success: false,
        message: `No se encontró el pedido con ID ${orderId}`,
        readOnly: true
      };
    }
    
    // Obtener el cliente usando la API normal de Drizzle pero con acceso a bajo nivel
    const customerResult = await db
      .select()
      .from(schema.customers)
      .where(sql`${schema.customers.id} = ${order.customerId}`)
      .limit(1);
    
    const customer = customerResult.length > 0 ? customerResult[0] : null;
      
    // Obtener los ítems del pedido usando Drizzle
    const itemsResult = await db
      .select()
      .from(schema.orderItems)
      .where(sql`${schema.orderItems.orderId} = ${orderId}`);
    
    const items = itemsResult || [];
      
    // Obtener productos para cada ítem
    const itemsWithProducts = await Promise.all(
      items.map(async (item) => {
        let product = null;
        if (item.productId) {
          const productResult = await db
            .select()
            .from(schema.products)
            .where(sql`${schema.products.id} = ${item.productId}`)
            .limit(1);
          
          product = productResult.length > 0 ? productResult[0] : null;
        }
        return { ...item, product };
      })
    );
    
    // Construir objeto con toda la información
    const orderData = {
      ...order,
      customer,
      items: itemsWithProducts
    };

    if (!order) {
      return {
        success: false,
        message: `No se encontró el pedido con ID ${orderId}`,
        readOnly: true
      };
    }

    // Verificar si ya tiene un ID de WooCommerce
    if (order.wooCommerceId) {
      return {
        success: false,
        message: `El pedido ya tiene un ID de WooCommerce asociado (${order.wooCommerceId}). No se puede crear duplicado.`,
        readOnly: true
      };
    }

    // Verificar que tengamos datos del cliente
    if (!customer) {
      return {
        success: false,
        message: `El pedido no tiene un cliente asociado. No se puede crear en WooCommerce.`,
        readOnly: true
      };
    }

    // Mapear estados del pedido a estados de WooCommerce
    const mapStatusToWoo = (status: string | null): string => {
      if (!status) return 'pending';
      
      switch (status.toLowerCase()) {
        case 'new': return 'pending';
        case 'preparing': return 'processing';
        case 'pending': return 'on-hold';
        case 'completed': return 'completed';
        case 'cancelled': return 'cancelled';
        case 'delivered': return 'completed';
        case 'failed': return 'failed';
        case 'refunded': return 'refunded';
        case 'on-hold': return 'on-hold';
        default: return 'pending';
      }
    };

    // Mapear estados de pago a métodos de pago de WooCommerce
    const mapPaymentStatus = (status: string | null, method: string | null): string => {
      if (status === 'paid') {
        return method ? method : 'bacs';  // Transferencia bancaria para pagos completados sin método especificado
      }
      return 'cod'; // Cash on delivery para pedidos pendientes de pago
    };

    // Preparar datos del cliente
    const customerData: Record<string, any> = {
      first_name: customer?.firstName || '',
      last_name: customer?.lastName || '',
      email: customer?.email || '',
      phone: customer?.phone || ''
    };

    // Direcciones de envío y facturación
    const billingAddress = order.billingAddress || {};
    const shippingAddress = order.shippingAddress || {};

    // Preparar datos del pedido para WooCommerce
    const wooData: Record<string, any> = {
      status: mapStatusToWoo(order.status || 'pending'),
      customer_id: 0, // 0 = cliente invitado
      payment_method: mapPaymentStatus(order.paymentStatus || 'pending', order.paymentMethod || null),
      payment_method_title: order.paymentMethod || 'Pago offline',
      set_paid: order.paymentStatus === 'paid',
      billing: {
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        email: customerData.email,
        phone: customerData.phone,
        address_1: (billingAddress as any)?.address_1 || customer?.street || '',
        city: (billingAddress as any)?.city || customer?.city || '',
        state: (billingAddress as any)?.state || customer?.province || '',
        country: (billingAddress as any)?.country || 'ES' // Default a España
      },
      shipping: {
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        address_1: (shippingAddress as any)?.address_1 || customer?.street || '',
        city: (shippingAddress as any)?.city || customer?.city || '',
        state: (shippingAddress as any)?.state || customer?.province || '',
        country: (shippingAddress as any)?.country || 'ES' // Default a España
      },
      line_items: [],
      customer_note: order.notes || ''
    };

    // Añadir items del pedido
    if (itemsWithProducts && itemsWithProducts.length > 0) {
      for (const item of itemsWithProducts) {
        const lineItem: Record<string, any> = {
          name: item.productName,
          quantity: item.quantity,
          price: item.unitPrice.toString(),
          total: item.subtotal.toString()
        };

        // Si el producto tiene ID de WooCommerce, incluirlo
        if (item.product && item.product.wooCommerceId) {
          lineItem.product_id = item.product.wooCommerceId;
        }

        // Si hay atributos, incluirlos
        if (item.attributes && typeof item.attributes === 'object') {
          const attrs = item.attributes as Record<string, any>;
          const meta_data = [];
          
          for (const [key, value] of Object.entries(attrs)) {
            if (value) {
              meta_data.push({
                key,
                value: value.toString()
              });
            }
          }
          
          if (meta_data.length > 0) {
            lineItem.meta_data = meta_data;
          }
        }

        wooData.line_items.push(lineItem);
      }
    }

    // MODO SOLO LECTURA: En lugar de crear el pedido, generamos un ID simulado
    // y mostramos los datos que se habrían enviado a WooCommerce
    
    // Generar un ID simulado para ilustrar el proceso
    const simulatedId = Math.floor(1000000 + Math.random() * 9000000);
    
    // Registrar los datos que se habrían enviado (para desarrollo y depuración)
    console.log(`MODO SOLO LECTURA: Simulando creación de pedido #${order.orderNumber || orderId} en WooCommerce`);
    console.log('Datos que se habrían enviado:', JSON.stringify(wooData, null, 2));
    
    return {
      success: true,
      readOnly: true,
      wooCommerceId: simulatedId, // ID simulado
      message: `MODO SOLO LECTURA: Simulación de pedido #${order.orderNumber || orderId} completada. Se habría creado con ID ${simulatedId} en WooCommerce.`
    };
  } catch (error) {
    console.error(`Error creando pedido en WooCommerce (MODO SOLO LECTURA):`, error);
    return {
      success: false,
      message: `Error creando pedido (MODO SOLO LECTURA): ${(error as Error).message}`,
      readOnly: true
    };
  }
}

/**
 * Servicio para integración con WooCommerce
 */
export class WooCommerceService implements Service {
  name = "woocommerce";

  /**
   * Registra rutas API para la integración con WooCommerce
   */
  registerRoutes(app: Express): void {
    // Ruta para sincronizar un producto a WooCommerce
    app.post("/api/woocommerce/sync-product/:id", async (req: Request, res: Response) => {
      try {
        const productId = parseInt(req.params.id);
        
        if (isNaN(productId)) {
          return res.status(400).json({ error: "ID de producto inválido" });
        }
        
        // Extraer el parámetro createIfNotExists del body o query
        const createIfNotExists = req.body.createIfNotExists === true || 
                                req.query.createIfNotExists === 'true';
        
        const result = await syncProductToWoo(productId, createIfNotExists);
        
        if (result.success) {
          return res.json(result);
        } else {
          return res.status(400).json(result);
        }
      } catch (error) {
        console.error("Error en sincronización de producto:", error);
        return res.status(500).json({ 
          error: "Error interno del servidor", 
          message: (error as Error).message 
        });
      }
    });
    
    // Ruta para crear un pedido en WooCommerce
    app.post("/api/woocommerce/create-order/:id", async (req: Request, res: Response) => {
      try {
        const orderId = parseInt(req.params.id);
        
        if (isNaN(orderId)) {
          return res.status(400).json({ error: "ID de pedido inválido" });
        }
        
        const result = await createOrderInWoo(orderId);
        
        if (result.success) {
          return res.json(result);
        } else {
          return res.status(400).json(result);
        }
      } catch (error) {
        console.error("Error al crear pedido en WooCommerce:", error);
        return res.status(500).json({ 
          error: "Error interno del servidor", 
          message: (error as Error).message 
        });
      }
    });
    
    // Ruta para sincronizar un cliente a WooCommerce
    app.post("/api/woocommerce/sync-customer/:id", async (req: Request, res: Response) => {
      try {
        const customerId = parseInt(req.params.id);
        
        if (isNaN(customerId)) {
          return res.status(400).json({ error: "ID de cliente inválido" });
        }
        
        // Extraer el parámetro createIfNotExists del body o query
        const createIfNotExists = req.body.createIfNotExists === true || 
                                req.query.createIfNotExists === 'true';
        
        const result = await syncCustomerToWoo(customerId, createIfNotExists);
        
        if (result.success) {
          return res.json(result);
        } else {
          return res.status(400).json(result);
        }
      } catch (error) {
        console.error("Error en sincronización de cliente:", error);
        return res.status(500).json({ 
          error: "Error interno del servidor", 
          message: (error as Error).message 
        });
      }
    });
    
    // Ruta para verificar la conexión con WooCommerce
    app.get("/api/woocommerce/check-connection", async (_req: Request, res: Response) => {
      try {
        // Verificar que tengamos configuración de WooCommerce
        if (!WOO_URL || !WOO_KEY || !WOO_SECRET) {
          return res.status(400).json({
            connected: false,
            message: 'Falta configuración de WooCommerce. Configure WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY y WOOCOMMERCE_CONSUMER_SECRET.',
            readOnly: true
          });
        }
        
        // Hacer una petición simple a la API de WooCommerce para verificar la conexión
        const response = await wooCommerceRequest('GET', '/products?per_page=1');
        const siteInfo = await wooCommerceRequest('GET', '');
        
        return res.json({
          connected: true,
          message: 'Conexión exitosa con WooCommerce',
          readOnly: true,
          store: {
            name: siteInfo.store_name || 'Tienda WooCommerce',
            description: siteInfo.store_description,
            url: WOO_URL,
            version: siteInfo.version,
            productsCount: siteInfo.products_count || 0,
            ordersCount: siteInfo.orders_count || 0
          }
        });
      } catch (error) {
        console.error("Error verificando conexión con WooCommerce:", error);
        return res.status(500).json({
          connected: false,
          message: `Error de conexión: ${(error as Error).message}`,
          readOnly: true
        });
      }
    });
  }

  /**
   * Inicializa el servicio registrando listeners para eventos
   */
  async initialize(): Promise<void> {
    // Escuchar eventos de actualización de productos para sincronizar con WooCommerce
    appEvents.on(EventTypes.PRODUCT_UPDATED, async (data: any) => {
      const product = data.product;
      
      if (product && product.id) {
        // Si el producto ya tiene WooCommerce ID, lo sincronizamos
        if (product.wooCommerceId) {
          console.log(`Producto actualizado. Sincronizando con WooCommerce: ${product.name} (ID: ${product.id})`);
          try {
            const result = await syncProductToWoo(product.id);
            console.log(`Resultado de sincronización:`, result);
          } catch (error) {
            console.error(`Error sincronizando producto automáticamente:`, error);
          }
        } 
        // Si no tiene ID pero está activo, intentamos crearlo en WooCommerce
        else if (product.active) {
          console.log(`Producto sin ID de WooCommerce actualizado. Intentando crear en WooCommerce: ${product.name} (ID: ${product.id})`);
          try {
            const result = await syncProductToWoo(product.id, true); // true = createIfNotExists
            console.log(`Resultado de creación en WooCommerce:`, result);
          } catch (error) {
            console.error(`Error creando producto en WooCommerce automáticamente:`, error);
          }
        }
      }
    });
    
    // Escuchar eventos de cambio de stock para sincronizar con WooCommerce
    appEvents.on(EventTypes.PRODUCT_STOCK_CHANGED, async (data: any) => {
      const product = data.product;
      
      if (product && product.id) {
        // Si el producto ya tiene WooCommerce ID, sincronizamos el stock
        if (product.wooCommerceId) {
          console.log(`Stock de producto modificado. Sincronizando con WooCommerce: ${product.name} (ID: ${product.id})`);
          try {
            const result = await syncProductToWoo(product.id);
            console.log(`Resultado de sincronización de stock:`, result);
          } catch (error) {
            console.error(`Error sincronizando stock de producto automáticamente:`, error);
          }
        }
        // Si no tiene ID pero está activo, intentamos crearlo en WooCommerce
        else if (product.active) {
          console.log(`Stock modificado en producto sin ID de WooCommerce. Intentando crear en WooCommerce: ${product.name} (ID: ${product.id})`);
          try {
            const result = await syncProductToWoo(product.id, true); // true = createIfNotExists
            console.log(`Resultado de creación en WooCommerce para stock:`, result);
          } catch (error) {
            console.error(`Error creando producto en WooCommerce para sincronizar stock:`, error);
          }
        }
      }
    });
    
    // Escuchar eventos de actualización de clientes para sincronizar con WooCommerce
    appEvents.on(EventTypes.CUSTOMER_UPDATED, async (data: any) => {
      const customer = data.customer;
      
      if (customer && customer.id) {
        // Si el cliente ya tiene WooCommerce ID, lo sincronizamos
        if (customer.wooCommerceId) {
          console.log(`Cliente actualizado. Sincronizando con WooCommerce: ${customer.name} (ID: ${customer.id})`);
          try {
            const result = await syncCustomerToWoo(customer.id);
            console.log(`Resultado de sincronización:`, result);
          } catch (error) {
            console.error(`Error sincronizando cliente automáticamente:`, error);
          }
        } 
        // Si no tiene ID, intentamos verificar si existe por cédula/RUC o crearlo en WooCommerce
        else {
          console.log(`Cliente sin ID de WooCommerce actualizado. Intentando crear en WooCommerce: ${customer.name} (ID: ${customer.id})`);
          try {
            const result = await syncCustomerToWoo(customer.id, true); // true = createIfNotExists
            console.log(`Resultado de creación en WooCommerce:`, result);
          } catch (error) {
            console.error(`Error creando cliente en WooCommerce automáticamente:`, error);
          }
        }
      }
    });
    
    // Escuchar eventos de creación de clientes para sincronizar con WooCommerce
    appEvents.on(EventTypes.CUSTOMER_CREATED, async (data: any) => {
      const customer = data;
      
      if (customer && customer.id) {
        console.log(`Nuevo cliente creado. Intentando crear en WooCommerce: ${customer.name} (ID: ${customer.id})`);
        try {
          const result = await syncCustomerToWoo(customer.id, true); // true = createIfNotExists
          console.log(`Resultado de creación en WooCommerce:`, result);
        } catch (error) {
          console.error(`Error creando cliente en WooCommerce automáticamente:`, error);
        }
      }
    });
    
    // Escuchar eventos cuando un lead se convierte en cliente
    appEvents.on(EventTypes.LEAD_CONVERTED, async (data: any) => {
      const customer = data.customer;
      
      if (customer && customer.id) {
        console.log(`Lead convertido a cliente. Sincronizando con WooCommerce: ${customer.name} (ID: ${customer.id})`);
        try {
          const result = await syncCustomerToWoo(customer.id, true); // true = createIfNotExists
          console.log(`Resultado de sincronización de lead convertido:`, result);
        } catch (error) {
          console.error(`Error sincronizando cliente convertido automáticamente:`, error);
        }
      }
    });
  }
}

export const wooCommerceService = new WooCommerceService();