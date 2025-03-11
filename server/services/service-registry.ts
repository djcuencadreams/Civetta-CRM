import { Express } from 'express';

/**
 * Interface that all services must implement
 */
export interface Service {
  /**
   * Name of the service for identification
   */
  name: string;
  
  /**
   * Register all routes for this service
   * @param app Express application instance
   */
  registerRoutes(app: Express): void;
  
  /**
   * Initialize the service
   * This is called during application startup
   */
  initialize?(): Promise<void>;
  
  /**
   * Shut down the service gracefully
   * This is called during application shutdown
   */
  shutdown?(): Promise<void>;
}

/**
 * Registry of all application services
 * This class is responsible for managing service lifecycle
 */
class ServiceRegistry {
  private services: Map<string, Service> = new Map();
  
  /**
   * Register a service with the registry
   * @param service Service instance to register
   */
  register(service: Service): void {
    if (this.services.has(service.name)) {
      throw new Error(`Service with name ${service.name} is already registered`);
    }
    
    this.services.set(service.name, service);
  }
  
  /**
   * Get a service by name
   * @param name Name of the service to retrieve
   */
  getService<T extends Service>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service with name ${name} not found`);
    }
    
    return service as T;
  }
  
  /**
   * Register all service routes with the Express application
   * @param app Express application instance
   */
  registerAllRoutes(app: Express): void {
    Array.from(this.services.values()).forEach(service => {
      service.registerRoutes(app);
    });
  }
  
  /**
   * Initialize all services
   */
  async initializeAll(): Promise<void> {
    const serviceArray = Array.from(this.services.values());
    for (let i = 0; i < serviceArray.length; i++) {
      const service = serviceArray[i];
      if (service.initialize) {
        await service.initialize();
      }
    }
  }
  
  /**
   * Shut down all services gracefully
   */
  async shutdownAll(): Promise<void> {
    const serviceArray = Array.from(this.services.values());
    for (let i = 0; i < serviceArray.length; i++) {
      const service = serviceArray[i];
      if (service.shutdown) {
        await service.shutdown();
      }
    }
  }
}

// Export singleton instance
export const serviceRegistry = new ServiceRegistry();