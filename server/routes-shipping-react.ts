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

// Función para guardar los datos del formulario
async function saveShippingFormData(formData: z.infer<typeof shippingFormSchema>) {
  console.log(`📝 Guardando datos del formulario de envío: ${JSON.stringify(formData)}`);
  
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
  
  // Creamos una orden pendiente asociada a este cliente
  const orderResult = await pool.query(
    `INSERT INTO orders
     (customer_id, status, created_at, updated_at, order_number, form_data)
     VALUES ($1, 'pending', NOW(), NOW(), $2, $3)
     RETURNING id`,
    [
      customerId,
      generateOrderNumber(),
      {
        formType: "shipping",
        firstName: formData.firstName,
        lastName: formData.lastName,
        document: formData.document,
        email: formData.email,
        phone: formData.phoneNumber,
        address: formData.address,
        city: formData.city,
        province: formData.province,
        instructions: formData.instructions
      }
    ]
  );
  
  const orderId = orderResult.rows[0].id;
  console.log(`✅ Orden pendiente creada con ID: ${orderId}`);
  
  return {
    success: true,
    customerId,
    orderId
  };
}

// Función para generar un número de orden único
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  
  return `SHF-${year}${month}${day}-${random}`;
}

// Función principal para registrar las rutas
export function registerReactShippingRoutes(app: Express): void {
  // Endpoint para guardar el formulario de envío
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
      
      // Guardamos los datos del formulario
      const saveResult = await saveShippingFormData(result.data);
      
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
  
  console.log("✅ Rutas del formulario React registradas: /api/guardar-formulario-envio");
}
