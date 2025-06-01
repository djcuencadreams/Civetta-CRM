/**
 * Implementación de rutas para el formulario de envío React mejorado.
 * Este archivo reemplaza routes-shipping-check-customer.ts con una versión más limpia
 * y mejor integrada con el formulario React.
 */

import { Request, Response, Express } from "express";
import { z } from "zod";

// Esquema para validar los datos del formulario de envío
const shippingFormSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  phoneNumber: z.string().min(8, "El teléfono debe tener al menos 8 caracteres"),
  email: z.string().email("Ingrese un email válido"),
  document: z.string().min(5, "El documento debe tener al menos 5 caracteres"),
  address: z.string().min(3, "La dirección debe tener al menos 3 caracteres"),
  city: z.string().min(2, "La ciudad debe tener al menos 2 caracteres"),
  province: z.string().min(3, "La provincia debe tener al menos 3 caracteres"),
  instructions: z.string().optional(),
});

// Esquema para validar los datos de búsqueda de cliente
const customerSearchSchema = z.object({
  identifier: z.string().min(3, "El identificador debe tener al menos 3 caracteres"),
  type: z.enum(["identification", "email", "phone"]),
});

// Esquema para validar datos para verificar duplicados
const checkDuplicateSchema = z.object({
  document: z.string().min(5, "El documento debe tener al menos 5 caracteres"),
  email: z.string().email("Ingrese un email válido"),
  phone: z.string().min(8, "El teléfono debe tener al menos 8 caracteres"),
});

// Esquema para validar datos para guardar borrador
const draftFormSchema = z.object({
  formData: shippingFormSchema.partial(),
  orderId: z.number().optional(),
  step: z.number().min(1).max(4),
});

// Función para verificar si un cliente existe
async function checkIfCustomerExists(identifier: string, type: "identification" | "email" | "phone") {
  console.log(`🔍 Verificando cliente: ${identifier} tipo: ${type}`);
  
  // Importamos el cliente de la base de datos
  const { pool } = await import("@db");
  
  // Construimos la consulta según el tipo de identificación
  let query = "SELECT * FROM customers WHERE ";
  if (type === "identification") {
    query += "id_number = $1";
  } else if (type === "email") {
    query += "email = $1";
  } else if (type === "phone") {
    query += "phone_number = $1 OR phone = $1 OR secondary_phone = $1";
  }
  
  // Ejecutamos la consulta
  const result = await pool.query(query, [identifier]);
  
  // Devolvemos el cliente si existe
  if (result.rows.length > 0) {
    const customer = result.rows[0];
    console.log(`✅ Cliente encontrado: ${customer.id} ${customer.name}`);
    
    // Verificamos si hay datos de dirección
    const addressData = {
      street: customer.street || null,
      city: customer.city || null,
      province: customer.province || null,
      deliveryInstructions: customer.delivery_instructions || null
    };
    console.log(`📋 Datos de dirección: ${JSON.stringify(addressData)}`);
    
    // Indicamos si hay una dirección completa
    const hasAddress = Boolean(addressData.street && addressData.city && addressData.province);
    console.log(`🚚 Respuesta con dirección: ${hasAddress ? "✓" : "✗"} ${addressData.street ? "✓" : "✗"} ${addressData.city ? "✓" : "✗"}`);
    
    return {
      found: true,
      customer: {
        id: customer.id,
        name: customer.name,
        firstName: customer.first_name || "",
        lastName: customer.last_name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        phoneNumber: customer.phone_number || "",
        idNumber: customer.id_number || "",
      },
      address: {
        street: addressData.street,
        city: addressData.city,
        province: addressData.province,
        instructions: addressData.deliveryInstructions,
      },
      hasAddress
    };
  }
  
  // Si no existe, indicamos que no se encontró
  return { found: false };
}

