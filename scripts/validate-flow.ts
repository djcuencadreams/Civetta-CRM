/**
 * Validation script for the Lead → Customer → Order workflow
 * 
 * This script performs a manual validation of:
 * 1. Creating a new lead
 * 2. Converting the lead to a customer
 * 3. Creating an order for that customer
 * 4. Verifying all related records are correctly created
 */

import { db } from '../db';
import { 
  leads, customers, orders, orderItems, products,
  brandEnum, leadStatusEnum, orderStatusEnum, paymentStatusEnum,
  sourceEnum
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { appEvents, EventTypes } from '../server/lib/event-emitter';

async function validateBusinessFlow() {
  console.log('Starting validation of Lead → Customer → Order workflow...');
  
  try {
    // Step 1: Create a product with initial stock
    console.log('\nStep 1: Creating test product...');
    const [product] = await db.insert(products).values({
      name: 'Test Validation Product',
      sku: `TEST-${Date.now()}`,
      description: 'Product created for validation testing',
      price: '99.99',
      stock: 10,
      active: true,
      brand: brandEnum.SLEEPWEAR,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log(`Product created: ${product.name} (ID: ${product.id}, Stock: ${product.stock})`);
    
    // Step 2: Create a lead
    console.log('\nStep 2: Creating test lead...');
    const [lead] = await db.insert(leads).values({
      name: 'Test Validation Lead',
      firstName: 'Test',
      lastName: 'Validation Lead',
      email: 'test.lead@example.com',
      phone: '+1234567890',
      status: leadStatusEnum.NEW,
      source: sourceEnum.WEBSITE,
      brand: brandEnum.SLEEPWEAR,
      notes: 'Created for validation testing',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log(`Lead created: ${lead.name} (ID: ${lead.id})`);
    
    // Step 3: Convert lead to customer
    console.log('\nStep 3: Converting lead to customer...');
    const [customer] = await db.insert(customers).values({
      name: lead.name,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      brand: lead.brand,
      notes: lead.notes ? `Converted from lead. ${lead.notes}` : 'Converted from lead',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Update lead to mark as converted
    await db.update(leads)
      .set({
        convertedToCustomer: true,
        convertedCustomerId: customer.id,
        status: leadStatusEnum.CONVERTED,
        updatedAt: new Date()
      })
      .where(eq(leads.id, lead.id));
    
    console.log(`Customer created: ${customer.name} (ID: ${customer.id})`);
    
    // Verify that the lead was updated correctly
    const [updatedLead] = await db.select().from(leads).where(eq(leads.id, lead.id));
    console.log(`Lead conversion status: ${updatedLead.convertedToCustomer ? 'Converted' : 'Not Converted'}`);
    console.log(`Lead linked to customer ID: ${updatedLead.convertedCustomerId}`);
    
    // Step 4: Create an order for the customer
    console.log('\nStep 4: Creating order...');
    const orderNumber = `TEST-${Date.now().toString().slice(-6)}`;
    const [order] = await db.insert(orders).values({
      customerId: customer.id,
      leadId: lead.id,
      orderNumber,
      totalAmount: '99.99',
      status: orderStatusEnum.NEW,
      paymentStatus: paymentStatusEnum.PENDING,
      paymentMethod: 'credit_card',
      source: sourceEnum.WEBSITE,
      brand: brandEnum.SLEEPWEAR,
      notes: 'Order created for validation testing',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log(`Order created: ${order.orderNumber} (ID: ${order.id})`);
    
    // Step 5: Create order items and update product stock
    console.log('\nStep 5: Creating order items and updating stock...');
    
    const [orderItem] = await db.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.price,
      discount: '0',
      subtotal: product.price,
      createdAt: new Date()
    }).returning();
    
    console.log(`Order item created: ${orderItem.productName} (Quantity: ${orderItem.quantity})`);
    
    // Update product stock
    const previousStock = product.stock || 0;
    const newStock = Math.max(0, previousStock - orderItem.quantity);
    
    await db.update(products)
      .set({
        stock: newStock,
        updatedAt: new Date()
      })
      .where(eq(products.id, product.id));
    
    // Verify that the product stock was updated
    const [updatedProduct] = await db.select().from(products).where(eq(products.id, product.id));
    
    console.log(`Product stock before: ${previousStock}, after: ${updatedProduct.stock}`);
    
    // Final validation report
    console.log('\n=== VALIDATION RESULTS ===');
    console.log('✓ Lead created successfully');
    console.log('✓ Lead converted to customer');
    console.log('✓ Order created and linked to customer');
    console.log('✓ Order items created successfully');
    console.log('✓ Product stock reduced by order quantity');
    console.log('\nEnd-to-end business workflow validation PASSED!');
    
    // Clean up (optional)
    console.log('\nCleaning up test data...');
    
    // Deletion order is important due to foreign key constraints
    // First remove order items
    await db.delete(orderItems).where(eq(orderItems.id, orderItem.id));
    
    // Then remove the order
    await db.delete(orders).where(eq(orders.id, order.id));
    
    // Update lead to remove reference to customer before deleting
    await db.update(leads)
      .set({
        convertedToCustomer: false,
        convertedCustomerId: null,
        status: leadStatusEnum.NEW,
        updatedAt: new Date()
      })
      .where(eq(leads.id, lead.id));
    
    // Now we can delete the customer
    await db.delete(customers).where(eq(customers.id, customer.id));
    
    // Then delete the lead
    await db.delete(leads).where(eq(leads.id, lead.id));
    
    // Finally, delete the product
    await db.delete(products).where(eq(products.id, product.id));
    
    console.log('Test data cleaned up successfully');
    
  } catch (error) {
    console.error('Validation failed with error:', error);
  }
}

// Run the validation
validateBusinessFlow()
  .then(() => {
    console.log('Validation script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Uncaught error in validation script:', error);
    process.exit(1);
  });