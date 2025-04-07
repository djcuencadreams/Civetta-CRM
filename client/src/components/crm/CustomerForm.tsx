import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer, brandEnum, customerTypeEnum, customerStatusEnum } from "@db/schema";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

// Definición de interfaz para dirección de facturación
interface BillingAddress {
  street: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
}
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  Package, 
  Trash2, 
  Copy, 
  Tag, 
  Building2,
  User,
  BadgeCheck,
  Clock
} from "lucide-react";

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
  customerId,
  onComplete
}: {
  customerId?: number;
  onComplete: (customer?: any) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isViewMode, setIsViewMode] = useState(!!customerId);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Usar useQuery para obtener los datos actualizados del cliente directamente de la base de datos
  const { data: customer, isLoading, error } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    queryFn: async () => {
      if (!customerId) return undefined;
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) {
        throw new Error(`Error al cargar datos del cliente: ${res.status}`);
      }
      return res.json();
    },
    enabled: !!customerId, // Solo ejecuta la consulta si hay un ID de cliente
    refetchOnWindowFocus: false, // No refrescar al enfocar la ventana
    staleTime: 0, // Siempre obtener datos frescos
  });
  
  // Log de los datos recibidos desde la API
  useEffect(() => {
    if (customer) {
      console.log("CustomerForm - Cliente cargado desde API:", customer);
    }
  }, [customer]);

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: t("common.success") });
      onComplete(data);
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Cliente eliminado" });
      onComplete(data);
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ 
        title: "Cliente convertido a Lead",
        description: "El cliente ha sido convertido a lead exitosamente"
      });
      onComplete(data);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al convertir cliente",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Determinar si existe una dirección de facturación diferente para el estado inicial
  const hasDifferentBillingAddress = customer 
    ? !!(customer.billingAddress && 
        (customer.billingAddress as BillingAddress)?.street && 
        (customer.billingAddress as BillingAddress)?.street !== customer.street)
    : false;
    
  // Si no tiene una dirección diferente, usamos "misma dirección"
  const initialSameAsBilling = !hasDifferentBillingAddress;
  
  const [sameAsBilling, setSameAsBilling] = useState(initialSameAsBilling);
  const [customerTags, setCustomerTags] = useState<string[]>(
    customer?.tags && Array.isArray(customer.tags) ? customer.tags : []
  );
  const [currentTag, setCurrentTag] = useState("");

  // Inicializamos el formulario con valores por defecto básicos
  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      idNumber: "",
      email: "",
      phoneCountry: DEFAULT_COUNTRY_CODE,
      phoneNumber: "",
      secondaryPhone: "",
      street: "",
      city: "",
      province: "",
      deliveryInstructions: "",
      billingStreet: "",
      billingCity: "",
      billingProvince: "",
      billingPostalCode: "",
      billingCountry: "Ecuador",
      type: customerTypeEnum.PERSON,
      status: customerStatusEnum.ACTIVE,
      source: "instagram",
      brand: brandEnum.SLEEPWEAR,
      notes: ""
    }
  });
  
  // Actualizar el formulario cuando se cargan los datos del cliente desde la API
  useEffect(() => {
    if (customer) {
      // Reset del formulario con los datos actualizados del cliente
      form.reset({
        // Use separate first/last name fields if available, otherwise split from name
        firstName: customer.firstName || (customer.name?.split(' ')[0] || ''),
        lastName: customer.lastName || (customer.name?.split(' ').slice(1).join(' ') || ''),
        idNumber: customer.idNumber || '',
        email: customer.email || '',
        // Use dedicated phone fields if available, otherwise parse from combined phone field
        phoneCountry: customer.phoneCountry || customer.phone?.split(/[0-9]/)[0] || DEFAULT_COUNTRY_CODE,
        phoneNumber: customer.phoneNumber || customer.phone?.replace(/^\+\d+/, '') || '',
        secondaryPhone: customer.secondaryPhone || '',
        // Use structured address fields if available, otherwise parse from legacy address field
        street: customer.street || customer.address?.split(',')[0]?.trim() || '',
        city: customer.city || customer.address?.split(',')[1]?.trim() || '',
        province: customer.province || customer.address?.split(',')[2]?.split('\n')[0]?.trim() || '',
        deliveryInstructions: customer.deliveryInstructions || customer.address?.split('\n')[1]?.trim() || '',
        // Billing address fields
        billingStreet: (customer.billingAddress as BillingAddress)?.street || customer.street || '',
        billingCity: (customer.billingAddress as BillingAddress)?.city || customer.city || '',
        billingProvince: (customer.billingAddress as BillingAddress)?.province || customer.province || '',
        billingPostalCode: (customer.billingAddress as BillingAddress)?.postalCode || '',
        billingCountry: (customer.billingAddress as BillingAddress)?.country || 'Ecuador',
        // Customer type and status
        type: customer.type as any || customerTypeEnum.PERSON,
        status: customer.status || customerStatusEnum.ACTIVE,
        // Other fields
        source: customer.source || 'instagram',
        brand: customer.brand || brandEnum.SLEEPWEAR,
        notes: customer.notes || ''
      });
      
      // Actualizar tags si están disponibles
      if (customer.tags && Array.isArray(customer.tags)) {
        setCustomerTags(customer.tags);
      }
    }
  }, [customer, form]);

  const formatPhoneNumber = (value: string | undefined) => {
    if (!value) return '';
    if (value.startsWith('0')) {
      return value.substring(1);
    }
    return value;
  };

  // Si hay un ID de cliente pero aún está cargando, mostrar un spinner
  if (customerId && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p className="text-muted-foreground">Cargando datos actualizados del cliente...</p>
      </div>
    );
  }

  // Si ocurrió un error al cargar los datos, mostrar un mensaje de error
  if (error) {
    return (
      <div className="bg-destructive/10 p-4 rounded-md">
        <h3 className="text-destructive font-medium mb-2">Error al cargar datos del cliente</h3>
        <p className="text-sm">{error instanceof Error ? error.message : "Ocurrió un error desconocido"}</p>
        <Button 
          className="mt-4" 
          variant="outline" 
          onClick={() => onComplete()}
        >
          Cerrar
        </Button>
      </div>
    );
  }

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
            // Generar un nombre completo consistente a partir de firstName y lastName
            name: `${data.firstName.trim()} ${data.lastName.trim()}`,
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            idNumber: data.idNumber?.trim() || null,
            email: data.email?.trim() || null,
            phone: data.phoneNumber ? `${data.phoneCountry}${formatPhoneNumber(data.phoneNumber)}` : null,
            phoneCountry: data.phoneCountry || null,
            phoneNumber: data.phoneNumber ? formatPhoneNumber(data.phoneNumber) : null,
            secondaryPhone: data.secondaryPhone?.trim() || null,
            street: data.street?.trim() || null,
            city: data.city?.trim() || null,
            province: data.province || null,
            deliveryInstructions: data.deliveryInstructions?.trim() || null,
            // Keep backward compatibility with address field
            address: data.street ? `${data.street.trim()}, ${data.city?.trim() || ''}, ${data.province || ''}\n${data.deliveryInstructions?.trim() || ''}`.trim() : null,
            // Billing address fields - manejo más robusto del objeto billingAddress
            billingAddress: sameAsBilling ? null : (
              // Solo creamos el objeto si al menos uno de los campos tiene valor
              data.billingStreet?.trim() || data.billingCity?.trim() || data.billingProvince || data.billingPostalCode?.trim() 
                ? {
                    street: data.billingStreet?.trim() || null,
                    city: data.billingCity?.trim() || null, 
                    province: data.billingProvince || null,
                    postalCode: data.billingPostalCode?.trim() || null,
                    country: data.billingCountry || 'Ecuador'
                  } 
                : null
            ) as BillingAddress | null,
            // Customer type and status
            type: data.type || customerTypeEnum.PERSON,
            status: data.status || customerStatusEnum.ACTIVE,
            // Tags
            tags: customerTags,
            // Other fields
            source: data.source,
            brand: data.brand,
            notes: data.notes?.trim() || null
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

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cliente</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isViewMode} 
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={customerTypeEnum.PERSON}>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          Persona
                        </div>
                      </SelectItem>
                      <SelectItem value={customerTypeEnum.COMPANY}>
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 mr-2" />
                          Empresa
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado del Cliente</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isViewMode} 
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={customerStatusEnum.ACTIVE}>
                        <div className="flex items-center">
                          <BadgeCheck className="h-4 w-4 mr-2" />
                          Activo
                        </div>
                      </SelectItem>
                      <SelectItem value={customerStatusEnum.INACTIVE}>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          Inactivo
                        </div>
                      </SelectItem>
                      <SelectItem value={customerStatusEnum.VIP}>
                        <div className="flex items-center">
                          <span className="text-amber-500 mr-2">★</span>
                          VIP
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

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
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (sameAsBilling && !isViewMode) {
                          form.setValue('billingProvince', val);
                        }
                      }}
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

            {!isViewMode && (
              <div className="flex items-center gap-2 mt-4 border-t pt-3">
                <Checkbox 
                  id="same-billing-shipping" 
                  checked={sameAsBilling}
                  onCheckedChange={(checked) => {
                    setSameAsBilling(!!checked);
                    if (checked) {
                      // Copiar dirección de entrega a facturación (pero mantenerla oculta)
                      const currentStreet = form.getValues('street') || '';
                      const currentCity = form.getValues('city') || '';
                      const currentProvince = form.getValues('province') || '';
                      
                      form.setValue('billingStreet', currentStreet);
                      form.setValue('billingCity', currentCity);
                      form.setValue('billingProvince', currentProvince);
                      
                      // Mostrar toast para confirmar acción
                      if (currentStreet) {
                        toast({ 
                          title: "Direcciones sincronizadas",
                          description: "Se usará la misma dirección para envío y facturación",
                          variant: "default"
                        });
                      }
                    }
                  }}
                />
                <label 
                  htmlFor="same-billing-shipping" 
                  className="text-sm cursor-pointer font-medium"
                >
                  Usar la misma dirección para envío y facturación
                </label>
              </div>
            )}
          </div>

          {/* Dirección de Facturación - Solo visible si sameAsBilling = false */}
          {!sameAsBilling && (
            <div className="space-y-4 border-t pt-4 mt-2">
              <h3 className="font-medium">Dirección de Facturación</h3>
              
              <FormField
                control={form.control}
                name="billingStreet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calle, Intersección y Número</FormLabel>
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
                  name="billingCity"
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
                  name="billingProvince"
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billingPostalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={isViewMode} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingCountry"
                  render={({ field }) => (
                    <FormItem>
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
                          <SelectItem value="Ecuador">Ecuador</SelectItem>
                          <SelectItem value="Colombia">Colombia</SelectItem>
                          <SelectItem value="Perú">Perú</SelectItem>
                          <SelectItem value="Estados Unidos">Estados Unidos</SelectItem>
                          <SelectItem value="México">México</SelectItem>
                          <SelectItem value="España">España</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Sección de Etiquetas */}
          <div className="space-y-4">
            <h3 className="font-medium">Etiquetas del Cliente</h3>
            
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1 mb-2">
                {customerTags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                    {!isViewMode && (
                      <button 
                        type="button" 
                        className="ml-1 hover:text-destructive"
                        onClick={() => setCustomerTags(tags => tags.filter((_, i) => i !== index))}
                      >
                        ×
                      </button>
                    )}
                  </Badge>
                ))}
                {customerTags.length === 0 && (
                  <p className="text-xs text-muted-foreground">No hay etiquetas asignadas</p>
                )}
              </div>
              
              {!isViewMode && (
                <div className="flex gap-2">
                  <Input 
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    placeholder="Nueva etiqueta"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && currentTag.trim()) {
                        e.preventDefault();
                        if (!customerTags.includes(currentTag.trim())) {
                          setCustomerTags([...customerTags, currentTag.trim()]);
                        }
                        setCurrentTag('');
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    disabled={!currentTag.trim()}
                    onClick={() => {
                      if (currentTag.trim() && !customerTags.includes(currentTag.trim())) {
                        setCustomerTags([...customerTags, currentTag.trim()]);
                        setCurrentTag('');
                      }
                    }}
                  >
                    Añadir
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Información adicional */}
          <div className="space-y-4">
            <h3 className="font-medium">Información Adicional</h3>

            {customer && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Fecha de Registro:</span>
                    </div>
                    <p className="text-sm mt-1">{customer?.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "N/A"}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Última Compra:</span>
                    </div>
                    <p className="text-sm mt-1">{customer?.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString() : "Sin compras"}</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="font-semibold">Valor Histórico:</span>
                    </div>
                    <p className="text-sm mt-1">${customer?.totalValue ? Number(customer.totalValue).toFixed(2) : "0.00"}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas Internas</FormLabel>
                  <FormControl>
                    <Textarea {...field} readOnly={isViewMode} className="min-h-[100px]" />
                  </FormControl>
                  <FormDescription>
                    Información adicional o notas importantes sobre este cliente
                  </FormDescription>
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