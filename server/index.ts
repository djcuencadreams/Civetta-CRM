// server/index.ts
import express from "express";
import { setupVite, log } from "./vite";
import { createServer } from "http";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { registerRoutes } from "./routes";
import { registerOrderRoutes } from "./routes-orders-new";
import { registerConfigurationRoutes } from "./routes-configuration";
import { registerEmailRoutes } from "./routes-email";
import { registerAdditionalRoutes } from "./routes-extension";
import { registerReactShippingRoutes } from "./routes-shipping-react";
import { serviceRegistry } from "./services";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const clientDistPath = path.join(__dirname, "../client/dist");

const app = express();
const server = createServer(app);

app.use(bodyParser.json());

// Registrar rutas React del formulario de envío con prioridad
registerReactShippingRoutes(app);

// Configurar Vite para desarrollo
await setupVite(app, server);

// Registrar todas las rutas API
registerRoutes(app);
registerOrderRoutes(app);
registerConfigurationRoutes(app);
registerEmailRoutes(app);
registerAdditionalRoutes(app);

// Servir archivos estáticos del cliente
app.use(express.static(clientDistPath));

// Middleware para manejar rutas específicas sin interferir con React
app.use((req, res, next) => {
  const requestPath = req.path;
  
  // Redireccionar rutas legacy del formulario de envío
  if (requestPath === '/embed/shipping-form' || requestPath === '/formulario-envio') {
    return res.redirect(301, '/shipping');
  }
  
  // Permitir que React maneje las rutas principales
  if (requestPath === '/' || requestPath === '/dashboard' || requestPath.startsWith('/client')) {
    next();
    return;
  }
  
  next();
});

// Inicializar servicios
try {
  await serviceRegistry.initializeAll();
  log("✅ Todos los servicios inicializados correctamente");
} catch (error) {
  log(`❌ Error inicializando servicios: ${error}`);
}

// Configurar puerto
const PORT = process.env.PORT || 3002;

server.listen(PORT, "0.0.0.0", () => {
  log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  log(`📱 CRM CIVETTA listo para usar`);
});