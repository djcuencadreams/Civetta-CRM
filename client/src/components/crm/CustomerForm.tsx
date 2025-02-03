
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer } from "@db/schema";
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

export function CustomerForm({
  customer,
  onComplete
}: {
  customer?: Customer;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const formattedData = {
        ...values,
        phoneNumber: values.phoneNumber ? values.phoneNumber.replace(/^0+/, '') : '',
      };
      const res = await apiRequest("POST", "/api/customers", formattedData);
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

  const form = useForm({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: customer || {
      firstName: "",
      lastName: "",
      email: "",
      phoneCountry: DEFAULT_COUNTRY_CODE,
      phoneNumber: "",
      street: "",
      city: "",
      province: "",
      deliveryInstructions: ""
    }
  });

  const formatPhoneNumber = (value: string) => {
    if (value.startsWith('0')) {
      return value.substring(1);
    }
    return value;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        const formattedData = {
          ...data,
          phoneNumber: formatPhoneNumber(data.phoneNumber)
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
                  <Input {...field} />
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
                  <Input {...field} />
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
                <Input type="email" {...field} />
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
                  <Input {...field} />
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
                    <Input {...field} />
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
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onComplete}
          >
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
