// server/index.ts
import express from "express";
import { setupVite, log } from "./vite";
import { createServer } from "http";
import bodyParser from "body-parser";
import path from "path";
// Importamos lo necesario para obtener la ruta del directorio actual en módulos ES
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerRoutes } from "./routes";
import { registerOrderRoutes } from "./routes-orders-new";
import { registerConfigurationRoutes } from "./routes-configuration";
import { registerEmailRoutes } from "./routes-email";
import { registerAdditionalRoutes } from "./routes-extension";
// Importamos endpoints de verificación de clientes para envíos
import { registerCustomerCheckEndpoint } from "./routes-shipping-check-customer";
// Importamos la versión oficial de las rutas del formulario React
import { registerReactShippingRoutes } from "./routes-shipping-react";
// Importamos el registro de servicios
import { serviceRegistry } from "./services";

// Creamos la ruta al directorio client/dist usando import.meta.url para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDistPath = path.join(__dirname, "../client/dist");

const app = express();
const server = createServer(app);

app.use(bodyParser.json());

// ⚠️⚠️⚠️ PRIMERO: REGISTRAR LAS RUTAS REACT PARA ASEGURAR PRIORIDAD ABSOLUTA ⚠️⚠️⚠️
console.log("🔥🔥🔥 REGISTRANDO RUTAS REACT CON PRIORIDAD ABSOLUTA 🔥🔥🔥");

app.use(express.static(clientDistPath)); // Sirve los assets

// ⚠️⚠️⚠️ INTERCEPCIÓN NUCLEAR: APLICAR MISMO ENFOQUE DEL PUERTO 3003 AL SERVIDOR PRINCIPAL
// Implementar el mismo middleware radical aquí para asegurar consistencia en TODOS los puertos

// INTERCEPTAR TODAS LAS RUTAS NO-API (máxima prioridad)
app.use((req, res, next) => {
  const requestPath = req.path.toLowerCase();
  
  // Permitir API
  if (requestPath.startsWith('/api/')) {
    return next();
  }
  
  // DETECTAR cualquier ruta relacionada con envíos, etiquetas, formularios o embed
  if (
    requestPath.includes('shipping') || 
    requestPath.includes('embed') || 
    requestPath.includes('etiqueta') || 
    requestPath.includes('wordpress') || 
    requestPath.includes('forms')
  ) {
    console.log(`💥💥💥 [INTERCEPCIÓN 3002] ${req.method} ${requestPath} ➡️ FORZANDO REACT`);
    
    // Eliminar cachés y forzar tipo
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'X-Mode': 'REACT-ONLY-ENFORCED-3002',
      'Content-Type': 'text/html; charset=UTF-8'
    });
    
    return res.sendFile(path.join(clientDistPath, "index.html"), {
      headers: {
        'X-React-Enforced': 'true',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  }
  
  // Para el resto de rutas, continuar normalmente
  return next();
});

// ⚠️ Endpoint "/" para health check de Replit sin romper frontend
app.get("/", (_req, res, next) => {
  if (_req.headers["user-agent"]?.includes("ELB-HealthChecker")) {
    return res.status(200).send("OK");
  }
  return next(); // Pasa al frontend
});

// Creamos funciones para manejar directamente rutas críticas de API
// Esta solución asegura que estas rutas no sean interceptadas por el middleware de Vite

// Ruta directa para clientes
app.get("/api/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log(`🔍 [API] Solicitud directa para cliente ID: ${id}`);
    res.setHeader('Content-Type', 'application/json');
    
    // Intentamos obtener el cliente de la base de datos usando SQL directo
    const { pool } = await import("@db");
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    
    const customer = result.rows[0];
    res.json(customer);
  } catch (error) {
    console.error('Error obteniendo cliente:', error);
    res.status(500).json({ error: "Error al obtener datos del cliente" });
  }
});

