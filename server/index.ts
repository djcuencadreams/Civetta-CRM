import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerAdditionalRoutes } from "./routes-extension";
import { setupVite, serveStatic, log } from "./vite";
import { scheduleBackups } from "../db/backup";
import { createServer } from "http";
import { serviceRegistry, eventListenerService } from "./services";

const app = express();
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
  
  // Optionally keep the main routes file for routes not yet migrated to services
  // Comment this out once all routes are migrated to services
  const legacyServer = registerRoutes(app);
  log("Legacy routes registered");

  // Enhanced error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const errorId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

    // Log detailed error information with a unique error ID
    console.error(`[ERROR-${errorId}]`, {
      message: err.message,
      stack: err.stack,
      status,
      timestamp: new Date().toISOString()
    });

    if (!res.headersSent) {
      res.status(status).json({ 
        message, 
        errorId,
        timestamp: new Date().toISOString()
      });
    }
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