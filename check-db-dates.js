// Script para verificar la conversión de fechas de la base de datos

// Simulamos una fecha almacenada en la base de datos (en UTC)
const dbDateStr = "2025-04-07T13:47:41.962Z";
const dbDate = new Date(dbDateStr);

// Función formateo similar a la de server/timezone-config.ts
function formatDateTimeEC(date) {
  return date.toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

console.log(`Fecha almacenada en DB (UTC): ${dbDateStr}`);
console.log(`Fecha convertida a ISO: ${dbDate.toISOString()}`);
console.log(`Fecha convertida a local: ${dbDate.toLocaleString()}`);
console.log(`Fecha convertida a Ecuador: ${formatDateTimeEC(dbDate)}`);