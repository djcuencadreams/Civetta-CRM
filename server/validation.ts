import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

/**
 * Middleware factory for validating request body against a Zod schema
 * 
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
export function validateBody<T extends z.ZodType<any, any, any>>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({
          message: "Validation error",
          errors: validationError.details
        });
      }
      
      // Replace req.body with the validated and typed data
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware factory for validating request params against a Zod schema
 * 
 * @param schema Zod schema to validate against
 * @returns Express middleware function
 */
export function validateParams<T extends z.ZodType<any, any, any>>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.params);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        return res.status(400).json({
          message: "Invalid request parameters",
          errors: validationError.details
        });
      }
      
      // Replace req.params with the validated and typed data
      req.params = result.data as any;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Generic error handler for database operations
 * 
 * @param res Express response object
 * @param error The caught error
 * @param entity Name of the entity being operated on (e.g., "customer", "lead")
 */
export function handleDatabaseError(res: Response, error: any, entity: string) {
  console.error(`Database error (${entity}):`, error);
  
  // Check for specific database error types
  if (error.code === '23505') {
    return res.status(409).json({ 
      message: `The ${entity} already exists with the provided unique identifier` 
    });
  }
  
  if (error.code === '23503') {
    return res.status(400).json({ 
      message: `The referenced ${entity} does not exist` 
    });
  }
  
  // Generic database error
  return res.status(500).json({ 
    message: `An error occurred while processing the ${entity}`,
    errorId: Date.now().toString(36)
  });
}
