/**
 * Error handling middleware for Express
 * 
 * This module provides middleware functions for handling errors consistently
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError, ValidationErrors } from './api-error';
import { isDatabaseError, handleDatabaseError } from './database-errors';
import { logError } from '../logger';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main error handling middleware for Express
 * This should be registered after all routes
 */
export function errorHandlerMiddleware(
  err: Error | ApiError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate a unique error ID
  const errorId = uuidv4();
  
  // Handle different error types
  if (err instanceof ZodError) {
    // Convert Zod validation errors to our format
    handleZodError(err, req, res, errorId);
  } else if (isDatabaseError(err)) {
    // Handle database errors
    handleDatabaseErrorResponse(err, req, res, errorId);
  } else if (err instanceof ApiError) {
    // Handle our custom API errors
    handleApiError(err, req, res, errorId);
  } else {
    // Handle unknown errors
    handleUnknownError(err, req, res, errorId);
  }
}

/**
 * Handle Zod validation errors
 */
function handleZodError(
  err: ZodError, 
  req: Request, 
  res: Response, 
  errorId: string
): void {
  // Convert the Zod error to a more readable format
  const validationError = fromZodError(err);
  
  // Map to our validation errors format
  const validationErrors: ValidationErrors = {};
  
  err.errors.forEach((error) => {
    const path = error.path.join('.');
    if (!validationErrors[path]) {
      validationErrors[path] = [];
    }
    validationErrors[path].push(error.message);
  });
  
  // Log the error
  logError(err, {
    errorId,
    requestId: req.headers['x-request-id'],
    path: req.path,
    method: req.method,
    errorType: 'validation',
  });
  
  // Send validation error response
  res.status(422).json({
    error: {
      message: validationError.message,
      errorId,
      statusCode: 422,
      validationErrors,
    }
  });
}

/**
 * Handle database errors
 */
function handleDatabaseErrorResponse(
  err: any, 
  req: Request, 
  res: Response, 
  errorId: string
): void {
  // Convert to our DatabaseError format
  const dbError = handleDatabaseError(err, {
    errorId,
    requestId: req.headers['x-request-id'],
    path: req.path,
    method: req.method,
  });
  
  // Send error response with appropriate status code
  res.status(dbError.statusCode).json({
    error: {
      message: dbError.message,
      errorId,
      statusCode: dbError.statusCode,
      errorCode: dbError.errorCode,
    }
  });
}

/**
 * Handle our custom API errors
 */
function handleApiError(
  err: ApiError, 
  req: Request, 
  res: Response, 
  errorId: string
): void {
  // Log the error
  logError(err, {
    errorId,
    requestId: req.headers['x-request-id'],
    path: req.path,
    method: req.method,
    errorType: 'api',
    statusCode: err.statusCode,
    errorCode: err.errorCode,
  });
  
  // Prepare response data
  const responseData: any = {
    error: {
      message: err.message,
      errorId,
      statusCode: err.statusCode,
    }
  };
  
  // Add error code if available
  if (err.errorCode) {
    responseData.error.errorCode = err.errorCode;
  }
  
  // Add validation errors if available
  if (err.validationErrors) {
    responseData.error.validationErrors = err.validationErrors;
  }
  
  // Send error response
  res.status(err.statusCode).json(responseData);
}

/**
 * Enhanced function to precisely identify genuine client abort errors
 * Only returns true for network disconnections and explicit abort signals
 * 
 * @param err Any error object to check
 * @param options Additional configuration options
 * @returns true if this is definitely a client abort, false otherwise
 */
function isAbortError(
  err: any, 
  options: { verbose?: boolean } = {}
): boolean {
  const verbose = options.verbose ?? false;
  let abortReason = '';
  
  // TIER 1: Check explicit connection abort error codes (most reliable)
  // These error codes reliably indicate client disconnections
  if (err.code) {
    const connectionAbortCodes = [
      'ECONNRESET',    // Connection reset by client
      'ECONNABORTED',  // Connection aborted before request completed
      'EPIPE',         // Broken pipe (client disconnected)
      'ETIMEDOUT',     // Connection timed out
      'ENETUNREACH',   // Network unreachable
      'ENOTCONN'       // Socket not connected
    ];
    
    if (connectionAbortCodes.includes(err.code)) {
      abortReason = `Connection abort code: ${err.code}`;
      if (verbose) console.debug(`Identified abort error by code: ${err.code}`);
      return true;
    }
  }
  
  // TIER 2: Check standard AbortError name (reliable)
  if (err.name === 'AbortError' || err.type === 'aborted') {
    abortReason = 'Standard AbortError name or type';
    if (verbose) console.debug(`Identified abort error by standard name: ${err.name}`);
    return true;
  }
  
  // TIER 3: Check for Node.js-specific abort indicators
  if (err.message && typeof err.message === 'string') {
    const message = err.message.toLowerCase();
    
    // Very specific message patterns that reliably indicate client aborts
    const EXACT_ABORT_PATTERNS = [
      'aborted',
      'socket hang up',
      'premature close',
      'client aborted',
      'client has aborted the request',
      'request aborted',
      'request was aborted',
      'socket interrupted',
      'socket disconnected',
      'network socket disconnected'
    ];
    
    // Check for exact message patterns first (very reliable)
    for (const pattern of EXACT_ABORT_PATTERNS) {
      if (message === pattern || message.includes(pattern)) {
        abortReason = `Exact abort message pattern: "${pattern}"`;
        if (verbose) console.debug(`Identified abort error by exact message: "${pattern}"`);
        return true;
      }
    }
    
    // More complex combined patterns (still reliable)
    if (
      (message.includes('abort') && message.includes('request')) ||
      (message.includes('abort') && message.includes('connection')) ||
      (message.includes('abort') && message.includes('socket')) ||
      (message.includes('client') && message.includes('disconnect'))
    ) {
      abortReason = 'Combined abort + network terms in message';
      if (verbose) console.debug(`Identified abort error by combined message pattern: "${message}"`);
      return true;
    }
  }
  
  // TIER 4: Check HTTP specific status indicators
  if (err.status === 499 || err.statusCode === 499) {
    // 499 is Nginx's code for "Client Closed Request"
    abortReason = 'HTTP 499 Client Closed Request status';
    if (verbose) console.debug('Identified abort error by 499 status code');
    return true;
  }
  
  // Log that we didn't identify this as an abort error if verbose is enabled
  if (verbose && err.message) {
    console.debug(`Not an abort error: "${err.message}"`);
  }
  
  return false;
}

