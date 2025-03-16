import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "../../components/ui/dialog";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "../../components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../components/ui/select";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from 'lucide-react';

// Opciones para canal de comunicación
const channelOptions = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "phone", label: "Teléfono" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Reunión" },
];

// Opciones para tipo de interacción
const typeOptions = [
  { value: "query", label: "Consulta" },
  { value: "complaint", label: "Queja" },
  { value: "followup", label: "Seguimiento" },
  { value: "order", label: "Pedido" },
  { value: "support", label: "Soporte" },
];

// Esquema de validación
const interactionSchema = z.object({
  contactType: z.string({ required_error: "Selecciona un tipo de contacto" }),
  contactId: z.string({ required_error: "Selecciona un contacto" }),
  type: z.string({ required_error: "Selecciona un tipo de interacción" }),
  channel: z.string({ required_error: "Selecciona un canal de comunicación" }),
  content: z.string({ required_error: "El contenido es requerido" })
    .min(3, "El contenido debe tener al menos 3 caracteres"),
  assignedUserId: z.string().optional(),
});

type InteractionFormValues = z.infer<typeof interactionSchema>;

interface CreateInteractionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateInteractionDialog({ open, onClose, onCreated }: CreateInteractionDialogProps) {
  const [selectedContactType, setSelectedContactType] = useState<string>('');
  
  // Consulta de usuarios CRM
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        console.error('Error fetching users:', error);
        return [];
      }
    },
  });
  
  // Consulta de clientes
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/customers');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        console.error('Error fetching customers:', error);
        return [];
      }
    },
  });
  
  // Consulta de leads
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ['/api/leads'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/leads');
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        console.error('Error fetching leads:', error);
        return [];
      }
    },
  });
  
  // Configuración del formulario
  const form = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      contactType: '',
      contactId: '',
      type: '',
      channel: '',
      content: '',
      assignedUserId: '',
    },
  });
  
  // Mutación para crear una interacción
  const createInteraction = useMutation<any, Error, InteractionFormValues>({
    mutationFn: async (data: InteractionFormValues) => {
      const response = await fetch('/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(data.contactType === 'customer' ? { customerId: parseInt(data.contactId) } : {}),
          ...(data.contactType === 'lead' ? { leadId: parseInt(data.contactId) } : {}),
          type: data.type,
          channel: data.channel,
          content: data.content,
          ...(data.assignedUserId ? { assignedUserId: parseInt(data.assignedUserId) } : {}),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear la interacción');
      }
      
      return response.json();
    },
    onSuccess: () => {
      form.reset();
      onCreated();
    },
  });
  
  // Manejar el envío del formulario
  function onSubmit(data: InteractionFormValues) {
    createInteraction.mutate(data);
  }
  
  // Manejar cambio en tipo de contacto
  const handleContactTypeChange = (value: string) => {
    setSelectedContactType(value);
    form.setValue('contactType', value);
    form.setValue('contactId', '');
  };
  
  // Obtener lista de contactos según el tipo seleccionado
  const getContactOptions = () => {
    if (selectedContactType === 'customer') {
      return customers?.map(customer => ({
        value: customer.id.toString(),
        label: customer.name
      })) || [];
    } else if (selectedContactType === 'lead') {
      return leads?.map(lead => ({
        value: lead.id.toString(),
        label: lead.name
      })) || [];
    }
    return [];
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Nueva Interacción</DialogTitle>
          <DialogDescription>
            Registra una nueva comunicación con un cliente o lead.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Tipo de contacto */}
            <FormField
              control={form.control}
              name="contactType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de contacto</FormLabel>
                  <Select 
                    onValueChange={handleContactTypeChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo de contacto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="customer">Cliente</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Contacto específico */}
            {selectedContactType && (
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedContactType === 'customer' ? 'Cliente' : 'Lead'}
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Seleccionar ${selectedContactType === 'customer' ? 'cliente' : 'lead'}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {getContactOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Tipo de interacción */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de interacción</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {typeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Canal de comunicación */}
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canal de comunicación</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar canal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {channelOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Contenido */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalles de la interacción" 
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Usuario asignado */}
            <FormField
              control={form.control}
              name="assignedUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignado a</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar usuario (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {users?.map(user => (
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
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createInteraction.isPending}
              >
                {createInteraction.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}