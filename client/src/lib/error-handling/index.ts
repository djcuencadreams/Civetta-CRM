/**
 * Central entry point for error handling functionality
 * Re-exports all error handling related functions
 */

// Export from monitoring module
export * from './monitoring';

// Export from retry module
export * from './retry';

// Export from validation module
export * from './validation';

// Helper function alias for backward compatibility
export { captureError as logError } from './monitoring';