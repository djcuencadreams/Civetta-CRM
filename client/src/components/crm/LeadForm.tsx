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
      source: lead?.source || 'website',
      notes: lead?.notes || '',
      brand: lead?.brand || brandEnum.SLEEPWEAR,
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
        brand: values.brand,
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

  // Add a new mutation for deleting leads
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!lead) return;

      const res = await apiRequest(
        "DELETE",
        `/api/leads/${lead.id}`,
        undefined
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || `HTTP error! status: ${res.status}`);
      }

      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead eliminado exitosamente" });
      onClose();
    },
    onError: (error: Error) => {
      console.error('Lead deletion error:', error);
      toast({
        title: "Error al eliminar lead",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // New conversion mutation with ID number
  const convertWithIdNumberMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!lead) return;
      
      const formattedValues = {
        ...values,
        idNumber: idNumber.trim() || null,
      };

      const res = await apiRequest(
        "PUT",
        `/api/leads/${lead.id}/convert-with-id`,
        formattedValues
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || `HTTP error! status: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ 
        title: "Lead convertido a cliente",
        description: "El lead ha sido convertido a cliente con número de cédula/pasaporte"
      });
      onClose();
    },
    onError: (error: Error) => {
      console.error('Lead conversion error:', error);
      toast({
        title: "Error al convertir lead",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Check if we're converting a lead to a customer
  const handleFormSubmit = (data: any) => {
    if (data.status === 'won' && !lead?.convertedToCustomer) {
      // Show the ID number prompt
      setShowIdNumberPrompt(true);
    } else {
      // Regular form submit
      mutation.mutate(data);
    }
  };

  // Handle ID number submission and lead conversion
  const handleIdNumberSubmit = () => {
    const data = form.getValues();
    convertWithIdNumberMutation.mutate(data);
  };

  return (
    <>
      {/* ID Number Dialog */}
      <Dialog open={showIdNumberPrompt} onOpenChange={setShowIdNumberPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ingrese el número de cédula/pasaporte</DialogTitle>
            <DialogDescription>
              Para convertir un lead a cliente, por favor ingrese el número de cédula o pasaporte. 
              Este dato es importante para facturación, despacho y procesamiento de pagos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="idNumber">Número de Cédula/Pasaporte</Label>
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
  );
}