import { Request, Response } from 'express';
import { Express } from 'express';
import { Service } from './service-registry';
import twilio from 'twilio';
import { appEvents, EventTypes } from '../lib/event-emitter';
import { db } from '@db';
import { customers, leads, whatsappMessages } from '@db/schema';
import { eq, or, and, isNull, desc } from 'drizzle-orm';

// Define Twilio client type to resolve TypeScript errors
type TwilioClient = ReturnType<typeof twilio>;

/**
 * Service for handling social media integrations like WhatsApp
 */
export class SocialService implements Service {
  name = "social";
  private twilioClient: TwilioClient | null = null;
  private initialized = false;

  /**
   * Initialize the service with Twilio credentials
   */
  async initialize(): Promise<void> {
    try {
      // Get Twilio credentials from environment variables
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      if (accountSid && authToken) {
        this.twilioClient = twilio(accountSid, authToken);
        this.initialized = true;
        console.log(`[${this.name}] WhatsApp service initialized successfully`);
      } else {
        console.log(`[${this.name}] WhatsApp service not configured. Please provide Twilio credentials.`);
      }
      
      // Register event listeners for the service
      this.registerEventListeners();
    } catch (error) {
      console.error(`[${this.name}] Error initializing service:`, error);
    }
  }

  /**
   * Register API routes for WhatsApp webhooks and configuration
   */
  registerRoutes(app: Express): void {
    // Webhook endpoint for incoming WhatsApp messages
    app.post('/api/webhooks/whatsapp', this.handleIncomingWhatsAppMessage.bind(this));
    
    // API endpoint to send a test WhatsApp message
    app.post('/api/whatsapp/send', this.sendWhatsAppMessageHandler.bind(this));
    
    // API endpoint for WhatsApp configuration
    app.get('/api/configuration/whatsapp', this.getWhatsAppConfiguration.bind(this));
    app.post('/api/configuration/whatsapp', this.updateWhatsAppConfiguration.bind(this));
    
    console.log(`[${this.name}] Routes registered`);
  }

  /**
   * Register event listeners for various app events
   */
  private registerEventListeners(): void {
    // Listen for new orders to potentially send WhatsApp notifications
    appEvents.on(EventTypes.ORDER_CREATED, this.handleOrderCreated.bind(this));
    
    // Listen for payment status changes to potentially send WhatsApp notifications
    appEvents.on(EventTypes.ORDER_PAYMENT_STATUS_CHANGED, this.handlePaymentStatusChanged.bind(this));
    
    console.log(`[${this.name}] Event listeners registered`);
  }

