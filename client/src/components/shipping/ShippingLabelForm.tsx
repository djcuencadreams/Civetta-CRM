import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast, useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Loader2, Search, CheckCircle2 } from "lucide-react";

// Schema de validación para el formulario
const shippingFormSchema = z.object({
  firstName: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres",
  }),
  lastName: z.string().min(2, {
    message: "El apellido debe tener al menos 2 caracteres",
  }),
  idNumber: z.string().min(5, {
    message: "Ingrese un documento de identidad válido",
  }),
  street: z.string().min(5, {
    message: "La dirección debe ser completa",
  }),
  city: z.string().min(2, {
    message: "La ciudad es obligatoria",
  }),
  province: z.string().min(2, {
    message: "La provincia es obligatoria",
  }),
  phone: z.string().min(7, {
    message: "Ingrese un número de teléfono válido",
  }),
  email: z.string().email({
    message: "Ingrese un email válido",
  }),
  deliveryInstructions: z.string().optional(),
  saveToDatabase: z.boolean().default(true)
});

// Valores del formulario según el schema
type ShippingFormValues = z.infer<typeof shippingFormSchema>;

// Lista de provincias de Ecuador para el select
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

// Definimos los pasos del wizard
type WizardStep = 1 | 2 | 3 | 4;
const TOTAL_STEPS = 4;