// Función para verificar si hay clientes duplicados
async function checkDuplicateCustomers(document: string, email: string, phone: string) {
  console.log(`🔍 Verificando duplicados - Documento: ${document}, Email: ${email}, Teléfono: ${phone}`);
  
  // Importamos el cliente de la base de datos
  const { pool } = await import("@db");
  
  // Verificar duplicado por documento
  const documentResult = await pool.query(
    "SELECT id, name FROM customers WHERE id_number = $1 LIMIT 1",
    [document]
  );
  
  // Verificar duplicado por email
  const emailResult = await pool.query(
    "SELECT id, name FROM customers WHERE email = $1 LIMIT 1",
    [email]
  );
  
  // Verificar duplicado por teléfono
  const phoneResult = await pool.query(
    "SELECT id, name FROM customers WHERE phone = $1 OR phone_number = $1 OR secondary_phone = $1 LIMIT 1",
    [phone.replace(/^\+/, "")] // Quitar el + inicial para búsqueda en todos los campos de teléfono
  );
  
  // Construimos el resultado
  const duplicates: Record<string, { id: number; name: string }> = {};
  
  if (documentResult.rows.length > 0) {
    duplicates.document = {
      id: documentResult.rows[0].id,
      name: documentResult.rows[0].name
    };
  }
  
  if (emailResult.rows.length > 0) {
    duplicates.email = {
      id: emailResult.rows[0].id,
      name: emailResult.rows[0].name
    };
  }
  
  if (phoneResult.rows.length > 0) {
    duplicates.phone = {
      id: phoneResult.rows[0].id,
      name: phoneResult.rows[0].name
    };
  }
  
  const hasDuplicates = Object.keys(duplicates).length > 0;
  console.log(`✅ Verificación de duplicados completada: ${hasDuplicates ? "Duplicados encontrados" : "No hay duplicados"}`);
  
  return {
    hasDuplicates,
    duplicates
  };
}

