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
import { 
  Loader2, Search, ArrowLeft, ArrowRight, 
  CheckCircle2, ChevronLeft, ChevronRight 
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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

// Definimos los pasos del wizard
type WizardStep = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

export function ShippingLabelForm() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIdentifier, setSearchIdentifier] = useState("");
  const [searchType, setSearchType] = useState<"identification" | "email" | "phone">("identification");
  const [customerType, setCustomerType] = useState<"existing" | "new">("new");
  const [customerFound, setCustomerFound] = useState(false);

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
    },
    mode: "onChange" // Validar en cambios para mejora UX en pasos
  });

  // Obtener el progreso actual (0-100)
  const getProgress = () => {
    return ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  };

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
        
        setCustomerFound(true);
        
        toast({
          title: "Cliente encontrado",
          description: "Los datos del cliente han sido cargados automáticamente",
          variant: "default"
        });
      } else {
        setCustomerFound(false);
        
        toast({
          title: "Cliente no encontrado",
          description: "No se encontró ningún cliente con esos datos",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error buscando cliente:', error);
      setCustomerFound(false);
      
      toast({
        title: "Error de búsqueda",
        description: "No se pudo buscar el cliente",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Función para ir al siguiente paso
  const goToNextStep = async () => {
    if (currentStep === 1) {
      // En el paso 1 no hay validación adicional, solo elegir tipo de cliente
      setCurrentStep(2);
    } 
    else if (currentStep === 2) {
      // Validar datos personales antes de pasar al siguiente paso
      const fieldsToValidate = ["firstName", "lastName", "idNumber", "phone", "email"];
      const result = await form.trigger(fieldsToValidate as any);
      
      if (result) {
        setCurrentStep(3);
      } else {
        toast({
          title: "Datos incompletos",
          description: "Por favor complete todos los campos obligatorios",
          variant: "destructive"
        });
      }
    } 
    else if (currentStep === 3) {
      // Validar datos de dirección antes de pasar al siguiente paso
      const fieldsToValidate = ["street", "city", "province"];
      const result = await form.trigger(fieldsToValidate as any);
      
      if (result) {
        setCurrentStep(4);
      } else {
        toast({
          title: "Datos de dirección incompletos",
          description: "Por favor complete todos los campos obligatorios de dirección",
          variant: "destructive"
        });
      }
    }
  };

  // Función para ir al paso anterior
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => (prev - 1) as WizardStep);
    }
  };

  // Función para generar la etiqueta de envío (en el último paso)
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
      
      // Resetear el wizard al paso 1 después del éxito
      setCurrentStep(1);
      form.reset();
      setCustomerType("new");
      setCustomerFound(false);
      
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

  // Renderizado del paso 1: Elegir tipo de cliente
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Tipo de Cliente</h3>
        <p className="text-sm text-muted-foreground">Seleccione una opción para continuar</p>
      </div>
      
      <RadioGroup 
        value={customerType} 
        onValueChange={(value) => setCustomerType(value as "existing" | "new")}
        className="space-y-6"
      >
        <div className="flex items-start space-x-3 border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer" onClick={() => setCustomerType("existing")}>
          <RadioGroupItem value="existing" id="r-existing" className="mt-1" />
          <div>
            <label htmlFor="r-existing" className="font-medium cursor-pointer text-lg block mb-1">Cliente Existente</label>
            <p className="text-sm text-muted-foreground">Ya he comprado en Civetta antes y quiero usar mis datos guardados</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3 border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer" onClick={() => setCustomerType("new")}>
          <RadioGroupItem value="new" id="r-new" className="mt-1" />
          <div>
            <label htmlFor="r-new" className="font-medium cursor-pointer text-lg block mb-1">Cliente Nuevo</label>
            <p className="text-sm text-muted-foreground">Es mi primera vez comprando en Civetta</p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );

  // Renderizado del paso 2: Datos personales (con búsqueda si es cliente existente)
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Datos Personales</h3>
        <p className="text-sm text-muted-foreground">
          {customerType === "existing" 
            ? "Busque sus datos para autocompletar el formulario" 
            : "Complete sus datos personales"}
        </p>
      </div>
      
      {/* Búsqueda para clientes existentes */}
      {customerType === "existing" && (
        <Card className="mb-6 bg-muted/40">
          <CardContent className="p-4">
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
            
            {customerFound && (
              <div className="mt-3 p-2 bg-green-50 text-green-700 rounded-md flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Cliente encontrado. Los datos se han cargado automáticamente.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Formulario de datos personales */}
      <Form {...form}>
        <div className="space-y-6">
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
        </div>
      </Form>
    </div>
  );

  // Renderizado del paso 3: Dirección de envío
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Dirección de Envío</h3>
        <p className="text-sm text-muted-foreground">Ingrese los datos de entrega del pedido</p>
      </div>
      
      <Form {...form}>
        <div className="space-y-6">
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
        </div>
      </Form>
    </div>
  );

  // Renderizado del paso 4: Resumen y confirmación
  const renderStep4 = () => {
    const formValues = form.getValues();
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">Resumen de Envío</h3>
          <p className="text-sm text-muted-foreground">Verifique que todos los datos sean correctos</p>
        </div>
        
        <Card className="bg-muted/40">
          <CardContent className="p-4 space-y-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Datos Personales</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Nombre completo:</p>
                  <p className="text-sm">{formValues.firstName} {formValues.lastName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Identificación:</p>
                  <p className="text-sm">{formValues.idNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Teléfono:</p>
                  <p className="text-sm">{formValues.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Email:</p>
                  <p className="text-sm">{formValues.email || "No especificado"}</p>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Dirección de Envío</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Dirección completa:</p>
                  <p className="text-sm">{formValues.street}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Ciudad:</p>
                    <p className="text-sm">{formValues.city}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Provincia:</p>
                    <p className="text-sm">{formValues.province}</p>
                  </div>
                </div>
                {formValues.deliveryInstructions && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Instrucciones:</p>
                    <p className="text-sm">{formValues.deliveryInstructions}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-2">
              <Badge variant={formValues.saveToDatabase ? "default" : "outline"}>
                {formValues.saveToDatabase 
                  ? "Los datos serán guardados para futuros envíos" 
                  : "Los datos no serán guardados"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(generateLabel)}>
            <Button 
              type="submit" 
              className="w-full mt-4" 
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
          </form>
        </Form>
      </div>
    );
  };

  // Renderizar el paso actual del wizard
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-primary">Formulario de Dirección de Envío</CardTitle>
        <CardDescription className="text-center">
          Complete el formulario paso a paso para generar su etiqueta de envío
        </CardDescription>
        
        {/* Indicador de progreso */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Paso {currentStep} de {TOTAL_STEPS}</span>
            <span>{Math.round(getProgress())}% Completado</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
          
          {/* Indicadores de paso */}
          <div className="flex justify-between mt-2">
            <div className={`text-xs ${currentStep >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Tipo Cliente
            </div>
            <div className={`text-xs ${currentStep >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Datos
            </div>
            <div className={`text-xs ${currentStep >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Dirección
            </div>
            <div className={`text-xs ${currentStep >= 4 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              Confirmación
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Contenido del paso actual */}
        {renderCurrentStep()}
      </CardContent>
      
      {/* Botones de navegación (excepto en el último paso que ya tiene su propio botón) */}
      {currentStep !== 4 && (
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </Button>
          <Button
            onClick={goToNextStep}
            className="gap-1"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}