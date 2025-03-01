import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer, brandEnum } from "@db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { t } from "@/lib/i18n";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

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
  { code: "+33", country: "🇫🇷 Francia (+33)" },
  { code: "+502", country: "🇬🇹 Guatemala (+502)" },
  { code: "+504", country: "🇭🇳 Honduras (+504)" },
  { code: "+39", country: "🇮🇹 Italia (+39)" },
  { code: "+81", country: "🇯🇵 Japón (+81)" },
  { code: "+52", country: "🇲🇽 México (+52)" },
  { code: "+505", country: "🇳🇮 Nicaragua (+505)" },
  { code: "+507", country: "🇵🇦 Panamá (+507)" },
  { code: "+595", country: "🇵🇾 Paraguay (+595)" },
  { code: "+51", country: "🇵🇪 Perú (+51)" },
  { code: "+351", country: "🇵🇹 Portugal (+351)" },
  { code: "+1_PR", country: "🇵🇷 Puerto Rico (+1)" },
  { code: "+44", country: "🇬🇧 Reino Unido (+44)" },
  { code: "+7", country: "🇷🇺 Rusia (+7)" },
  { code: "+41", country: "🇨🇭 Suiza (+41)" },
  { code: "+598", country: "🇺🇾 Uruguay (+598)" },
  { code: "+58", country: "🇻🇪 Venezuela (+58)" }
];

const DEFAULT_COUNTRY_CODE = "+593";

const provinces = [
  "Azuay", "Bolívar", "Cañar", "Carchi", "Chimborazo", "Cotopaxi", 
  "El Oro", "Esmeraldas", "Galápagos", "Guayas", "Imbabura", "Loja",
  "Los Ríos", "Manabí", "Morona Santiago", "Napo", "Orellana", 
  "Pastaza", "Pichincha", "Santa Elena", "Santo Domingo", 
  "Sucumbíos", "Tungurahua", "Zamora Chinchipe"
];

// Brand options for the form
const brandOptions = [
  { id: brandEnum.SLEEPWEAR, name: "Civetta Sleepwear" },
  { id: brandEnum.BRIDE, name: "Civetta Bride" },
  { id: `${brandEnum.SLEEPWEAR},${brandEnum.BRIDE}`, name: "Ambas marcas" }
];

