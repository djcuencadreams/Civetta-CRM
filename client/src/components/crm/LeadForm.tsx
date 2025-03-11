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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { type Lead, brandEnum } from "@db/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, AlertCircle } from "lucide-react";

interface LeadFormProps {
  lead?: Lead;
  onClose: () => void;
}

export function LeadForm({ lead, onClose }: LeadFormProps) {
  const [isViewMode, setIsViewMode] = useState(!!lead);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showIdNumberPrompt, setShowIdNumberPrompt] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Brand options for marketing segmentation purposes
  const brandOptions = [
    { id: brandEnum.SLEEPWEAR, name: "Civetta Sleepwear" },
    { id: brandEnum.BRIDE, name: "Civetta Bride" },
    { id: `${brandEnum.SLEEPWEAR},${brandEnum.BRIDE}`, name: "Ambas marcas" }
  ];

  const form = useForm({
    defaultValues: {
      firstName: lead?.name?.split(' ')[0] || '',
      lastName: lead?.name?.split(' ').slice(1).join(' ') || '',
      email: lead?.email || '',
      phone: lead?.phone || '',
      status: lead?.status || 'new',
      source: lead?.source || 'instagram',
      notes: lead?.notes || '',
      lastContact: lead?.lastContact ? new Date(lead?.lastContact) : undefined,
      nextFollowUp: lead?.nextFollowUp ? new Date(lead?.nextFollowUp) : undefined,
      brand: lead?.brand || brandEnum.SLEEPWEAR,
      brandInterest: lead?.brandInterest || '', // Add the brand interest field
      idNumber: lead?.idNumber || '', // Add the ID number field
    }
  });

  // Mutation for creating/updating leads
  const mutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      
      // Handle brand-specific lead tracking
      const brandValue = data.brand || brandEnum.SLEEPWEAR;

      const payload = {
        name: fullName,
        email: data.email,
        phone: data.phone,
        status: data.status,
        source: data.source,
        notes: data.notes,
        lastContact: data.lastContact,
        nextFollowUp: data.nextFollowUp,
        brand: brandValue,
        brandInterest: data.brandInterest,
        idNumber: data.idNumber
      };

      // Detect if status is 'won' (about to be converted to customer)
      if (data.status === 'won' && (!lead || lead.status !== 'won')) {
        // Show the prompt for ID number instead of proceeding with conversion
        setShowIdNumberPrompt(true);
        return null; // Don't complete the mutation yet
      }

      if (lead) {
        return apiRequest(`/api/leads/${lead.id}`, 'PUT', payload);
      } else {
        return apiRequest('/api/leads', 'POST', payload);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to ${lead ? "update" : "create"} lead: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      if (!data) return; // If we showed the ID prompt, there's no data yet
      
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: lead ? "Lead Actualizado" : "Lead Creado",
        description: `El lead fue ${lead ? "actualizado" : "creado"} exitosamente.`,
      });
      onClose();
    },
  });

  // Mutation for deleting leads
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!lead) return null;
      return apiRequest(`/api/leads/${lead.id}`, 'DELETE');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete lead: ${error.message}`,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: "Lead Eliminado",
        description: "El lead fue eliminado exitosamente.",
      });
      onClose();
    },
  });

  // Mutation for converting lead to customer with ID number
  const convertWithIdNumberMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!lead) return null;
      
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      
      // Include the ID number in the payload
      const payload = {
        name: fullName,
        email: data.email,
        phone: data.phone,
        status: 'won', // Set explicitly to won
        source: data.source,
        notes: data.notes,
        lastContact: data.lastContact,
        nextFollowUp: data.nextFollowUp,
        brand: data.brand || brandEnum.SLEEPWEAR,
        brandInterest: data.brandInterest, // Add brand interest information
        idNumber: idNumber.trim() // Add the ID number from the dialog
      };

      return apiRequest(`/api/leads/${lead.id}/convert-with-id`, 'PUT', payload);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to convert lead to customer: ${error.message}`,
        variant: "destructive",
      });
      setShowIdNumberPrompt(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: "Lead Convertido",
        description: "El lead fue convertido a cliente exitosamente.",
      });
      setShowIdNumberPrompt(false);
      onClose();
    },
  });

  const handleFormSubmit = (data: Record<string, any>) => {
    mutation.mutate(data);
  };

  const handleDelete = () => {
    setShowDeleteDialog(false);
    deleteMutation.mutate();
  };

  const handleIdNumberSubmit = () => {
    if (!idNumber.trim()) {
      toast({
        title: "Error",
        description: "El número de identificación es requerido para convertir el lead a cliente.",
        variant: "destructive",
      });
      return;
    }
    
    const data = form.getValues();
    convertWithIdNumberMutation.mutate(data);
  };

  return (
    <>
      {/* ID Number Dialog */}
      <Dialog open={showIdNumberPrompt} onOpenChange={setShowIdNumberPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ingrese el número de cédula, pasaporte o RUC</DialogTitle>
            <DialogDescription>
              Para convertir un lead a cliente, por favor ingrese el número de identificación. 
              Este dato es importante para facturación, despacho y procesamiento de pagos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="idNumber">Número de Cédula, Pasaporte o RUC</Label>
            <Input
              id="idNumber"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="Ej: 1234567890"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIdNumberPrompt(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleIdNumberSubmit}
              disabled={convertWithIdNumberMutation.isPending}
            >
              {convertWithIdNumberMutation.isPending ? "Procesando..." : "Guardar y Convertir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
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
                    ["instagram", "Instagram"],
                    ["facebook", "Facebook"],
                    ["tiktok", "TikTok"],
                    ["website", "Página Web"],
                    ["whatsapp", "WhatsApp"],
                    ["email", "Email"],
                    ["event", "Evento"],
                    ["referral", "Referido"],
                    ["mass_media", "Publicidad en medios masivos"],
                    ["call", "Llamada"],
                    ["other", "Otros"]
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

        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marca preferida</FormLabel>
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
                  {brandOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Marca por la que el lead inicialmente mostró interés para fines de marketing
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="brandInterest"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interés específico</FormLabel>
              <FormControl>
                <Input {...field} disabled={isViewMode} placeholder="Ej: Pijamas, batas, ropa de novia..." />
              </FormControl>
              <FormDescription>
                Producto o categoría específica que interesa al lead
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="idNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de identificación</FormLabel>
              <FormControl>
                <Input {...field} disabled={isViewMode} placeholder="Cédula, pasaporte o RUC" />
              </FormControl>
              <FormDescription>
                Solo requerido para convertir a cliente
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between gap-2">
          {lead && (
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button 
                  type="button" 
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Lead
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Está seguro de eliminar este lead?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esta eliminará permanentemente el lead y todos sus datos asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <div className="flex ml-auto gap-2">
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
        </div>
      </form>
    </Form>
    </>
  );
}