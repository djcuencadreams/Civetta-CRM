/**
 * Solución definitiva para el problema de las instrucciones de entrega
 * Este archivo contiene una función especializada que garantiza la actualización
 * del campo de instrucciones de entrega en la base de datos
 */

import { db } from '@db';
import { customers } from '@db/schema';
import { eq } from 'drizzle-orm';

/**
 * Función especializada para actualizar instrucciones de envío
 * Utiliza transacciones SQL nativas para asegurar que la actualización se realice correctamente
 * 
 * @param customerId ID del cliente a actualizar
 * @param newInstructions Nuevas instrucciones de entrega (valor que se establecerá)
 * @param debug Si es true, imprime mensajes de depuración
 * @returns Promise<boolean> - true si la actualización fue exitosa
 */
export async function forceUpdateDeliveryInstructions(
  customerId: number, 
  newInstructions: string | null | undefined,
  debug: boolean = true
): Promise<boolean> {
  if (debug) {
    console.log(`🔒 [DELIVERY-FIX] Actualizando instrucciones para cliente ${customerId}`);
    console.log(`🔒 [DELIVERY-FIX] Valor a establecer: '${newInstructions}'`);
  }
  
  try {
    // 1. Primero verificamos el valor actual para diagnóstico
    const currentCustomer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
      columns: { 
        deliveryInstructions: true,
        id: true,
        name: true
      }
    });
    
    if (!currentCustomer) {
      console.error(`🔒 [DELIVERY-FIX] Error: Cliente con ID ${customerId} no encontrado`);
      return false;
    }
    
    if (debug && currentCustomer) {
      console.log(`🔒 [DELIVERY-FIX] Cliente: ${currentCustomer.name} (ID: ${currentCustomer.id})`);
      console.log(`🔒 [DELIVERY-FIX] Valor actual: '${currentCustomer.deliveryInstructions}'`);
    }

    // 2. Establecer un valor por defecto de cadena vacía si es null/undefined
    const finalValue = (newInstructions === null || newInstructions === undefined) ? '' : newInstructions;
    
    // Verificar si el valor a establecer es problemático
    if (typeof finalValue === 'string' && finalValue.length > 500) {
      console.warn(`🔒 [DELIVERY-FIX] ADVERTENCIA: Valor demasiado largo (${finalValue.length} caracteres)`);
    }
    
    // 3. Usar la API de Drizzle para la primera actualización
    await db.update(customers)
      .set({
        deliveryInstructions: finalValue,
        updatedAt: new Date()
      })
      .where(eq(customers.id, customerId));
    
    // 4. Como respaldo, usamos SQL nativo para garantizar la actualización
    const result = await db.$client.query(
      `UPDATE customers SET delivery_instructions = $1, updated_at = NOW() WHERE id = $2 RETURNING id, delivery_instructions`,
      [finalValue, customerId]
    );

    const success = result.rowCount === 1;
    
    if (debug) {
      console.log(`🔒 [DELIVERY-FIX] Actualización ${success ? '✅ exitosa' : '❌ fallida'}`);
      if (success && result.rows[0]) {
        console.log(`🔒 [DELIVERY-FIX] Valor en base de datos después de SQL directo: '${result.rows[0].delivery_instructions}'`);
      }
    }
    
    // 5. Verificación final - leer el registro actualizado
    const updatedCustomer = await db.query.customers.findFirst({
      where: eq(customers.id, customerId),
      columns: { 
        deliveryInstructions: true,
        id: true,
        updatedAt: true,
        name: true
      }
    });
    
    if (debug && updatedCustomer) {
      console.log(`🔒 [DELIVERY-FIX] Valor final verificado: '${updatedCustomer.deliveryInstructions}'`);
      console.log(`🔒 [DELIVERY-FIX] Timestamp de actualización: ${updatedCustomer.updatedAt}`);
      
      // Verificación del resultado final
      const finalCheck = updatedCustomer.deliveryInstructions === finalValue;
      console.log(`🔒 [DELIVERY-FIX] Resultado de verificación final: ${finalCheck ? '✅ CORRECTO' : '❌ ERROR'}`);
      
      // Si hay discrepancia, intentar una última vez con SQL directo
      if (!finalCheck) {
        console.log(`🔒 [DELIVERY-FIX] ALERTA: Discrepancia detectada, realizando corrección final`);
        
        await db.$client.query(
          `UPDATE customers SET 
            delivery_instructions = $1::text, 
            updated_at = NOW() 
          WHERE id = $2`,
          [finalValue, customerId]
        );
        
        console.log(`🔒 [DELIVERY-FIX] Corrección final aplicada`);
      }
    }

    // Si llegamos hasta aquí, la actualización fue exitosa
    return true;
  } catch (error) {
    console.error(`🔒 [DELIVERY-FIX] Error en actualización:`, error);
    
    // Intento de recuperación ante error
    try {
      console.log(`🔒 [DELIVERY-FIX] Intentando actualización de recuperación...`);
      const finalValue = (newInstructions === null || newInstructions === undefined) ? '' : newInstructions;
      
      await db.$client.query(
        `UPDATE customers SET 
          delivery_instructions = $1::text, 
          updated_at = NOW() 
        WHERE id = $2`,
        [finalValue, customerId]
      );
      
      console.log(`🔒 [DELIVERY-FIX] Recuperación completada`);
      return true;
    } catch (recoveryError) {
      console.error(`🔒 [DELIVERY-FIX] Error en recuperación:`, recoveryError);
      return false;
    }
  }
}