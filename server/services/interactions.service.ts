/**
 * Servicio para manejar interacciones con clientes y leads
 */
import { Request, Response } from 'express';
import { Express } from 'express';
import { db } from '../../db';
// Importaciones directas del esquema
import { 
  interactions, 
  customers, 
  leads, 
  crmUsers, 
  interactionTypeEnum, 
  interactionChannelEnum,
  interactionRelations
} from '../../db/schema';
import { eq, and, or, like, desc, asc, inArray, gte, lte, SQL, sql } from 'drizzle-orm';
import { Service } from './service-registry';
import { appEvents, EventTypes } from '../lib/event-emitter';
import { validateBody, validateParams, handleDatabaseError } from '../validation';
import { z } from 'zod';

// Comprobación simple para verificar si un elemento existe en un schema
const schemaToCheck = {
  interactions,
  customers,
  leads,
  crmUsers
};

/**
 * Esquema para ID de interacción como parámetro
 */
export const interactionIdParamSchema = z.object({
  id: z.string().min(1).transform(val => parseInt(val)),
});

/**
 * Esquema para crear/actualizar interacciones
 */
export const interactionSchema = z.object({
  customerId: z.number().optional(),
  leadId: z.number().optional(),
  opportunityId: z.number().optional(),
  type: z.enum(Object.values(interactionTypeEnum) as [string, ...string[]]),
  channel: z.enum(Object.values(interactionChannelEnum) as [string, ...string[]]),
  content: z.string().min(3),
  attachments: z.array(z.object({
    url: z.string(),
    name: z.string(),
    type: z.string()
  })).optional(),
  assignedUserId: z.number().optional(),
  isResolved: z.boolean().optional(),
  resolutionNotes: z.string().optional(),
}).refine(data => {
  // Debe tener al menos customerId o leadId
  return !!data.customerId || !!data.leadId || !!data.opportunityId;
}, {
  message: "Debe especificar al menos un cliente, lead u oportunidad",
});

/**
 * Servicio para gestionar interacciones
 */
export class InteractionsService implements Service {
  name = "interactions";

  registerRoutes(app: Express): void {
    // Ruta para obtener todas las interacciones
    app.get('/api/interactions', async (req: Request, res: Response) => {
      try {
        await this.getAllInteractions(req, res);
      } catch (error) {
        handleDatabaseError(res, error, "interacción");
      }
    });

    // Ruta para obtener una interacción por ID
    app.get('/api/interactions/:id', validateParams(interactionIdParamSchema), async (req: Request, res: Response) => {
      try {
        await this.getInteractionById(req, res);
      } catch (error) {
        handleDatabaseError(res, error, "interacción");
      }
    });

    // Ruta para crear una nueva interacción
    app.post('/api/interactions', validateBody(interactionSchema), async (req: Request, res: Response) => {
      try {
        await this.createInteraction(req, res);
      } catch (error) {
        handleDatabaseError(res, error, "interacción");
      }
    });

    // Ruta para actualizar una interacción
    app.patch('/api/interactions/:id', validateParams(interactionIdParamSchema), 
      validateBody(interactionSchema), async (req: Request, res: Response) => {
      try {
        await this.updateInteraction(req, res);
      } catch (error) {
        handleDatabaseError(res, error, "interacción");
      }
    });

    // Ruta para eliminar una interacción
    app.delete('/api/interactions/:id', validateParams(interactionIdParamSchema), async (req: Request, res: Response) => {
      try {
        await this.deleteInteraction(req, res);
      } catch (error) {
        handleDatabaseError(res, error, "interacción");
      }
    });

    // Ruta para buscar interacciones
    app.get('/api/interactions/search', async (req: Request, res: Response) => {
      try {
        await this.searchInteractions(req, res);
      } catch (error) {
        handleDatabaseError(res, error, "interacción");
      }
    });

    // Ruta para obtener usuarios del CRM (para asignación)
    app.get('/api/users', async (_req: Request, res: Response) => {
      try {
        // Simulamos lista de usuarios
        return res.json([
          { id: 1, fullName: "Admin CRM" },
          { id: 2, fullName: "Vendedor 1" },
          { id: 3, fullName: "Soporte Técnico" }
        ]);
      } catch (error) {
        handleDatabaseError(res, error, "usuarios");
      }
    });
  }

