import { EventEmitter } from 'events';

/**
 * Application event emitter singleton for inter-service communication
 * Services can emit and listen to events to communicate with each other
 */
class ApplicationEvents extends EventEmitter {
  private static instance: ApplicationEvents;
  
  private constructor() {
    super();
    // Set higher limit for event listeners
    this.setMaxListeners(50);
  }
  
  /**
   * Get the singleton instance of the event emitter
   */
  public static getInstance(): ApplicationEvents {
    if (!ApplicationEvents.instance) {
      ApplicationEvents.instance = new ApplicationEvents();
    }
    
    return ApplicationEvents.instance;
  }
}

// Export singleton instance
export const appEvents = ApplicationEvents.getInstance();

// Export event types as enum for type safety
export enum EventTypes {
  // Lead events
  LEAD_CREATED = 'lead.created',
  LEAD_UPDATED = 'lead.updated',
  LEAD_DELETED = 'lead.deleted',
  LEAD_CONVERTED = 'lead.converted',
  
  // Customer events
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
  
  // Order events
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_STATUS_CHANGED = 'order.status.changed',
  ORDER_PAYMENT_STATUS_CHANGED = 'order.payment_status.changed',
  ORDER_DELETED = 'order.deleted',
  
  // Product events
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated',
  PRODUCT_DELETED = 'product.deleted',
  PRODUCT_STOCK_CHANGED = 'product.stock.changed',
  
  // Interaction events
  INTERACTION_CREATED = 'interaction.created',
  INTERACTION_UPDATED = 'interaction.updated',
  INTERACTION_DELETED = 'interaction.deleted'
}