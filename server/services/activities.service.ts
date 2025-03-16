/**
 * Servicio para gestión de actividades y calendario CRM
 */
import { Request, Response } from 'express';
import { Express } from 'express';
import { db } from '../../db';
import { 
  activities, 
  customers, 
  leads, 
  crmUsers, 
  opportunities,
  activityTypeEnum, 
  activityStatusEnum,
  priorityEnum
} from '../../db/schema';
import { eq, and, or, like, desc, asc, inArray, gte, lte, SQL, sql, isNull, isNotNull } from 'drizzle-orm';
import { Service } from './service-registry';
import { appEvents, EventTypes } from '../lib/event-emitter';
import { validateBody, validateParams, handleDatabaseError } from '../validation';
import { z } from 'zod';

/**
 * Esquema para ID de actividad como parámetro
 */
export const activityIdParamSchema = z.object({
  id: z.string().min(1).transform(val => parseInt(val)),
});

/**
 * Esquema para crear/actualizar actividades
 */
export const activitySchema = z.object({
  type: z.enum(Object.values(activityTypeEnum) as [string, ...string[]]),
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
  customerId: z.number().optional(),
  leadId: z.number().optional(),
  opportunityId: z.number().optional(),
  assignedUserId: z.number(),
  status: z.enum(Object.values(activityStatusEnum) as [string, ...string[]]),
  priority: z.enum(Object.values(priorityEnum) as [string, ...string[]]).optional(),
  reminderTime: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
}).refine(data => {
  // Debe tener al menos un cliente, lead u oportunidad asociada
  return !!data.customerId || !!data.leadId || !!data.opportunityId;
}, {
  message: "Debe especificar al menos un cliente, lead u oportunidad"
});

/**
 * Servicio para gestionar actividades del calendario
 */
export class ActivitiesService implements Service {
  name = "activities";

  registerRoutes(app: Express): void {
    // Rutas para actividades
    app.get('/api/activities', async (req: Request, res: Response) => {
      await this.getAllActivities(req, res);
    });

    app.get('/api/activities/:id', validateParams(activityIdParamSchema), async (req: Request, res: Response) => {
      await this.getActivityById(req, res);
    });

    app.post('/api/activities', validateBody(activitySchema), async (req: Request, res: Response) => {
      await this.createActivity(req, res);
    });

    app.patch('/api/activities/:id', 
      validateParams(activityIdParamSchema), 
      validateBody(activitySchema), 
      async (req: Request, res: Response) => {
        await this.updateActivity(req, res);
      }
    );

    app.delete('/api/activities/:id', validateParams(activityIdParamSchema), async (req: Request, res: Response) => {
      await this.deleteActivity(req, res);
    });

    // Ruta para buscar actividades por fecha o filtros
    app.get('/api/activities/search', async (req: Request, res: Response) => {
      await this.searchActivities(req, res);
    });

    // Ruta para obtener actividades por rango de fechas (para vista de calendario)
    app.get('/api/activities/calendar', async (req: Request, res: Response) => {
      await this.getCalendarActivities(req, res);
    });
  }

