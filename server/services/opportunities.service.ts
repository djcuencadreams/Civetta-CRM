/**
 * Servicio de oportunidades para el pipeline de ventas
 */
import { Express, Request, Response, NextFunction } from "express";
import { pool } from "@db";
import { opportunities, opportunityStatusEnum, brandEnum } from "@db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { Service } from "./service-registry";
import { validateParams, validateBody, handleDatabaseError } from "../validation";
import { appEvents, EventTypes } from "../lib/event-emitter";
import * as schema from "@db/schema";

// Crear una instancia directa de Drizzle con el esquema
const db = drizzle(pool, { schema });

/**
 * Esquema de validación para ID de oportunidad
 */
const opportunityIdSchema = z.object({
  id: z.coerce.number().int().positive()
});

/**
 * Esquema de validación para creación/actualización de oportunidades
 */
const opportunitySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  customerId: z.number().int().positive().optional().nullable(),
  leadId: z.number().int().positive().optional().nullable(),
  estimatedValue: z.number().min(0, "El valor debe ser positivo"),
  probability: z.number().int().min(0).max(100).optional().nullable(),
  status: z.string().optional().default(opportunityStatusEnum.NEGOTIATION),
  stage: z.string().min(1, "La etapa es obligatoria"),
  assignedUserId: z.number().int().positive().optional().nullable(),
  estimatedCloseDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  productsInterested: z.array(z.any()).optional(),
  nextActionDate: z.string().optional().nullable(),
  brand: z.string().optional().default(brandEnum.SLEEPWEAR),
});

/**
 * Esquema para actualización de etapa de oportunidad
 */
const stageUpdateSchema = z.object({
  stage: z.string().min(1, "La etapa es obligatoria")
});

/**
 * Service responsible for managing opportunities
 */
export class OpportunitiesService implements Service {
  name = "opportunities";

  registerRoutes(app: Express): void {
    // Get all opportunities
    app.get("/api/opportunities", this.getAllOpportunities.bind(this));

    // Get opportunity by ID
    app.get(
      "/api/opportunities/:id",
      validateParams(opportunityIdSchema),
      this.getOpportunityById.bind(this)
    );

    // Create a new opportunity
    app.post(
      "/api/opportunities",
      validateBody(opportunitySchema),
      this.createOpportunity.bind(this)
    );

    // Update an opportunity
    app.patch(
      "/api/opportunities/:id",
      validateParams(opportunityIdSchema),
      validateBody(opportunitySchema),
      this.updateOpportunity.bind(this)
    );

    // Update opportunity stage (for drag & drop)
    app.patch(
      "/api/opportunities/:id/stage",
      validateParams(opportunityIdSchema),
      validateBody(stageUpdateSchema),
      this.updateOpportunityStage.bind(this)
    );

    // Delete an opportunity
    app.delete(
      "/api/opportunities/:id",
      validateParams(opportunityIdSchema),
      this.deleteOpportunity.bind(this)
    );

    // Get pipeline stages by brand
    app.get(
      "/api/opportunities/pipeline-stages/:brand",
      this.getPipelineStages.bind(this)
    );
  }

  /**
   * Get all opportunities with related data
   */
  async getAllOpportunities(req: Request, res: Response): Promise<void> {
    try {
      // Ejecutar una consulta SQL directa para obtener las oportunidades
      const query = `
        SELECT o.*, 
          c.name as customer_name, 
          l.name as lead_name,
          u.full_name as assigned_user_name
        FROM opportunities o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN leads l ON o.lead_id = l.id
        LEFT JOIN crm_users u ON o.assigned_user_id = u.id
        ORDER BY o.updated_at DESC
      `;
      
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      res.status(500).json({ error: "Error al obtener las oportunidades" });
    }
  }

