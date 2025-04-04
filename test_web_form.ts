
import { ordersService } from './server/services/orders.service';

async function testWebFormOrder() {
  try {
    // Simular datos del formulario web de Civetta
    const formData = {
      customerName: "María Prueba Web",
      email: "mprueba@test.com",
      phone: "0987654321",
      idNumber: "0923456789",
      shippingAddress: {
        name: "María Prueba Web",
        street: "Av. Francisco de Orellana y Justino Cornejo",
        city: "Guayaquil",
        province: "Guayas",
        instructions: "Edificio WTC piso 8, oficina 802",
        phone: "0987654321",
        email: "mprueba@test.com"
      },
      source: "website",
      brand: "sleepwear",
      notes: "Orden de prueba desde formulario web"
    };

    console.log('Creando orden desde formulario web...');
    const order = await ordersService.createOrderFromShippingForm(formData);
    
    console.log('Orden creada exitosamente:', {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customer: order.customer,
      shippingAddress: order.shippingAddress
    });

  } catch (error) {
    console.error('Error creando orden:', error);
  }
}

// Ejecutar la prueba
testWebFormOrder();
