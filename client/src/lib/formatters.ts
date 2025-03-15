/**
 * Formatea un número como moneda (€) con separador de miles y dos decimales
 * @param amount cantidad a formatear
 * @returns cadena formateada como moneda
 */
export function formatCurrency(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return '€0.00';
  }
  
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
}

/**
 * Formatea una fecha en formato dd/mm/yyyy
 * @param date fecha a formatear
 * @returns cadena de fecha formateada
 */
export function formatDate(date: Date | string): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Verificar si la fecha es válida
  if (isNaN(d.getTime())) {
    return '';
  }
  
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formatea un porcentaje
 * @param percent valor de porcentaje
 * @returns cadena formateada como porcentaje
 */
export function formatPercent(percent: number | string): string {
  const numPercent = typeof percent === 'string' ? parseFloat(percent) : percent;
  
  if (isNaN(numPercent)) {
    return '0%';
  }
  
  return `${numPercent}%`;
}