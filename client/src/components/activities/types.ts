import { LucideIcon } from "lucide-react";
import { z } from "zod";

// Enumeración de tipos de actividades
export const ActivityType = {
  CALL: "CALL",
  MEETING: "MEETING",
  TASK: "TASK",
  FOLLOWUP: "FOLLOWUP",
  EMAIL: "EMAIL",
} as const;

export type ActivityType = typeof ActivityType[keyof typeof ActivityType];

// Enumeración de estados de actividades
export const ActivityStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELED: "CANCELED",
} as const;

export type ActivityStatus = typeof ActivityStatus[keyof typeof ActivityStatus];

// Enumeración de prioridades
export const ActivityPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
} as const;

export type ActivityPriority = typeof ActivityPriority[keyof typeof ActivityPriority];

// Interfaces para la visualización del calendario
export type CalendarView = "month" | "week" | "day" | "agenda";

// Estado de filtros de calendario
export interface CalendarFilterState {
  view: CalendarView;
  date: Date;
}

// Interfaz de evento de calendario
export interface ActivityEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type: ActivityType;
  status: ActivityStatus;
  priority?: ActivityPriority;
  resource?: any;
}

// Interfaz para una actividad
export interface Activity {
  id: number;
  title: string;
  description?: string;
  startDateTime: string; // ISO date string
  endDateTime: string;   // ISO date string
  allDay: boolean;
  type: ActivityType;
  status: ActivityStatus;
  priority: ActivityPriority;
  assignedUserId?: number;
  assignedUserName?: string;
  customerId?: number;
  customerName?: string;
  leadId?: number;
  leadName?: string;
  opportunityId?: number;
  createdAt: string;     // ISO date string
  updatedAt: string;     // ISO date string
}

// Interfaz para los filtros de actividades
export interface ActivityFilter {
  types?: ActivityType[];
  statuses?: ActivityStatus[];
  priorities?: ActivityPriority[];
  startDateFrom?: string; // ISO date string
  startDateTo?: string;   // ISO date string
  endDateFrom?: string;   // ISO date string
  endDateTo?: string;     // ISO date string
  assignedUserIds?: number[];
  customerIds?: number[];
  leadIds?: number[];
  opportunityIds?: number[];
  // Campos adicionales para UI
  search?: string;
  startDate?: Date;
  endDate?: Date;
  assignedUserId?: number;
  relatedToCustomerId?: number;
  relatedToLeadId?: number;
  relatedToOpportunityId?: number;
}

// Mapping de íconos por tipo de actividad
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, LucideIcon | string> = {
  CALL: "phone",
  MEETING: "users",
  TASK: "check-square",
  FOLLOWUP: "repeat",
  EMAIL: "mail",
};

// Mapeo de colores por tipo de actividad (para el calendario y badges)
export const ACTIVITY_COLORS: Record<ActivityType, {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}> = {
  CALL: {
    backgroundColor: "#e6f7ff", // Azul claro
    borderColor: "#1890ff",     // Azul primario
    textColor: "#0050b3"        // Azul oscuro
  },
  MEETING: {
    backgroundColor: "#f6ffed", // Verde claro
    borderColor: "#52c41a",     // Verde primario
    textColor: "#237804"        // Verde oscuro
  },
  TASK: {
    backgroundColor: "#fff7e6", // Naranja claro
    borderColor: "#fa8c16",     // Naranja primario
    textColor: "#ad4e00"        // Naranja oscuro
  },
  FOLLOWUP: {
    backgroundColor: "#f9f0ff", // Púrpura claro
    borderColor: "#722ed1",     // Púrpura primario
    textColor: "#391085"        // Púrpura oscuro
  },
  EMAIL: {
    backgroundColor: "#fcf4f2", // Rojo claro
    borderColor: "#f5222d",     // Rojo primario
    textColor: "#a8071a"        // Rojo oscuro
  }
};

// Mapeo de traducciones para tipos y estados
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: "Llamada",
  MEETING: "Reunión",
  TASK: "Tarea",
  FOLLOWUP: "Seguimiento",
  EMAIL: "Email"
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completada",
  CANCELED: "Cancelada"
};

export const ACTIVITY_PRIORITY_LABELS: Record<ActivityPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta"
};

// Interfaz para los valores del formulario de actividad
export interface ActivityFormValues {
  id?: number;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  type: ActivityType;
  status: ActivityStatus;
  priority: ActivityPriority;
  assignedUserId?: number | null;
  customerId?: number | null;
  leadId?: number | null;
  opportunityId?: number | null;
  location?: string;
  notes?: string;
  reminder?: boolean;
  reminderDate?: Date | null;
}

// Esquema de validación para el formulario de actividad
export const activityFormSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(3, {
    message: "El título debe tener al menos 3 caracteres",
  }),
  description: z.string().optional(),
  startDate: z.date({
    required_error: "La fecha de inicio es requerida",
  }),
  endDate: z.date({
    required_error: "La fecha de fin es requerida",
  }),
  allDay: z.boolean().default(false),
  type: z.enum(["CALL", "MEETING", "TASK", "FOLLOWUP", "EMAIL"] as const, {
    required_error: "El tipo de actividad es requerido",
  }),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const, {
    required_error: "El estado es requerido",
  }),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"] as const, {
    required_error: "La prioridad es requerida",
  }),
  assignedUserId: z.number().nullable().optional(),
  customerId: z.number().nullable().optional(),
  leadId: z.number().nullable().optional(),
  opportunityId: z.number().nullable().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  reminder: z.boolean().default(false),
  reminderDate: z.date().nullable().optional(),
});