  /**
   * Obtener todas las interacciones con datos relacionados
   */
  async getAllInteractions(req: Request, res: Response): Promise<void> {
    try {
      // Extraer parámetros de consulta
      const {
        contactType,
        contactId,
        channel,
        type,
        assignedUserId,
        dateFrom,
        dateTo,
        query,
      } = req.query;

      // Construir las condiciones de filtrado
      const conditions: SQL[] = [];

      // Filtrar por tipo de contacto y ID
      if (contactType === 'customer' && contactId) {
        conditions.push(eq(interactions.customerId, parseInt(contactId as string)));
      } else if (contactType === 'lead' && contactId) {
        conditions.push(eq(interactions.leadId, parseInt(contactId as string)));
      }

      // Filtrar por canal
      if (channel) {
        conditions.push(eq(interactions.channel, channel as string));
      }

      // Filtrar por tipo
      if (type) {
        conditions.push(eq(interactions.type, type as string));
      }

      // Filtrar por usuario asignado
      if (assignedUserId) {
        conditions.push(eq(interactions.assignedUserId, parseInt(assignedUserId as string)));
      }

      // Filtrar por fechas
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string);
        conditions.push(sql`${interactions.createdAt} >= ${fromDate}`);
      }

      if (dateTo) {
        const toDate = new Date(dateTo as string);
        conditions.push(sql`${interactions.createdAt} <= ${toDate}`);
      }

      // Filtrar por búsqueda en contenido
      if (query) {
        conditions.push(like(interactions.content, `%${query}%`));
      }