export function CustomerForm({
  customer,
  onComplete
}: {
  customer?: Customer;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isViewMode, setIsViewMode] = useState(!!customer);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const method = customer?.id ? "PUT" : "POST";
      const endpoint = customer?.id ? `/api/customers/${customer.id}` : "/api/customers";

      const res = await apiRequest(method, endpoint, values);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: t("common.success") });
      onComplete();
    },
    onError: (error: any) => {
      toast({ 
        title: t("common.error"),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.id) return;
      const res = await apiRequest("DELETE", `/api/customers/${customer.id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || `HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Cliente eliminado" });
      onComplete();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al eliminar cliente",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // New mutation for converting a customer back to a lead
  const convertToLeadMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.id) return;
      const res = await apiRequest("POST", `/api/customers/${customer.id}/convert-to-lead`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || `HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ 
        title: "Cliente convertido a Lead",
        description: "El cliente ha sido convertido a lead exitosamente"
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al convertir cliente",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const form = useForm({
    defaultValues: customer ? {
      // Use separate first/last name fields if available, otherwise split from name
      firstName: customer.firstName || customer.name?.split(' ')[0] || '',
      lastName: customer.lastName || customer.name?.split(' ').slice(1).join(' ') || '',
      idNumber: customer.idNumber || '',
      email: customer.email || '',
      // Use dedicated phone fields if available, otherwise parse from combined phone field
      phoneCountry: customer.phoneCountry || customer.phone?.split(/[0-9]/)[0] || DEFAULT_COUNTRY_CODE,
      phoneNumber: customer.phoneNumber || customer.phone?.replace(/^\+\d+/, '') || '',
      // Use structured address fields if available, otherwise parse from legacy address field
      street: customer.street || customer.address?.split(',')[0]?.trim() || '',
      city: customer.city || customer.address?.split(',')[1]?.trim() || '',
      province: customer.province || customer.address?.split(',')[2]?.split('\n')[0]?.trim() || '',
      deliveryInstructions: customer.deliveryInstructions || customer.address?.split('\n')[1]?.trim() || '',
      source: customer.source || 'instagram',
      brand: customer.brand || brandEnum.SLEEPWEAR
    } : {
      firstName: "",
      lastName: "",
      idNumber: "",
      email: "",
      phoneCountry: DEFAULT_COUNTRY_CODE,
      phoneNumber: "",
      street: "",
      city: "",
      province: "",
      deliveryInstructions: "",
      source: "instagram",
      brand: brandEnum.SLEEPWEAR
    }
  });

  const formatPhoneNumber = (value: string | undefined) => {
    if (!value) return '';
    if (value.startsWith('0')) {
      return value.substring(1);
    }
    return value;
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => {
          if (!data.firstName?.trim() || !data.lastName?.trim()) {
            toast({ 
              title: "Error",
              description: "Nombres y apellidos son requeridos",
              variant: "destructive"
            });
            return;
          }
          const formattedData = {
            name: `${data.firstName.trim()} ${data.lastName.trim()}`,
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            idNumber: data.idNumber?.trim() || null,
            email: data.email?.trim() || null,
            phone: data.phoneNumber ? `${data.phoneCountry}${formatPhoneNumber(data.phoneNumber)}` : null,
            phoneCountry: data.phoneCountry || null,
            phoneNumber: data.phoneNumber ? formatPhoneNumber(data.phoneNumber) : null,
            street: data.street?.trim() || null,
            city: data.city?.trim() || null,
            province: data.province || null,
            deliveryInstructions: data.deliveryInstructions?.trim() || null,
            // Keep backward compatibility with address field
            address: data.street ? `${data.street.trim()}, ${data.city?.trim() || ''}, ${data.province || ''}\n${data.deliveryInstructions?.trim() || ''}`.trim() : null,
            source: data.source,
            brand: data.brand
          };
          mutation.mutate(formattedData);
        })} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombres</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={isViewMode} />
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
                    <Input {...field} readOnly={isViewMode} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="idNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Cédula, Pasaporte o RUC</FormLabel>
                <FormControl>
                  <Input {...field} readOnly={isViewMode} />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  Requerido para facturación, despacho y procesamiento de pagos
                </p>
              </FormItem>
            )}
          />

          <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca preferida (opcional)</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isViewMode} 
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {brandOptions.map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Esta información es solo para referencia. Los productos comprados determinarán las marcas reales.
                  </p>
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
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isViewMode} 
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: "instagram", label: "Instagram" },
                        { value: "facebook", label: "Facebook" },
                        { value: "tiktok", label: "TikTok" },
                        { value: "website", label: "Página Web" },
                        { value: "whatsapp", label: "WhatsApp" },
                        { value: "email", label: "Email" },
                        { value: "event", label: "Evento" },
                        { value: "referral", label: "Referido" },
                        { value: "mass_media", label: "Publicidad en medios masivos" },
                        { value: "call", label: "Llamada" },
                        { value: "other", label: "Otros" }
                      ].map(source => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
              <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl>
                  <Input type="email" {...field} readOnly={isViewMode} />
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
                      readOnly={isViewMode}
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

          <div className="space-y-4">
            <h3 className="font-medium">Dirección de Entrega</h3>

            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calle, Intersección y Número de Casa</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={isViewMode} />
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
                      <Input {...field} readOnly={isViewMode} />
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
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isViewMode} 
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
                  <FormLabel>Referencia o Instrucciones Especiales para la Entrega</FormLabel>
                  <FormControl>
                    <Textarea {...field} readOnly={isViewMode} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between gap-2">
            {customer && isViewMode && (
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="destructive"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Cliente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Está seguro de eliminar este cliente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Esta eliminará permanentemente el cliente y todos sus datos asociados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <div className="flex ml-auto gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onComplete}
              >
                {t("common.cancel")}
              </Button>
              {customer && isViewMode && (
                <>
                  <Button type="button" onClick={() => setIsViewMode(false)}>
                    Editar Cliente
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setShowConvertDialog(true)}
                    variant="secondary"
                    disabled={convertToLeadMutation.isPending}
                  >
                    Convertir a Lead
                  </Button>
                </>
              )}
              {!isViewMode && <Button type="submit" disabled={mutation.isPending}>
                {t("common.save")}
              </Button>}
            </div>
          </div>
        </form>
      </Form>

      {/* Confirmation dialog for converting customer to lead */}
      <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertir Cliente a Lead</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de convertir este cliente a lead? 
              Esta acción no afectará las ventas existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                convertToLeadMutation.mutate();
                setShowConvertDialog(false);
              }}
            >
              Convertir a Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}