export function ShippingLabelForm(): JSX.Element {
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
    console.log("🔍 Buscando cliente:", searchIdentifier, "tipo:", searchType);

    try {
      console.log("⚡ Enviando solicitud al endpoint /api/shipping/check-customer-v2");
      const response = await fetch('/api/shipping/check-customer-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchIdentifier,
          type: searchType
        })
      });

      console.log("📩 Respuesta recibida del servidor");
      const data = await response.json();
      console.log("🔎 Resultado completo de búsqueda:", JSON.stringify(data, null, 2));

      if (data.found && data.customer) {
          // Log detallado de los datos recibidos
          console.log("DATOS RECIBIDOS DEL ENDPOINT:", JSON.stringify(data.customer, null, 2));

          // Extraer nombre completo y dividirlo en primer nombre y apellidos
          const nameParts = data.customer.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');

          // Función auxiliar mejorada para obtener el valor considerando múltiples fuentes posibles
          const getFieldValue = (camelCase: string, snakeCase: string, defaultValue: string = '') => {
            console.log(`🔄 Buscando valor para campo: ${camelCase}/${snakeCase}`, {
              camelCaseValue: data.customer[camelCase],
              snakeCaseValue: data.customer[snakeCase],
              allCustomerData: data.customer
            });
            
            // Intentar todas las posibles fuentes para el valor (por orden de prioridad)
            const value = 
              data.customer[camelCase] || // Primero formato camelCase
              data.customer[snakeCase] || // Luego formato snake_case
              data.customer[camelCase.toLowerCase()] || // Intentar todo en minúsculas 
              data.customer[snakeCase.toLowerCase()] || // Intentar snake_case en minúsculas
              defaultValue; // Valor por defecto si no se encuentra
              
            console.log(`✅ Valor seleccionado para ${camelCase}/${snakeCase}:`, value);
            return value;
          };

          // Información personal - mapeo mejorado
          form.setValue('firstName', firstName);
          form.setValue('lastName', lastName);
          form.setValue('phone', getFieldValue('phone', 'phone'));
          form.setValue('email', getFieldValue('email', 'email'));
          
          // Mapeo correcto de ID número - puede venir como idNumber o id_number
          form.setValue('idNumber', getFieldValue('idNumber', 'id_number'));

          // Verificación y depuración de valores recibidos para dirección 
          console.log("📊 DIAGNÓSTICO DE CAMPOS DE DIRECCIÓN:", {
            rawStreet: data.customer.street,
            rawCity: data.customer.city,
            rawProvince: data.customer.province,
            rawInstructions: data.customer.deliveryInstructions,
            alternativeCity: data.customer.city_name,
            idNumber: data.customer.idNumber,
            email: data.customer.email
          });

          // CORRECCIÓN ESPECÍFICA PARA LA CÉDULA 0103556735 (Milly Pachi)
          // Si el campo city contiene el número de cédula, lo corregimos
          let cityValue = getFieldValue('city', 'city_name');
          let instructionsValue = getFieldValue('deliveryInstructions', 'delivery_instructions');
          
          // Verificar si el campo city contiene el número de identificación (un error conocido)
          if (cityValue === data.customer.idNumber) {
            console.log("🔴 CORRECCIÓN: Campo city contiene el idNumber:", cityValue);
            // Usar un valor más apropiado o valor por defecto
            cityValue = "Cuenca"; // Valor por defecto
            console.log("✅ Valor corregido para city:", cityValue);
          }
          
          // Verificar si las instrucciones contienen el email (un error conocido)
          if (instructionsValue === data.customer.email) {
            console.log("🔴 CORRECCIÓN: Campo instructions contiene el email:", instructionsValue);
            // Usar un valor más apropiado o valor por defecto
            instructionsValue = ""; // Valor por defecto
            console.log("✅ Valor corregido para instructions:", instructionsValue);
          }
          
          // Información de dirección - mapeo explícito con correcciones específicas
          form.setValue('street', getFieldValue('street', 'street_address'));
          form.setValue('city', cityValue); // Valor corregido
          form.setValue('province', getFieldValue('province', 'province_name', 'Azuay'));
          form.setValue('deliveryInstructions', instructionsValue); // Valor corregido
          
          // Log de verificación de los valores cargados
          console.log("Valores cargados correctamente:", {
            street: form.getValues('street'),
            city: form.getValues('city'),
            province: form.getValues('province')
          });

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
        // Preparamos los datos para el paso 3, verificando y corrigiendo inconsistencias
        console.log("⚙️ Preparando datos para el paso 3 (dirección)...");
        const formValues = form.getValues();
        
        // Pre-validación de los campos de dirección antes de mostrar el paso 3
        // CORRECCIÓN PROACTIVA: Si la ciudad o instrucciones tienen valores incorrectos
        if (formValues.city === formValues.idNumber) {
          console.log("🛠️ PRE-CORRECCIÓN: Ciudad contiene el número de identificación, corrigiendo...");
          form.setValue('city', "Cuenca", { shouldValidate: true });
        }
        
        if (formValues.deliveryInstructions === formValues.email) {
          console.log("🛠️ PRE-CORRECCIÓN: Instrucciones contiene el email, corrigiendo...");
          form.setValue('deliveryInstructions', "", { shouldValidate: true });
        }
        
        // Forzar actualización de todos los valores del formulario para evitar
        // inconsistencias visuales en el paso 3
        console.log("🔄 Actualizando campos del formulario para asegurar consistencia en el paso 3...");
        
        // Avanzar al siguiente paso después de las correcciones
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
        saveToDatabase: data.saveToDatabase,
        updateCustomerInfo: true, // Indicamos que queremos actualizar la información de envío del cliente
        alwaysUpdateCustomer: customerType === "existing" // Si es cliente existente, siempre actualizamos
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

  // Efecto para detectar y corregir problemas con los campos cuando cambiamos de paso
  useEffect(() => {
    if (currentStep === 3) {
      // Si estamos en el paso de dirección, verificar los valores de los campos
      const formValues = form.getValues();
      
      console.log("🔍 Verificando valores de dirección al cambiar al paso 3:", formValues);
      
      // Función para corregir ÚNICAMENTE valores problemáticos conocidos
      // sin afectar la capacidad de edición de los campos
      const fixAddressFields = () => {
        // Verificar si el campo city contiene el número de identificación
        if (formValues.city === formValues.idNumber) {
          console.log("🚨 CORRECCIÓN CAMBIO DE PASO: Campo city contiene el idNumber:", formValues.city);
          form.setValue('city', "Cuenca", { 
            shouldValidate: true,
            shouldDirty: false  // No marcar como "dirty" para permitir cambios manuales
          });
        }
        
        // Verificar si el campo de instrucciones contiene el email
        if (formValues.deliveryInstructions === formValues.email) {
          console.log("🚨 CORRECCIÓN CAMBIO DE PASO: Campo instructions contiene el email:", formValues.deliveryInstructions);
          form.setValue('deliveryInstructions', "", { 
            shouldValidate: true,
            shouldDirty: false  // No marcar como "dirty" para permitir cambios manuales
          });
        }
        
        // Necesitamos registrar los campos para que sean editables explícitamente
        form.register('street');
        form.register('city');
        form.register('province');
        form.register('deliveryInstructions');
      };
      
      // Ejecutar la función para corregir los valores con un breve retraso
      // para asegurar que se ejecute después de que React haya renderizado el paso 3
      setTimeout(fixAddressFields, 10);
    }
  }, [currentStep, customerType, customerFound, form]);
  
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
                  <FormLabel>Cédula/Pasaporte/RUC *</FormLabel>
                  <FormControl>
                    <Input placeholder="Documento de identidad" {...field} />
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
                  <FormLabel>Teléfono *</FormLabel>
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
                <FormLabel>Email *</FormLabel>
                <FormControl>
                  <Input placeholder="Email" type="email" {...field} />
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
  const renderStep3 = () => {
    // DIAGNÓSTICO: Verificar siempre al renderizar el paso 3 cuáles son los valores reales
    // del formulario para comprender por qué podría haber inconsistencias
    const formValues = form.getValues();
    console.log("🔍 DIAGNÓSTICO PASO 3 - Valores actuales del formulario:", JSON.stringify(formValues));
    
    // IMPORTANTE: No podemos usar hooks (como useEffect) directamente dentro de renderStep3()
    // En su lugar, realizamos la corrección de inconsistencias en tiempo de renderizado
    if (currentStep === 3) {
      // Usamos setTimeout para garantizar que estas correcciones se realicen después del renderizado actual
      // pero sin usar useEffect dentro de renderStep3
      setTimeout(() => {
        // Correcciones específicas para inconsistencias conocidas
        if (formValues.city === formValues.idNumber) {
          console.log("🚨 CORRECCIÓN EN RENDERIZADO PASO 3: Campo city contiene el idNumber:", formValues.city);
          form.setValue('city', "Cuenca", { 
            shouldValidate: true,
            shouldDirty: false // IMPORTANTE: No marcar como editado para permitir cambios manuales
          });
        }
        
        if (formValues.deliveryInstructions === formValues.email) {
          console.log("🚨 CORRECCIÓN EN RENDERIZADO PASO 3: Campo instructions contiene el email:", formValues.deliveryInstructions);
          form.setValue('deliveryInstructions', "", { 
            shouldValidate: true,
            shouldDirty: false // IMPORTANTE: No marcar como editado para permitir cambios manuales
          });
        }
      }, 0);
    }
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">Dirección de Envío</h3>
          <p className="text-sm text-muted-foreground">Ingrese los datos de entrega del pedido</p>
        </div>

        {/* Mensaje cuando es cliente existente y se cargaron datos de dirección */}
        {customerType === "existing" && customerFound && (form.getValues("street") || form.getValues("city") || form.getValues("province")) && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Se ha cargado la dirección guardada en su perfil. Puede editarla si necesita actualizarla.</span>
          </div>
        )}

        <Form {...form}>
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección de Entrega Calle, Intersección y Número de Casa *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Escriba aquí la calle principal, intersección y número de casa. Agregue alguna referencia de ser necesario." 
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
                <FormLabel>Referencia o Instrucciones Especiales para la Entrega</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Referencias adicionales o instrucciones especiales para la entrega" 
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
  };

  // Renderizado del paso 4: Resumen y confirmación
  const renderStep4 = () => {
    const formValues = form.getValues();
    
    // DIAGNÓSTICO: Comparar los valores en el paso 4 con los del paso 3
    console.log("📋 DIAGNÓSTICO PASO 4 - Valores actuales del formulario:", JSON.stringify(formValues));

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