  /**
   * Handle the ORDER_CREATED event to send a WhatsApp notification
   */
  private async handleOrderCreated(order: any): Promise<void> {
    try {
      if (!this.initialized || !order.customerId) return;
      
      // Get customer details
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, order.customerId)
      });
      
      if (!customer || !customer.phone) return;
      
      // Format a message for the new order
      const message = `Hola ${customer.name}, ¡gracias por tu pedido #${order.orderNumber}! Tu pedido por $${order.totalAmount} está siendo procesado. Te informaremos cuando esté listo para envío.`;
      
      // Send WhatsApp message (this is commented out until we have proper credentials)
      // await this.sendWhatsAppMessage(customer.phone, message);
      
      console.log(`[${this.name}] Order notification would be sent to ${customer.phone}: ${message}`);
    } catch (error) {
      console.error(`[${this.name}] Error handling order created:`, error);
    }
  }

  /**
   * Handle the ORDER_PAYMENT_STATUS_CHANGED event to send a WhatsApp notification
   */
  private async handlePaymentStatusChanged(data: { order: any, previousStatus: string, newStatus: string }): Promise<void> {
    try {
      if (!this.initialized || !data.order.customerId) return;
      
      // Only send message if payment status changed to 'paid'
      if (data.newStatus !== 'paid') return;
      
      // Get customer details
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, data.order.customerId)
      });
      
      if (!customer || !customer.phone) return;
      
      // Format a message for the payment confirmation
      const message = `Hola ${customer.name}, hemos confirmado el pago de tu pedido #${data.order.orderNumber}. ¡Gracias por tu compra!`;
      
      // Send WhatsApp message (this is commented out until we have proper credentials)
      // await this.sendWhatsAppMessage(customer.phone, message);
      
      console.log(`[${this.name}] Payment confirmation would be sent to ${customer.phone}: ${message}`);
    } catch (error) {
      console.error(`[${this.name}] Error handling payment status changed:`, error);
    }
  }

  /**
   * Send a WhatsApp message via Twilio API
   * @param phone The phone number to send to (with country code)
   * @param messageText The message text to send
   * @returns Promise with the result of the send operation
   */
  async sendWhatsAppMessage(phone: string, messageText: string): Promise<any> {
    try {
      if (!this.initialized || !this.twilioClient) {
        throw new Error('WhatsApp service not initialized');
      }
      
      // Normalize the phone number
      let normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      // Get the WhatsApp sender number from environment variables
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
      
      if (!fromNumber) {
        throw new Error('Twilio WhatsApp number not configured');
      }
      
      // Send the message through Twilio
      const message = await this.twilioClient.messages.create({
        body: messageText,
        from: `whatsapp:${fromNumber}`,
        to: `whatsapp:${normalizedPhone}`
      });
      
      console.log(`[${this.name}] WhatsApp message sent to ${normalizedPhone}:`, message.sid);
      
      // Save the message to database
      await this.saveOutgoingMessage(normalizedPhone, messageText, message.sid);
      
      return message;
    } catch (error) {
      console.error(`[${this.name}] Error sending WhatsApp message:`, error);
      throw error;
    }
  }

  /**
   * Handler for the /api/whatsapp/send API endpoint
   */
  private async sendWhatsAppMessageHandler(req: Request, res: Response): Promise<void> {
    try {
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        res.status(400).json({ error: 'Phone number and message text are required' });
        return;
      }
      
      // Check if we have Twilio credentials configured
      if (!this.initialized || !this.twilioClient) {
        res.status(500).json({ 
          error: 'WhatsApp service not configured', 
          configureUrl: '/api/configuration/whatsapp' 
        });
        return;
      }
      
      // Send the message
      const result = await this.sendWhatsAppMessage(phone, message);
      
      res.status(200).json({ success: true, messageSid: result.sid });
    } catch (error: any) {
      console.error(`[${this.name}] Error in send message handler:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Handler for incoming WhatsApp webhook messages from Twilio
   */
  private async handleIncomingWhatsAppMessage(req: Request, res: Response): Promise<void> {
    try {
      console.log(`[${this.name}] Received incoming WhatsApp webhook:`, req.body);
      
      // Extract message details from Twilio webhook payload
      const messageSid = req.body.MessageSid;
      const from = req.body.From?.replace('whatsapp:', '') || '';
      const to = req.body.To?.replace('whatsapp:', '') || '';
      const body = req.body.Body || '';
      
      // Save incoming message to database
      await this.saveIncomingMessage(from, to, body, messageSid);
      
      // Find the corresponding customer or lead by phone number
      const contact = await this.findContactByPhone(from);
      
      console.log(`[${this.name}] Incoming WhatsApp from ${from}, contact found:`, contact?.id || 'None');
      
      // Return a 200 response to acknowledge receipt
      res.status(200).send('OK');
    } catch (error: any) {
      console.error(`[${this.name}] Error handling incoming message:`, error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Save an incoming WhatsApp message to the database
   */
  private async saveIncomingMessage(from: string, to: string, body: string, messageSid: string): Promise<void> {
    try {
      // Find associated contact
      const contact = await this.findContactByPhone(from);
      
      // Due to the current state of database migration, we will just log the message for now
      // In production, this would save to the database
      console.log(`[${this.name}] Incoming WhatsApp message:`, {
        fromNumber: from,
        toNumber: to,
        messageBody: body,
        direction: 'incoming',
        messageSid,
        customerId: contact?.type === 'customer' ? contact.id : null,
        leadId: contact?.type === 'lead' ? contact.id : null,
      });
      
      // After the migration is completed, this would be used:
      /*
      await db.insert(whatsappMessages).values({
        fromNumber: from,
        toNumber: to,
        messageBody: body,
        direction: 'incoming',
        messageSid,
        customerId: contact?.type === 'customer' ? contact.id : null,
        leadId: contact?.type === 'lead' ? contact.id : null,
        createdAt: new Date()
      });
      */
      
      console.log(`[${this.name}] Processed incoming message from ${from}`);
    } catch (error) {
      console.error(`[${this.name}] Error processing incoming message:`, error);
      throw error;
    }
  }

  /**
   * Save an outgoing WhatsApp message to the database
   */
  private async saveOutgoingMessage(to: string, body: string, messageSid: string): Promise<void> {
    try {
      // Find associated contact
      const contact = await this.findContactByPhone(to);
      
      // Get the WhatsApp sender number from environment variables
      const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';
      
      // Due to the current state of database migration, we will just log the message for now
      // In production, this would save to the database
      console.log(`[${this.name}] Outgoing WhatsApp message:`, {
        fromNumber,
        toNumber: to,
        messageBody: body,
        direction: 'outgoing',
        messageSid,
        customerId: contact?.type === 'customer' ? contact.id : null,
        leadId: contact?.type === 'lead' ? contact.id : null,
      });
      
      // After the migration is completed, this would be used:
      /*
      await db.insert(whatsappMessages).values({
        fromNumber,
        toNumber: to,
        messageBody: body,
        direction: 'outgoing',
        messageSid,
        customerId: contact?.type === 'customer' ? contact.id : null,
        leadId: contact?.type === 'lead' ? contact.id : null,
        createdAt: new Date()
      });
      */
      
      console.log(`[${this.name}] Processed outgoing message to ${to}`);
    } catch (error) {
      console.error(`[${this.name}] Error processing outgoing message:`, error);
      throw error;
    }
  }

  /**
   * Find a customer or lead by their phone number
   */
  private async findContactByPhone(phone: string): Promise<{ id: number, type: 'customer' | 'lead' } | null> {
    try {
      // Clean the phone number for comparison
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Try to find a customer first
      const customer = await db.query.customers.findFirst({
        where: or(
          eq(customers.phone, phone),
          eq(customers.phone, cleanPhone),
          eq(customers.phoneNumber, cleanPhone)
        )
      });
      
      if (customer) {
        return { id: customer.id, type: 'customer' };
      }
      
      // If no customer found, try to find a lead
      const lead = await db.query.leads.findFirst({
        where: or(
          eq(leads.phone, phone),
          eq(leads.phone, cleanPhone),
          eq(leads.phoneNumber, cleanPhone)
        )
      });
      
      if (lead) {
        return { id: lead.id, type: 'lead' };
      }
      
      return null;
    } catch (error) {
      console.error(`[${this.name}] Error finding contact by phone:`, error);
      return null;
    }
  }

  /**
   * Get WhatsApp configuration
   */
  private async getWhatsAppConfiguration(_req: Request, res: Response): Promise<void> {
    const config = {
      enabled: this.initialized,
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '',
      webhookUrl: `${process.env.PUBLIC_URL || ''}/api/webhooks/whatsapp`,
      orderNotificationsEnabled: true,
      paymentNotificationsEnabled: true
    };
    
    res.json(config);
  }

  /**
   * Update WhatsApp configuration
   */
  private async updateWhatsAppConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { accountSid, authToken, whatsappNumber } = req.body;
      
      // We'll need to store these in environment variables or a secure configuration store
      // For now, just update the in-memory client
      
      if (accountSid && authToken) {
        // Re-initialize the client with new credentials
        this.twilioClient = twilio(accountSid, authToken);
        this.initialized = true;
        
        // In a real implementation, we would store these securely
        console.log(`[${this.name}] WhatsApp configuration updated`);
        
        res.json({ success: true, message: 'WhatsApp configuration updated' });
      } else {
        res.status(400).json({ error: 'Missing required credentials' });
      }
    } catch (error: any) {
      console.error(`[${this.name}] Error updating WhatsApp configuration:`, error);
      res.status(500).json({ error: error.message });
    }
  }
}

// Export a singleton instance
export const socialService = new SocialService();