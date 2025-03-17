/**
 * Tipos relacionados con las actividades del CRM
 */
import { z } from "zod";

// Esquema de validación para actividades
export const activitySchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  type: z.enum(["call", "meeting", "task", "followup"], {
    errorMap: () => ({ message: "Seleccione un tipo válido" }),
  }),
  status: z.enum(["pending", "completed", "cancelled"], {
    errorMap: () => ({ message: "Seleccione un estado válido" }),
  }).default("pending"),
  priority: z.enum(["low", "medium", "high"], {
    errorMap: () => ({ message: "Seleccione una prioridad válida" }),
  }).default("medium"),
  startDate: z.date({
    required_error: "Seleccione una fecha de inicio",
  }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  endDate: z.date({
    required_error: "Seleccione una fecha de fin",
  }),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  reminderDate: z.date().optional(),
  reminderTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)").optional(),
  notes: z.string().optional(),
  assignedUserId: z.number({
    required_error: "Seleccione un usuario",
  }),
  contactType: z.enum(["none", "customer", "lead", "opportunity"], {
    errorMap: () => ({ message: "Seleccione un tipo de contacto válido" }),
  }).default("none"),
  contactId: z.number().optional(),
});

// Tipo para el formulario de actividad
export type ActivityFormData = z.infer<typeof activitySchema>;

// Tipo para la actividad en la API
export interface Activity {
  id: number;
  type: "call" | "meeting" | "task" | "followup";
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  customerId?: number;
  leadId?: number;
  opportunityId?: number;
  assignedUserId: number;
  status: "pending" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  reminderTime?: string;
  notes?: string;
  customer?: { id: number; name: string };
  lead?: { id: number; name: string };
  opportunity?: { id: number; name: string };
  assignedUser?: { id: number; fullName: string };
}