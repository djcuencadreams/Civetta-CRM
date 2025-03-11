import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

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
 * Request logging middleware for Express
 * Logs information about each incoming request and its response
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Generate a unique request ID if not provided
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  
  // Set the request ID header on response
  res.setHeader('X-Request-ID', requestId);
  
  // Record start time
  const startTime = process.hrtime();
  
  // Create a request-specific logger
  const reqLogger = logger.child({
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  
  // Log incoming request
  reqLogger.info('Request received');
  
  // Log response when complete
  res.on('finish', () => {
    // Calculate response time
    const hrDuration = process.hrtime(startTime);
    const responseTimeMs = hrDuration[0] * 1000 + hrDuration[1] / 1000000;
    
    const logData = {
      statusCode: res.statusCode,
      responseTimeMs: Math.round(responseTimeMs),
      contentLength: res.get('content-length') || 0
    };
    
    // Log with appropriate level based on response code
    if (res.statusCode >= 500) {
      reqLogger.error(logData, 'Request failed with server error');
    } else if (res.statusCode >= 400) {
      reqLogger.warn(logData, 'Request failed with client error');
    } else {
      reqLogger.info(logData, 'Request completed successfully');
    }
  });
  
  next();
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
  req: Request,
  res: Response,
  next: NextFunction
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
    requestId: req.headers['x-request-id'] || 'unknown',
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

/**
 * Custom API Error class with built-in status code handling
 */
export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
  
  static badRequest(message: string) {
    return new ApiError(message, 400);
  }
  
  static unauthorized(message: string = 'Unauthorized') {
    return new ApiError(message, 401);
  }
  
  static forbidden(message: string = 'Forbidden') {
    return new ApiError(message, 403);
  }
  
  static notFound(message: string = 'Resource not found') {
    return new ApiError(message, 404);
  }
  
  static conflict(message: string = 'Resource conflict') {
    return new ApiError(message, 409);
  }
  
  static internal(message: string = 'Internal Server Error') {
    return new ApiError(message, 500);
  }
}

// Export the default logger
export default logger;