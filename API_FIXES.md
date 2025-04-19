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

2. **Aseguramos el orden correcto de middlewares**:
   - Las rutas API ahora se registran ANTES que el middleware de Vite

3. **Cambio de Puerto**:
   - Cambiamos el puerto del servidor de 3001 a 3002 para evitar conflictos

## Cómo Funciona

El problema principal era que el middleware de Vite estaba capturando todas las solicitudes, incluidas las dirigidas a la API. La solución crea rutas directas y explícitas para estos endpoints críticos que se procesan antes de que el middleware de Vite pueda interceptarlas.

## Instrucciones para el Deployment

1. El servidor ahora utiliza el puerto 3002 por defecto (configurable mediante la variable PORT)
2. Todas las rutas de API deben definirse en server/index.ts antes del middleware de Vite
3. El sistema ya está listo para deployment

## Rutas API Reparadas

- `/api/customers/:id` - Obtiene un cliente específico por ID
- `/api/opportunities` - Lista todas las oportunidades
- `/api/opportunities/pipeline-stages/:brand` - Obtiene las etapas del pipeline para una marca
- `/api/interactions` - Lista todas las interacciones

## Pruebas Realizadas

Se realizaron pruebas con curl para confirmar que todas las rutas devuelven JSON correctamente:

```bash
curl -s -H "Accept: application/json" http://localhost:3002/api/opportunities
curl -s -H "Accept: application/json" http://localhost:3002/api/opportunities/pipeline-stages/sleepwear
curl -s -H "Accept: application/json" http://localhost:3002/api/interactions
curl -s -H "Accept: application/json" http://localhost:3002/api/customers/152
```

Todas las pruebas fueron exitosas, confirmando que la solución es efectiva y lista para deployment.