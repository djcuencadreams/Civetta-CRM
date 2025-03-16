import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  ActivityFormValues, 
  Activity,
  ActivityStatus,
  ActivityType,
  ActivityPriority
} from "./types";
import { ActivityForm } from './ActivityForm';

interface CreateActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity?: Activity & { id?: number };
  isEdit?: boolean;
  onSuccess?: () => void;
}

export function CreateActivityDialog({
  open,
  onOpenChange,
  activity,
  isEdit = false,
  onSuccess
}: CreateActivityDialogProps) {
  const queryClient = useQueryClient();

  // Convertir Activity a ActivityFormValues para el formulario
  const getFormValues = (): (ActivityFormValues & { id?: number }) | undefined => {
    if (!activity) return undefined;

    return {
      id: activity.id,
      title: activity.title,
      type: activity.type,
      status: activity.status,
      priority: activity.priority,
      startDate: typeof activity.startDate === 'string' ? new Date(activity.startDate) : activity.startDate,
      endDate: typeof activity.endDate === 'string' ? new Date(activity.endDate) : activity.endDate,
      description: activity.description || '',
      notes: activity.notes || '',
      customerId: activity.customerId || null,
      leadId: activity.leadId || null,
      opportunityId: activity.opportunityId || null,
      location: activity.location || '',
      reminder: Boolean(activity.reminder),
      reminderDate: activity.reminderDate 
        ? (typeof activity.reminderDate === 'string' ? new Date(activity.reminderDate) : activity.reminderDate) 
        : null,
      userId: activity.userId
    };
  };

  // Mutación para crear actividad
  const createActivityMutation = useMutation({
    mutationFn: (data: ActivityFormValues) => apiRequest('/api/activities', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      onOpenChange(false);
      if (onSuccess) onSuccess();
      toast({
        title: "Actividad creada correctamente",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear la actividad",
        description: error.message || "Ha ocurrido un error al crear la actividad",
        variant: "destructive",
      });
    },
  });

  // Mutación para actualizar actividad
  const updateActivityMutation = useMutation({
    mutationFn: ({ id, ...data }: ActivityFormValues & { id: number }) => apiRequest(`/api/activities/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      onOpenChange(false);
      if (onSuccess) onSuccess();
      toast({
        title: "Actividad actualizada correctamente",
        variant: "success",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar la actividad",
        description: error.message || "Ha ocurrido un error al actualizar la actividad",
        variant: "destructive",
      });
    },
  });

  // Manejar envío del formulario
  const handleSubmit = (data: ActivityFormValues) => {
    if (isEdit && activity?.id) {
      updateActivityMutation.mutate({ ...data, id: activity.id });
    } else {
      createActivityMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Actualiza los detalles de la actividad' 
              : 'Completa los detalles para crear una nueva actividad'}
          </DialogDescription>
        </DialogHeader>

        <ActivityForm
          isEdit={isEdit}
          initialData={getFormValues()}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isSubmitting={createActivityMutation.isPending || updateActivityMutation.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}