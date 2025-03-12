/**
 * Enhanced API Error classes for our application
 * 
 * This module provides specialized error classes for different HTTP error scenarios
 */

// Type for validation error records
export interface ValidationErrors {
  [field: string]: string[];
}

/**
 * Base API Error class with support for HTTP status codes
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly errorCode?: string;
  readonly context?: Record<string, any>;
  readonly validationErrors?: ValidationErrors;
  
  /**
   * Create a new API error
   * @param message Human-readable error message
   * @param statusCode HTTP status code (defaults to 500)
   * @param options Additional error options
   */
  constructor(
    message: string, 
    statusCode: number = 500, 
    options: {
      errorCode?: string;
      context?: Record<string, any>;
      validationErrors?: ValidationErrors;
    } = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = options.errorCode;
    this.context = options.context;
    this.validationErrors = options.validationErrors;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message: string, options: {
    errorCode?: string;
    context?: Record<string, any>;
  } = {}) {
    return new ApiError(message, 400, options);
  }
  
  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message: string = 'Unauthorized', options: {
    errorCode?: string;
    context?: Record<string, any>;
  } = {}) {
    return new ApiError(message, 401, options);
  }
  
  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message: string = 'Forbidden', options: {
    errorCode?: string;
    context?: Record<string, any>;
  } = {}) {
    return new ApiError(message, 403, options);
  }
  
  /**
   * Create a 404 Not Found error
   */
  static notFound(message: string = 'Resource not found', options: {
    errorCode?: string;
    context?: Record<string, any>;
  } = {}) {
    return new ApiError(message, 404, options);
  }
  
  /**
   * Create a 409 Conflict error
   */
  static conflict(message: string = 'Resource already exists', options: {
    errorCode?: string;
    context?: Record<string, any>;
  } = {}) {
    return new ApiError(message, 409, options);
  }
  
  /**
   * Create a 422 Unprocessable Entity error with validation errors
   */
  static validation(
    message: string = 'Validation failed', 
    validationErrors: ValidationErrors, 
    options: {
      errorCode?: string;
      context?: Record<string, any>;
    } = {}
  ) {
    return new ApiError(message, 422, {
      ...options,
      validationErrors
    });
  }
  
  /**
   * Create a 500 Internal Server Error
   */
  static internal(message: string = 'Internal server error', options: {
    errorCode?: string;
    context?: Record<string, any>;
  } = {}) {
    return new ApiError(message, 500, options);
  }
  
  /**
   * Create a 502 Bad Gateway error
   */
  static badGateway(message: string = 'Bad gateway', options: {
    errorCode?: string;
    context?: Record<string, any>;
  } = {}) {
    return new ApiError(message, 502, options);
  }
  
  /**
   * Create a 503 Service Unavailable error
   */
  static serviceUnavailable(message: string = 'Service unavailable', options: {
    errorCode?: string;
    context?: Record<string, any>;
  } = {}) {
    return new ApiError(message, 503, options);
  }
  
  /**
   * Create a 504 Gateway Timeout error
   */
  static gatewayTimeout(message: string = 'Gateway timeout', options: {
    errorCode?: string;
    context?: Record<string, any>;
  } = {}) {
    return new ApiError(message, 504, options);
  }
}

/**
 * Database error class
 */
export class DatabaseError extends ApiError {
  constructor(
    message: string = 'Database error occurred', 
    options: {
      errorCode?: string;
      context?: Record<string, any>;
      cause?: Error;
    } = {}
  ) {
    // Create enhanced context with database-specific info
    const enhancedContext = {
      ...(options.context || {}),
      errorType: 'database',
      cause: options.cause?.message,
    };
    
    // Pass enhanced context to parent constructor
    super(message, 500, {
      ...options,
      context: enhancedContext
    });
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends ApiError {
  readonly serviceName: string;
  
  constructor(
    serviceName: string,
    message: string = 'External service error',
    statusCode: number = 502,
    options: {
      errorCode?: string;
      context?: Record<string, any>;
    } = {}
  ) {
    // Create enhanced context with service-specific info
    const enhancedContext = {
      ...(options.context || {}),
      errorType: 'external_service',
      serviceName
    };
    
    // Pass enhanced context to parent constructor
    super(message, statusCode, {
      ...options,
      context: enhancedContext
    });
    this.serviceName = serviceName;
    
    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * Formatting utility for error messages
 * @param message Base message
 * @param details Details to append
 * @returns Formatted error message
 */
export function formatErrorMessage(message: string, details?: string): string {
  return details ? `${message}: ${details}` : message;
}