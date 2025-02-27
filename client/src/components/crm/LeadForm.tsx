import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { type Lead } from "@db/schema";

interface LeadFormProps {
  lead?: Lead;
  onClose: () => void;
}

export function LeadForm({ lead, onClose }: LeadFormProps) {
  const [isViewMode, setIsViewMode] = useState(!!lead);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      firstName: lead?.name?.split(' ')[0] || '',
      lastName: lead?.name?.split(' ').slice(1).join(' ') || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      status: lead?.status || 'new',
      source: lead?.source || 'website',
      notes: lead?.notes || '',
      lastContact: lead?.lastContact ? new Date(lead.lastContact) : null,
      nextFollowUp: lead?.nextFollowUp ? new Date(lead.nextFollowUp) : null,
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      if (!values.firstName?.trim()) {
        throw new Error("El nombre es requerido");
      }

      const formattedValues = {
        name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        status: values.status,
        source: values.source,
        notes: values.notes?.trim() || null,
        lastContact: values.lastContact ? new Date(values.lastContact).toISOString() : null,
        nextFollowUp: values.nextFollowUp ? new Date(values.nextFollowUp).toISOString() : null
      };

      const res = await apiRequest(
        lead ? "PUT" : "POST",
        `/api/leads${lead ? `/${lead.id}` : ''}`,
        formattedValues
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || `HTTP error! status: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });

      // If the lead status is 'won', also invalidate the customers query
      // to ensure the newly created customer appears in customer lists
      if (form.getValues().status === 'won') {
        await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
        toast({ 
          title: "Lead convertido a cliente",
          description: "El lead ha sido convertido exitosamente a cliente"
        });
      } else {
        toast({ title: "Lead guardado exitosamente" });
      }

      onClose();
    },
    onError: (error: Error) => {
      console.error('Lead update error:', error);
      toast({
        title: "Error al guardar lead",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombres</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isViewMode} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellidos</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isViewMode} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo Electrónico</FormLabel>
              <FormControl>
                <Input type="email" {...field} disabled={isViewMode} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <Input {...field} disabled={isViewMode} />
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
                disabled={isViewMode}
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[
                    ["new", "Nuevo"],
                    ["contacted", "Contactado"],
                    ["qualified", "Calificado"],
                    ["proposal", "Propuesta"],
                    ["negotiation", "Negociación"],
                    ["won", "Ganado"],
                    ["lost", "Perdido"]
                  ].map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fuente</FormLabel>
              <Select
                disabled={isViewMode}
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[
                    ["website", "Sitio Web"],
                    ["referral", "Referido"],
                    ["social_media", "Redes Sociales"],
                    ["email", "Correo Electrónico"],
                    ["cold_call", "Llamada en Frío"],
                    ["event", "Evento"],
                    ["other", "Otro"]
                  ].map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea {...field} disabled={isViewMode} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Último Contacto</FormLabel>
              <FormControl>
                <DatePicker
                  disabled={isViewMode}
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nextFollowUp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Próximo Seguimiento</FormLabel>
              <FormControl>
                <DatePicker
                  disabled={isViewMode}
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          {lead && isViewMode && (
            <Button type="button" onClick={() => setIsViewMode(false)}>
              Editar Lead
            </Button>
          )}
          {!isViewMode && (
            <Button type="submit" disabled={mutation.isPending}>
              Guardar
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}