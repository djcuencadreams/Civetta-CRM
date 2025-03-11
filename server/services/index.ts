/**
 * Service registry
 * This file exports all service instances and the service registry
 */
import { serviceRegistry } from './service-registry';
import { leadsService } from './leads.service';
import { customersService } from './customers.service';
import { ordersService } from './orders.service';
import { inventoryService } from './inventory.service';
import { eventListenerService } from './event-listener.service';

// Register all services
serviceRegistry.register(leadsService);
serviceRegistry.register(customersService);
serviceRegistry.register(ordersService);
serviceRegistry.register(inventoryService);
serviceRegistry.register(eventListenerService);

// Export all services and registry
export {
  serviceRegistry,
  leadsService,
  customersService,
  ordersService,
  inventoryService,
  eventListenerService
};