/**
 * Handle unknown errors
 */
/**
 * Handle unknown errors with enhanced abort detection and detailed logging
 * 
 * @param err The error that occurred
 * @param req Express request object
 * @param res Express response object
 * @param errorId Unique identifier for this error
 */
function handleUnknownError(
  err: Error, 
  req: Request, 
  res: Response, 
  errorId: string
): void {
  // Use our enhanced isAbortError with verbose option enabled
  // This ensures we only treat genuine network disconnections as aborts
  if (isAbortError(err, { verbose: true })) {
    // For abort errors, log at info/debug level rather than error level
    // This prevents error monitoring systems from treating aborts as critical issues
    console.debug('Request aborted by client:', {
      errorId,
      requestId: req.headers['x-request-id'] || 'no-request-id',
      url: req.originalUrl || req.url || 'unknown-url',
      path: req.path,
      method: req.method,
      errorType: 'client_abort',
      severity: 'info', // Lower severity for expected aborts
      message: err.message || 'Unknown abort error',
      code: (err as any).code,
      type: err.name || 'Unknown',
      timestamp: new Date().toISOString(),
      // Include client IP if available for debugging patterns
      clientIp: req.ip || req.headers['x-forwarded-for'] || 'unknown'
    });
    
    // The client may have already disconnected, so check connection status
    // before attempting to send a response to avoid secondary errors
    if (!res.headersSent && res.writable) {
      // Return 499 Client Closed Request (Nginx's code for this scenario)
      // This helps differentiate aborts from server errors in logs/metrics
      res.status(499).json({
        error: {
          message: 'Request aborted by client',
          errorId,
          statusCode: 499,
          type: 'abort'
        }
      });
    }
    
    return; // Stop processing - no need to handle further
  }
  
  // This is a genuine error (not an abort), log it with high severity
  // and detailed context for debugging and monitoring
  logError(err, {
    errorId,
    requestId: req.headers['x-request-id'] || 'no-request-id',
    url: req.originalUrl || req.url || 'unknown-url',
    path: req.path,
    method: req.method,
    query: req.query || {},
    params: req.params || {},
    headers: Object.keys(req.headers), // Only log header names, not values (for security)
    errorType: 'unhandled_server_error',
    severity: 'high',
    timestamp: new Date().toISOString(),
    // Additional server context for debugging
    env: process.env.NODE_ENV || 'unknown',
    nodeVersion: process.version
  });
  
  // Prepare a response that's informative but doesn't leak sensitive details
  const response: any = {
    error: {
      message: 'An unexpected error occurred',
      errorId, // Include ID so users can reference it in support requests
      statusCode: 500,
      timestamp: new Date().toISOString()
    }
  };
  
  // Include more details in development mode to aid debugging
  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
    response.error.details = err.message;
    response.error.name = err.name;
    // Add any additional properties that might help with debugging
    if ((err as any).code) response.error.code = (err as any).code;
    if ((err as any).type) response.error.type = (err as any).type;
  }
  
  // Only send response if headers haven't been sent yet
  if (!res.headersSent) {
    res.status(500).json(response);
  }
}

/**
 * 404 Not Found middleware
 * This should be registered after all routes but before error handler
 */
export function notFoundMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only handle API routes with JSON responses
  // Let non-API routes pass through to be handled by the Vite/static middleware
  if (req.path.startsWith('/api')) {
    // Generate a unique error ID
    const errorId = uuidv4();
    
    // Log the not found request
    logError(new Error(`API route not found: ${req.method} ${req.path}`), {
      errorId,
      requestId: req.headers['x-request-id'],
      path: req.path,
      method: req.method,
      errorType: 'not_found',
      severity: 'low',
    });
    
    // Send 404 response
    res.status(404).json({
      error: {
        message: `API route not found: ${req.method} ${req.path}`,
        errorId,
        statusCode: 404,
      }
    });
  } else {
    // Let non-API routes pass through
    next();
  }
}

/**
 * Async route handler wrapper to avoid try/catch in each route
 * @param fn The async route handler function
 * @returns A wrapped function that forwards errors to next()
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}