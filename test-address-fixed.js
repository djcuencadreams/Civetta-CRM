/**
 * Test script para verificar la corrección del problema de dirección en clientes
 * Este script compara los resultados de la API original y la API mejorada
 */
import fetch from 'node-fetch';

async function testCustomerAddressFixed() {
  const customerId = "0103556735"; // ID del cliente específico que estamos verificando
  
  console.log("=== TEST: CORRECCIÓN DE DATOS DE DIRECCIÓN ===");
  console.log(`Verificando cliente con ID: ${customerId}`);
  console.log("-------------------------------------------");
  
  try {
    // 1. Verificar directamente los datos del cliente en la base de datos
    const customerData = await fetch(`http://localhost:3000/api/shipping/check-customer-v2?searchType=identification&identifier=${customerId}`);
    const customer = await customerData.json();
    
    if (!customer.found) {
      console.error(`❌ ERROR: Cliente con ID ${customerId} no encontrado en la base de datos!`);
      return;
    }
    
    console.log("✅ Cliente encontrado en la base de datos:");
    console.log("- ID:", customer.customer.id);
    console.log("- Nombre:", customer.customer.name);
    console.log("");
    
    // 2. Verificar los datos de dirección
    console.log("DATOS DE DIRECCIÓN ACTUALES:");
    console.log("- Calle:", customer.customer.street || "(vacío)");
    console.log("- Ciudad:", customer.customer.city || "(vacío)");
    console.log("- Provincia:", customer.customer.province || "(vacío)");
    console.log("- Instrucciones de entrega:", customer.customer.deliveryInstructions || "(vacío)");
    console.log("");
    
    // 3. Verificar si los datos están corregidos
    const idInCity = customer.customer.city === customer.customer.idNumber;
    const emailInInstructions = customer.customer.deliveryInstructions === customer.customer.email;
    
    console.log("VERIFICACIÓN DE CORRECCIONES:");
    console.log("- ¿ID en campo ciudad?", idInCity ? "❌ SÍ (error)" : "✅ NO (correcto)");
    console.log("- ¿Email en instrucciones?", emailInInstructions ? "❌ SÍ (error)" : "✅ NO (correcto)");
    
    // Resultados finales
    if (!idInCity && !emailInInstructions) {
      console.log("\n✅ RESULTADO: Los datos de dirección están CORRECTOS");
    } else {
      console.log("\n❌ RESULTADO: Los datos de dirección todavía tienen PROBLEMAS");
    }
    
  } catch (error) {
    console.error("Error al ejecutar las pruebas:", error);
  }
}

// Ejecutar la prueba
testCustomerAddressFixed();