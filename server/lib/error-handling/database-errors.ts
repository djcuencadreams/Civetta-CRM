/**
 * Database error handling utilities
 * 
 * This module provides functions for handling database-related errors
 */

import { DatabaseError } from './api-error';
import { logError } from '../logger';

/**
 * Database error codes for categorizing errors
 */
export enum DatabaseErrorCode {
  CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  QUERY_ERROR = 'DB_QUERY_ERROR',
  TRANSACTION_ERROR = 'DB_TRANSACTION_ERROR',
  CONSTRAINT_VIOLATION = 'DB_CONSTRAINT_VIOLATION',
  UNIQUE_VIOLATION = 'DB_UNIQUE_VIOLATION',
  FOREIGN_KEY_VIOLATION = 'DB_FOREIGN_KEY_VIOLATION',
  CHECK_VIOLATION = 'DB_CHECK_VIOLATION',
  NOT_NULL_VIOLATION = 'DB_NOT_NULL_VIOLATION',
  DATA_EXCEPTION = 'DB_DATA_EXCEPTION',
  UNKNOWN_ERROR = 'DB_UNKNOWN_ERROR'
}

/**
 * Determine if an error is a Drizzle or PostgreSQL error
 * @param error The error to check
 * @returns True if it's a database error
 */
export function isDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as any;
  
  // Check for PostgreSQL specific error codes
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    return true;
  }
  
  // Check for Drizzle ORM specific properties
  if (err.name && (
    err.name === 'DrizzleError' || 
    err.name.includes('Database') || 
    err.name.includes('SQL')
  )) {
    return true;
  }
  
  // Check for error message that indicates DB error
  if (err.message && typeof err.message === 'string' && (
    err.message.includes('database') ||
    err.message.includes('Database') ||
    err.message.includes('SQL') ||
    err.message.includes('sql') ||
    err.message.includes('query') ||
    err.message.includes('connection')
  )) {
    return true;
  }
  
  return false;
}

/**
 * Get the database error code from a PostgreSQL error
 * @param pgError The PostgreSQL error object
 * @returns The mapped database error code
 */
export function getDatabaseErrorCode(pgError: any): DatabaseErrorCode {
  if (!pgError || typeof pgError !== 'object') {
    return DatabaseErrorCode.UNKNOWN_ERROR;
  }
  
  // Map PostgreSQL error codes to our enum
  // https://www.postgresql.org/docs/current/errcodes-appendix.html
  switch (pgError.code) {
    // Connection errors (Class 08)
    case '08000':
    case '08003':
    case '08006':
    case '08001':
    case '08004':
    case '08007':
    case '08P01':
      return DatabaseErrorCode.CONNECTION_ERROR;
      
    // Integrity constraint violations (Class 23)
    case '23000':
      return DatabaseErrorCode.CONSTRAINT_VIOLATION;
    case '23505':
      return DatabaseErrorCode.UNIQUE_VIOLATION;
    case '23503':
      return DatabaseErrorCode.FOREIGN_KEY_VIOLATION;
    case '23514':
      return DatabaseErrorCode.CHECK_VIOLATION;
    case '23502':
      return DatabaseErrorCode.NOT_NULL_VIOLATION;
      
    // Data exceptions (Class 22)
    case '22000':
    case '22001':
    case '22003':
    case '22007':
    case '22P02':
      return DatabaseErrorCode.DATA_EXCEPTION;
      
    // Query execution errors
    case '42601': // Syntax error
    case '42P01': // Table not found
    case '42703': // Column not found
    case '42P02': // Parameter not found
      return DatabaseErrorCode.QUERY_ERROR;
      
    // Transaction errors
    case '25000':
    case '25001':
    case '25006':
    case '25P02':
      return DatabaseErrorCode.TRANSACTION_ERROR;
      
    default:
      // Check for error message patterns if code is not recognized
      if (pgError.message) {
        const msg = pgError.message.toLowerCase();
        if (msg.includes('connection') || msg.includes('connect')) {
          return DatabaseErrorCode.CONNECTION_ERROR;
        } else if (msg.includes('unique') || msg.includes('duplicate')) {
          return DatabaseErrorCode.UNIQUE_VIOLATION;
        } else if (msg.includes('foreign key')) {
          return DatabaseErrorCode.FOREIGN_KEY_VIOLATION;
        } else if (msg.includes('constraint')) {
          return DatabaseErrorCode.CONSTRAINT_VIOLATION;
        } else if (msg.includes('not null')) {
          return DatabaseErrorCode.NOT_NULL_VIOLATION;
        } else if (msg.includes('transaction')) {
          return DatabaseErrorCode.TRANSACTION_ERROR;
        } else if (msg.includes('query') || msg.includes('sql')) {
          return DatabaseErrorCode.QUERY_ERROR;
        }
      }
      
      return DatabaseErrorCode.UNKNOWN_ERROR;
  }
}

/**
 * Get a user-friendly error message for a database error
 * @param dbError The database error object
 * @param defaultMessage Default message to use if no specific message can be determined
 * @returns User-friendly error message
 */
export function getDatabaseErrorMessage(
  dbError: any,
  defaultMessage: string = 'A database error occurred'
): string {
  if (!dbError) {
    return defaultMessage;
  }
  
  const errorCode = getDatabaseErrorCode(dbError);
  
  // Provide user-friendly messages based on error code
  switch (errorCode) {
    case DatabaseErrorCode.CONNECTION_ERROR:
      return 'Unable to connect to the database. Please try again later.';
      
    case DatabaseErrorCode.UNIQUE_VIOLATION:
      return 'A record with this information already exists.';
      
    case DatabaseErrorCode.FOREIGN_KEY_VIOLATION:
      return 'This operation references data that does not exist or is being used by other records.';
      
    case DatabaseErrorCode.CHECK_VIOLATION:
      return 'The data does not meet validation requirements.';
      
    case DatabaseErrorCode.NOT_NULL_VIOLATION:
      return 'Required information is missing.';
      
    case DatabaseErrorCode.DATA_EXCEPTION:
      return 'The data format is invalid or out of range.';
      
    case DatabaseErrorCode.QUERY_ERROR:
      return 'The operation could not be completed due to a database query error.';
      
    case DatabaseErrorCode.TRANSACTION_ERROR:
      return 'The operation could not be completed due to a transaction error.';
      
    default:
      // Use original message if available, otherwise the default
      return dbError.message || defaultMessage;
  }
}

/**
 * Handle a database error and convert it to an appropriate API error
 * @param error The original database error
 * @param context Additional context information
 * @param friendlyMessage Optional user-friendly message to override the default
 * @returns A DatabaseError with appropriate context
 */
export function handleDatabaseError(
  error: any,
  context: Record<string, any> = {},
  friendlyMessage?: string
): DatabaseError {
  // Get the database error code
  const errorCode = getDatabaseErrorCode(error);
  
  // Get a user-friendly message
  const message = friendlyMessage || getDatabaseErrorMessage(error);
  
  // Log the original error with context
  logError(error, {
    ...context,
    errorType: 'database',
    databaseErrorCode: errorCode,
    originalMessage: error.message
  });
  
  // Create and return a DatabaseError
  return new DatabaseError(message, {
    errorCode,
    context: {
      ...context,
      originalError: {
        message: error.message,
        code: error.code
      }
    },
    cause: error
  });
}