  /**
   * Get opportunity by ID with related data
   */
  async getOpportunityById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      // Ejecutar una consulta SQL directa para obtener una oportunidad por su ID
      const query = `
        SELECT o.*, 
          c.name as customer_name, 
          l.name as lead_name,
          u.full_name as assigned_user_name
        FROM opportunities o
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN leads l ON o.lead_id = l.id
        LEFT JOIN crm_users u ON o.assigned_user_id = u.id
        WHERE o.id = $1
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Oportunidad no encontrada" });
        return;
      }
      
      // Obtener interacciones relacionadas
      const interactionsQuery = `
        SELECT * FROM interactions 
        WHERE opportunity_id = $1
        ORDER BY created_at DESC
      `;
      
      const interactionsResult = await pool.query(interactionsQuery, [id]);
      
      // Obtener actividades relacionadas
      const activitiesQuery = `
        SELECT * FROM activities 
        WHERE opportunity_id = $1
        ORDER BY start_time ASC
      `;
      
      const activitiesResult = await pool.query(activitiesQuery, [id]);
      
      // Construir respuesta con datos relacionados
      const opportunity = {
        ...result.rows[0],
        interactions: interactionsResult.rows,
        activities: activitiesResult.rows
      };
      
      res.json(opportunity);
    } catch (error) {
      handleDatabaseError(res, error, "oportunidad");
    }
  }

  /**
   * Create a new opportunity
   */
  async createOpportunity(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      
      // Format dates if they exist
      const estimatedCloseDate = data.estimatedCloseDate ? new Date(data.estimatedCloseDate) : null;
      const nextActionDate = data.nextActionDate ? new Date(data.nextActionDate) : null;
      const now = new Date();

      // Usar SQL directo para insertar
      const query = `
        INSERT INTO opportunities (
          name, 
          customer_id, 
          lead_id, 
          estimated_value, 
          probability, 
          status, 
          stage, 
          assigned_user_id, 
          estimated_close_date, 
          notes, 
          products_interested, 
          next_action_date,
          brand,
          created_at, 
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        ) RETURNING *
      `;

      const values = [
        data.name,
        data.customerId || null,
        data.leadId || null,
        data.estimatedValue,
        data.probability || null,
        data.status || opportunityStatusEnum.NEGOTIATION,
        data.stage,
        data.assignedUserId || null,
        estimatedCloseDate,
        data.notes || null,
        data.productsInterested || null,
        nextActionDate,
        data.brand || brandEnum.SLEEPWEAR,
        now,
        now
      ];

      const result = await pool.query(query, values);
      const newOpportunity = result.rows[0];

      // Emit event for opportunity creation
      appEvents.emit("opportunity.created", newOpportunity);

      res.status(201).json(newOpportunity);
    } catch (error) {
      handleDatabaseError(res, error, "oportunidad");
    }
  }

  /**
   * Update an opportunity
   */
  async updateOpportunity(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      // Obtener oportunidad actual
      const currentOpportunityQuery = `
        SELECT * FROM opportunities WHERE id = $1
      `;
      const currentResult = await pool.query(currentOpportunityQuery, [id]);
      
      if (currentResult.rows.length === 0) {
        res.status(404).json({ error: "Oportunidad no encontrada" });
        return;
      }
      
      const currentOpportunity = currentResult.rows[0];
      const data = req.body;
      
      // Format dates if they exist
      const estimatedCloseDate = data.estimatedCloseDate ? new Date(data.estimatedCloseDate) : currentOpportunity.estimated_close_date;
      const nextActionDate = data.nextActionDate ? new Date(data.nextActionDate) : currentOpportunity.next_action_date;
      const now = new Date();

      // Construir la consulta de actualización
      const query = `
        UPDATE opportunities SET
          name = $1,
          customer_id = $2,
          lead_id = $3,
          estimated_value = $4,
          probability = $5,
          status = $6,
          stage = $7,
          assigned_user_id = $8,
          estimated_close_date = $9,
          notes = $10,
          products_interested = $11,
          next_action_date = $12,
          brand = $13,
          updated_at = $14
        WHERE id = $15
        RETURNING *
      `;

      const values = [
        data.name || currentOpportunity.name,
        data.customerId !== undefined ? data.customerId : currentOpportunity.customer_id,
        data.leadId !== undefined ? data.leadId : currentOpportunity.lead_id,
        data.estimatedValue || currentOpportunity.estimated_value,
        data.probability !== undefined ? data.probability : currentOpportunity.probability,
        data.status || currentOpportunity.status,
        data.stage || currentOpportunity.stage,
        data.assignedUserId !== undefined ? data.assignedUserId : currentOpportunity.assigned_user_id,
        estimatedCloseDate,
        data.notes !== undefined ? data.notes : currentOpportunity.notes,
        data.productsInterested || currentOpportunity.products_interested,
        nextActionDate,
        data.brand || currentOpportunity.brand,
        now,
        id
      ];

      const result = await pool.query(query, values);
      const updatedOpportunity = result.rows[0];

      // Emit event for opportunity update
      appEvents.emit("opportunity.updated", updatedOpportunity);

      // Emit event for stage change if changed
      if (currentOpportunity.stage !== updatedOpportunity.stage) {
        appEvents.emit("opportunity.stage.changed", {
          opportunity: updatedOpportunity,
          previousStage: currentOpportunity.stage,
          newStage: updatedOpportunity.stage
        });
      }

      res.json(updatedOpportunity);
    } catch (error) {
      handleDatabaseError(res, error, "oportunidad");
    }
  }

  /**
   * Update just the stage of an opportunity (for drag & drop)
   */
  async updateOpportunityStage(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { stage } = req.body;

    try {
      // Obtener oportunidad actual
      const currentOpportunityQuery = `
        SELECT * FROM opportunities WHERE id = $1
      `;
      const currentResult = await pool.query(currentOpportunityQuery, [id]);
      
      if (currentResult.rows.length === 0) {
        res.status(404).json({ error: "Oportunidad no encontrada" });
        return;
      }
      
      const currentOpportunity = currentResult.rows[0];
      const now = new Date();

      // Actualizar solo el campo stage
      const query = `
        UPDATE opportunities SET
          stage = $1,
          updated_at = $2
        WHERE id = $3
        RETURNING *
      `;

      const result = await pool.query(query, [stage, now, id]);
      const updatedOpportunity = result.rows[0];

      // Emit event for stage change
      appEvents.emit("opportunity.stage.changed", {
        opportunity: updatedOpportunity,
        previousStage: currentOpportunity.stage,
        newStage: stage
      });

      res.json(updatedOpportunity);
    } catch (error) {
      handleDatabaseError(res, error, "oportunidad");
    }
  }

  /**
   * Delete an opportunity
   */
  async deleteOpportunity(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      // Obtener oportunidad antes de eliminar
      const opportunityQuery = `
        SELECT * FROM opportunities WHERE id = $1
      `;
      const opportunityResult = await pool.query(opportunityQuery, [id]);
      
      if (opportunityResult.rows.length === 0) {
        res.status(404).json({ error: "Oportunidad no encontrada" });
        return;
      }
      
      const opportunity = opportunityResult.rows[0];

      // Eliminar la oportunidad
      const deleteQuery = `
        DELETE FROM opportunities
        WHERE id = $1
      `;
      await pool.query(deleteQuery, [id]);

      // Emit event for opportunity deletion
      appEvents.emit("opportunity.deleted", opportunity);

      res.json({ success: true });
    } catch (error) {
      handleDatabaseError(res, error, "oportunidad");
    }
  }

  /**
   * Get pipeline stages based on brand
   */
  async getPipelineStages(req: Request, res: Response): Promise<void> {
    const { brand } = req.params;
    
    try {
      let stages;
      
      // Customize stages by brand
      if (brand === brandEnum.BRIDE) {
        stages = [
          "Consulta Inicial",
          "Propuesta Enviada",
          "Prueba de Vestido",
          "Ajustes",
          "Confección",
          "Entrega Programada",
          "Cerrado Ganado",
          "Cerrado Perdido"
        ];
      } else {
        // Default stages for Sleepwear or any other brand
        stages = [
          "Prospecto",
          "Primer Contacto",
          "Propuesta Enviada",
          "Negociación",
          "Pedido Confirmado",
          "Cerrado Ganado",
          "Cerrado Perdido"
        ];
      }
      
      res.json(stages);
    } catch (error) {
      console.error("Error fetching pipeline stages:", error);
      res.status(500).json({ error: "Error al obtener las etapas del pipeline" });
    }
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    // Any initialization logic can go here
    console.log("Opportunity service initialized");
  }
}

export const opportunitiesService = new OpportunitiesService();