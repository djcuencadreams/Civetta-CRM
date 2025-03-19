# Guía de Integración del Formulario de Envío en WordPress

Esta guía proporciona tres métodos diferentes para integrar el formulario de etiquetas de envío de Civetta en un sitio WordPress. Cada método tiene sus ventajas según el nivel de acceso y personalización requerido.

## Método 1: Versión Optimizada para WordPress (RECOMENDADO)

Esta es la solución más sencilla y confiable, diseñada específicamente para WordPress.

### Pasos para implementar:

1. En WordPress, crea una nueva página o edita una existente
2. Añade un bloque HTML personalizado
3. Pega el siguiente código:

```html
<iframe 
  src="https://clothing-sales-tracker-jaradanny.replit.app/wordpress-embed" 
  width="100%" 
  height="1200px" 
  style="border:none;overflow:hidden;" 
  scrolling="no"
  frameborder="0">
</iframe>
```

### Ventajas:
- Funciona en cualquier tema de WordPress
- Mantiene todos los estilos correctamente
- Funcionalidad completa garantizada
- No requiere conocimientos técnicos avanzados

## Método 2: Script Cargador (Implementación mediante JavaScript)

Este método utiliza un script personalizado que detecta automáticamente la mejor ruta para cargar el formulario.

### Pasos para implementar:

1. En WordPress, crea una nueva página o edita una existente
2. Añade los siguientes dos elementos:

Primero, añade un bloque HTML con este contenido:
```html
<div id="civetta-shipping-form"></div>
```

Luego, añade otro bloque HTML con el script:
```html
<script src="https://clothing-sales-tracker-jaradanny.replit.app/shipping-form-loader.js"></script>
```

### Ventajas:
- Integración más nativa
- Adaptabilidad al tema del sitio
- Detección automática de la mejor ruta

## Método 3: Implementación Directa del Iframe

Este método es similar al primero pero permite más configuración manual.

### Pasos para implementar:

1. En WordPress, crea una nueva página o edita una existente
2. Añade un bloque HTML personalizado
3. Pega el siguiente código:

```html
<iframe 
  src="https://clothing-sales-tracker-jaradanny.replit.app/forms/shipping" 
  width="100%" 
  height="1200px" 
  style="border:none;overflow:hidden;" 
  scrolling="no"
  frameborder="0">
</iframe>
```

### Ventajas:
- Control directo sobre la URL exacta
- Fácil de implementar en cualquier sitio web

## Solución de problemas comunes

### El formulario no se carga
- Verifica que no tengas bloqueadores de scripts activos
- Asegúrate de que el dominio del CRM esté accesible desde tu red

### El formulario se ve deformado o sin estilos
- Utiliza el Método 1 (optimizado para WordPress)
- Asegúrate de que no haya conflictos con CSS del tema

### Se cargan correctamente pero no se puede enviar el formulario
- Verifica que el navegador permita cookies de terceros
- Asegúrate de que no haya restricciones de CORS en tu servidor

## Requisitos técnicos

- WordPress 5.0 o superior
- Permisos para añadir bloques HTML personalizados
- Conexión a internet para cargar recursos del CRM

---

Para soporte técnico adicional, por favor contacta al administrador del sistema.