// Función para guardar formulario como borrador
async function saveFormAsDraft(
  formData: Partial<z.infer<typeof shippingFormSchema>>,
  orderId: number | null,
  step: number
) {
  console.log(`📝 Guardando borrador (paso ${step}) ${orderId ? `para orden #${orderId}` : "nueva orden"}`);
  
  // Importamos el cliente de la base de datos
  const { pool } = await import("@db");
  
  // Si no hay un ID de orden existente, creamos uno nuevo
  if (!orderId) {
    // Verificamos si hay un cliente con este documento si está presente
    let customerId: number | null = null;
    
    if (formData.document) {
      const customerResult = await pool.query(
        "SELECT id FROM customers WHERE id_number = $1 LIMIT 1",
        [formData.document]
      );
      
      if (customerResult.rows.length > 0) {
        customerId = customerResult.rows[0].id;
      }
    }
    
    // Creamos una orden borrador
    const orderResult = await pool.query(
      `INSERT INTO orders
       (customer_id, status, created_at, updated_at, order_number, notes, is_from_web_form)
       VALUES ($1, 'draft', NOW(), NOW(), $2, $3, $4)
       RETURNING id`,
      [
        customerId, // Puede ser null si no hay cliente
        generateOrderNumber("DFT"),
        JSON.stringify({ formType: "shipping_draft", step, ...formData }), // Guardar datos parciales en notes
        true
      ]
    );
    
    orderId = orderResult.rows[0].id;
    console.log(`✅ Nuevo borrador creado con ID: ${orderId}`);
  } else {
    // Actualizamos la orden existente
    await pool.query(
      `UPDATE orders
       SET notes = $1, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify({ formType: "shipping_draft", step, ...formData }), orderId]
    );
    
    console.log(`✅ Borrador actualizado para orden ID: ${orderId}`);
  }
  
  return {
    orderId
  };
}

// Función para guardar los datos finales del formulario
async function saveFinalShippingForm(formData: z.infer<typeof shippingFormSchema>, draftOrderId: number | null) {
  console.log(`📝 Guardando formulario final${draftOrderId ? ` (convertido desde borrador #${draftOrderId})` : ""}`);
  
  // Importamos el cliente de la base de datos
  const { pool } = await import("@db");
  
  // Verificamos si ya existe un cliente con este documento
  const existingCustomerResult = await pool.query(
    "SELECT * FROM customers WHERE id_number = $1",
    [formData.document]
  );
  
  let customerId: number;
  
  if (existingCustomerResult.rows.length > 0) {
    // Actualizamos el cliente existente
    const customer = existingCustomerResult.rows[0];
    customerId = customer.id;
    console.log(`✅ Actualizando cliente existente: ${customerId} (${formData.firstName} ${formData.lastName})`);
    
    // Actualizamos los datos del cliente
    await pool.query(
      `UPDATE customers 
       SET name = $1, first_name = $2, last_name = $3, email = $4, phone = $5, 
           phone_number = $6, street = $7, city = $8, province = $9, delivery_instructions = $10,
           updated_at = NOW()
       WHERE id = $11`,
      [
        `${formData.firstName} ${formData.lastName}`,
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.phoneNumber,
        formData.phoneNumber.replace(/^\+/, ""), // Quitar el + inicial para phone_number
        formData.address,
        formData.city,
        formData.province,
        formData.instructions || null,
        customerId
      ]
    );
    
    console.log(`✅ Cliente actualizado correctamente`);
  } else {
    // Creamos un nuevo cliente
    console.log(`✅ Creando nuevo cliente: ${formData.firstName} ${formData.lastName}`);
    
    // Insertamos el nuevo cliente
    const newCustomerResult = await pool.query(
      `INSERT INTO customers 
       (name, first_name, last_name, email, phone, phone_number, id_number, street, city, province, delivery_instructions, 
        source, created_at, updated_at, type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW(), 'person', 'active')
       RETURNING id`,
      [
        `${formData.firstName} ${formData.lastName}`,
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.phoneNumber,
        formData.phoneNumber.replace(/^\+/, ""), // Quitar el + inicial para phone_number
        formData.document,
        formData.address,
        formData.city,
        formData.province,
        formData.instructions || null,
        "shipping_form" // Fuente
      ]
    );
    
    customerId = newCustomerResult.rows[0].id;
    console.log(`✅ Nuevo cliente creado con ID: ${customerId}`);
  }
  
  let orderId: number;
  
  // Si tenemos un borrador, actualizamos esa orden
  if (draftOrderId) {
    await pool.query(
      `UPDATE orders
       SET customer_id = $1, status = 'pending', notes = $2, updated_at = NOW()
       WHERE id = $3`,
      [
        customerId,
        JSON.stringify({
          formType: "shipping",
          ...formData
        }),
        draftOrderId
      ]
    );
    
    orderId = draftOrderId;
    console.log(`✅ Borrador convertido a orden pendiente, ID: ${orderId}`);
  } else {
    // Creamos una nueva orden pendiente asociada a este cliente
    const orderResult = await pool.query(
      `INSERT INTO orders
       (customer_id, status, created_at, updated_at, order_number, notes, is_from_web_form, total_amount, subtotal, tax, discount, shipping_cost, source)
       VALUES ($1, 'pending', NOW(), NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        customerId,
        generateOrderNumber("SHF"),
        JSON.stringify({
          formType: "shipping",
          ...formData
        }),
        true,
        0.00, // total_amount
        0.00, // subtotal
        0.00, // tax
        0.00, // discount
        0.00, // shipping_cost
        "shipping_form" // source
      ]
    );
    
    orderId = orderResult.rows[0].id;
    console.log(`✅ Orden pendiente creada con ID: ${orderId}`);
  }
  
  return {
    success: true,
    customerId,
    orderId
  };
}

// Función para obtener listado de órdenes
async function getOrdersList(limit: number = 50) {
  console.log(`📋 Obteniendo lista de órdenes (limit: ${limit})`);
  
  // Importamos el cliente de la base de datos
  const { pool } = await import("@db");
  
  // Obtenemos las órdenes incluyendo datos del cliente
  const result = await pool.query(
    `SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     ORDER BY o.created_at DESC
     LIMIT $1`,
    [limit]
  );
  
  // Formateamos los resultados
  const orders = result.rows.map(row => ({
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customer: row.customer_id ? {
      id: row.customer_id,
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone
    } : null,
    formData: row.notes ? (() => {
      try {
        return JSON.parse(row.notes);
      } catch {
        return { notes: row.notes };
      }
    })() : null,
    isFromWebForm: row.is_from_web_form
  }));
  
  console.log(`✅ Obtenidas ${orders.length} órdenes`);
  
  return orders;
}

// Función para generar un número de orden único
function generateOrderNumber(prefix: string = "SHF"): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  
  return `${prefix}-${year}${month}${day}-${random}`;
}

