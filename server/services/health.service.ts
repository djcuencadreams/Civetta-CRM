import { Express, Request, Response } from "express";
import { Service } from "./service-registry";
import { db, pool } from "@db";

/**
 * Service responsible for health checks and system status
 */
export class HealthService implements Service {
  name = "health";

  registerRoutes(app: Express): void {
    // Root health check endpoint for deployment - Commented out to use static HTML
    // app.get("/", (_req: Request, res: Response) => {
    //   res.status(200).send("OK");
    // });
    
    // Health check endpoint
    app.get("/api/health", this.getHealthStatus.bind(this));
    
    // Service status endpoint
    app.get("/api/health/status", this.getServiceStatus.bind(this));
  }

  /**
   * Get basic health status
   */
  async getHealthStatus(_req: Request, res: Response): Promise<void> {
    try {
      // Check database connection
      const { rows } = await pool.query("SELECT 1 as check_value");
      
      if (rows.length > 0 && rows[0].check_value === 1) {
        res.json({
          status: "healthy",
          database: "connected",
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          status: "unhealthy",
          database: "error",
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({
        status: "unhealthy",
        database: "error",
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get detailed service status
   */
  async getServiceStatus(_req: Request, res: Response): Promise<void> {
    try {
      // Get database statistics
      const { rows: tableStats } = await pool.query(`
        SELECT 
          table_name,
          pg_total_relation_size(quote_ident(table_name)) as table_size,
          pg_relation_size(quote_ident(table_name)) as table_data_size,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
        FROM information_schema.tables t
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC
        LIMIT 10
      `);
      
      // Get system uptime info
      const uptimeSeconds = process.uptime();
      const uptimeFormatted = new Date(uptimeSeconds * 1000).toISOString().substr(11, 8);
      
      res.json({
        status: "active",
        serviceName: this.name,
        environment: process.env.NODE_ENV || "development",
        memory: {
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        },
        uptime: {
          seconds: uptimeSeconds,
          formatted: uptimeFormatted
        },
        database: {
          connected: true,
          tables: tableStats
        },
        version: "1.0.0",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Service status check failed:', error);
      res.status(500).json({
        status: "error",
        error: (error as Error).message,
        serviceName: this.name,
        timestamp: new Date().toISOString()
      });
    }
  }
}

// Create and export the service instance
export const healthService = new HealthService();