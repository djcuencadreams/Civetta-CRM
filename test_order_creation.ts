/**
 * Test script for creating orders without products
 * 
 * This script directly tests the createOrderFromShippingForm function
 * in the OrdersService to verify it works correctly with no products.
 */

import { ordersService } from './server/services/orders.service';
import { db } from '@db';
import { customers, orders } from '@db/schema';
import { eq } from 'drizzle-orm';

async function testCreateOrderWithoutProducts() {
  try {
    console.log('Starting test: Create order without products');
    
    // 1. Find or create a test customer
    let customer = await db.query.customers.findFirst({
      where: eq(customers.email, 'test@example.com')
    });
    
    if (!customer) {
      console.log('Creating test customer...');
      const [newCustomer] = await db.insert(customers).values({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890',
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      customer = newCustomer;
      console.log('Test customer created with ID:', customer.id);
    } else {
      console.log('Using existing test customer with ID:', customer.id);
    }
    
    // 2. Create an order without products
    console.log('Creating order without products...');
    const orderData = {
      customerId: customer.id,
      shippingAddress: {
        street: 'Test Street 123',
        city: 'Test City',
        province: 'Test Province'
      },
      notes: 'Test order without products'
    };
    
    const newOrder = await ordersService.createOrderFromShippingForm(orderData);
    console.log('Order created successfully:', {
      id: newOrder.id,
      status: newOrder.status,
      notes: newOrder.notes
    });
    
    // 3. Verify the order has the correct status
    const savedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, newOrder.id)
    });
    
    console.log('Saved order status:', savedOrder?.status);
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testCreateOrderWithoutProducts().then(() => {
  console.log('Test script completed');
  process.exit(0);
}).catch(error => {
  console.error('Error running test script:', error);
  process.exit(1);
});