      // Ejecutar la consulta
      const allInteractions = await db.query.interactions.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(interactions.createdAt)],
        with: {
          customer: true,
          lead: true,
          assignedUser: true,
        },
      });

      // Formatear los datos para la respuesta
      const formattedInteractions = allInteractions.map(interaction => ({
        ...interaction,
        attachments: interaction.attachments || [],
      }));

      return res.json(formattedInteractions);
    } catch (error) {
      console.error('Error getting interactions:', error);
      throw error;
    }
  }

  /**
   * Obtener una interacción por ID con datos relacionados
   */
  async getInteractionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as unknown as { id: number };

      const interaction = await db.query.interactions.findFirst({
        where: eq(interactions.id, id),
        with: {
          customer: true,
          lead: true,
          assignedUser: true,
        },
      });

      if (!interaction) {
        return res.status(404).json({ message: 'Interacción no encontrada' });
      }

      return res.json({
        ...interaction,
        attachments: interaction.attachments || [],
      });
    } catch (error) {
      console.error('Error getting interaction by ID:', error);
      throw error;
    }
  }

  /**
   * Crear una nueva interacción
   */
  async createInteraction(req: Request, res: Response): Promise<void> {
    try {
      const newInteractionData = req.body;

      // Validar que el cliente o lead exista si se proporciona ID
      if (newInteractionData.customerId) {
        const customer = await db.query.customers.findFirst({
          where: eq(customers.id, newInteractionData.customerId),
        });

        if (!customer) {
          return res.status(404).json({ message: 'Cliente no encontrado' });
        }
      }

      if (newInteractionData.leadId) {
        const lead = await db.query.leads.findFirst({
          where: eq(leads.id, newInteractionData.leadId),
        });

        if (!lead) {
          return res.status(404).json({ message: 'Lead no encontrado' });
        }
      }

      // Validar usuario asignado si se proporciona
      if (newInteractionData.assignedUserId) {
        const user = await db.query.crmUsers.findFirst({
          where: eq(crmUsers.id, newInteractionData.assignedUserId),
        });

        if (!user) {
          return res.status(404).json({ message: 'Usuario no encontrado' });
        }
      }

      // Crear la interacción
      const [insertedInteraction] = await db.insert(interactions).values({
        ...newInteractionData,
        createdAt: new Date(),
      }).returning();

      // Buscar la interacción completa con relaciones
      const fullInteraction = await db.query.interactions.findFirst({
        where: eq(interactions.id, insertedInteraction.id),
        with: {
          customer: true,
          lead: true,
          assignedUser: true,
        },
      });

      // Emitir evento de interacción creada
      appEvents.emit(EventTypes.INTERACTION_CREATED, fullInteraction);

      return res.status(201).json(fullInteraction);
    } catch (error) {
      console.error('Error creating interaction:', error);
      throw error;
    }
  }

  /**
   * Actualizar una interacción
   */
  async updateInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as unknown as { id: number };
      const updateData = req.body;

      // Verificar que la interacción existe
      const existingInteraction = await db.query.interactions.findFirst({
        where: eq(interactions.id, id),
      });

      if (!existingInteraction) {
        return res.status(404).json({ message: 'Interacción no encontrada' });
      }

      // Actualizar la interacción
      await db.update(interactions)
        .set(updateData)
        .where(eq(interactions.id, id));

      // Obtener la interacción actualizada
      const updatedInteraction = await db.query.interactions.findFirst({
        where: eq(interactions.id, id),
        with: {
          customer: true,
          lead: true,
          assignedUser: true,
        },
      });

      // Emitir evento de interacción actualizada
      appEvents.emit(EventTypes.INTERACTION_UPDATED, updatedInteraction);

      return res.json(updatedInteraction);
    } catch (error) {
      console.error('Error updating interaction:', error);
      throw error;
    }
  }

  /**
   * Eliminar una interacción
   */
  async deleteInteraction(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params as unknown as { id: number };

      // Verificar que la interacción existe
      const existingInteraction = await db.query.interactions.findFirst({
        where: eq(interactions.id, id),
        with: {
          customer: true,
          lead: true,
        },
      });

      if (!existingInteraction) {
        return res.status(404).json({ message: 'Interacción no encontrada' });
      }

      // Eliminar la interacción
      await db.delete(interactions).where(eq(interactions.id, id));

      // Emitir evento de interacción eliminada
      appEvents.emit(EventTypes.INTERACTION_DELETED, existingInteraction);

      return res.json({ message: 'Interacción eliminada correctamente', deletedInteraction: existingInteraction });
    } catch (error) {
      console.error('Error deleting interaction:', error);
      throw error;
    }
  }

  /**
   * Buscar interacciones por varios criterios
   */
  async searchInteractions(req: Request, res: Response): Promise<void> {
    try {
      // Esta es una función separada más flexible que getAllInteractions
      // Puede ser ampliada con búsquedas más complejas en el futuro
      const { query, types, channels, dateFrom, dateTo } = req.query;
      
      const conditions: SQL[] = [];
      
      // Búsqueda por texto en contenido
      if (query) {
        conditions.push(like(interactions.content, `%${query}%`));
      }
      
      // Filtrar por tipos de interacción (múltiples)
      if (types && typeof types === 'string') {
        const typeArray = types.split(',');
        if (typeArray.length > 0) {
          conditions.push(inArray(interactions.type, typeArray));
        }
      }
      
      // Filtrar por canales (múltiples)
      if (channels && typeof channels === 'string') {
        const channelArray = channels.split(',');
        if (channelArray.length > 0) {
          conditions.push(inArray(interactions.channel, channelArray));
        }
      }
      
      // Filtro por rango de fechas
      if (dateFrom) {
        const fromDate = new Date(dateFrom as string);
        conditions.push(sql`${interactions.createdAt} >= ${fromDate}`);
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo as string);
        conditions.push(sql`${interactions.createdAt} <= ${toDate}`);
      }
      
      // Ejecutar la consulta
      const searchResults = await db.query.interactions.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(interactions.createdAt)],
        with: {
          customer: true,
          lead: true,
          assignedUser: true,
        },
      });
      
      return res.json(searchResults);
    } catch (error) {
      console.error('Error searching interactions:', error);
      throw error;
    }
  }
}

export const interactionsService = new InteractionsService();