/**
 * Archivo de configuración global para Civetta CRM
 * Mantiene configuraciones centralizadas para entornos de desarrollo y producción
 */

export const config = {
  // Configuración del servidor
  server: {
    // Usar puerto 3000 por defecto, o el definido en variables de entorno
    port: process.env.PORT || 3000,
    // Bind a todas las interfaces de red para acceso externo
    host: process.env.HOST || '0.0.0.0',
    // Modo de entorno
    environment: process.env.NODE_ENV || 'development'
  },

  // Configuración de la base de datos
  database: {
    // La cadena de conexión se mantiene en la variable de entorno
    url: process.env.DATABASE_URL,
    poolSize: 10,
    // Tiempo de espera para consultas en ms
    queryTimeout: 30000
  },

  // Configuración de la aplicación
  app: {
    name: 'CIVETTA CRM',
    version: '1.0.0',
    // Tiempo de sesión en milisegundos (4 horas)
    sessionTimeout: 4 * 60 * 60 * 1000
  },

  // Rutas de archivos y carpetas
  paths: {
    // Ruta a los archivos estáticos del frontend
    static: './client/public',
    // Ruta al HTML principal
    indexHtml: './client/public/index.html'
  }
};

export default config;