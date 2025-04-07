// Script para configurar la zona horaria del sistema
process.env.TZ = 'America/Guayaquil'; // Zona horaria de Ecuador
console.log(`Zona horaria configurada a: ${process.env.TZ}`);
console.log(`Hora actual del sistema: ${new Date().toLocaleString()}`);
