import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerAdditionalRoutes } from "./routes-extension";
import { registerEmailRoutes } from "./routes-email";
import { setupVite, serveStatic, log } from "./vite";
import { scheduleBackups } from "../db/backup";
import { createServer } from "http";
import { serviceRegistry, eventListenerService } from "./services";
import { registerEmailEventHandlers } from "./lib/email.service";
import logger, { createLogger } from "./lib/logger";

// Create a logger instance for the express server
const serverLogger = createLogger("server");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enhanced request logging middleware with structured logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
  
  // Attach request ID to the request object for the error handler
  (req as any).requestId = requestId;
  
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log request start for API routes
  if (path.startsWith("/api")) {
    serverLogger.info({
      requestId,
      method: req.method,
      path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    }, `Request started: ${req.method} ${path}`);
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Prepare log data
      const logData = {
        requestId,
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration,
        response: capturedJsonResponse && res.statusCode >= 400 ? capturedJsonResponse : undefined
      };
      
      // Log at appropriate level based on status code
      if (res.statusCode >= 500) {
        serverLogger.error(logData, `Request errored: ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      } else if (res.statusCode >= 400) {
        serverLogger.warn(logData, `Request failed: ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      } else {
        serverLogger.info(logData, `Request completed: ${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
      
      // Maintain backward compatibility with existing logging
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
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    // Use the request ID if available, or generate a new one
    const errorId = (req as any).requestId || Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    
    // Extract request information for logging
    const requestInfo = {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      query: req.query,
      // Don't log sensitive information like passwords
      body: req.method === 'POST' && req.path.includes('login') ? '[REDACTED]' : req.body,
    };

    // Log with structured info
    serverLogger.error({
      err: {
        message: err.message,
        stack: err.stack,
        status,
        name: err.name,
        code: err.code
      },
      errorId,
      request: requestInfo,
      timestamp: new Date().toISOString()
    }, `Error processing request: ${message}`);

    // For backward compatibility, also log to console
    console.error(`[ERROR-${errorId}]`, {
      message: err.message,
      stack: err.stack,
      status,
      timestamp: new Date().toISOString()
    });

    // Don't expose stack traces in production
    const responseError = {
      message: process.env.NODE_ENV === 'production' ? message : `${message}${err.stack ? `: ${err.stack}` : ''}`,
      errorId,
      timestamp: new Date().toISOString(),
      status
    };

    if (!res.headersSent) {
      res.status(status).json(responseError);
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