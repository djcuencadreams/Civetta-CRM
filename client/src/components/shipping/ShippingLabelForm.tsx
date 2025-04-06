import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Search } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Lista de provincias de Ecuador
const provinciasEcuador = [
  "Azuay",
  "Bolívar",
  "Cañar",
  "Carchi",
  "Chimborazo",
  "Cotopaxi",
  "El Oro",
  "Esmeraldas",
  "Galápagos",
  "Guayas",
  "Imbabura",
  "Loja",
  "Los Ríos",
  "Manabí",
  "Morona Santiago",
  "Napo",
  "Orellana",
  "Pastaza",
  "Pichincha",
  "Santa Elena",
  "Santo Domingo de los Tsáchilas",
  "Sucumbíos",
  "Tungurahua",
  "Zamora Chinchipe"
];

// Esquema para validar el formulario
const shippingFormSchema = z.object({
  firstName: z.string().min(2, { message: "El nombre es requerido" }),
  lastName: z.string().min(2, { message: "El apellido es requerido" }),
  idNumber: z.string().min(5, { message: "La cédula o pasaporte es requerido" }),
  street: z.string().min(5, { message: "La dirección es requerida" }),
  city: z.string().min(2, { message: "La ciudad es requerida" }),
  province: z.string().min(2, { message: "La provincia es requerida" }),
  phone: z.string().min(5, { message: "El teléfono es requerido" }),
  email: z.string().email({ message: "Correo electrónico inválido" }).optional().nullable(),
  deliveryInstructions: z.string().optional(),
  saveToDatabase: z.boolean().default(false)
});

type ShippingFormValues = z.infer<typeof shippingFormSchema>;

export function ShippingLabelForm() {
  const { toast } = useToast();
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIdentifier, setSearchIdentifier] = useState("");
  const [searchType, setSearchType] = useState<"identification" | "email" | "phone">("identification");
  const [customerType, setCustomerType] = useState<"existing" | "new">("new");

  // Definir el formulario con valores por defecto
  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      idNumber: "",
      street: "",
      city: "",
      province: "",
      phone: "",
      email: "",
      deliveryInstructions: "",
      saveToDatabase: true
    }
  });

  // Función para buscar cliente
  const searchCustomer = async () => {
    if (!searchIdentifier.trim()) {
      toast({
        title: "Error de búsqueda",
        description: "Por favor ingrese un valor para buscar",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    console.log("Buscando cliente:", searchIdentifier, "tipo:", searchType);

    try {
      const response = await fetch('/api/shipping/check-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchIdentifier,
          type: searchType
        })
      });

      const data = await response.json();
      console.log("Resultado búsqueda:", data);

      if (data.found && data.customer) {
        // Extraer nombre completo y dividirlo en primer nombre y apellidos
        const nameParts = data.customer.name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        // Llenar el formulario con los datos del cliente
        form.setValue('firstName', firstName);
        form.setValue('lastName', lastName);
        form.setValue('phone', data.customer.phone || '');
        form.setValue('email', data.customer.email || '');
        form.setValue('idNumber', data.customer.idNumber || '');
        
        toast({
          title: "Cliente encontrado",
          description: "Los datos del cliente han sido cargados automáticamente",
          variant: "default"
        });
      } else {
        toast({
          title: "Cliente no encontrado",
          description: "No se encontró ningún cliente con esos datos",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error buscando cliente:', error);
      toast({
        title: "Error de búsqueda",
        description: "No se pudo buscar el cliente",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Función para generar la etiqueta de envío
  const generateLabel = async (data: ShippingFormValues) => {
    setIsPdfGenerating(true);
    
    try {
      // Formato para enviar al servidor
      const formData = {
        name: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
        email: data.email,
        street: data.street,
        city: data.city,
        province: data.province,
        idNumber: data.idNumber,
        companyName: "Civetta", // Valor predeterminado
        deliveryInstructions: data.deliveryInstructions,
        orderNumber: "", // Valor vacío predeterminado
        saveToDatabase: data.saveToDatabase
      };

      // Realizar solicitud al servidor para generar el PDF
      const response = await fetch('/api/shipping/generate-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Error al generar la etiqueta de envío');
      }

      // Obtener el blob del PDF
      const blob = await response.blob();
      
      // Crear URL para el blob
      const url = window.URL.createObjectURL(blob);
      
      // Crear un enlace para descargar el PDF
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiqueta-envio-${data.firstName}-${data.lastName}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Limpiar
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Etiqueta generada con éxito",
        description: "La etiqueta de envío se ha descargado correctamente",
        variant: "default"
      });
      
      // Opcional: resetear el formulario después de la generación exitosa
      // form.reset();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error al generar la etiqueta",
        description: error instanceof Error ? error.message : "Ocurrió un error al generar la etiqueta de envío",
        variant: "destructive"
      });
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-primary">Formulario de Dirección de Envío</CardTitle>
        <CardDescription className="text-center">
          Complete el formulario para generar una etiqueta de envío para su pedido
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Selección de tipo de cliente */}
        <Card className="mb-6 bg-muted/40">
          <CardContent className="p-4">
            <h3 className="font-medium mb-2 text-primary">Tipo de Cliente</h3>
            <RadioGroup 
              value={customerType} 
              onValueChange={(value) => setCustomerType(value as "existing" | "new")}
              className="space-y-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="r-existing" />
                <label htmlFor="r-existing" className="font-medium cursor-pointer">Cliente Existente</label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="r-new" />
                <label htmlFor="r-new" className="font-medium cursor-pointer">Cliente Nuevo</label>
              </div>
            </RadioGroup>
            
            {/* Mostrar buscador solo cuando se selecciona Cliente Existente */}
            {customerType === "existing" && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  Busque sus datos para completar el formulario automáticamente.
                </p>
                <div className="flex flex-col md:flex-row gap-2">
                  <Select
                    value={searchType}
                    onValueChange={(value) => setSearchType(value as "identification" | "email" | "phone")}
                  >
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="Buscar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="identification">Cédula/Pasaporte</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Teléfono</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Ingrese valor de búsqueda"
                      value={searchIdentifier}
                      onChange={(e) => setSearchIdentifier(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={searchCustomer}
                      disabled={isSearching}
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      <span>Verificar</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(generateLabel)} className="space-y-6">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombres *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombres" {...field} />
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
                    <FormLabel>Apellidos *</FormLabel>
                    <FormControl>
                      <Input placeholder="Apellidos" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="idNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cédula o Pasaporte *</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de identificación" {...field} />
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
                    <FormLabel>Teléfono de contacto *</FormLabel>
                    <FormControl>
                      <Input placeholder="Teléfono" {...field} />
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
                  <FormLabel>Correo electrónico *</FormLabel>
                  <FormControl>
                    <Input placeholder="correo@ejemplo.com" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección de Entrega *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Escriba aquí la calle principal, secundaria y número de cada, departamento y oficina. Agregue alguna referencia de ser necesario." 
                      rows={3} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ciudad" {...field} />
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
                    <FormLabel>Provincia *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una provincia" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinciasEcuador.map((provincia) => (
                            <SelectItem key={provincia} value={provincia}>
                              {provincia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Los campos de Empresa y Número de Pedido han sido eliminados */}

            <FormField
              control={form.control}
              name="deliveryInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios o Instrucciones Especiales para la Entrega</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Instrucciones especiales para la entrega" 
                      rows={2} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="saveToDatabase"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Guardar información para futuros envíos
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <CardFooter className="flex justify-center p-0">
              <Button 
                type="submit" 
                className="w-full md:w-auto" 
                disabled={isPdfGenerating}
              >
                {isPdfGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar formulario'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}