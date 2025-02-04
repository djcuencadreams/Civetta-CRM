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

const countryCodes = [
  { code: "+593", country: "🇪🇨 Ecuador (+593)" },
  { code: "+1_US", country: "🇺🇸 Estados Unidos (+1)" },
  { code: "+54", country: "🇦🇷 Argentina (+54)" },
  { code: "+591", country: "🇧🇴 Bolivia (+591)" },
  { code: "+55", country: "🇧🇷 Brasil (+55)" },
  { code: "+1_CA", country: "🇨🇦 Canadá (+1)" },
  { code: "+56", country: "🇨🇱 Chile (+56)" },
  { code: "+86", country: "🇨🇳 China (+86)" },
  { code: "+57", country: "🇨🇴 Colombia (+57)" },
  { code: "+506", country: "🇨🇷 Costa Rica (+506)" },
  { code: "+53", country: "🇨🇺 Cuba (+53)" },
  { code: "+503", country: "🇸🇻 El Salvador (+503)" },
  { code: "+34", country: "🇪🇸 España (+34)" },
  { code: "+502", country: "🇬🇹 Guatemala (+502)" },
  { code: "+504", country: "🇭🇳 Honduras (+504)" },
  { code: "+52", country: "🇲🇽 México (+52)" },
  { code: "+505", country: "🇳🇮 Nicaragua (+505)" },
  { code: "+507", country: "🇵🇦 Panamá (+507)" },
  { code: "+595", country: "🇵🇾 Paraguay (+595)" },
  { code: "+51", country: "🇵🇪 Perú (+51)" },
  { code: "+1_PR", country: "🇵🇷 Puerto Rico (+1)" },
  { code: "+598", country: "🇺🇾 Uruguay (+598)" },
  { code: "+58", country: "🇻🇪 Venezuela (+58)" }
];

const provinces = [
  "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", 
  "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja",
  "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", 
  "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo", 
  "Sucumbíos", "Tungurahua", "Zamora Chinchipe"
];

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
      phoneCountry: lead?.phoneCountry || '+593',
      phoneNumber: lead?.phoneNumber?.replace(/^\+\d+/, '') || '',
      status: lead?.status || 'new',
      street: lead?.street || '',
      city: lead?.city || '',
      province: lead?.province || '',
      deliveryInstructions: lead?.deliveryInstructions || '',
      notes: lead?.notes || '',
      lastContact: lead?.lastContact ? new Date(lead.lastContact) : null,
      nextFollowUp: lead?.nextFollowUp ? new Date(lead.nextFollowUp) : null,
    }
  });

  const formatPhoneNumber = (value: string | undefined) => {
    if (!value) return '';
    return value.replace(/^0/, '');
  };

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      if (!values.firstName?.trim()) {
        throw new Error("El nombre es requerido");
      }

      const formattedValues = {
        name: `${values.firstName?.trim()} ${values.lastName?.trim()}`.trim(),
        email: values.email?.trim() || null,
        phoneCountry: values.phoneCountry,
        phoneNumber: values.phoneNumber ? formatPhoneNumber(values.phoneNumber) : null,
        status: values.status,
        street: values.street?.trim() || null,
        city: values.city?.trim() || null,
        province: values.province || null,
        deliveryInstructions: values.deliveryInstructions?.trim() || null,
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
      toast({ 
        title: "Lead guardado exitosamente",
        description: "Todos los campos han sido actualizados"
      });
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!lead?.id) return;
      const res = await apiRequest("DELETE", `/api/leads/${lead.id}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead eliminado exitosamente" });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al eliminar lead",
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

        <div className="grid grid-cols-12 gap-4">
          <FormField
            control={form.control}
            name="phoneCountry"
            render={({ field }) => (
              <FormItem className="col-span-5">
                <FormLabel>País</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isViewMode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodes.map(({code, country}) => (
                      <SelectItem key={code} value={code}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem className="col-span-7">
                <FormLabel>Teléfono celular</FormLabel>
                <FormControl>
                  <Input 
                    maxLength={10} 
                    {...field} 
                    disabled={isViewMode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 10) {
                        field.onChange(value);
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        <div className="space-y-4">
          <h3 className="font-medium">Dirección</h3>

          <FormField
            control={form.control}
            name="street"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Calle, Intersección y Número de Casa</FormLabel>
                <FormControl>
                  <Input {...field} disabled={isViewMode} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isViewMode} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provincia</FormLabel>
                  <Select
                    disabled={isViewMode}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map(province => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="deliveryInstructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia o Instrucciones Especiales</FormLabel>
                <FormControl>
                  <Textarea {...field} disabled={isViewMode} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                  date={field.value ? new Date(field.value) : undefined}
                  onSelect={field.onChange}
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
                  date={field.value ? new Date(field.value) : undefined}
                  onSelect={field.onChange}
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