// Función principal para registrar las rutas
export function registerReactShippingRoutes(app: Express): void {
  // Endpoint para verificar si un cliente existe (usado por el hook useShippingForm)
  app.post("/api/shipping/check-customer-v2", async (req: Request, res: Response) => {
    try {
      console.log("🔍 Verificando cliente existente:", JSON.stringify(req.body, null, 2));
      
      // Validamos los datos de búsqueda
      const { searchType, searchIdentifier } = req.body;
      
      if (!searchType || !searchIdentifier) {
        return res.status(400).json({
          success: false,
          error: "searchType y searchIdentifier son requeridos"
        });
      }
      
      // Buscamos el cliente
      const result = await checkIfCustomerExists(searchIdentifier, searchType);
      
      console.log("✅ Resultado de búsqueda:", JSON.stringify(result, null, 2));
      
      // Devolvemos el resultado en el formato esperado por el frontend
      if (result.found && result.customer) {
        return res.json({
          found: true,
          customer: {
            ...result.customer,
            document: result.customer.idNumber, // Mapear idNumber a document para compatibilidad
            address: result.address?.street || "",
            city: result.address?.city || "",
            province: result.address?.province || "",
            deliveryInstructions: result.address?.instructions || ""
          }
        });
      } else {
        return res.json({
          found: false,
          customer: null
        });
      }
    } catch (error) {
      console.error("❌ Error al verificar cliente:", error);
      return res.status(500).json({
        success: false,
        error: "Error al verificar cliente",
        details: String(error)
      });
    }
  });

  // Endpoint para verificar duplicados
  app.post("/api/shipping/check-duplicate", async (req: Request, res: Response) => {
    try {
      // Validamos los datos
      const result = checkDuplicateSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: "Datos inválidos",
          details: result.error.format()
        });
      }
      
      // Verificamos duplicados
      const { document, email, phone } = result.data;
      const checkResult = await checkDuplicateCustomers(document, email, phone);
      
      // Respondemos con el resultado
      return res.json({
        success: true,
        hasDuplicates: checkResult.hasDuplicates,
        duplicates: checkResult.duplicates
      });
    } catch (error) {
      console.error("❌ Error al verificar duplicados:", error);
      return res.status(500).json({
        success: false,
        error: "Error al verificar duplicados",
        details: String(error)
      });
    }
  });
  
  // Endpoint para guardar borrador
  app.post("/api/shipping/draft", async (req: Request, res: Response) => {
    try {
      // Validamos los datos
      const result = draftFormSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: "Datos inválidos",
          details: result.error.format()
        });
      }
      
      // Guardamos el borrador
      const { formData, orderId, step } = result.data;
      const saveResult = await saveFormAsDraft(formData, orderId || null, step);
      
      // Respondemos con el resultado
      return res.json({
        success: true,
        message: "Borrador guardado correctamente",
        orderId: saveResult.orderId
      });
    } catch (error) {
      console.error("❌ Error al guardar borrador:", error);
      return res.status(500).json({
        success: false,
        error: "Error al guardar borrador",
        details: String(error)
      });
    }
  });
  
  // Endpoint para guardar formulario final
  app.post("/api/shipping/final", async (req: Request, res: Response) => {
    try {
      console.log("📝 Datos recibidos en /api/shipping/final:", JSON.stringify(req.body, null, 2));
      
      // Validamos los datos del formulario
      const formDataResult = shippingFormSchema.safeParse(req.body.formData || req.body);
      
      if (!formDataResult.success) {
        console.error("❌ Error de validación:", formDataResult.error.format());
        return res.status(400).json({
          success: false,
          error: "Datos inválidos",
          details: formDataResult.error.format()
        });
      }
      
      console.log("✅ Datos validados correctamente:", JSON.stringify(formDataResult.data, null, 2));
      
      // Extraemos el ID de orden borrador si existe
      const draftOrderId = req.body.orderId || null;
      
      // Guardamos los datos finales
      const saveResult = await saveFinalShippingForm(formDataResult.data, draftOrderId);
      
      // Respondemos con éxito
      return res.json({
        success: true,
        message: "Formulario guardado correctamente",
        data: saveResult
      });
    } catch (error) {
      console.error("❌ Error al guardar datos del formulario:", error);
      return res.status(500).json({
        success: false,
        error: "Error al guardar los datos del formulario",
        details: String(error)
      });
    }
  });
  
  // Endpoint para obtener lista de órdenes
  app.get("/api/shipping/list", async (_req: Request, res: Response) => {
    try {
      const orders = await getOrdersList();
      
      return res.json({
        success: true,
        orders
      });
    } catch (error) {
      console.error("❌ Error al obtener lista de órdenes:", error);
      return res.status(500).json({
        success: false,
        error: "Error al obtener lista de órdenes",
        details: String(error)
      });
    }
  });
  
  // Mantenemos compatibilidad con el endpoint anterior
  app.post("/api/guardar-formulario-envio", async (req: Request, res: Response) => {
    try {
      // Validamos los datos del formulario
      const result = shippingFormSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: "Datos inválidos",
          details: result.error.format()
        });
      }
      
      // Guardamos los datos finales
      const saveResult = await saveFinalShippingForm(result.data, null);
      
      // Respondemos con éxito
      return res.json({
        success: true,
        message: "Formulario guardado correctamente",
        data: saveResult
      });
    } catch (error) {
      console.error("❌ Error al guardar datos del formulario:", error);
      return res.status(500).json({
        success: false,
        error: "Error al guardar los datos del formulario",
        details: String(error)
      });
    }
  });
  
  // Endpoint para verificar existencia de cliente
  app.post("/api/shipping/check-customer-v2", async (req: Request, res: Response) => {
    try {
      // Validamos los datos de búsqueda
      const result = customerSearchSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: "Datos inválidos",
          details: result.error.format()
        });
      }
      
      // Verificamos si el cliente existe
      const { identifier, type } = result.data;
      const checkResult = await checkIfCustomerExists(identifier, type);
      
      // Respondemos con el resultado
      return res.json({
        success: true,
        ...checkResult
      });
    } catch (error) {
      console.error("❌ Error al verificar cliente:", error);
      return res.status(500).json({
        success: false,
        error: "Error al verificar cliente",
        details: String(error)
      });
    }
  });
  
  // Endpoint para verificar existencia de cliente (versión GET)
  app.get("/api/shipping/check-customer-v2", async (req: Request, res: Response) => {
    try {
      const { identifier, type } = req.query;
      
      // Validamos los parámetros
      if (!identifier || !type || typeof identifier !== "string" || 
          !["identification", "email", "phone"].includes(type as string)) {
        return res.status(400).json({
          success: false,
          error: "Parámetros inválidos"
        });
      }
      
      // Verificamos si el cliente existe
      const checkResult = await checkIfCustomerExists(
        identifier,
        type as "identification" | "email" | "phone"
      );
      
      // Respondemos con el resultado
      return res.json({
        success: true,
        ...checkResult
      });
    } catch (error) {
      console.error("❌ Error al verificar cliente (GET):", error);
      return res.status(500).json({
        success: false,
        error: "Error al verificar cliente",
        details: String(error)
      });
    }
  });
  
  console.log("✅ Rutas del formulario React registradas: /api/shipping/check-duplicate, /api/shipping/draft, /api/shipping/final, /api/shipping/list");
}
