# Solución de Problemas API en Civetta CRM

## Problemas Identificados

El sistema estaba experimentando problemas con las rutas de API para diferentes endpoints, incluyendo:
- API de Clientes
- API de Oportunidades
- API de Interacciones

El error común era que el middleware de Vite estaba interceptando todas las peticiones a la API y devolviendo contenido HTML en lugar de JSON.

## Solución Implementada

1. **Creación de rutas directas para APIs críticas**:
   - Implementamos rutas directas para `/api/customers/:id`
   - Agregamos rutas directas para `/api/opportunities` y `/api/opportunities/pipeline-stages/:brand`
   - Creamos una ruta directa para `/api/interactions`
   - Implementamos un endpoint de depuración `/api/debug/opportunities`

2. **Aseguramos el orden correcto de middlewares**:
   - Las rutas API ahora se registran ANTES que el middleware de Vite
   - Usamos cabeceras explícitas para garantizar respuestas JSON: `res.setHeader('Content-Type', 'application/json')`

3. **Cambio de Puerto**:
   - Cambiamos el puerto del servidor de 3001 a 3002 para evitar conflictos

4. **Arreglos en componentes de React**:
   - Corregimos las claves de consulta en React Query para que coincidan exactamente con las URL de la API
   - Mejoramos el manejo de errores y logging para identificar problemas

## Cómo Funciona

El problema principal era que el middleware de Vite estaba capturando todas las solicitudes, incluidas las dirigidas a la API. La solución crea rutas directas y explícitas para estos endpoints críticos que se procesan antes de que el middleware de Vite pueda interceptarlas.

## Instrucciones para el Deployment

1. El servidor ahora utiliza el puerto 3002 por defecto (configurable mediante la variable PORT)
2. Todas las rutas de API deben definirse en server/index.ts antes del middleware de Vite
3. Las claves de consulta en React Query deben coincidir exactamente con las URLs de la API
4. El sistema ya está listo para deployment

## Rutas API Reparadas

- `/api/customers/:id` - Obtiene un cliente específico por ID
- `/api/opportunities` - Lista todas las oportunidades
- `/api/debug/opportunities` - Endpoint alternativo para oportunidades (diagnóstico)
- `/api/opportunities/pipeline-stages/:brand` - Obtiene las etapas del pipeline para una marca
- `/api/interactions` - Lista todas las interacciones

## Pruebas Realizadas

Se realizaron pruebas con curl para confirmar que todas las rutas devuelven JSON correctamente:

```bash
curl -s -H "Accept: application/json" http://localhost:3002/api/opportunities
curl -s -H "Accept: application/json" http://localhost:3002/api/debug/opportunities
curl -s -H "Accept: application/json" http://localhost:3002/api/opportunities/pipeline-stages/sleepwear
curl -s -H "Accept: application/json" http://localhost:3002/api/interactions
curl -s -H "Accept: application/json" http://localhost:3002/api/customers/152
```

Todas las pruebas fueron exitosas, confirmando que la solución es efectiva y lista para deployment.

## Problemas Específicos Resueltos

### Página de Oportunidades
La página de oportunidades no cargaba correctamente los datos debido a:
1. Conflicto en la respuesta del endpoint `/api/opportunities` (devolvía HTML en lugar de JSON)
2. La clave de consulta en React Query no coincidía con la URL real del endpoint
3. Falta de manejo explícito del tipo de contenido en la respuesta

Solución: Creamos un endpoint de depuración `/api/debug/opportunities` y actualizamos el componente React para usar este endpoint con la clave de consulta correcta.

### Página de Interacciones
La página de interacciones tenía problemas similares, resueltos con una ruta directa en server/index.ts.