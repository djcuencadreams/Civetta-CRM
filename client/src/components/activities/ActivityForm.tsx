import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "../ui/date-time-picker";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-device-type';

import {
  Activity, 
  ActivityFormValues, 
  ActivityType, 
  ActivityStatus, 
  ActivityPriority,
  activityFormSchema,
  ACTIVITY_TYPE_LABELS,
  ACTIVITY_STATUS_LABELS,
  ACTIVITY_PRIORITY_LABELS
} from './types';

interface ActivityFormProps {
  isEdit?: boolean;
  initialData?: ActivityFormValues & { id?: number };
  onSubmit: (data: ActivityFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ActivityForm({ 
  isEdit = false,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}: ActivityFormProps) {
  const isMobile = useIsMobile();

  // Get customers for dropdown
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
    enabled: true,
  });

  // Get leads for dropdown
  const { data: leads = [] } = useQuery({
    queryKey: ['/api/leads'],
    enabled: true,
  });

  // Get opportunities for dropdown
  const { data: opportunities = [] } = useQuery({
    queryKey: ['/api/opportunities'],
    enabled: true,
  });

  // Get users for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: true,
  });

  // Form setup
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: initialData || {
      title: '',
      type: ActivityType.TASK,
      status: ActivityStatus.PLANNED,
      priority: ActivityPriority.MEDIUM,
      startDate: new Date(),
      endDate: new Date(new Date().setHours(new Date().getHours() + 1)),
      description: '',
      notes: '',
      customerId: null,
      leadId: null,
      opportunityId: null,
      location: '',
      reminder: false,
      reminderDate: null,
      userId: undefined
    }
  });

  // Reminder date logic
  const showReminderDate = form.watch('reminder');
  
  // Handle form submission
  const handleSubmit = (data: ActivityFormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Título */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Título de la actividad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Tipo */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ActivityType).map(type => (
                      <SelectItem key={type} value={type}>
                        {ACTIVITY_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estado */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ActivityStatus).map(status => (
                      <SelectItem key={status} value={status}>
                        {ACTIVITY_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Prioridad */}
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridad</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar prioridad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ActivityPriority).map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {ACTIVITY_PRIORITY_LABELS[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha y hora de inicio */}
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha y hora de inicio</FormLabel>
                <DateTimePicker 
                  date={field.value}
                  setDate={field.onChange}
                  locale={es}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Fecha y hora de finalización */}
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha y hora de finalización</FormLabel>
                <DateTimePicker 
                  date={field.value}
                  setDate={field.onChange}
                  locale={es}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Ubicación */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación</FormLabel>
                  <FormControl>
                    <Input placeholder="Ubicación (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Usuario asignado */}
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asignado a</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value ? Number(value) : undefined)} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin asignar</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cliente relacionado */}
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value ? Number(value) : null)} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Ninguno</SelectItem>
                    {customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Lead relacionado */}
          <FormField
            control={form.control}
            name="leadId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value ? Number(value) : null)} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar lead" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Ninguno</SelectItem>
                    {leads.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id.toString()}>
                        {lead.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Oportunidad relacionada */}
          <FormField
            control={form.control}
            name="opportunityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Oportunidad</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value ? Number(value) : null)} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar oportunidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Ninguna</SelectItem>
                    {opportunities.map((opportunity: any) => (
                      <SelectItem key={opportunity.id} value={opportunity.id.toString()}>
                        {opportunity.title || opportunity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Recordatorio */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="reminder"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Switch 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Recordatorio</FormLabel>
                    <FormDescription>
                      Activar recordatorio para esta actividad
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Fecha de recordatorio */}
          {showReminderDate && (
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="reminderDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha y hora del recordatorio</FormLabel>
                    <DateTimePicker 
                      date={field.value || undefined}
                      setDate={(date) => field.onChange(date)}
                      locale={es}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Descripción */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descripción de la actividad" 
                      className="min-h-20"
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Notas */}
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas adicionales</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas adicionales (opcional)" 
                      className="min-h-20"
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className={cn(
          "flex justify-end gap-2",
          isMobile ? "flex-col" : ""
        )}>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className={cn(isMobile && "w-full")}
          >
            Cancelar
          </Button>
          
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className={cn(isMobile && "w-full")}
          >
            {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Form>
  );
}