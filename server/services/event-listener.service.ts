import { Express } from "express";
import { Service } from "./service-registry";
import { appEvents, EventTypes } from "../lib/event-emitter";

/**
 * Service that listens to application events and performs actions
 * This service demonstrates the use of the event system
 */
export class EventListenerService implements Service {
  name = "event-listener";

  registerRoutes(_app: Express): void {
    // This service doesn't register any routes
    // It just listens to events
  }

  initialize(): Promise<void> {
    // Register event listeners
    this.registerEventListeners();
    return Promise.resolve();
  }

  private registerEventListeners(): void {
    // Lead events
    appEvents.on(EventTypes.LEAD_CREATED, this.onLeadCreated.bind(this));
    appEvents.on(EventTypes.LEAD_UPDATED, this.onLeadUpdated.bind(this));
    appEvents.on(EventTypes.LEAD_DELETED, this.onLeadDeleted.bind(this));
    appEvents.on(EventTypes.LEAD_CONVERTED, this.onLeadConverted.bind(this));
    
    // Customer events
    appEvents.on(EventTypes.CUSTOMER_CREATED, this.onCustomerCreated.bind(this));
    appEvents.on(EventTypes.CUSTOMER_UPDATED, this.onCustomerUpdated.bind(this));
    appEvents.on(EventTypes.CUSTOMER_DELETED, this.onCustomerDeleted.bind(this));
    
    // Order events
    appEvents.on(EventTypes.ORDER_CREATED, this.onOrderCreated.bind(this));
    appEvents.on(EventTypes.ORDER_UPDATED, this.onOrderUpdated.bind(this));
    appEvents.on(EventTypes.ORDER_STATUS_CHANGED, this.onOrderStatusChanged.bind(this));
    appEvents.on(EventTypes.ORDER_PAYMENT_STATUS_CHANGED, this.onOrderPaymentStatusChanged.bind(this));
    appEvents.on(EventTypes.ORDER_DELETED, this.onOrderDeleted.bind(this));
    
    // Product events
    appEvents.on(EventTypes.PRODUCT_CREATED, this.onProductCreated.bind(this));
    appEvents.on(EventTypes.PRODUCT_UPDATED, this.onProductUpdated.bind(this));
    appEvents.on(EventTypes.PRODUCT_DELETED, this.onProductDeleted.bind(this));
    appEvents.on(EventTypes.PRODUCT_STOCK_CHANGED, this.onProductStockChanged.bind(this));
  }

  // Lead event handlers
  private onLeadCreated(lead: any): void {
    console.log(`Event: Lead created - ID: ${lead.id}, Name: ${lead.name}`);
    // Additional actions like notifications, integrations, etc.
  }

  private onLeadUpdated(lead: any): void {
    console.log(`Event: Lead updated - ID: ${lead.id}, Name: ${lead.name}`);
    // Additional actions like tracking changes, notifications, etc.
  }

  private onLeadDeleted(lead: any): void {
    console.log(`Event: Lead deleted - ID: ${lead.id}, Name: ${lead.name}`);
    // Additional cleanup actions, notifications, etc.
  }

  private onLeadConverted(data: { lead: any, customer: any }): void {
    console.log(`Event: Lead converted - Lead ID: ${data.lead.id}, Customer ID: ${data.customer.id}`);
    // Additional actions like congratulatory notifications, tracking, etc.
  }

  // Customer event handlers
  private onCustomerCreated(customer: any): void {
    console.log(`Event: Customer created - ID: ${customer.id}, Name: ${customer.name}`);
    // Additional actions like welcome emails, notifications, etc.
  }

  private onCustomerUpdated(customer: any): void {
    console.log(`Event: Customer updated - ID: ${customer.id}, Name: ${customer.name}`);
    // Additional actions like tracking changes, notifications, etc.
  }

  private onCustomerDeleted(customer: any): void {
    console.log(`Event: Customer deleted - ID: ${customer.id}, Name: ${customer.name}`);
    // Additional cleanup actions, notifications, etc.
  }

  // Order event handlers
  private onOrderCreated(order: any): void {
    console.log(`Event: Order created - ID: ${order.id}, Customer: ${order.customer?.name}, Amount: ${order.totalAmount}`);
    // Additional actions like order confirmation emails, inventory updates, etc.
  }

  private onOrderUpdated(order: any): void {
    console.log(`Event: Order updated - ID: ${order.id}, Customer: ${order.customer?.name}, Amount: ${order.totalAmount}`);
    // Additional actions like notifying customer of changes, etc.
  }

  private onOrderStatusChanged(data: { order: any, previousStatus: string, newStatus: string, reason?: string }): void {
    console.log(`Event: Order status changed - ID: ${data.order.id}, Status: ${data.previousStatus} -> ${data.newStatus}`);
    // Additional actions like order status notifications, etc.
  }

  private onOrderPaymentStatusChanged(data: { order: any, previousStatus: string, newStatus: string, reason?: string }): void {
    console.log(`Event: Order payment status changed - ID: ${data.order.id}, Payment Status: ${data.previousStatus} -> ${data.newStatus}`);
    // Additional actions like payment confirmation emails, etc.
  }

  private onOrderDeleted(order: any): void {
    console.log(`Event: Order deleted - ID: ${order.id}, Customer ID: ${order.customerId}`);
    // Additional cleanup actions, notifications, etc.
  }

  // Product event handlers
  private onProductCreated(product: any): void {
    console.log(`Event: Product created - ID: ${product.id}, Name: ${product.name}`);
    // Additional actions like catalog updates, notifications, etc.
  }

  private onProductUpdated(product: any): void {
    console.log(`Event: Product updated - ID: ${product.id}, Name: ${product.name}`);
    // Additional actions like catalog updates, notifications, etc.
  }

  private onProductDeleted(product: any): void {
    console.log(`Event: Product deleted - ID: ${product.id}, Name: ${product.name}`);
    // Additional cleanup actions, notifications, etc.
  }

  private onProductStockChanged(data: { product: any, previousStock: number, newStock: number, reason?: string }): void {
    console.log(`Event: Product stock changed - ID: ${data.product.id}, Name: ${data.product.name}, Stock: ${data.previousStock} -> ${data.newStock}`);
    // Additional actions like low stock alerts, etc.
  }
}

// Create and export the service instance
export const eventListenerService = new EventListenerService();