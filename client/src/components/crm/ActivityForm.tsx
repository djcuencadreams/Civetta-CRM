import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, addHours, isBefore } from "date-fns";
import { es } from "date-fns/locale";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Clock } from "lucide-react";

import { activitySchema, ActivityFormData, Activity } from "../../pages/types/activities";

interface ActivityFormProps {
  activity?: Activity;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ActivityForm({ activity, onSubmit, onCancel }: ActivityFormProps) {
  const [contactType, setContactType] = useState<"none" | "customer" | "lead" | "opportunity">(
    activity?.customerId ? "customer" : 
    activity?.leadId ? "lead" :
    activity?.opportunityId ? "opportunity" : "none"
  );
  
  // Cargar usuarios para asignar la actividad
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }
      return response.json();
    },
  });
  
  // Cargar clientes para asociar la actividad
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) {
        throw new Error("Error al cargar clientes");
      }
      return response.json();
    },
    enabled: contactType === "customer" || contactType === "none"
  });
  
  // Cargar leads para asociar la actividad
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const response = await fetch("/api/leads");
      if (!response.ok) {
        throw new Error("Error al cargar leads");
      }
      return response.json();
    },
    enabled: contactType === "lead" || contactType === "none"
  });
  
  // Cargar oportunidades para asociar la actividad
  const { data: opportunities = [] } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const response = await fetch("/api/opportunities");
      if (!response.ok) {
        throw new Error("Error al cargar oportunidades");
      }
      return response.json();
    },
    enabled: contactType === "opportunity" || contactType === "none"
  });
  
  // Procesar los datos de la actividad si se está editando
  const defaultValues = activity
    ? {
        id: activity.id,
        title: activity.title,
        description: activity.description || "",
        type: activity.type,
        status: activity.status,
        priority: activity.priority,
        startDate: new Date(activity.startTime),
        startTime: format(new Date(activity.startTime), "HH:mm"),
        endDate: new Date(activity.endTime),
        endTime: format(new Date(activity.endTime), "HH:mm"),
        reminderDate: activity.reminderTime ? new Date(activity.reminderTime) : undefined,
        reminderTime: activity.reminderTime ? format(new Date(activity.reminderTime), "HH:mm") : undefined,
        notes: activity.notes || "",
        assignedUserId: activity.assignedUserId,
        contactType: 
          activity.customerId ? "customer" : 
          activity.leadId ? "lead" :
          activity.opportunityId ? "opportunity" : "none",
        contactId: activity.customerId || activity.leadId || activity.opportunityId,
      }
    : {
        title: "",
        description: "",
        type: "task" as const,
        status: "pending" as const,
        priority: "medium" as const,
        startDate: new Date(),
        startTime: format(new Date(), "HH:mm"),
        endDate: new Date(),
        endTime: format(addHours(new Date(), 1), "HH:mm"),
        notes: "",
        assignedUserId: users[0]?.id,
        contactType: "none" as const,
      };
  
  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues
  });
  
  // Actualizar el contactId cuando cambia el tipo de contacto
  useEffect(() => {
    form.setValue("contactId", undefined);
    form.setValue("contactType", contactType);
  }, [contactType, form]);
  
  // Validación adicional: la fecha de fin debe ser posterior a la fecha de inicio
  const validateDates = (startDate: Date, startTime: string, endDate: Date, endTime: string): boolean => {
    const start = new Date(startDate);
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    start.setHours(startHours, startMinutes);
    
    const end = new Date(endDate);
    const [endHours, endMinutes] = endTime.split(":").map(Number);
    end.setHours(endHours, endMinutes);
    
    return !isBefore(end, start);
  };
  
  // Mutación para crear o actualizar una actividad
  const activityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof activitySchema>) => {
      // Convertir las fechas y horas a formato ISO
      const startDate = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(":").map(Number);
      startDate.setHours(startHours, startMinutes, 0, 0);
      
      const endDate = new Date(data.endDate);
      const [endHours, endMinutes] = data.endTime.split(":").map(Number);
      endDate.setHours(endHours, endMinutes, 0, 0);
      
      let reminderDate = undefined;
      if (data.reminderDate && data.reminderTime) {
        reminderDate = new Date(data.reminderDate);
        const [reminderHours, reminderMinutes] = data.reminderTime.split(":").map(Number);
        reminderDate.setHours(reminderHours, reminderMinutes, 0, 0);
      }
      
      // Preparar los datos para enviar
      const activityData = {
        id: data.id,
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status,
        priority: data.priority,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        reminderTime: reminderDate?.toISOString(),
        notes: data.notes,
        assignedUserId: data.assignedUserId,
        customerId: data.contactType === "customer" ? data.contactId : null,
        leadId: data.contactType === "lead" ? data.contactId : null,
        opportunityId: data.contactType === "opportunity" ? data.contactId : null,
      };
      
      // Enviar los datos al servidor
      const url = data.id 
        ? `/api/activities/${data.id}` 
        : "/api/activities";
      
      const response = await fetch(url, {
        method: data.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(activityData),
      });
      
      if (!response.ok) {
        throw new Error(`Error al ${data.id ? "actualizar" : "crear"} la actividad`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: `Actividad ${activity ? "actualizada" : "creada"} correctamente`,
        description: `La actividad ha sido ${activity ? "actualizada" : "creada"} exitosamente.`,
      });
      onSubmit();
    },
    onError: (error) => {
      toast({
        title: `Error al ${activity ? "actualizar" : "crear"} la actividad`,
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onFormSubmit = (data: z.infer<typeof activitySchema>) => {
    // Validar que la fecha de fin sea posterior a la fecha de inicio
    if (!validateDates(data.startDate, data.startTime, data.endDate, data.endTime)) {
      toast({
        title: "Error de validación",
        description: "La fecha y hora de fin debe ser posterior a la fecha y hora de inicio.",
        variant: "destructive",
      });
      return;
    }
    
    activityMutation.mutate(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título*</FormLabel>
                <FormControl>
                  <Input placeholder="Título de la actividad" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de actividad*</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="call">Llamada</SelectItem>
                    <SelectItem value="meeting">Reunión</SelectItem>
                    <SelectItem value="task">Tarea</SelectItem>
                    <SelectItem value="followup">Seguimiento</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de inicio*</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`pl-3 text-left font-normal ${
                          !field.value && "text-muted-foreground"
                        }`}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: es })
                        ) : (
                          <span>Seleccione una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora de inicio*</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input type="time" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de fin*</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`pl-3 text-left font-normal ${
                          !field.value && "text-muted-foreground"
                        }`}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: es })
                        ) : (
                          <span>Seleccione una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora de fin*</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input type="time" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
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
                      <SelectValue placeholder="Seleccione un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="completed">Completada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
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
                      <SelectValue placeholder="Seleccione una prioridad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="assignedUserId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asignado a*</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un usuario" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex flex-col space-y-1.5">
            <FormLabel htmlFor="contactType">Asociar con</FormLabel>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Select
                value={contactType}
                onValueChange={(value: "none" | "customer" | "lead" | "opportunity") => setContactType(value)}
              >
                <SelectTrigger id="contactType">
                  <SelectValue placeholder="Seleccione un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguno</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="opportunity">Oportunidad</SelectItem>
                </SelectContent>
              </Select>
              
              {contactType !== "none" && (
                <FormField
                  control={form.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={`Seleccione ${
                              contactType === "customer" ? "un cliente" : 
                              contactType === "lead" ? "un lead" : "una oportunidad"
                            }`} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contactType === "customer" && customers.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                          {contactType === "lead" && leads.map((lead: any) => (
                            <SelectItem key={lead.id} value={lead.id.toString()}>
                              {lead.name}
                            </SelectItem>
                          ))}
                          {contactType === "opportunity" && opportunities.map((opportunity: any) => (
                            <SelectItem key={opportunity.id} value={opportunity.id.toString()}>
                              {opportunity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
          
          <div className="col-span-1 md:col-span-2">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe la actividad..." 
                      className="min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="col-span-1 md:col-span-2">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas adicionales..." 
                      className="min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="reminderDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Recordatorio (opcional)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={`pl-3 text-left font-normal ${
                          !field.value && "text-muted-foreground"
                        }`}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: es })
                        ) : (
                          <span>Seleccione una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="reminderTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora del recordatorio</FormLabel>
                <FormControl>
                  <div className="flex items-center">
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <Input type="time" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={activityMutation.isPending}
          >
            {activityMutation.isPending 
              ? "Guardando..." 
              : activity 
                ? "Actualizar actividad" 
                : "Crear actividad"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}