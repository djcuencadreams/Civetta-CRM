# Correcciones API: Página de Oportunidades

## Problema Detectado
La página de oportunidades no estaba cargando correctamente los datos debido a problemas con el endpoint de la API. El sistema estaba sirviendo HTML en lugar de JSON cuando se solicitaba el endpoint `/api/opportunities`.

## Diagnóstico
1. **Middleware conflictivo**: El middleware de Vite estaba interceptando las solicitudes a la API y devolviendo HTML en lugar de JSON.
2. **Orden incorrecto de registro**: Las rutas de la API se estaban registrando después del middleware de Vite.
3. **Clave de consulta incorrecta**: El componente React estaba usando una clave de consulta que no coincidía con la URL real del endpoint.

## Soluciones Implementadas

### 1. Creación de endpoint directo
Se agregó un endpoint directo en `server/index.ts` antes del middleware de Vite:

```typescript
// Ruta directa para oportunidades con nombre de endpoint alternativo (para debugging)
app.get("/api/debug/opportunities", async (req, res) => {
  try {
    console.log(`🔧 [API] Solicitud al endpoint de depuración de oportunidades`);
    res.setHeader('Content-Type', 'application/json');
    
    // Obtenemos oportunidades de la base de datos
    const { pool } = await import("@db");
    const result = await pool.query(`
      SELECT o.*, 
             c.name as customer_name,
             l.name as lead_name
      FROM opportunities o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN leads l ON o.lead_id = l.id
      ORDER BY o.created_at DESC
    `);
    
    console.log(`✅ Consulta completada en endpoint de depuración, devolviendo ${result.rows.length} oportunidades`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error en endpoint de depuración de oportunidades:', error);
    res.status(500).json({ error: "Error al obtener oportunidades", details: String(error) });
  }
});
```

### 2. Configuración explícita de cabeceras
Se agregó una cabecera `Content-Type` explícita para asegurar que la respuesta sea tratada como JSON:

```typescript
res.setHeader('Content-Type', 'application/json');
```

### 3. Actualización del componente React
Se modificó el componente de React en `client/src/pages/opportunities/index.tsx` para usar el nuevo endpoint y asegurar que la clave de consulta coincida exactamente con la URL:

```typescript
// Obtener oportunidades - Usamos endpoint de depuración
const { 
  data: opportunitiesData, 
  // ...otros valores
} = useQuery<any[]>({ 
  queryKey: ['/api/debug/opportunities'], // Aseguramos que la clave coincida con la URL exacta
  queryFn: async () => {
    // Código para obtener datos...
    const response = await fetch('/api/debug/opportunities', {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    // Resto del código...
  },
  // ...opciones de la consulta
});
```

## Verificación
Después de las correcciones:
1. El endpoint `/api/debug/opportunities` responde correctamente con datos JSON.
2. La aplicación React puede recibir y procesar los datos.
3. Se confirma la recepción de 9 oportunidades desde la base de datos.

## Aprendizajes
1. En Express, el orden de registro de rutas es crítico - las rutas más específicas deben registrarse antes de middlewares generales.
2. Con React Query, la clave de la consulta debe coincidir exactamente con la URL utilizada para la solicitud.
3. Es útil incluir cabeceras explícitas (`Content-Type`) para evitar problemas de interpretación de la respuesta.
4. Cuando hay problemas complejos, crear endpoints alternativos permite aislar y diagnosticar los problemas.