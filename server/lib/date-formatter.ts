/**
 * Utilidades para formateo de fechas en zona horaria de Ecuador
 */

/**
 * Formatea una fecha usando la zona horaria de Ecuador
 * @param date Fecha a formatear (por defecto: fecha actual)
 * @param format Formato deseado (full, short, time)
 * @returns String con la fecha formateada
 */
export function formatDateEC(date: Date = new Date(), format: 'full' | 'short' | 'time' = 'full'): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Guayaquil'
  };
  
  switch (format) {
    case 'full':
      // Formato completo: 15/04/2025 14:30:25
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      break;
    case 'short':
      // Formato corto: 15/04/2025
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'time':
      // Solo hora: 14:30:25
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
      options.hour12 = false;
      break;
  }
  
  return date.toLocaleString('es-EC', options);
}

/**
 * Obtiene la fecha actual en zona horaria de Ecuador
 * @returns Objeto Date ajustado a la hora de Ecuador
 */
export function getCurrentDateEC(): Date {
  // Esto funciona porque ya hemos establecido process.env.TZ = 'America/Guayaquil'
  return new Date();
}

/**
 * Formatea una fecha ISO para mostrarla en zona horaria de Ecuador
 * @param isoString String de fecha en formato ISO
 * @param format Formato deseado
 * @returns String con la fecha formateada
 */
export function formatIsoDateEC(isoString: string, format: 'full' | 'short' | 'time' = 'full'): string {
  try {
    const date = new Date(isoString);
    return formatDateEC(date, format);
  } catch (error) {
    return 'Fecha inválida';
  }
}

export default {
  formatDateEC,
  getCurrentDateEC,
  formatIsoDateEC
};