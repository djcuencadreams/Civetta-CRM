import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerAdditionalRoutes } from "./routes-extension";
import { registerEmailRoutes } from "./routes-email";
import { registerConfigurationRoutes } from "./routes-configuration";
import { registerShippingRoutes } from "./routes-shipping-fixed";
import { registerNewShippingRoutes } from "./routes-shipping-new"; // Nuevo sistema de etiquetas
import { registerImprovedShippingRoutes } from "./routes-shipping-improved"; // Sistema mejorado con creación automática de clientes
import { setupVite, serveStatic, log } from "./vite";
import { scheduleBackups } from "../db/backup";
import { createServer } from "http";
import { serviceRegistry, eventListenerService } from "./services";
import { pino } from 'pino';
import { registerEmailEventHandlers } from "./lib/email.service";
import { ensureShippingLabelTemplateDirectories } from "./lib/shipping-label.service";
import cors from 'cors';

const logger = pino({ level: 'info' });
const app = express();

// Habilitar CORS para todas las rutas
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize automated database backups (every 24 hours)
  try {
    await scheduleBackups();
    log("Automated database backups scheduled successfully");
  } catch (error) {
    log("Failed to schedule database backups: " + (error as Error).message);
    // Continue with server startup even if backup scheduling fails
  }

  // Create HTTP server
  const server = createServer(app);

  // Initialize all services
  try {
    await serviceRegistry.initializeAll();
    log("All services initialized successfully");
  } catch (error) {
    log("Failed to initialize services: " + (error as Error).message);
  }

  // Register routes from service registry
  serviceRegistry.registerAllRoutes(app);
  log("Service routes registered successfully");

  // Legacy routes (for backward compatibility)
  registerAdditionalRoutes(app);
  
  // Register email routes
  registerEmailRoutes(app);
  log("Email routes registered");
  
  // Register configuration routes
  registerConfigurationRoutes(app);
  log("Configuration routes registered");
  
  // Register email event handlers
  registerEmailEventHandlers();
  log("Email event handlers registered");
  
  // Register shipping routes
  registerShippingRoutes(app);
  log("Shipping routes registered");
  
  // Registrar NUEVO sistema de etiquetas
  registerNewShippingRoutes(app);
  log("Nuevo sistema de etiquetas registrado");
  
  // Registrar sistema MEJORADO de etiquetas con creación automática de clientes
  registerImprovedShippingRoutes(app);
  log("Sistema mejorado de etiquetas registrado");
  
  // Ensure shipping label template directories exist
  ensureShippingLabelTemplateDirectories();
  
  // Optionally keep the main routes file for routes not yet migrated to services
  // Comment this out once all routes are migrated to services
  const legacyServer = registerRoutes(app);
  log("Legacy routes registered");

  // Global error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (req.aborted) {
      logger.info({ error: err.message }, 'Client aborted request.');
      return; // Abort silently (no HTTP response needed)
    }

    logger.error({ error: err.message, stack: err.stack }, 'Unhandled server error.');

    res.status(500).json({ error: 'Internal Server Error' });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();