  /**
   * Obtener todas las actividades con datos relacionados
   */
  async getAllActivities(req: Request, res: Response): Promise<void> {
    try {
      const { 
        status, 
        type, 
        priority, 
        assignedUserId, 
        customerId, 
        leadId, 
        opportunityId,
        dateFrom,
        dateTo
      } = req.query;

      const conditions: SQL[] = [];

      // Filtrar por estado
      if (status) {
        conditions.push(eq(activities.status, status as string));
      }

      // Filtrar por tipo
      if (type) {
        conditions.push(eq(activities.type, type as string));
      }

      // Filtrar por prioridad
      if (priority) {
        conditions.push(eq(activities.priority, priority as string));
      }

      // Filtrar por usuario asignado
      if (assignedUserId) {
        conditions.push(eq(activities.assignedUserId, parseInt(assignedUserId as string)));
      }

      // Filtrar por cliente
      if (customerId) {
        conditions.push(eq(activities.customerId, parseInt(customerId as string)));
      }

      // Filtrar por lead
      if (leadId) {
        conditions.push(eq(activities.leadId, parseInt(leadId as string)));
      }

      // Filtrar por oportunidad
      if (opportunityId) {
        conditions.push(eq(activities.opportunityId, parseInt(opportunityId as string)));
      }

      // Filtrar por rango de fechas (inicio de actividad)
      if (dateFrom) {
        conditions.push(gte(activities.startTime, new Date(dateFrom as string)));
      }

      if (dateTo) {
        conditions.push(lte(activities.startTime, new Date(dateTo as string)));
      }

      // Consulta con JOIN para obtener datos relacionados
      const activityList = await db.query.activities.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        },
        orderBy: [desc(activities.startTime)]
      });

      res.json(activityList);
    } catch (error) {
      console.error('Error al obtener actividades:', error);
      res.status(500).json({ error: 'Error al obtener actividades' });
    }
  }

  /**
   * Obtener una actividad por ID con datos relacionados
   */
  async getActivityById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const activityId = parseInt(id);

      if (isNaN(activityId)) {
        res.status(400).json({ error: 'ID de actividad inválido' });
        return;
      }

      const activity = await db.query.activities.findFirst({
        where: eq(activities.id, activityId),
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        }
      });

      if (!activity) {
        res.status(404).json({ error: 'Actividad no encontrada' });
        return;
      }

      res.json(activity);
    } catch (error) {
      console.error('Error al obtener actividad:', error);
      res.status(500).json({ error: 'Error al obtener actividad' });
    }
  }

  /**
   * Crear una nueva actividad
   */
  async createActivity(req: Request, res: Response): Promise<void> {
    try {
      const activityData = req.body;

      // Asegurarse de que las fechas sean objetos Date
      const newActivity = {
        ...activityData,
        startTime: new Date(activityData.startTime),
        endTime: new Date(activityData.endTime),
        reminderTime: activityData.reminderTime ? new Date(activityData.reminderTime) : null,
      };

      const insertedActivity = await db.insert(activities)
        .values(newActivity)
        .returning();

      if (insertedActivity.length === 0) {
        res.status(500).json({ error: 'Error al crear la actividad' });
        return;
      }

      const createdActivity = insertedActivity[0];

      // Recuperar la actividad con sus relaciones
      const activityWithRelations = await db.query.activities.findFirst({
        where: eq(activities.id, createdActivity.id),
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
      console.error('Error al crear actividad:', error);
      handleDatabaseError(res, error, 'actividad');
    }
  }

  /**
   * Actualizar una actividad
   */
  async updateActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const activityId = parseInt(id);
      const activityData = req.body;

      if (isNaN(activityId)) {
        res.status(400).json({ error: 'ID de actividad inválido' });
        return;
      }

      // Verificar que la actividad existe
      const existingActivity = await db.query.activities.findFirst({
        where: eq(activities.id, activityId)
      });

      if (!existingActivity) {
        res.status(404).json({ error: 'Actividad no encontrada' });
        return;
      }

      // Asegurarse de que las fechas sean objetos Date
      const updateData = {
        ...activityData,
        startTime: new Date(activityData.startTime),
        endTime: new Date(activityData.endTime),
        reminderTime: activityData.reminderTime ? new Date(activityData.reminderTime) : null,
        updatedAt: new Date()
      };

      // Actualizar la actividad
      await db.update(activities)
        .set(updateData)
        .where(eq(activities.id, activityId));

      // Recuperar la actividad actualizada con sus relaciones
      const updatedActivity = await db.query.activities.findFirst({
        where: eq(activities.id, activityId),
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        }
      });

      // Emitir evento de actividad actualizada
      appEvents.emit(EventTypes.ACTIVITY_UPDATED, updatedActivity);

      res.json(updatedActivity);
    } catch (error) {
      console.error('Error al actualizar actividad:', error);
      handleDatabaseError(res, error, 'actividad');
    }
  }

  /**
   * Eliminar una actividad
   */
  async deleteActivity(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const activityId = parseInt(id);

      if (isNaN(activityId)) {
        res.status(400).json({ error: 'ID de actividad inválido' });
        return;
      }

      // Verificar que la actividad existe
      const existingActivity = await db.query.activities.findFirst({
        where: eq(activities.id, activityId),
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        }
      });

      if (!existingActivity) {
        res.status(404).json({ error: 'Actividad no encontrada' });
        return;
      }

      // Eliminar la actividad
      await db.delete(activities)
        .where(eq(activities.id, activityId));

      // Emitir evento de actividad eliminada
      appEvents.emit(EventTypes.ACTIVITY_DELETED, existingActivity);

      res.status(200).json({ message: 'Actividad eliminada correctamente', activity: existingActivity });
    } catch (error) {
      console.error('Error al eliminar actividad:', error);
      handleDatabaseError(res, error, 'actividad');
    }
  }

  /**
   * Buscar actividades por varios criterios
   */
  async searchActivities(req: Request, res: Response): Promise<void> {
    try {
      const { 
        query, 
        types, 
        statuses, 
        priorities, 
        assignedUserIds,
        dateFrom, 
        dateTo 
      } = req.query;
      
      const conditions: SQL[] = [];
      
      // Búsqueda por texto en título o descripción
      if (query) {
        conditions.push(
          or(
            like(activities.title, `%${query}%`),
            like(activities.description || '', `%${query}%`),
            like(activities.notes || '', `%${query}%`)
          )
        );
      }
      
      // Filtrar por tipos de actividad (múltiples)
      if (types && typeof types === 'string') {
        const typeArray = types.split(',');
        if (typeArray.length > 0) {
          conditions.push(inArray(activities.type, typeArray));
        }
      }
      
      // Filtrar por estados (múltiples)
      if (statuses && typeof statuses === 'string') {
        const statusArray = statuses.split(',');
        if (statusArray.length > 0) {
          conditions.push(inArray(activities.status, statusArray));
        }
      }
      
      // Filtrar por prioridades (múltiples)
      if (priorities && typeof priorities === 'string') {
        const priorityArray = priorities.split(',');
        if (priorityArray.length > 0) {
          conditions.push(inArray(activities.priority || '', priorityArray));
        }
      }
      
      // Filtrar por usuarios asignados (múltiples)
      if (assignedUserIds && typeof assignedUserIds === 'string') {
        const userArray = assignedUserIds.split(',').map(id => parseInt(id));
        if (userArray.length > 0) {
          conditions.push(inArray(activities.assignedUserId, userArray));
        }
      }
      
      // Filtro por rango de fechas (inicio de actividad)
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string);
        conditions.push(gte(activities.startTime, fromDate));
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo as string);
        conditions.push(lte(activities.startTime, toDate));
      }
      
      // Ejecutar la consulta con las condiciones
      const activitiesList = await db.query.activities.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        },
        orderBy: [desc(activities.startTime)]
      });
      
      res.json(activitiesList);
    } catch (error) {
      console.error('Error al buscar actividades:', error);
      res.status(500).json({ error: 'Error al buscar actividades' });
    }
  }

  /**
   * Obtener actividades para la vista de calendario
   */
  async getCalendarActivities(req: Request, res: Response): Promise<void> {
    try {
      const { start, end, userId } = req.query;
      
      if (!start || !end) {
        res.status(400).json({ error: 'Se requieren los parámetros start y end' });
        return;
      }
      
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ error: 'Formato de fecha inválido' });
        return;
      }
      
      const conditions: SQL[] = [
        and(
          gte(activities.startTime, startDate),
          lte(activities.startTime, endDate)
        )
      ];
      
      // Filtrar por usuario asignado si se especifica
      if (userId) {
        conditions.push(eq(activities.assignedUserId, parseInt(userId as string)));
      }
      
      const calendarActivities = await db.query.activities.findMany({
        where: and(...conditions),
        with: {
          customer: true,
          lead: true,
          opportunity: true,
          assignedUser: true
        },
        orderBy: [asc(activities.startTime)]
      });
      
      // Transformar los datos para formato compatible con calendario
      const formattedActivities = calendarActivities.map(activity => {
        // Determinar el contacto asociado (cliente, lead u oportunidad)
        const contact = activity.customer || activity.lead || activity.opportunity;
        const contactName = contact 
          ? 'name' in contact 
            ? contact.name 
            : `${contact.title || ''}`
          : 'Sin contacto';
        
        return {
          id: activity.id,
          title: activity.title,
          start: activity.startTime,
          end: activity.endTime,
          description: activity.description,
          status: activity.status,
          type: activity.type,
          priority: activity.priority,
          contactName,
          contactType: activity.customer ? 'customer' : activity.lead ? 'lead' : 'opportunity',
          contactId: activity.customer?.id || activity.lead?.id || activity.opportunity?.id,
          assignedUser: activity.assignedUser?.fullName || 'Sin asignar',
          assignedUserId: activity.assignedUser?.id,
          notes: activity.notes,
          // Propiedades visuales según tipo y estado
          backgroundColor: this.getActivityBackgroundColor(activity.type, activity.status),
          borderColor: this.getActivityBorderColor(activity.type, activity.status),
          textColor: this.getActivityTextColor(activity.type, activity.status),
        };
      });
      
      res.json(formattedActivities);
    } catch (error) {
      console.error('Error al obtener actividades del calendario:', error);
      res.status(500).json({ error: 'Error al obtener actividades del calendario' });
    }
  }

  /**
   * Definir color de fondo según tipo y estado de actividad
   */
  private getActivityBackgroundColor(type: string, status: string): string {
    if (status === activityStatusEnum.COMPLETED) {
      return '#4CAF50'; // Verde para completadas
    }
    
    if (status === activityStatusEnum.CANCELLED) {
      return '#9E9E9E'; // Gris para canceladas
    }
    
    // Para pendientes, color según tipo
    switch (type) {
      case activityTypeEnum.CALL:
        return '#2196F3'; // Azul para llamadas
      case activityTypeEnum.MEETING:
        return '#673AB7'; // Púrpura para reuniones
      case activityTypeEnum.TASK:
        return '#FF9800'; // Naranja para tareas
      case activityTypeEnum.FOLLOWUP:
        return '#00BCD4'; // Cyan para seguimientos
      default:
        return '#E91E63'; // Rosa para otros tipos
    }
  }

  /**
   * Definir color de borde según tipo y estado de actividad
   */
  private getActivityBorderColor(type: string, status: string): string {
    if (status === activityStatusEnum.COMPLETED) {
      return '#388E3C'; // Verde oscuro para completadas
    }
    
    if (status === activityStatusEnum.CANCELLED) {
      return '#616161'; // Gris oscuro para canceladas
    }
    
    // Para pendientes, color según tipo
    switch (type) {
      case activityTypeEnum.CALL:
        return '#1976D2'; // Azul oscuro para llamadas
      case activityTypeEnum.MEETING:
        return '#512DA8'; // Púrpura oscuro para reuniones
      case activityTypeEnum.TASK:
        return '#F57C00'; // Naranja oscuro para tareas
      case activityTypeEnum.FOLLOWUP:
        return '#0097A7'; // Cyan oscuro para seguimientos
      default:
        return '#C2185B'; // Rosa oscuro para otros tipos
    }
  }

  /**
   * Definir color de texto según tipo y estado de actividad
   */
  private getActivityTextColor(type: string, status: string): string {
    // Texto blanco para todos los estados
    return '#FFFFFF';
  }

  /**
   * Inicializar el servicio
   */
  async initialize(): Promise<void> {
    console.log('Servicio de actividades inicializado');
  }
}

export const activitiesService = new ActivitiesService();