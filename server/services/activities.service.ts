/**
 * Servicio para gestionar actividades (Calendario CRM)
 */
import { Request, Response, Express } from "express";
import { eq, and, or, desc, gte, lte, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@db";
import { activities, crmUsers, customers, leads, opportunities } from "@db/schema";
import { Service } from "./service-registry";
import { validateBody, validateParams, handleDatabaseError } from "../validation";
import { EventTypes, appEvents } from "../lib/event-emitter";

/**
 * Esquema de validación para ID de actividad
 */
export const activityIdParamSchema = z.object({
  id: z.coerce.number()
});

/**
 * Esquema de validación para creación/actualización de actividades
 */
export const activitySchema = z.object({
  type: z.enum(["call", "meeting", "task", "followup"]),
  title: z.string().min(1, { message: "El título es obligatorio" }),
  description: z.string().optional(),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  customerId: z.number().optional().nullable(),
  leadId: z.number().optional().nullable(),
  opportunityId: z.number().optional().nullable(),
  assignedUserId: z.number(),
  status: z.enum(["pending", "completed", "cancelled"]).default("pending"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  reminderTime: z.string().optional().nullable(),
  notes: z.string().optional()
});

/**
 * Servicio para gestionar actividades (Calendario CRM)
 */
export class ActivitiesService implements Service {
  name = "activities";

  /**
   * Registra las rutas del API para el servicio de actividades
   */
  registerRoutes(app: Express): void {
    // Obtener todas las actividades con filtros opcionales
    app.get('/api/activities', async (req: Request, res: Response) => {
      await this.getAllActivities(req, res);
    });
    
    // Obtener actividad por ID
    app.get('/api/activities/:id', validateParams(activityIdParamSchema), async (req: Request, res: Response) => {
      await this.getActivityById(req, res);
    });
    
    // Crear nueva actividad
    app.post('/api/activities', validateBody(activitySchema), async (req: Request, res: Response) => {
      await this.createActivity(req, res);
    });
    
    // Actualizar actividad
    app.patch('/api/activities/:id', 
      validateParams(activityIdParamSchema), 
      validateBody(activitySchema), 
      async (req: Request, res: Response) => {
        await this.updateActivity(req, res);
      }
    );
    
    // Eliminar actividad
    app.delete('/api/activities/:id', validateParams(activityIdParamSchema), async (req: Request, res: Response) => {
      await this.deleteActivity(req, res);
    });
    
    // Obtener usuarios del CRM para asignación
    app.get('/api/users', async (_req: Request, res: Response) => {
      try {
        const users = await db.select({
          id: crmUsers.id,
          fullName: crmUsers.fullName
        }).from(crmUsers).orderBy(crmUsers.fullName);
        
        res.json(users);
      } catch (error) {
        console.error('Error fetching CRM users:', error);
        res.status(500).json({ error: "Failed to fetch CRM users" });
      }
    });
  }

  /**
   * Obtener todas las actividades con datos relacionados
   * Soporta filtrado por fechas, tipo, estado y usuario asignado
   */
  async getAllActivities(req: Request, res: Response): Promise<void> {
    try {
      const { 
        startDate, endDate, type, status, 
        userId, customerId, leadId, opportunityId
      } = req.query;
      
      // Construir condiciones de filtrado dinámicamente
      const conditions = [];
      
      // Filtrar por rango de fechas si se proporcionan
      if (startDate) {
        conditions.push(gte(activities.startTime, new Date(startDate as string)));
      }
      
      if (endDate) {
        conditions.push(lte(activities.endTime, new Date(endDate as string)));
      }
      
      // Filtrar por tipo de actividad
      if (type) {
        conditions.push(eq(activities.type, type as string));
      }
      
      // Filtrar por estado
      if (status) {
        conditions.push(eq(activities.status, status as string));
      }
      
      // Filtrar por usuario asignado
      if (userId) {
        conditions.push(eq(activities.assignedUserId, parseInt(userId as string)));
      }
      
      // Filtrar por cliente, lead u oportunidad
      if (customerId) {
        conditions.push(eq(activities.customerId, parseInt(customerId as string)));
      }
      
      if (leadId) {
        conditions.push(eq(activities.leadId, parseInt(leadId as string)));
      }
      
      if (opportunityId) {
        conditions.push(eq(activities.opportunityId, parseInt(opportunityId as string)));
      }
      
      // Ejecutar la consulta con los filtros aplicados
      const activitiesList = await db.query.activities.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(activities.startTime)],
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        }
      });
      
      res.json(activitiesList);
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  }

  /**
   * Obtener una actividad por ID con datos relacionados
   */
  async getActivityById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const activity = await db.query.activities.findFirst({
        where: eq(activities.id, parseInt(id)),
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        }
      });
      
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      
      res.json(activity);
    } catch (error) {
      console.error('Error fetching activity:', error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  }

  /**
   * Crear una nueva actividad
   */
  async createActivity(req: Request, res: Response): Promise<void> {
    try {
      // Parsear las fechas como objetos Date
      const data = {
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        reminderTime: req.body.reminderTime ? new Date(req.body.reminderTime) : null
      };
      
      const [newActivity] = await db.insert(activities)
        .values(data)
        .returning();
      
      // Cargar los datos relacionados para la respuesta
      const activityWithRelations = await db.query.activities.findFirst({
        where: eq(activities.id, newActivity.id),
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        }
      });
      
      // Emitir evento de actividad creada
      appEvents.emit(EventTypes.ACTIVITY_CREATED, activityWithRelations);
      
      res.status(201).json(activityWithRelations);
    } catch (error) {
      console.error('Error creating activity:', error);
      handleDatabaseError(res, error, "activity");
    }
  }

  /**
   * Actualizar una actividad
   */
  async updateActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Obtener la actividad actual para comparar cambios
      const existingActivity = await db.query.activities.findFirst({
        where: eq(activities.id, parseInt(id))
      });
      
      if (!existingActivity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      
      // Parsear las fechas como objetos Date
      const data = {
        ...req.body,
        startTime: new Date(req.body.startTime),
        endTime: new Date(req.body.endTime),
        reminderTime: req.body.reminderTime ? new Date(req.body.reminderTime) : null
      };
      
      const [updatedActivity] = await db.update(activities)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(activities.id, parseInt(id)))
        .returning();
      
      // Cargar los datos relacionados para la respuesta
      const activityWithRelations = await db.query.activities.findFirst({
        where: eq(activities.id, updatedActivity.id),
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        }
      });
      
      // Emitir evento de actividad actualizada
      appEvents.emit(EventTypes.ACTIVITY_UPDATED, activityWithRelations);
      
      // Si cambió el estado, emitir evento específico
      if (existingActivity.status !== updatedActivity.status) {
        appEvents.emit(EventTypes.ACTIVITY_STATUS_CHANGED, {
          activity: activityWithRelations,
          previousStatus: existingActivity.status,
          newStatus: updatedActivity.status
        });
      }
      
      res.json(activityWithRelations);
    } catch (error) {
      console.error('Error updating activity:', error);
      handleDatabaseError(res, error, "activity");
    }
  }

  /**
   * Eliminar una actividad
   */
  async deleteActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Obtener la actividad antes de eliminarla
      const activity = await db.query.activities.findFirst({
        where: eq(activities.id, parseInt(id)),
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        }
      });
      
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      
      // Eliminar la actividad
      await db.delete(activities)
        .where(eq(activities.id, parseInt(id)));
      
      // Emitir evento de actividad eliminada
      appEvents.emit(EventTypes.ACTIVITY_DELETED, activity);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting activity:', error);
      res.status(500).json({ error: "Failed to delete activity" });
    }
  }
  
  /**
   * Inicializa el servicio
   */
  async initialize(): Promise<void> {
    // Registrar en el event emitter si es necesario
    return Promise.resolve();
  }
}

// Exportar instancia del servicio
export const activitiesService = new ActivitiesService();