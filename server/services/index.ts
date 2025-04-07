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
import { wooCommerceService } from './woocommerce.service';
import { socialService } from './social.service';
import { opportunitiesService } from './opportunities.service';
import { interactionsService } from './interactions.service';
import { activitiesService } from './activities.service';
import { healthService } from './health.service';

// Register all services
serviceRegistry.register(leadsService);
serviceRegistry.register(customersService);
serviceRegistry.register(ordersService);
serviceRegistry.register(inventoryService);
serviceRegistry.register(eventListenerService);
serviceRegistry.register(wooCommerceService);
serviceRegistry.register(socialService);
serviceRegistry.register(opportunitiesService);
serviceRegistry.register(interactionsService);
serviceRegistry.register(activitiesService);
serviceRegistry.register(healthService);

// Export all services and registry
export {
  serviceRegistry,
  leadsService,
  customersService,
  ordersService,
  inventoryService,
  eventListenerService,
  wooCommerceService,
  socialService,
  opportunitiesService,
  interactionsService,
  activitiesService,
  healthService
};