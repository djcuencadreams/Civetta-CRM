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
 * Handle unknown errors
 */
function handleUnknownError(
  err: Error, 
  req: Request, 
  res: Response, 
  errorId: string
): void {
  // Log the error with request context
  logError(err, {
    errorId,
    requestId: req.headers['x-request-id'],
    path: req.path,
    method: req.method,
    errorType: 'unknown',
    severity: 'high',
  });
  
  // Send a generic error response
  const response: any = {
    error: {
      message: 'An unexpected error occurred',
      errorId,
      statusCode: 500,
    }
  };
  
  // Add stack trace in development mode
  if (process.env.NODE_ENV !== 'production') {
    response.error.stack = err.stack;
    response.error.details = err.message;
  }
  
  res.status(500).json(response);
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