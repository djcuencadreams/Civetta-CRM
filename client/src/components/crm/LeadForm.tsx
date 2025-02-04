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

export function LeadForm({
  lead,
  onClose
}: {
  lead?: any;
  onClose: () => void;
}) {
  const [isViewMode, setIsViewMode] = useState(!!lead);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      firstName: lead?.name?.split(' ')[0] || '',
      lastName: lead?.name?.split(' ').slice(1).join(' ') || '',
      email: lead?.email || '',
      phoneCountry: lead?.phone?.split(/[0-9]/)[0] || '+593',
      phoneNumber: lead?.phone?.replace(/^\+\d+/, '') || '',
      source: lead?.source || '',
      status: lead?.status || 'new',
      street: lead?.address?.split(',')[0]?.trim() || '',
      city: lead?.address?.split(',')[1]?.trim() || '',
      province: lead?.address?.split(',')[2]?.split('\n')[0]?.trim() || '',
      deliveryInstructions: lead?.address?.split('\n')[1]?.trim() || '',
      notes: lead?.notes || '',
      lastContact: lead?.last_contact ? new Date(lead.last_contact) : null,
      nextFollowUp: lead?.next_follow_up ? new Date(lead.next_follow_up) : null,
    }
  });

  const formatPhoneNumber = (value: string | undefined) => {
    if (!value) return '';
    if (value.startsWith('0')) {
      return value.substring(1);
    }
    return value;
  };
  
  const mutation = useMutation({
    mutationFn: async (values: any) => {
      // Validate required fields
      if (!values.firstName?.trim()) {
        throw new Error("El nombre es requerido");
      }

      const formattedValues = {
        name: `${values.firstName?.trim()} ${values.lastName?.trim()}`.trim(),
        email: values.email?.trim() || null,
        phone: values.phoneNumber ? values.phoneCountry.replace(/[_]/g, '') + formatPhoneNumber(values.phoneNumber) : null,
        address: values.street ? 
          `${values.street.trim()}, ${values.city?.trim() || ''}, ${values.province || ''}${values.deliveryInstructions ? '\n' + values.deliveryInstructions.trim() : ''}`.trim() 
          : null,
        source: values.source || null,
        status: values.status,
        notes: values.notes?.trim() || null,
        last_contact: values.lastContact ? new Date(values.lastContact).toISOString() : null,
        next_follow_up: values.nextFollowUp ? new Date(values.nextFollowUp).toISOString() : null,
        customer_lifecycle_stage: values.status === 'won' ? 'customer' : 'lead'
      };

      console.log('Sending lead update:', formattedValues);

      try {
        const res = await apiRequest(
          lead ? "PUT" : "POST",
          `/api/leads${lead ? `/${lead.id}` : ''}`,
          formattedValues
        );

        const contentType = res.headers.get("content-type");
        if (!res.ok) {
          const errorText = contentType?.includes("application/json") 
            ? (await res.json()).error 
            : await res.text();
          throw new Error(errorText);
        }

        if (contentType?.includes("application/json")) {
          return await res.json();
        }
        throw new Error("Invalid response format from server");
      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    },
    onSuccess: async (data) => {
      // Validate response data
      if (!data || !data.id) {
        throw new Error("Invalid response from server");
      }

      try {
        // Invalidate and refetch leads
        await queryClient.invalidateQueries({ 
          queryKey: ["/api/leads"],
          refetchType: 'active'
        });
        
        // If lead was converted to customer, invalidate customers
        if (data.convertedToCustomer) {
          await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
        }

        // Update local cache
        queryClient.setQueryData(["/api/leads"], (oldData: any[]) => {
          if (!oldData) return [data];
          const filtered = oldData.filter(item => item.id !== data.id);
          return [...filtered, data].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        toast({ 
          title: "Lead guardado exitosamente",
          description: "Todos los campos han sido actualizados",
          variant: "success"
        });
        onClose();
      } catch (error) {
        console.error('Error updating cache:', error);
        toast({ 
          title: "Error actualizando caché",
          description: "Los cambios fueron guardados pero requieren refrescar la página",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error('Lead update error:', error);
      const errorMessage = error?.response?.data?.error || error.message || "Error desconocido";
      toast({ 
        title: "Error al guardar lead",
        description: errorMessage,
        variant: "destructive"
      });
      // Force refetch on error to ensure consistent state
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
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
                    ["Website", "Sitio Web"],
                    ["Referral", "Referido"],
                    ["Social Media", "Redes Sociales"],
                    ["Email", "Correo Electrónico"],
                    ["Cold Call", "Llamada en Frío"],
                    ["Event", "Evento"],
                    ["Other", "Otro"]
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
          name="lastContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Último Contacto</FormLabel>
              <FormControl>
                <DatePicker
                  disabled={isViewMode}
                  value={field.value}
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
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
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

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          {lead && (
            <>
              {isViewMode ? (
                <Button type="button" onClick={() => setIsViewMode(false)}>
                  Editar Lead
                </Button>
              ) : null}
              <Button 
                type="button" 
                onClick={() => deleteMutation.mutate()} 
                disabled={deleteMutation.isPending}
                variant="destructive"
              >
                Eliminar Lead
              </Button>
            </>
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