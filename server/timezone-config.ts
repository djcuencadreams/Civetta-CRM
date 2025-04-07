/**
 * Configuración de zona horaria para Ecuador
 * Este archivo se importa al principio de server/index.ts
 * para configurar la zona horaria del sistema
 */

// Configurar zona horaria para Ecuador
process.env.TZ = 'America/Guayaquil';
console.log(`[Timezone] Configurada zona horaria a: ${process.env.TZ} (Ecuador (GMT-5))`);
console.log(`[Timezone] Hora actual: ${new Date().toLocaleString('es-EC')}`);

/**
 * Formatea una fecha y hora en zona horaria de Ecuador
 * @param date Fecha a formatear (por defecto: fecha actual)
 * @returns Fecha formateada en hora de Ecuador
 */
export function formatDateTimeEC(date: Date = new Date()): string {
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

/**
 * Información de zona horaria para Ecuador
 */
export const timezoneInfo = {
  timezone: 'America/Guayaquil',
  offset: '-05:00', // UTC-5
  region: 'Ecuador',
  formatDate: formatDateTimeEC
};