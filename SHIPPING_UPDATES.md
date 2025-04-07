# Actualizaciones Recientes del Sistema de Envíos - Abril 2025

## Resumen de Cambios

Se han implementado mejoras importantes en el sistema de gestión de direcciones de envío para seguir las mejores prácticas del mercado (similar a Amazon). Las direcciones ahora se almacenan en el perfil del cliente y se utilizan directamente para generar etiquetas de envío, evitando duplicaciones y desincronizaciones.

## Mejoras Implementadas

### 1. Nuevo Endpoint para Verificación de Clientes

Se ha creado un nuevo endpoint `/api/shipping/check-customer-v2` que:

- Devuelve todos los campos de dirección del cliente, incluyendo instrucciones de entrega
- Utiliza validación Zod para asegurar datos correctos
- Proporciona respuestas más detalladas para depuración

### 2. Nuevo Formulario Web Integrado

Se ha creado un nuevo template `embed-form.html` y se ha reemplazado el anterior:

- Utiliza el endpoint mejorado `/api/shipping/check-customer-v2` 
- Incluye selector desplegable para provincias en lugar de campo de texto libre
- Clarifica toda la terminología para usar "Referencia o Instrucciones Especiales para la Entrega"
- Establece siempre `updateCustomerInfo` y `alwaysUpdateCustomer` a `true` para asegurar actualizaciones
- Mejora los mensajes para enfatizar que se está actualizando la información del perfil del cliente
- Elimina referencias a WordPress y se accede directamente desde una ruta dedicada en el CRM

### 3. Ruta Dedicada en el CRM

Se ha añadido la ruta `/embed/shipping-form-static` para acceder directamente al formulario desde el CRM sin necesidad de integración con WordPress.

### 4. Corrección de Bug en la Visualización de Direcciones

Se ha corregido un problema que impedía que los campos de dirección se mostraran correctamente en la segunda etapa del formulario cuando se encontraba un cliente existente.

## Detalles Técnicos

### Archivos Modificados

1. `server/routes-shipping-check-customer.ts` - Nuevo endpoint dedicado
2. `templates/shipping/embed-form.html` - Nuevo formulario mejorado
3. `templates/shipping/wordpress-embed-modern.html` - Template original adaptado
4. `server/routes-shipping.ts` - Rutas actualizadas para servir el nuevo formulario
5. `server/validation.ts` - Middleware de validación para el nuevo endpoint

### Cambios en la Lógica de Actualización de Clientes

El sistema ahora prioriza la información del cliente existente:

```javascript
// Lógica de actualización en routes-shipping-improved.ts
const shouldUpdate = formData.alwaysUpdateCustomer || 
                    !customer.street || 
                    !customer.city || 
                    !customer.province;

if (shouldUpdate) {
  await db.update(customers)
    .set({
      street: formData.street,
      city: formData.city,
      province: formData.province,
      deliveryInstructions: formData.deliveryInstructions || customer.deliveryInstructions,
      // Actualizamos también los campos de contacto si el cliente no los tiene
      phone: customer.phone || formData.phone,
      email: customer.email || formData.email || null,
      updatedAt: new Date()
    })
    .where(eq(customers.id, customer.id));
}
```

## Beneficios de los Cambios

1. **Mayor precisión**: Siempre se usa la información más reciente del cliente
2. **Mejor experiencia del usuario**: No tienen que reingresar su dirección en cada compra
3. **Datos consistentes**: Se evita la duplicación y desincronización de información
4. **Gestión simplificada**: Administradores pueden ver y editar un solo perfil por cliente

## Próximos Pasos

- Mejorar la detección de cambios en la dirección para actualizaciones más inteligentes
- Implementar un historial de direcciones para mantener registros de cambios
- Añadir selección de dirección preferida cuando el cliente tiene múltiples opciones
