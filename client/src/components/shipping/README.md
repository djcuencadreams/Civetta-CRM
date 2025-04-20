# Componentes del Sistema de Formulario de Envío

## Estructura de componentes

### Componente principal
- `ShippingLabelForm.tsx`: Formulario multipaso para recolección de datos de envío

### Componentes modulares
- `Step2_Form.tsx`: Formulario para datos personales (paso 2)
- `Step2_CustomerData.tsx`: Subcomponente para información del cliente
- `Step3_Form.tsx`: Formulario para dirección de envío (paso 3)
- `Step3_ShippingAddress.tsx`: Subcomponente para datos de dirección

## Funcionalidades clave

1. **Búsqueda de clientes**: Permite buscar clientes por cédula, email o teléfono
2. **Verificación de duplicados**: Alerta sobre datos que coinciden con clientes existentes
3. **Formulario multipaso**: Interfaz de usuario intuitiva con pasos secuenciales
4. **Validación de datos**: Utiliza Zod para validación en tiempo real
5. **Modal de éxito**: Confirmación visual al completar el proceso

## Flujo de uso

1. El usuario elige si es cliente existente o nuevo
2. Ingresa datos personales con validación en tiempo real
3. Ingresa dirección de envío
4. Confirma los datos ingresados
5. Recibe confirmación de éxito

## Notas para desarrolladores

- El componente utiliza React Hook Form para la gestión del formulario
- Se implementa validación tanto en frontend como en backend
- Las peticiones a la API utilizan:
  - `/api/shipping/check-customer-v2` para verificar duplicados
  - `/api/guardar-formulario-envio` para enviar los datos completos
- Las validaciones clave incluyen:
  - Documento (cédula) mínimo 5 caracteres
  - Email formato válido
  - Teléfono mínimo 7 caracteres
  - Dirección mínimo 5 caracteres

## Puntos de extensión

Para añadir nuevas funcionalidades, considere:

1. Extender el esquema de validación en `ShippingLabelForm.tsx`
2. Añadir pasos adicionales al formulario modificando el switch en la función `renderCurrentStep()`
3. Para campos adicionales, actualizar tanto el frontend como la API en `routes-shipping-react.ts`

## Más información

Consulte el documento `AUDIT_SHIPPING_FORM.md` en la raíz del proyecto para una documentación detallada de la auditoría y recomendaciones de mejora.