# Configuración de Zona Horaria

Esta documentación describe la configuración de zona horaria implementada en el CRM para adaptarla a la hora local de Ecuador (GMT-5).

## Implementación

La zona horaria se configura de manera global al inicio de la aplicación mediante las siguientes configuraciones:

1. **Configuración a nivel de sistema**
   - Se establece la variable de entorno `TZ` con el valor `America/Guayaquil` al iniciar la aplicación
   - Esto afecta a todas las funciones de fecha/hora nativas de JavaScript como `new Date()` y `toLocaleString()`

2. **Utilidades de formateo de fechas**
   - Se ha creado una biblioteca de utilidades en `server/lib/date-formatter.ts` para formatear fechas consistentemente
   - Esta biblioteca proporciona funciones para diferentes formatos adaptados a Ecuador

3. **Configuración de Pino Logger**
   - El sistema de logs Pino también utiliza la zona horaria de Ecuador para sus timestamps
   - Garantiza que todos los registros del servidor muestren la hora correcta

## Uso en el código

Para mantener la consistencia, utilice las siguientes prácticas:

### Obtener fecha/hora actual

```typescript
// Usando la biblioteca de utilidades (recomendado)
import { getCurrentDateEC } from 'server/lib/date-formatter';
const now = getCurrentDateEC();

// Alternativa usando Date directamente (también funciona correctamente)
const now = new Date();
```

### Formatear fechas para mostrar

```typescript
// Usando la biblioteca de utilidades
import { formatDateEC, formatIsoDateEC } from 'server/lib/date-formatter';

// Formatear fecha actual (formato completo: 07/04/2025, 07:30:25)
const formattedDate = formatDateEC(new Date(), 'full');

// Formatear solo fecha (formato corto: 07/04/2025)
const formattedShortDate = formatDateEC(new Date(), 'short');

// Formatear solo hora (formato hora: 07:30:25)
const formattedTime = formatDateEC(new Date(), 'time');

// Formatear una fecha ISO (ideal para datos de base de datos)
const isoDate = '2025-04-07T12:30:00Z';
const formatted = formatIsoDateEC(isoDate, 'full'); // Convierte a hora de Ecuador
```

## Consideraciones importantes

1. **Base de datos**
   - PostgreSQL almacena las fechas en UTC internamente
   - Al recuperar fechas de la base de datos, asegúrese de formatearlas adecuadamente para mostrarlas

2. **APIs externas**
   - Cuando se envíen fechas a APIs externas, considere si necesitan formato UTC u otro formato específico
   - Use `toISOString()` para obtener fechas en formato UTC estándar cuando sea necesario para APIs

3. **Frontend**
   - El frontend también utilizará la zona horaria de Ecuador para mostrar fechas
   - Para cambios futuros de zona horaria, considere implementar una detección automática basada en la ubicación del usuario

## Ejemplo de conversión

```
Hora UTC: 2025-04-07T12:30:00Z
Hora Ecuador: 2025-04-07T07:30:00 (UTC-5)
```

## Referencias

- [MDN: Date.prototype.toLocaleString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString)
- [IANA Time Zone Database: America/Guayaquil](https://www.iana.org/time-zones)

---

Documento creado: 7 de abril de 2025
