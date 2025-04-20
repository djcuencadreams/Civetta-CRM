# Actualización del Formulario de Envío

## Descripción General
Este documento describe las actualizaciones implementadas en el formulario de envío del sistema. El formulario ha sido reestructurado completamente para seguir un enfoque modular y de pasos secuenciales (wizard), mejorando la experiencia del usuario y permitiendo una mejor gestión del estado del formulario.

## Componentes Principales

### 1. ShippingLabelForm.tsx
- Componente principal que integra el formulario completo
- Implementa un sistema de pasos (wizard) con 4 etapas
- Utiliza animaciones de transición entre pasos
- Incluye barra de progreso visual
- Contiene el modal de confirmación final

### 2. Componentes de Pasos
- **Step1_Form.tsx**: Selección de tipo de cliente (nuevo o existente)
- **Step2_Form.tsx**: Datos del cliente (nombre, apellido, etc.)
- **Step3_Form.tsx**: Dirección de envío (calle, ciudad, provincia, instrucciones)
- Paso 4 (resumen): Implementado directamente en ShippingLabelForm.tsx

### 3. Hook Personalizado: useShippingForm.ts
- Implementa toda la lógica de negocio separada de la UI
- Gestiona el estado del formulario con React Context
- Maneja validaciones con Zod
- Implementa guardado automático como borrador al cambiar de paso
- Verifica clientes existentes por identificación, email o teléfono
- Emite eventos tras completar formulario: 'shipping-form:order-created' y 'orderSaved'

## Mejoras Implementadas

### Experiencia de Usuario
- Animaciones fluidas entre pasos del formulario
- Indicadores visuales de progreso
- Validación en tiempo real con mensajes de error específicos
- Auto-guardado de progreso entre pasos
- Resumen visual antes de la confirmación final

### Arquitectura de Software
- Separación de preocupaciones (UI vs lógica de negocio)
- Uso de React Context para gestión de estado
- Validación robusta con esquemas Zod
- Implementación de interfaces TypeScript para type-safety
- Estructura modular para facilitar mantenimiento

### Características Técnicas
- Guardado automático como borrador entre pasos
- Emisión de eventos para integración con otros componentes
- Validación preventiva para evitar envío de datos incompletos
- Rellenado automático de campos para clientes existentes
- Manejo de errores en caso de fallos de red o del servidor

## Rutas y Endpoints

### Rutas Frontend
- **Ruta principal**: `/shipping` - Versión principal del formulario
- **Ruta embebida**: `/embed/shipping` - Versión para insertar en iframes
- **Rutas adicionales**: Múltiples rutas para compatibilidad con integraciones existentes
  - `/embed/shipping-form`
  - `/embed/shipping-form-static`
  - `/shipping-form`
  - `/etiqueta`
  - `/etiqueta-de-envio`
  - `/wordpress-embed`
  - `/wordpress-embed-modern`
  - `/forms/shipping`

**Nota**: En una futura refactorización, se recomienda consolidar estas rutas y utilizar redirecciones adecuadas.

### Endpoints API
- `/api/shipping/check-customer-v2`: Verifica la existencia de un cliente
- `/api/shipping/check-duplicate`: Verifica si hay clientes duplicados
- `/api/shipping/draft`: Guarda un borrador del formulario
- `/api/shipping/final`: Envía el formulario finalizado 
- `/api/shipping/list`: Obtiene la lista de órdenes

## Estilos y Animaciones
Se ha creado un archivo de estilos específico (`stepAnimations.css`) para las animaciones del formulario, incluyendo:

- Transiciones entre pasos
- Animaciones de la barra de progreso
- Efectos visuales para indicar guardado automático
- Animaciones para alertas y mensajes

## Consideraciones Futuras

### Mejoras Técnicas
- Consolidar las múltiples rutas en rutas canónicas con redirecciones adecuadas
- Implementar una solución para manejo de redirecciones que sea compatible con wouter
- Revisar y actualizar todas las referencias a las rutas antiguas en integraciones externas

### Mejoras de Funcionalidad
- Implementar funcionalidad offline con sincronización posterior
- Añadir opciones de autocompletado para direcciones comunes
- Integrar con servicios de mapas para validación de direcciones
- Mejorar accesibilidad para usuarios con necesidades especiales
- Implementar búsqueda avanzada de clientes existentes