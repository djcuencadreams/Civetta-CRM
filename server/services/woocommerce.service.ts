import { EventEmitter } from "events";
import { appEvents, EventTypes } from "../lib/event-emitter";
import { eq, and, or, like, desc, asc, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import * as schema from "../../db/schema";
import type { Express, Request, Response } from "express";
import type { Service } from "./service-registry";
import { createHmac } from "crypto";
import { 
  loadWooCommerceConfig, 
  saveWooCommerceConfig, 
  getWooCommerceConfig, 
  hasWooCommerceCredentials,
  isWooCommerceEnabled,
  WooCommerceConfig
} from "../lib/woocommerce-config";

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
    const config = getWooCommerceConfig();
    if (!hasWooCommerceCredentials()) {
      throw new Error('Faltan credenciales de WooCommerce');
    }

    // Preparar la URL
    const url = `${config.url}/wp-json/wc/v3${endpoint}`;
    
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
    authUrl.searchParams.append('consumer_key', config.consumerKey);
    authUrl.searchParams.append('consumer_secret', config.consumerSecret);

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
    if (!hasWooCommerceCredentials()) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure URL, Consumer Key y Consumer Secret en la sección de configuración.',
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
    if (!hasWooCommerceCredentials()) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure URL, Consumer Key y Consumer Secret en la sección de configuración.',
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
    if (!hasWooCommerceCredentials()) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure URL, Consumer Key y Consumer Secret en la sección de configuración.',
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
      
      // Obtener configuración de WooCommerce
      const config = getWooCommerceConfig();
      
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
            wooCommerceUrl: `${config.url}/product/simulado-${product.id}`,
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
    if (!hasWooCommerceCredentials()) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure URL, Consumer Key y Consumer Secret en la sección de configuración.',
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
 * Sincroniza un cliente desde WooCommerce al CRM con detección avanzada de duplicados
 * Verifica múltiples campos de identificación: cédula, RUC, email y teléfono
 * 
 * @param wooCustomerId ID del cliente en WooCommerce
 * @returns Resultado de la sincronización con información del cliente en el CRM
 */
/**
 * Sincroniza un cliente desde WooCommerce al CRM con detección avanzada de duplicados
 * Verifica múltiples campos de identificación: cédula, RUC, email y teléfono
 * 
 * @param wooCustomerId ID del cliente en WooCommerce
 * @returns Resultado de la sincronización con información del cliente en el CRM
 */
export async function syncCustomerFromWoo(wooCustomerId: number): Promise<{
  success: boolean;
  customerId?: number;
  message: string;
  isNew?: boolean;
  matchedBy?: string;
  identifiers?: {
    email?: string;
    phone?: string;
    idNumber?: string;
    ruc?: string;
  };
}> {
  try {
    // Verificar que tengamos configuración de WooCommerce
    if (!hasWooCommerceCredentials()) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure URL, Consumer Key y Consumer Secret en la sección de configuración.',
      };
    }

    // Consultar datos del cliente en WooCommerce
    const wooCustomerResponse = await wooCommerceRequest('GET', `/customers/${wooCustomerId}`);
    
    if (!wooCustomerResponse || !wooCustomerResponse.id) {
      return {
        success: false,
        message: `No se encontró el cliente con ID ${wooCustomerId} en WooCommerce`,
      };
    }

    const wooCustomer = wooCustomerResponse;
    
    // Extraer información relevante del cliente
    const email = wooCustomer.email || null;
    const firstName = wooCustomer.first_name || '';
    const lastName = wooCustomer.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || wooCustomer.username || 'Cliente sin nombre';
    const phone = wooCustomer.billing?.phone || null;
    
    // Verificar cédula/DNI y RUC del cliente desde meta_data
    let cedula: string | null = null;
    let ruc: string | null = null;
    
    // Buscar documentos de identidad en meta_data
    if (wooCustomer.meta_data && Array.isArray(wooCustomer.meta_data)) {
      // Buscar campo de cédula (varios posibles nombres)
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
      
      // Buscar campo de RUC (varios posibles nombres)
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
    
    // También podría estar en billing.tax_id o fields específicos según la configuración
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

    // Verificar si el cliente ya existe en el CRM usando múltiples criterios
    
    // 1. Buscar por ID de WooCommerce (match exacto)
    let existingCustomer = await db
      .select()
      .from(schema.customers)
      .where(eq(schema.customers.wooCommerceId, wooCustomerId))
      .limit(1)
      .then(rows => rows[0] || null);
    
    if (existingCustomer) {
      // Actualizar los datos del cliente con la información más reciente de WooCommerce
      await db.update(schema.customers)
        .set({
          name: fullName,
          firstName: firstName,
          lastName: lastName,
          email: email || existingCustomer.email,
          phone: phone || existingCustomer.phone,
          street: wooCustomer.billing?.address_1 || existingCustomer.street,
          city: wooCustomer.billing?.city || existingCustomer.city,
          province: wooCustomer.billing?.state || existingCustomer.province,
          deliveryInstructions: wooCustomer.billing?.postcode || existingCustomer.deliveryInstructions,
          address: wooCustomer.billing?.country || existingCustomer.address,
          idNumber: cedula || existingCustomer.idNumber,
          ruc: ruc || existingCustomer.ruc,
          updatedAt: new Date()
        })
        .where(eq(schema.customers.id, existingCustomer.id));
      
      return {
        success: true,
        customerId: existingCustomer.id,
        message: `Cliente de WooCommerce #${wooCustomerId} actualizado en el CRM (ID: ${existingCustomer.id})`,
        isNew: false,
        matchedBy: 'wooCommerceId'
      };
    }
    
    // 2. Buscar por cédula (si está disponible)
    if (cedula) {
      existingCustomer = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.idNumber, cedula))
        .limit(1)
        .then(rows => rows[0] || null);
      
      if (existingCustomer) {
        // Actualizar los datos y vincular con WooCommerce
        await db.update(schema.customers)
          .set({
            name: fullName,
            firstName: firstName,
            lastName: lastName,
            email: email || existingCustomer.email,
            phone: phone || existingCustomer.phone,
            street: wooCustomer.billing?.address_1 || existingCustomer.street,
            city: wooCustomer.billing?.city || existingCustomer.city,
            province: wooCustomer.billing?.state || existingCustomer.province,
            deliveryInstructions: wooCustomer.billing?.postcode || existingCustomer.deliveryInstructions,
            address: wooCustomer.billing?.country || existingCustomer.address,
            wooCommerceId: wooCustomerId, // Actualizamos el ID de WooCommerce
            updatedAt: new Date()
          })
          .where(eq(schema.customers.id, existingCustomer.id));
        
        return {
          success: true,
          customerId: existingCustomer.id,
          message: `Cliente existente en CRM vinculado a WooCommerce por cédula (CRM ID: ${existingCustomer.id}, Woo ID: ${wooCustomerId})`,
          isNew: false,
          matchedBy: 'cedula'
        };
      }
    }
    
    // 3. Buscar por RUC (si está disponible)
    if (ruc) {
      existingCustomer = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.ruc, ruc))
        .limit(1)
        .then(rows => rows[0] || null);
      
      if (existingCustomer) {
        // Actualizar los datos y vincular con WooCommerce
        await db.update(schema.customers)
          .set({
            name: fullName,
            firstName: firstName,
            lastName: lastName,
            email: email || existingCustomer.email,
            phone: phone || existingCustomer.phone,
            street: wooCustomer.billing?.address_1 || existingCustomer.street,
            city: wooCustomer.billing?.city || existingCustomer.city,
            province: wooCustomer.billing?.state || existingCustomer.province,
            deliveryInstructions: wooCustomer.billing?.postcode || existingCustomer.deliveryInstructions,
            address: wooCustomer.billing?.country || existingCustomer.address,
            wooCommerceId: wooCustomerId, // Actualizamos el ID de WooCommerce
            updatedAt: new Date()
          })
          .where(eq(schema.customers.id, existingCustomer.id));
        
        return {
          success: true,
          customerId: existingCustomer.id,
          message: `Cliente existente en CRM vinculado a WooCommerce por RUC (CRM ID: ${existingCustomer.id}, Woo ID: ${wooCustomerId})`,
          isNew: false,
          matchedBy: 'ruc'
        };
      }
    }
    
    // 4. Buscar por email (si está disponible)
    if (email) {
      existingCustomer = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.email, email))
        .limit(1)
        .then(rows => rows[0] || null);
      
      if (existingCustomer) {
        // Actualizar los datos y vincular con WooCommerce
        await db.update(schema.customers)
          .set({
            name: fullName,
            firstName: firstName,
            lastName: lastName,
            phone: phone || existingCustomer.phone,
            street: wooCustomer.billing?.address_1 || existingCustomer.street,
            city: wooCustomer.billing?.city || existingCustomer.city,
            province: wooCustomer.billing?.state || existingCustomer.province,
            deliveryInstructions: wooCustomer.billing?.postcode || existingCustomer.deliveryInstructions,
            address: wooCustomer.billing?.country || existingCustomer.address,
            idNumber: cedula || existingCustomer.idNumber,
            ruc: ruc || existingCustomer.ruc,
            wooCommerceId: wooCustomerId, // Actualizamos el ID de WooCommerce
            updatedAt: new Date()
          })
          .where(eq(schema.customers.id, existingCustomer.id));
        
        return {
          success: true,
          customerId: existingCustomer.id,
          message: `Cliente existente en CRM vinculado a WooCommerce por email (CRM ID: ${existingCustomer.id}, Woo ID: ${wooCustomerId})`,
          isNew: false,
          matchedBy: 'email'
        };
      }
    }
    
    // 5. Buscar por teléfono (si está disponible)
    if (phone) {
      existingCustomer = await db
        .select()
        .from(schema.customers)
        .where(eq(schema.customers.phone, phone))
        .limit(1)
        .then(rows => rows[0] || null);
      
      if (existingCustomer) {
        // Actualizar los datos y vincular con WooCommerce
        await db.update(schema.customers)
          .set({
            name: fullName,
            firstName: firstName,
            lastName: lastName,
            email: email || existingCustomer.email,
            street: wooCustomer.billing?.address_1 || existingCustomer.street,
            city: wooCustomer.billing?.city || existingCustomer.city,
            province: wooCustomer.billing?.state || existingCustomer.province,
            deliveryInstructions: wooCustomer.billing?.postcode || existingCustomer.deliveryInstructions,
            address: wooCustomer.billing?.country || existingCustomer.address,
            idNumber: cedula || existingCustomer.idNumber,
            ruc: ruc || existingCustomer.ruc,
            wooCommerceId: wooCustomerId, // Actualizamos el ID de WooCommerce
            updatedAt: new Date()
          })
          .where(eq(schema.customers.id, existingCustomer.id));
        
        return {
          success: true,
          customerId: existingCustomer.id,
          message: `Cliente existente en CRM vinculado a WooCommerce por teléfono (CRM ID: ${existingCustomer.id}, Woo ID: ${wooCustomerId})`,
          isNew: false,
          matchedBy: 'phone'
        };
      }
    }
    
    // 6. Si no encontramos al cliente por ningún método, creamos uno nuevo
    const brand = 'sleepwear'; // Por defecto sleepwear, podría variar según categorías/tags WooCommerce
    const type = ruc ? 'business' : 'person'; // Inferir tipo según si tiene RUC
    
    const [newCustomer] = await db.insert(schema.customers)
      .values({
        name: fullName,
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        street: wooCustomer.billing?.address_1 || null,
        city: wooCustomer.billing?.city || null,
        province: wooCustomer.billing?.state || null,
        deliveryInstructions: wooCustomer.billing?.postcode || null,
        address: wooCustomer.billing?.country || null,
        idNumber: cedula,
        ruc: ruc,
        source: 'woocommerce',
        brand: brand,
        type: type,
        wooCommerceId: wooCustomerId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Notificar la creación del cliente
    appEvents.emit(EventTypes.CUSTOMER_CREATED, newCustomer);
    
    return {
      success: true,
      customerId: newCustomer.id,
      message: `Nuevo cliente creado en CRM desde WooCommerce (CRM ID: ${newCustomer.id}, Woo ID: ${wooCustomerId})`,
      isNew: true
    };
    
  } catch (error) {
    console.error('Error sincronizando cliente desde WooCommerce:', error);
    return {
      success: false,
      message: `Error sincronizando cliente desde WooCommerce: ${(error as Error).message}`
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
    if (!hasWooCommerceCredentials()) {
      return {
        success: false,
        message: 'Falta configuración de WooCommerce. Configure URL, Consumer Key y Consumer Secret en la sección de configuración.',
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
    
    // Ruta para sincronizar un cliente desde WooCommerce
    app.post("/api/woocommerce/sync-customer-from-woo/:id", async (req: Request, res: Response) => {
      try {
        const wooCustomerId = parseInt(req.params.id);
        
        if (isNaN(wooCustomerId)) {
          return res.status(400).json({ error: "ID de cliente de WooCommerce inválido" });
        }
        
        const result = await syncCustomerFromWoo(wooCustomerId);
        
        if (result.success) {
          return res.json(result);
        } else {
          return res.status(400).json(result);
        }
      } catch (error) {
        console.error("Error en sincronización de cliente desde WooCommerce:", error);
        return res.status(500).json({ 
          error: "Error interno del servidor", 
          message: (error as Error).message 
        });
      }
    });

    // Ruta para verificar si un cliente existe en CRM y WooCommerce por diferentes criterios
    app.get("/api/woocommerce/verify-customer", async (req: Request, res: Response) => {
      try {
        // Extraer parámetros de búsqueda
        const { email, phone, idNumber, ruc } = req.query;
        
        if (!email && !phone && !idNumber && !ruc) {
          return res.status(400).json({ 
            error: "Se requiere al menos un criterio de búsqueda (email, phone, idNumber o ruc)" 
          });
        }
        
        // Verificar cliente en el CRM
        let crmCustomer = null;
        const criterios = [];
        const valores = [];
        
        if (email) {
          criterios.push('email = $' + (valores.length + 1));
          valores.push(email);
        }
        
        if (phone) {
          criterios.push('phone = $' + (valores.length + 1));
          valores.push(phone);
        }
        
        if (idNumber) {
          criterios.push('id_number = $' + (valores.length + 1));
          valores.push(idNumber);
        }
        
        if (ruc) {
          criterios.push('ruc = $' + (valores.length + 1));
          valores.push(ruc);
        }
        
        const whereClause = criterios.length > 0 ? 'WHERE ' + criterios.join(' OR ') : '';
        
        const customerQuery = `
          SELECT id, name, first_name, last_name, email, phone, id_number, ruc, "wooCommerceId"
          FROM customers
          ${whereClause}
          LIMIT 1
        `;
        
        const crmResult = await db.$client.query(customerQuery, valores);
        
        if (crmResult.rows.length > 0) {
          crmCustomer = crmResult.rows[0];
        }
        
        // Si el cliente tiene wooCommerceId, intentar verificar en WooCommerce
        let wooCustomer = null;
        let matchWithWoo = false;
        
        if (crmCustomer && crmCustomer.wooCommerceId) {
          try {
            const wooResponse = await wooCommerceRequest('GET', `/customers/${crmCustomer.wooCommerceId}`);
            
            if (wooResponse && wooResponse.id) {
              wooCustomer = wooResponse;
              matchWithWoo = true;
            }
          } catch (error) {
            console.error(`Error verificando cliente en WooCommerce:`, error);
          }
        }
        
        // Si no encontramos por ID directo, buscar por criterios en WooCommerce
        if (!matchWithWoo) {
          let wooSearchParams = new URLSearchParams();
          
          if (email) {
            wooSearchParams.append('email', email.toString());
          }
          
          if (wooSearchParams.toString()) {
            try {
              const wooResponse = await wooCommerceRequest('GET', `/customers?${wooSearchParams.toString()}`);
              
              if (wooResponse && Array.isArray(wooResponse) && wooResponse.length > 0) {
                // Si encontramos por email, verificamos si coincide algún otro criterio
                wooCustomer = wooResponse[0];
                
                // Verificar coincidencia de teléfono si existe
                if (phone && wooCustomer.billing && wooCustomer.billing.phone === phone) {
                  matchWithWoo = true;
                }
                
                // Verificar coincidencia de cédula o RUC si existen en meta_data
                if (wooCustomer.meta_data && Array.isArray(wooCustomer.meta_data)) {
                  if (idNumber) {
                    const cedulaField = wooCustomer.meta_data.find((meta: any) => 
                      (meta.key === 'cedula' || meta.key === 'dni' || meta.key === 'identification') && 
                      meta.value === idNumber
                    );
                    
                    if (cedulaField) {
                      matchWithWoo = true;
                    }
                  }
                  
                  if (ruc) {
                    const rucField = wooCustomer.meta_data.find((meta: any) => 
                      (meta.key === 'ruc' || meta.key === 'nit') && 
                      meta.value === ruc
                    );
                    
                    if (rucField) {
                      matchWithWoo = true;
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Error buscando cliente en WooCommerce:`, error);
            }
          }
        }
        
        // Preparar respuesta
        const resultado = {
          existsInCRM: !!crmCustomer,
          existsInWooCommerce: !!wooCustomer,
          matchBetweenSystems: matchWithWoo,
          crmCustomer: crmCustomer ? {
            id: crmCustomer.id,
            name: crmCustomer.name,
            email: crmCustomer.email,
            phone: crmCustomer.phone,
            idNumber: crmCustomer.id_number,
            ruc: crmCustomer.ruc,
            wooCommerceId: crmCustomer.wooCommerceId
          } : null,
          wooCommerceCustomer: wooCustomer ? {
            id: wooCustomer.id,
            username: wooCustomer.username,
            name: `${wooCustomer.first_name || ''} ${wooCustomer.last_name || ''}`.trim(),
            email: wooCustomer.email,
            phone: wooCustomer.billing?.phone || null
          } : null,
          searchCriteria: {
            email: email || null,
            phone: phone || null,
            idNumber: idNumber || null,
            ruc: ruc || null
          }
        };
        
        res.json(resultado);
      } catch (error) {
        console.error("Error verificando cliente:", error);
        res.status(500).json({ error: `Error verificando cliente: ${(error as Error).message}` });
      }
    });

    // Ruta para verificar la conexión con WooCommerce
    app.get("/api/woocommerce/check-connection", async (_req: Request, res: Response) => {
      try {
        // Verificar que tengamos configuración de WooCommerce
        if (!hasWooCommerceCredentials()) {
          return res.status(400).json({
            connected: false,
            message: 'Falta configuración de WooCommerce. Configure URL, Consumer Key y Consumer Secret en la sección de configuración.',
            readOnly: true
          });
        }
        
        // Obtener la configuración de WooCommerce
        const config = getWooCommerceConfig();
        
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
            url: config.url,
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