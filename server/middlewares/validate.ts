/**
 * Middleware para validación de datos utilizando Zod
 * Este middleware valida que los datos de la petición cumplan con el esquema definido
 */
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

/**
 * Middleware para validar el cuerpo de la petición utilizando el esquema Zod proporcionado
 * 
 * @param schema Esquema Zod para validar el cuerpo de la petición
 * @returns Middleware Express
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar el cuerpo de la petición
      const validatedData = await schema.parseAsync(req.body);
      // Reemplazar el cuerpo con los datos validados (y posiblemente transformados)
      req.body = validatedData;
      next();
    } catch (error) {
      // Devolver error de validación
      return res.status(400).json({
        error: 'Validación fallida',
        details: error
      });
    }
  };
};

/**
 * Middleware para validar los parámetros de la ruta utilizando el esquema Zod proporcionado
 * 
 * @param schema Esquema Zod para validar los parámetros de la ruta
 * @returns Middleware Express
 */
export const validateParams = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar los parámetros de la ruta
      const validatedParams = await schema.parseAsync(req.params);
      // Reemplazar los parámetros con los datos validados
      req.params = validatedParams;
      next();
    } catch (error) {
      // Devolver error de validación
      return res.status(400).json({
        error: 'Parámetros de ruta inválidos',
        details: error
      });
    }
  };
};

/**
 * Middleware para validar los parámetros de consulta utilizando el esquema Zod proporcionado
 * 
 * @param schema Esquema Zod para validar los parámetros de consulta
 * @returns Middleware Express
 */
export const validateQuery = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar los parámetros de consulta
      const validatedQuery = await schema.parseAsync(req.query);
      // Reemplazar los parámetros de consulta con los datos validados
      req.query = validatedQuery;
      next();
    } catch (error) {
      // Devolver error de validación
      return res.status(400).json({
        error: 'Parámetros de consulta inválidos',
        details: error
      });
    }
  };
};