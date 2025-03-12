/**
 * Validation error handling utilities
 * This module provides functions for handling validation errors
 */
import { z } from 'zod';
import { captureError } from './monitoring';

/**
 * Validation error structure
 */
export interface ValidationErrorsMap {
  [field: string]: string[];
}

/**
 * Extract validation errors from a Zod error object
 * 
 * @param error Zod validation error
 * @returns Object with field-specific validation errors
 */
export function extractZodErrors(error: z.ZodError): ValidationErrorsMap {
  const validationErrors: ValidationErrorsMap = {};
  
  // Iterate through Zod error issues
  for (const issue of error.errors) {
    // Get the field path (e.g., "name" or "address.street")
    const path = issue.path.join('.');
    
    // Initialize array for this field if it doesn't exist
    if (!validationErrors[path]) {
      validationErrors[path] = [];
    }
    
    // Add the error message
    validationErrors[path].push(issue.message);
  }
  
  return validationErrors;
}

/**
 * Extract validation errors from an API error response
 * 
 * @param error Error object from API response
 * @returns Object with field-specific validation errors or empty object
 */
export function extractApiValidationErrors(error: any): ValidationErrorsMap {
  if (error && typeof error === 'object') {
    // Check various common locations for validation errors in API responses
    const errors = error.validationErrors || 
                  error.errors || 
                  (error.response?.data?.validationErrors) || 
                  (error.response?.data?.errors);
    
    if (errors && typeof errors === 'object') {
      return errors as ValidationErrorsMap;
    }
  }
  
  return {};
}

/**
 * Validate a value against a Zod schema and return any validation errors
 * 
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validation result with parsed data or errors
 */
export function validateWithZod<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: ValidationErrorsMap;
} {
  try {
    // Attempt to parse and validate the data
    const parsedData = schema.parse(data);
    return { success: true, data: parsedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Extract and format validation errors
      const errors = extractZodErrors(error);
      
      // Log validation error
      captureError(error, {
        source: 'validation',
        errorType: 'validation_error',
        fieldErrors: errors
      });
      
      return { success: false, errors };
    }
    
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Formats validation errors into user-friendly messages
 * 
 * @param errors Validation errors object
 * @returns User-friendly error messages by field
 */
export function formatValidationErrors(errors: ValidationErrorsMap): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  for (const [field, messages] of Object.entries(errors)) {
    // Join multiple error messages for the same field
    formatted[field] = messages.join('. ');
  }
  
  return formatted;
}

/**
 * Get the first error message from validation errors
 * Useful for displaying a single error message
 * 
 * @param errors Validation errors object
 * @returns First error message or empty string if no errors
 */
export function getFirstValidationError(errors: ValidationErrorsMap): string {
  for (const messages of Object.values(errors)) {
    if (messages && messages.length > 0) {
      return messages[0];
    }
  }
  
  return '';
}