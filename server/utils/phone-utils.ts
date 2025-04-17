
// Implementación temporal sin depender de libphonenumber-js
// hasta que se pueda instalar la dependencia correctamente

/**
 * Normaliza un número de teléfono a formato E.164
 * Implementación básica para Ecuador (códigos de país +593)
 * @param raw El número de teléfono en formato crudo
 * @returns El número normalizado o null si no es válido
 */
export function normalizePhoneNumber(raw: string): string | null {
  if (!raw) return null;
  
  // Eliminar todos los caracteres no numéricos
  const digitsOnly = raw.replace(/\D/g, '');
  
  // Validación básica de longitud para números ecuatorianos
  // 10 dígitos para números nacionales
  if (digitsOnly.length === 10) {
    // Asumimos que es un número ecuatoriano (código de país +593)
    return `+593${digitsOnly}`;
  }
  
  // Si ya incluye código de país
  if (digitsOnly.length > 10) {
    // Validación muy básica
    return `+${digitsOnly}`;
  }
  
  // Si no cumple con el formato esperado
  console.warn(`Número de teléfono no válido: ${raw}`);
  return null;
}
