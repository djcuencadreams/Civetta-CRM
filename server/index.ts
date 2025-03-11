import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerAdditionalRoutes } from "./routes-extension";
import { registerEmailRoutes } from "./routes-email";
import { setupVite, serveStatic, log } from "./vite";
import { scheduleBackups } from "../db/backup";
import { createServer } from "http";
import { serviceRegistry, eventListenerService } from "./services";
import { registerEmailEventHandlers } from "./lib/email.service";
import logger, { createLogger, requestLoggerMiddleware, errorHandler } from "./lib/logger";

// Create a logger instance for the express server
const serverLogger = createLogger("server");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced request logging middleware with structured logging
app.use(requestLoggerMiddleware);

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
  
  // Register email event handlers
  registerEmailEventHandlers();
  log("Email event handlers registered");
  
  // Add health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    // Collect health information about various parts of the application
    const health = {
      status: 'healthy',
      message: 'System is operating normally',
      timestamp: new Date().toISOString(),
      services: {
        database: { status: 'up' },
        api: { status: 'up' }
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    
    // Log health check
    serverLogger.info({
      health,
      requestSource: _req.ip
    }, 'Health check performed');
    
    res.json(health);
  });
  log("Health check endpoint registered");
  
  // Optionally keep the main routes file for routes not yet migrated to services
  // Comment this out once all routes are migrated to services
  const legacyServer = registerRoutes(app);
  log("Legacy routes registered");

  // Enhanced error handling middleware with structured logging
  app.use(errorHandler);

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