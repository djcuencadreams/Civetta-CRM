// Script para verificar la zona horaria actual
console.log(`Zona horaria del sistema: ${process.env.TZ}`);
console.log(`Hora actual del sistema: ${new Date().toLocaleString()}`);
console.log(`Hora actual ISO: ${new Date().toISOString()}`);
console.log(`Hora actual (formato Ecuador): ${new Date().toLocaleString('es-EC', {
  timeZone: 'America/Guayaquil',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})}`);