// Ruta directa para etapas del pipeline de oportunidades
app.get("/api/opportunities/pipeline-stages/:brand", async (req, res) => {
  try {
    const { brand } = req.params;
    console.log(`🔍 [API] Solicitud directa para etapas del pipeline de marca: ${brand}`);
    res.setHeader('Content-Type', 'application/json');
    
    // Definimos las etapas según la marca
    let stages;
    if (brand === 'bride') {
      stages = [
        "Consulta Inicial",
        "Propuesta Enviada",
        "Prueba de Vestido",
        "Ajustes",
        "Confección",
        "Entrega Programada",
        "Cerrado Ganado",
        "Cerrado Perdido"
      ];
    } else {
      // Default para Sleepwear u otras marcas
      stages = [
        "Prospecto",
        "Primer Contacto",
        "Propuesta Enviada",
        "Negociación",
        "Pedido Confirmado",
        "Cerrado Ganado",
        "Cerrado Perdido"
      ];
    }
    
    res.json(stages);
  } catch (error) {
    console.error('Error obteniendo etapas del pipeline:', error);
    res.status(500).json({ error: "Error al obtener etapas del pipeline" });
  }
});

// Ruta directa para obtener oportunidades (implementación básica)
app.get("/api/opportunities", async (req, res) => {
  try {
    console.log(`🔍 [API] Solicitud directa para listar oportunidades`);
    res.setHeader('Content-Type', 'application/json');
    
    // Obtenemos oportunidades de la base de datos
    const { pool } = await import("@db");
    const result = await pool.query(`
      SELECT o.*, 
             c.name as customer_name,
             l.name as lead_name
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN leads l ON o.lead_id = l.id
      ORDER BY o.created_at DESC
    `);
    
    // Formateamos la respuesta
    const opportunities = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      stage: row.stage,
      amount: row.amount,
      brand: row.brand,
      customerId: row.customer_id,
      leadId: row.lead_id,
      assignedUserId: row.assigned_user_id,
      priority: row.priority,
      expectedCloseDate: row.expected_close_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      customer: row.customer_name ? { id: row.customer_id, name: row.customer_name } : null,
      lead: row.lead_name ? { id: row.lead_id, name: row.lead_name } : null
    }));
    
    res.json(opportunities);
  } catch (error) {
    console.error('Error obteniendo oportunidades:', error);
    res.status(500).json({ error: "Error al obtener oportunidades" });
  }
});

// Ruta directa para listar interacciones
app.get("/api/interactions", async (req, res) => {
  try {
    console.log(`🔍 [API] Solicitud directa para listar interacciones`);
    res.setHeader('Content-Type', 'application/json');
    
    // Obtenemos interacciones de la base de datos
    const { pool } = await import("@db");
    const result = await pool.query(`
      SELECT i.*, 
             c.name as customer_name, 
             l.name as lead_name 
      FROM interactions i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN leads l ON i.lead_id = l.id
      ORDER BY i.created_at DESC
      LIMIT 50
    `);
    
    // Formateamos la respuesta
    const interactions = result.rows.map(row => ({
      id: row.id,
      customerId: row.customer_id,
      leadId: row.lead_id,
      opportunityId: row.opportunity_id,
      type: row.type,
      channel: row.channel,
      content: row.content,
      attachments: row.attachments || [],
      assignedUserId: row.assigned_user_id,
      createdAt: row.created_at,
      isResolved: row.is_resolved,
      resolutionNotes: row.resolution_notes,
      customer: row.customer_name ? { name: row.customer_name } : null,
      lead: row.lead_name ? { name: row.lead_name } : null
    }));
    
    res.json(interactions);
  } catch (error) {
    console.error('Error obteniendo interacciones:', error);
    res.status(500).json({ error: "Error al obtener interacciones" });
  }
});

