import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

// Configure pino logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  // Add runtime environment information
  base: {
    env: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '0.0.0',
  },
});

/**
 * Creates a scoped logger with a specific module context
 * @param module The module name to use for this logger
 * @returns A configured logger instance
 */
export const createLogger = (module: string) => {
  return logger.child({ module });
};

/**
 * Log an informational message
 * @param message The message to log
 * @param data Optional data to include with the log
 */
export function logInfo(message: string, data: Record<string, any> = {}): void {
  logger.info({ ...data, msg: message });
}

/**
 * Log a warning message
 * @param message The message to log
 * @param data Optional data to include with the log
 */
export function logWarning(message: string, data: Record<string, any> = {}): void {
  logger.warn({ ...data, msg: message });
}

/**
 * Log an error with structured context
 * @param error The error object
 * @param context Additional context for the error
 * @returns A unique error ID
 */
export function logError(
  error: Error | unknown,
  context: Record<string, any> = {}
): string {
  // Generate a unique error ID for reference
  const errorId = context.errorId || uuidv4();
  
  // Extract error details
  const errorDetails = error instanceof Error ? {
    name: error.name,
    message: error.message,
    stack: error.stack,
  } : {
    message: String(error),
  };
  
  // Log the error with all context
  logger.error({
    ...errorDetails,
    ...context,
    errorId,
    time: new Date().toISOString(),
  });
  
  return errorId;
}

/**
 * Express error handler middleware
 * @param err Error object
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export function errorHandler(
  err: any,
  req: any,
  res: any,
  next: any
): void {
  // Generate a unique error ID
  const errorId = uuidv4();
  
  // Log the error with request context
  logError(err, {
    errorId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    origin: req.get('origin') || req.get('host'),
  });
  
  // Determine if this is a known error with a status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Prepare the response body
  const errorResponse = {
    status: statusCode,
    message: err.message || 'Internal Server Error',
    errorId,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  };
  
  // Send the response
  res.status(statusCode).json(errorResponse);
}

// Export the default logger
export default logger;