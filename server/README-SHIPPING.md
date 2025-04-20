# API del Sistema de Formulario de Envío

## Endpoints disponibles

### Verificación de clientes
- **URL**: `/api/shipping/check-customer-v2`
- **Método**: `POST`
- **Payload**:
  ```json
  {
    "query": "string", // Valor a buscar
    "type": "identification | email | phone" // Tipo de búsqueda
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "found": true,
    "customer": {
      "id": 123,
      "name": "Nombre Cliente",
      "firstName": "Nombre",
      "lastName": "Apellido",
      "email": "email@example.com",
      "phone": "0991234567",
      "idNumber": "1234567890",
      "street": "Dirección completa",
      "city": "Ciudad",
      "province": "Provincia",
      "deliveryInstructions": "Instrucciones adicionales"
    }
  }
  ```
- **Respuesta no encontrada**:
  ```json
  {
    "found": false
  }
  ```

### Guardar formulario de envío
- **URL**: `/api/guardar-formulario-envio`
- **Método**: `POST`
- **Payload**:
  ```json
  {
    "firstName": "string",
    "lastName": "string",
    "phoneNumber": "string",
    "email": "string",
    "document": "string",
    "address": "string",
    "city": "string",
    "province": "string",
    "instructions": "string" // opcional
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true,
    "message": "Datos guardados correctamente",
    "customer": {
      "id": 123,
      "name": "Nombre Cliente"
    }
  }
  ```
- **Respuesta de error**:
  ```json
  {
    "success": false,
    "message": "Error al guardar los datos",
    "error": "Descripción del error"
  }
  ```

## Implementación

### Archivos principales
- `routes-shipping-check-customer.ts`: Implementa los endpoints para verificar clientes existentes
- `routes-shipping-react.ts`: Implementa el endpoint para guardar formularios de envío

### Validación
Los endpoints utilizan validación Zod para garantizar la integridad de los datos:

```typescript
// Esquema para verificación de clientes
const customerCheckSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['identification', 'email', 'phone'])
});

// Esquema para guardar formulario
const shippingFormSchema = z.object({
  firstName: z.string().min(2, { message: "El nombre es requerido" }),
  lastName: z.string().min(2, { message: "El apellido es requerido" }),
  phoneNumber: z.string().min(7, { message: "Número de teléfono inválido" }),
  email: z.string().email({ message: "Email inválido" }),
  document: z.string().min(5, { message: "Documento de identificación inválido" }),
  address: z.string().min(5, { message: "Dirección inválida" }),
  city: z.string().min(2, { message: "Ciudad inválida" }),
  province: z.string().min(2, { message: "Provincia inválida" }),
  instructions: z.string().optional(),
});
```

## Flujo de datos

1. El cliente invoca `/api/shipping/check-customer-v2` para verificar si existe un cliente
2. Si existe, se cargan sus datos en el formulario para edición
3. El cliente completa el formulario y envía a `/api/guardar-formulario-envio`
4. El servidor crea o actualiza el cliente según corresponda
5. Se crea una orden pendiente vinculada al cliente

## Seguridad y CORS

Los endpoints implementan configuración CORS para permitir acceso desde múltiples orígenes:

```typescript
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

## Más información

Consulte el documento `AUDIT_SHIPPING_FORM.md` en la raíz del proyecto para una documentación detallada de la auditoría y recomendaciones de mejora.