// Ruta directa para oportunidades con nombre de endpoint alternativo (para debugging)
app.get("/api/debug/opportunities", async (req, res) => {
  try {
    console.log(`🔧 [API] Solicitud al endpoint de depuración de oportunidades`);
    res.setHeader('Content-Type', 'application/json');
    
    // Obtenemos oportunidades de la base de datos
    const { pool } = await import("@db");
    const result = await pool.query(`
      SELECT o.*, 
             c.name as customer_name,
             l.name as lead_name
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN leads l ON o.lead_id = l.id
      ORDER BY o.created_at DESC
    `);
    
    console.log(`✅ Consulta completada en endpoint de depuración, devolviendo ${result.rows.length} oportunidades`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error en endpoint de depuración de oportunidades:', error);
    res.status(500).json({ error: "Error al obtener oportunidades", details: String(error) });
  }
});

// IMPORTANTE: Inicializamos los servicios
console.log("Inicializando servicios...");
serviceRegistry.initializeAll().then(() => {
  console.log("Servicios inicializados correctamente");
  console.log("Registrando rutas de servicios...");
  serviceRegistry.registerAllRoutes(app);
}).catch(error => {
  console.error("Error inicializando servicios:", error);
});

// Registrar las rutas básicas de la API para diagnóstico
console.log("Registrando rutas básicas para diagnóstico...");
registerRoutes(app);

// Registrar rutas adicionales
console.log("Registrando rutas de pedidos...");
registerOrderRoutes(app);
console.log("Registrando rutas de configuración...");
registerConfigurationRoutes(app);
console.log("Registrando rutas de email...");
registerEmailRoutes(app);
console.log("Registrando rutas adicionales...");
registerAdditionalRoutes(app);
console.log("Registrando endpoints para verificación de clientes...");
registerCustomerCheckEndpoint(app);
console.log("Registrando rutas del formulario React...");
registerReactShippingRoutes(app);

// NOTA: Las rutas para el formulario de envío React ya fueron registradas al inicio
// directamente en este archivo para garantizar prioridad absoluta
console.log("✅ Rutas para el formulario React ya registradas al inicio del servidor");

// 🔥 Servir frontend React/Vite (IMPORTANTE: debe ir después de registrar rutas API)
setupVite(app);

// ✅ Escuchar en puerto asignado por Replit (o 3002 por defecto para evitar conflicto)
const PORT = parseInt(process.env.PORT || "3002", 10);

// Configurar puerto principal
server.listen(PORT, "0.0.0.0", () => {
  log(`🚀 Servidor escuchando en puerto ${PORT}`);
  
  // También escuchar en puerto 3003 para compatibilidad con URL existente
  try {
    // Crear una instancia secundaria con configuración específica para servir SOLO React
    const secondaryApp = express();
    
    // ⚠️⚠️⚠️ INTERCEPCIÓN NUCLEAR V2: SOLUCIÓN ULTRA AGRESIVA
    // Este middleware intercepta TODO y tiene prioridad ABSOLUTA
    secondaryApp.use((req, res, next) => {
      const requestPath = req.path.toLowerCase();
      
      // SOLO dejar pasar solicitudes API
      if (requestPath.startsWith('/api/')) {
        console.log(`⚙️ [API-3003] Procesando API: ${requestPath}`);
        return next();
      }
      
      // 💥💥💥 OVERRRIDE TOTAL - MODO ULTRA NUCLEAR
      console.log(`🔥🔥🔥 [MODO ULTRA NUCLEAR] ${req.method} ${requestPath} ➡️ ENVIANDO REDIRECCIÓN FORZADA`);
      
      // Eliminar TODAS las cachés posibles
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
        'X-Mode': 'REACT-ONLY-ENFORCED-REDIRECT',
        'Content-Type': 'text/html; charset=UTF-8'
      });
      
      // TÁCTICA ALTERNATIVA: Enviar HTML de redirección agresiva
      // Este HTML tiene múltiples técnicas de redirección por si alguna falla
      return res.sendFile(path.join(__dirname, "../public/shipping-redirect.html"), {
        headers: {
          'X-React-Enforced': 'true',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    });
    
    // Configurar bodyParser después del middleware de intercepción
    secondaryApp.use(bodyParser.json());
    
    // Configurar rutas de API necesarias para el formulario
    registerReactShippingRoutes(secondaryApp);
    
    const secondaryServer = createServer(secondaryApp);
    const SECONDARY_PORT = 3003;
    secondaryServer.listen(SECONDARY_PORT, "0.0.0.0", () => {
      log(`🚀 Servidor secundario escuchando en puerto ${SECONDARY_PORT} (🛡️ INTERCEPCIÓN TOTAL - SOLO REACT)`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor secundario en puerto 3003:", error);
  }
});