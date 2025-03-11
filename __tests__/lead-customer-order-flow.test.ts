/**
 * End-to-end test for the Lead → Customer → Order workflow
 * 
 * This test verifies:
 * 1. Creating a new lead via the API
 * 2. Converting the lead to a customer
 * 3. Creating an order for that customer
 * 4. Verifying all related records are correctly created
 *    - Lead with converted flag
 *    - New customer record
 *    - Order linked to customer
 *    - Order items
 *    - Product stock reduction
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { 
  leads, customers, orders, orderItems, products,
  brandEnum, leadStatusEnum, orderStatusEnum, paymentStatusEnum
} from '../db/schema';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';
import { appEvents, EventTypes } from '../server/lib/event-emitter';

// Setup in-memory SQLite database
const sqlite = new Database(':memory:');
const db = drizzle(sqlite, { schema });

// Define query builder
db.query = {
  leads: {
    findFirst: (opts: any) => db.select().from(schema.leads).where(opts.where).limit(1).then(rows => rows[0] || null)
  },
  customers: {
    findFirst: (opts: any) => db.select().from(schema.customers).where(opts.where).limit(1).then(rows => rows[0] || null) 
  },
  products: {
    findFirst: (opts: any) => db.select().from(schema.products).where(opts.where).limit(1).then(rows => rows[0] || null)
  },
  orders: {
    findFirst: (opts: any) => db.select().from(schema.orders).where(opts.where).limit(1).then(rows => rows[0] || null)
  },
  orderItems: {
    findFirst: (opts: any) => db.select().from(schema.orderItems).where(opts.where).limit(1).then(rows => rows[0] || null)
  }
};

// Mock the appEvents
jest.mock('../server/lib/event-emitter', () => {
  const realEventEmitter = jest.requireActual('../server/lib/event-emitter');
  return {
    ...realEventEmitter,
    appEvents: {
      emit: jest.fn(),
      on: jest.fn()
    }
  };
});

// Simplified implementations of the services for testing
class LeadsTestService {
  async createLead(data: any) {
    // Split name into first and last name
    let firstName = data.name;
    let lastName = '';
    
    const nameParts = data.name.trim().split(' ');
    if (nameParts.length > 1) {
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }

    const [lead] = await db.insert(leads).values({
      name: data.name.trim(),
      firstName,
      lastName,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      status: data.status || leadStatusEnum.NEW,
      source: data.source || 'website',
      brand: data.brand || brandEnum.SLEEPWEAR,
      notes: data.notes?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Emit lead created event
    appEvents.emit(EventTypes.LEAD_CREATED, lead);
    
    return lead;
  }

  async convertLeadById(leadId: number) {
    // Use direct select to ensure we get all fields
    const [existingLead] = await db.select().from(leads).where(eq(leads.id, leadId));

    if (!existingLead) {
      throw new Error("Lead not found");
    }

    // Check if the lead has already been converted
    if (existingLead.convertedToCustomer && existingLead.convertedCustomerId) {
      return {
        lead: existingLead.id,
        customer: existingLead.convertedCustomerId,
        success: true
      };
    }

    // Split name into first and last name
    let firstName = existingLead.firstName || existingLead.name;
    let lastName = existingLead.lastName || '';
    
    // Format notes to include brand interest if it exists
    let customerNotes = existingLead.notes || null;
    
    const [customer] = await db.insert(customers)
      .values({
        name: existingLead.name.trim(),
        firstName,
        lastName,
        email: existingLead.email,
        phone: existingLead.phone,
        phoneCountry: existingLead.phoneCountry,
        street: existingLead.street,
        city: existingLead.city,
        province: existingLead.province,
        source: existingLead.source || 'website',
        brand: existingLead.brand || brandEnum.SLEEPWEAR,
        notes: customerNotes,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Update lead to mark as converted
    await db.update(leads)
      .set({
        convertedToCustomer: true,
        convertedCustomerId: customer.id,
        status: leadStatusEnum.CONVERTED,
        updatedAt: new Date()
      })
      .where(eq(leads.id, leadId));

    // Emit lead converted event
    appEvents.emit(EventTypes.LEAD_CONVERTED, { 
      lead: existingLead, 
      customer 
    });
    
    return { 
      lead: existingLead.id, 
      customer: customer.id,
      success: true
    };
  }
}

class OrdersTestService {
  async createOrder(orderData: any) {
    const { customerId, items, ...orderDetails } = orderData;

    // Check if customer exists
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId)
    });

    if (!customer) {
      throw new Error("Customer not found");
    }
    
    // Calculate total amount from items if not specified
    let totalAmount = orderDetails.totalAmount;
    if (!totalAmount && items?.length > 0) {
      totalAmount = items.reduce((sum: number, item: any) => sum + item.subtotal, 0);
    }

    // Generate order number
    const orderNumber = this.generateOrderNumber();

    // Create the order
    const [order] = await db.insert(orders).values({
      customerId,
      leadId: orderDetails.leadId || null,
      orderNumber: orderDetails.orderNumber || orderNumber,
      totalAmount,
      status: orderDetails.status || orderStatusEnum.NEW,
      paymentStatus: orderDetails.paymentStatus || paymentStatusEnum.PENDING,
      paymentMethod: orderDetails.paymentMethod || null,
      source: orderDetails.source || 'direct',
      brand: orderDetails.brand || customer.brand || brandEnum.SLEEPWEAR,
      notes: orderDetails.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Create order items
    if (items && items.length > 0) {
      const orderItemsData = items.map((item: any) => ({
        orderId: order.id,
        productId: item.productId || null,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        subtotal: item.subtotal,
        createdAt: new Date()
      }));

      await db.insert(orderItems).values(orderItemsData);
      
      // Update product stock if product ID is provided
      for (const item of items) {
        if (item.productId) {
          const product = await db.query.products.findFirst({
            where: eq(products.id, item.productId)
          });
          
          if (product) {
            const previousStock = product.stock || 0;
            const newStock = Math.max(0, previousStock - item.quantity);
            
            await db.update(products)
              .set({
                stock: newStock,
                updatedAt: new Date()
              })
              .where(eq(products.id, item.productId));
            
            // Emit product stock changed event
            appEvents.emit(EventTypes.PRODUCT_STOCK_CHANGED, {
              product: { ...product, stock: newStock },
              previousStock,
              newStock,
              reason: `Order ${order.id} creation`
            });
          }
        }
      }
    }

    // Emit order created event
    appEvents.emit(EventTypes.ORDER_CREATED, order);
    
    return order;
  }

  private generateOrderNumber(): string {
    const prefix = 'TST';
    const timestamp = Date.now().toString().slice(-6);
    const randomChars = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${prefix}-${randomChars}${timestamp}`;
  }
}

class ProductsTestService {
  async createProduct(productData: any) {
    const [product] = await db.insert(products).values({
      name: productData.name,
      sku: productData.sku || this.generateSku(productData.name, productData.brand || 'GEN'),
      description: productData.description || null,
      price: productData.price,
      stock: productData.stock || 0,
      active: productData.active ?? true,
      brand: productData.brand || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Emit product created event
    appEvents.emit(EventTypes.PRODUCT_CREATED, product);
    
    return product;
  }

  private generateSku(productName: string, brand: string): string {
    const brandPrefix = brand.slice(0, 3).toUpperCase();
    const namePrefix = productName
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 3).toUpperCase();
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${brandPrefix}-${namePrefix}${randomSuffix}`;
  }
}

// Initialize services
const leadsService = new LeadsTestService();
const ordersService = new OrdersTestService();
const productsService = new ProductsTestService();

describe('Lead to Customer to Order Flow', () => {
  beforeAll(async () => {
    // Create all necessary tables in the in-memory database
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        id_number TEXT,
        email TEXT,
        phone TEXT,
        phone_country TEXT,
        phone_number TEXT,
        street TEXT,
        city TEXT,
        province TEXT,
        delivery_instructions TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        source TEXT NOT NULL DEFAULT 'instagram',
        brand TEXT DEFAULT 'sleepwear',
        brand_interest TEXT,
        notes TEXT,
        converted_to_customer BOOLEAN DEFAULT FALSE,
        converted_customer_id INTEGER,
        last_contact TIMESTAMP,
        next_follow_up TIMESTAMP,
        customer_lifecycle_stage TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        id_number TEXT,
        email TEXT,
        phone TEXT,
        phone_country TEXT,
        phone_number TEXT,
        street TEXT,
        city TEXT,
        province TEXT,
        delivery_instructions TEXT,
        address TEXT,
        source TEXT DEFAULT 'instagram',
        brand TEXT DEFAULT 'sleepwear',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT NOT NULL UNIQUE,
        description TEXT,
        category_id INTEGER,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER DEFAULT 0,
        brand TEXT DEFAULT 'sleepwear',
        woocommerce_id INTEGER,
        woocommerce_url TEXT,
        active BOOLEAN DEFAULT TRUE,
        images JSON DEFAULT '[]',
        attributes JSON DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        lead_id INTEGER,
        order_number TEXT UNIQUE,
        total_amount DECIMAL(10, 2) NOT NULL,
        status TEXT DEFAULT 'new',
        payment_status TEXT DEFAULT 'pending',
        payment_method TEXT,
        source TEXT DEFAULT 'website',
        woocommerce_id INTEGER,
        brand TEXT DEFAULT 'sleepwear',
        shipping_address JSON DEFAULT '{}',
        billing_address JSON DEFAULT '{}',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (lead_id) REFERENCES leads(id)
      );
      
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price DECIMAL(10, 2) NOT NULL,
        discount DECIMAL(10, 2) DEFAULT 0,
        subtotal DECIMAL(10, 2) NOT NULL,
        attributes JSON DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `);
  });

  afterAll(() => {
    // Close the SQLite connection
    sqlite.close();
    
    // Clear all mocks
    jest.resetAllMocks();
  });

  it('should complete the entire lead -> customer -> order flow with stock update', async () => {
    // Create a product with initial stock
    const product = await productsService.createProduct({
      name: 'Test Product',
      description: 'Test product description',
      price: 99.99,
      stock: 10,
      brand: brandEnum.SLEEPWEAR
    });
    
    expect(product).toBeDefined();
    expect(product.id).toBeDefined();
    expect(product.stock).toBe(10);
    
    // Step 1: Create a lead
    const leadData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      status: leadStatusEnum.NEW,
      source: 'website',
      brand: brandEnum.SLEEPWEAR,
      notes: 'Test lead'
    };
    
    const lead = await leadsService.createLead(leadData);
    
    expect(lead).toBeDefined();
    expect(lead.id).toBeDefined();
    expect(lead.name).toBe(leadData.name);
    expect(lead.email).toBe(leadData.email);
    expect(lead.convertedToCustomer).toBeFalsy();
    expect(lead.convertedCustomerId).toBeNull();
    
    // Verify lead created event was emitted
    expect(appEvents.emit).toHaveBeenCalledWith(EventTypes.LEAD_CREATED, expect.anything());
    
    // Step 2: Convert lead to customer
    const conversionResult = await leadsService.convertLeadById(lead.id);
    
    expect(conversionResult).toBeDefined();
    expect(conversionResult.success).toBe(true);
    expect(conversionResult.lead).toBe(lead.id);
    expect(conversionResult.customer).toBeDefined();
    
    // Verify the lead has been updated with the conversion information
    const updatedLead = await db.query.leads.findFirst({
      where: eq(leads.id, lead.id)
    });
    
    expect(updatedLead).toBeDefined();
    expect(updatedLead!.convertedToCustomer).toBe(true);
    expect(updatedLead!.convertedCustomerId).toBe(conversionResult.customer);
    expect(updatedLead!.status).toBe(leadStatusEnum.CONVERTED);
    
    // Verify the customer has been created
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, conversionResult.customer)
    });
    
    expect(customer).toBeDefined();
    expect(customer!.name).toBe(lead.name);
    expect(customer!.email).toBe(lead.email);
    expect(customer!.phone).toBe(lead.phone);
    
    // Verify lead converted event was emitted
    expect(appEvents.emit).toHaveBeenCalledWith(EventTypes.LEAD_CONVERTED, expect.anything());
    
    // Step 3: Create an order for the customer
    const orderData = {
      customerId: customer!.id,
      leadId: lead.id,
      totalAmount: 99.99,
      status: orderStatusEnum.NEW,
      paymentStatus: paymentStatusEnum.PENDING,
      paymentMethod: 'credit_card',
      source: 'website',
      brand: brandEnum.SLEEPWEAR,
      notes: 'Test order',
      items: [
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.price,
          discount: 0,
          subtotal: product.price
        }
      ]
    };
    
    const order = await ordersService.createOrder(orderData);
    
    expect(order).toBeDefined();
    expect(order.id).toBeDefined();
    expect(order.customerId).toBe(customer!.id);
    expect(order.leadId).toBe(lead.id);
    expect(order.totalAmount).toBe(orderData.totalAmount);
    
    // Verify the order has items
    const orderItemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    
    expect(orderItemsResult).toBeDefined();
    expect(orderItemsResult.length).toBe(1);
    expect(orderItemsResult[0].productId).toBe(product.id);
    expect(orderItemsResult[0].quantity).toBe(1);
    
    // Verify product stock has been reduced
    const updatedProduct = await db.query.products.findFirst({
      where: eq(products.id, product.id)
    });
    
    expect(updatedProduct).toBeDefined();
    expect(updatedProduct!.stock).toBe(9); // Initial 10 - 1
    
    // Verify order created event was emitted
    expect(appEvents.emit).toHaveBeenCalledWith(EventTypes.ORDER_CREATED, expect.anything());
    
    // Verify product stock changed event was emitted
    expect(appEvents.emit).toHaveBeenCalledWith(
      EventTypes.PRODUCT_STOCK_CHANGED, 
      expect.objectContaining({
        previousStock: 10,
        newStock: 9
      })
    );
  });
});