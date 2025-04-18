// server/index.ts
import express from "express";
import { setupVite, log } from "./vite";
import { createServer } from "http";
import bodyParser from "body-parser";
import { registerRoutes } from "./routes";
import { registerOrderRoutes } from "./routes-orders-new";
import { registerConfigurationRoutes } from "./routes-configuration";
import { registerEmailRoutes } from "./routes-email";
import { registerAdditionalRoutes } from "./routes-extension";
// Importamos el registro de servicios
import { serviceRegistry } from "./services";

const app = express();
const server = createServer(app);

app.use(bodyParser.json());

// ⚠️ Endpoint "/" para health check de Replit sin romper frontend
app.get("/", (_req, res, next) => {
  if (_req.headers["user-agent"]?.includes("ELB-HealthChecker")) {
    return res.status(200).send("OK");
  }
  return next(); // Pasa al frontend
});

// Creamos una función que maneja directamente la ruta para los clientes
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

// 🔥 Servir frontend React/Vite (IMPORTANTE: debe ir después de registrar rutas API)
setupVite(app);

// ✅ Escuchar en puerto asignado por Replit (o 3001 por defecto para evitar conflicto)
const PORT = parseInt(process.env.PORT || "3001", 10);
server.listen(PORT, "0.0.0.0", () => {
  log(`🚀 Servidor escuchando en puerto ${PORT}`);
});