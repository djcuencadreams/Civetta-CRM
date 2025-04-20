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

### Actualizaciones Recientes (Abril 2025)
- **Ruta Canónica**: Consolidación a una única ruta `/shipping`
- **Componente EmbedShippingForm**: Creación de componente específico para embeber el formulario
- **Corrección de Importaciones**: Arregladas las rutas de importación en los componentes Step1_Form, Step2_Form y Step3_Form 
- **Estilos de Animación**: Mejora del archivo CSS con clases fade-in y fade-out para transiciones
- **Rutas de Diagnóstico**: Añadidas páginas de test para facilitar la depuración

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
- **Ruta canónica única**: `/shipping` - Formulario de envío simplificado
- **Rutas de diagnóstico**: 
  - `/test-shipping` - Página de prueba para el formulario desde el CRM
  - `/test-embed` - Página de prueba para el formulario en modo embed

Se ha simplificado a una única ruta canónica para mejorar la mantenibilidad y seguir las mejores prácticas de desarrollo. Cualquier referencia externa o integración deberá actualizarse para utilizar esta ruta. Además, se han añadido rutas de diagnóstico para facilitar pruebas y depuración, pero éstas no deben utilizarse en producción.

### Configuración de Rutas en el Frontend
La detección de rutas se realiza en `App.tsx` mediante la función `isShippingFormRoute`, que determina si debe usarse el shell normal o el shell embed (sin chrome UI). Esta configuración permite que la misma ruta canónica pueda ser utilizada tanto dentro del CRM como de forma independiente.

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
- Implementar redirecciones desde rutas antiguas (como `/etiqueta`, `/forms/shipping`, etc.) hacia la ruta canónica
- Actualizar integraciones externas (WordPress, etc.) para usar la ruta canónica
- Implementar sistema de monitoreo para detectar solicitudes a las rutas obsoletas

### Mejoras de Funcionalidad
- Implementar funcionalidad offline con sincronización posterior
- Añadir opciones de autocompletado para direcciones comunes
- Integrar con servicios de mapas para validación de direcciones
- Mejorar accesibilidad para usuarios con necesidades especiales
- Implementar búsqueda avanzada de clientes existentes