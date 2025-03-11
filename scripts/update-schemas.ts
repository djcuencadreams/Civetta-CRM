/**
 * Script para actualizar y confirmar la coherencia entre los esquemas usados en la aplicación
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Función para agregar o actualizar tipos en schema.ts
function updateSchemaFile() {
  console.log('Actualizando tipos en el archivo schema.ts...');
  
  // Ruta al archivo schema.ts
  const schemaPath = path.join(__dirname, '../db/schema.ts');
  
  // Verificar que exista el archivo
  if (!fs.existsSync(schemaPath)) {
    console.error('Error: No se encontró el archivo schema.ts');
    return;
  }
  
  // Leer el contenido actual
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Agregar las definiciones de tipo si no existen
  const typeDefinitions = `
// Type exports
export type Customer = typeof customers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
`;
  
  // Verificar si ya existen los tipos adicionales
  if (!schemaContent.includes('export type Product =') || 
      !schemaContent.includes('export type Order =') || 
      !schemaContent.includes('export type OrderItem =')) {
    
    // Eliminar el bloque de tipos existente si hay uno
    if (schemaContent.includes('// Type exports')) {
      const typeExportsIndex = schemaContent.indexOf('// Type exports');
      const typesEndIndex = schemaContent.lastIndexOf('export type');
      
      // Encontrar el final del último tipo
      let endPosition = typesEndIndex;
      const lines = schemaContent.slice(typesEndIndex).split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().endsWith(';')) {
          endPosition += lines[i].length + 1; // +1 para el salto de línea
          break;
        }
        endPosition += lines[i].length + 1;
      }
      
      // Reemplazar el bloque de tipos
      schemaContent = schemaContent.slice(0, typeExportsIndex) + typeDefinitions;
    } else {
      // Agregar al final si no existe
      schemaContent += typeDefinitions;
    }
    
    // Guardar los cambios
    fs.writeFileSync(schemaPath, schemaContent, 'utf8');
    console.log('Tipos actualizados correctamente en schema.ts');
  } else {
    console.log('Los tipos ya están correctamente definidos en schema.ts');
  }

  // Verificar y agregar los esquemas de inserción y selección si no existen
  if (!schemaContent.includes('export const insertProductSchema') || 
      !schemaContent.includes('export const insertOrderSchema') || 
      !schemaContent.includes('export const insertOrderItemSchema')) {
    
    // Buscar la posición adecuada para agregar los esquemas
    const insertSchemaPosition = schemaContent.indexOf('export const insertCustomerSchema');
    
    if (insertSchemaPosition !== -1) {
      const insertSchemaDefinitions = `
export const insertProductSchema = createInsertSchema(products);
export const insertOrderSchema = createInsertSchema(orders);
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const insertProductCategorySchema = createInsertSchema(productCategories);
`;
      
      // Encontrar el final de los esquemas de inserción
      let endInsertSchemaPos = insertSchemaPosition;
      const insertLines = schemaContent.slice(insertSchemaPosition).split('\n');
      let lineCount = 0;
      for (let i = 0; i < insertLines.length; i++) {
        lineCount++;
        if (insertLines[i].trim().includes('export const select') || lineCount > 10) {
          break;
        }
        endInsertSchemaPos += insertLines[i].length + 1;
      }
      
      // Insertar las definiciones
      schemaContent = 
        schemaContent.slice(0, endInsertSchemaPos) + 
        insertSchemaDefinitions +
        schemaContent.slice(endInsertSchemaPos);
    }
    
    // Buscar la posición para los esquemas de selección
    const selectSchemaPosition = schemaContent.indexOf('export const selectCustomerSchema');
    
    if (selectSchemaPosition !== -1) {
      const selectSchemaDefinitions = `
export const selectProductSchema = createSelectSchema(products);
export const selectOrderSchema = createSelectSchema(orders);
export const selectOrderItemSchema = createSelectSchema(orderItems);
export const selectProductCategorySchema = createSelectSchema(productCategories);
`;
      
      // Encontrar el final de los esquemas de selección
      let endSelectSchemaPos = selectSchemaPosition;
      const selectLines = schemaContent.slice(selectSchemaPosition).split('\n');
      let lineCount = 0;
      for (let i = 0; i < selectLines.length; i++) {
        lineCount++;
        if (selectLines[i].trim().includes('// Type exports') || lineCount > 10) {
          break;
        }
        endSelectSchemaPos += selectLines[i].length + 1;
      }
      
      // Insertar las definiciones
      schemaContent = 
        schemaContent.slice(0, endSelectSchemaPos) + 
        selectSchemaDefinitions +
        schemaContent.slice(endSelectSchemaPos);
    }
    
    // Guardar los cambios
    fs.writeFileSync(schemaPath, schemaContent, 'utf8');
    console.log('Esquemas de inserción y selección actualizados correctamente en schema.ts');
  } else {
    console.log('Los esquemas de inserción y selección ya están correctamente definidos en schema.ts');
  }
}

// Ejecutar el script
updateSchemaFile();
console.log('Actualización de esquemas completada');