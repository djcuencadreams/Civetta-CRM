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
  phoneCountry: z.string().min(1), // Added phone country code field
  phoneNumber: z.string().min(7, {
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

// Helper function to parse phone number (you'll need to implement this)
const parsePhoneNumber = (phoneNumber: string): { phoneCountry: string; phoneNumber: string } => {
  // Implement your phone number parsing logic here.  This example assumes
  // a '+' followed by the country code.  You may need a more robust solution.
  const parts = phoneNumber.split('+');
  if (parts.length === 2) {
    return { phoneCountry: '+' + parts[1].substring(0,3), phoneNumber: parts[1].substring(3) };
  } else {
    return { phoneCountry: '', phoneNumber: phoneNumber };
  }
};

// Helper function to format phone number (you might need this too)
const formatPhoneNumber = (phoneCountry: string, phoneNumber: string): string => {
  return `+${phoneCountry}${phoneNumber}`;
};

export function ShippingLabelForm(): JSX.Element {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchIdentifier, setSearchIdentifier] = useState("");
  const [searchType, setSearchType] = useState<"identification" | "email" | "phone">("identification");
  const [customerType, setCustomerType] = useState<"existing" | "new">("new");
  const [customerFound, setCustomerFound] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<{ id: number; name: string } | null>(null); 
  const [formSnapshot, setFormSnapshot] = useState<ShippingFormValues | null>(null); // Added state to store form values


  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      idNumber: "",
      street: "",
      city: "",
      province: "",
      phoneCountry: "", //Added default values
      phoneNumber: "", //Added default values
      email: "",
      deliveryInstructions: "",
      saveToDatabase: true
    },
    mode: "onChange" 
  });

  useEffect(() => {
    if (currentStep === 3) {
      setTimeout(() => {
        const formValues = form.getValues();
        let correctionsMade = false;
        let cityValue = formValues.city;
        let instructionsValue = formValues.deliveryInstructions;

        if (cityValue === formValues.idNumber || cityValue === "" || cityValue === null) {
          cityValue = "Cuenca"; 
          correctionsMade = true;
        }

        if (instructionsValue === formValues.email) {
          instructionsValue = ""; 
          correctionsMade = true;
        }

        if (correctionsMade) {
          form.setValue('city', cityValue, { shouldTouch: true });
          form.setValue('deliveryInstructions', instructionsValue);
          form.trigger(['city', 'deliveryInstructions']);
        } 
      }, 100); 
    }
  }, [currentStep, form]);

  const getProgress = () => {
    return ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  };

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

      const data = await response.json();
      console.log("🔎 Resultado completo de búsqueda:", JSON.stringify(data, null, 2));

      if (data.found && data.customer) {
          const nameParts = data.customer.name.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');

          const getFieldValue = (camelCase: string, snakeCase: string, defaultValue: string = '') => {
            let value = 
              data.customer[camelCase] || 
              data.customer[snakeCase] || 
              data.customer[camelCase.toLowerCase()] || 
              data.customer[snakeCase.toLowerCase()] || 
              defaultValue; 

            const idValue = data.customer.idNumber || data.customer.id_number || '';
            const emailValue = data.customer.email || '';

            if (camelCase === 'city' && value === idValue) {
              value = defaultValue || 'Cuenca';
            }

            if ((camelCase === 'deliveryInstructions' || snakeCase === 'delivery_instructions') 
                && value === emailValue) {
              value = defaultValue;
            }

            return value;
          };

          form.setValue('firstName', firstName);
          form.setValue('lastName', lastName);
          const { phoneCountry, phoneNumber } = parsePhoneNumber(getFieldValue('phone', 'phone', ''));
          form.setValue('phoneCountry', phoneCountry);
          form.setValue('phoneNumber', phoneNumber);
          form.setValue('email', getFieldValue('email', 'email'));
          form.setValue('idNumber', getFieldValue('idNumber', 'id_number'));

          const streetValue = getFieldValue('street', 'street_address', '');
          const cityValue = getFieldValue('city', 'city_name', 'Cuenca');
          const provinceValue = getFieldValue('province', 'province_name', 'Azuay');
          const instructionsValue = getFieldValue('deliveryInstructions', 'delivery_instructions', '');

          form.setValue('street', streetValue, { shouldTouch: true });
          form.setValue('city', cityValue, { shouldTouch: true });
          form.setValue('province', provinceValue, { shouldTouch: true });
          form.setValue('deliveryInstructions', instructionsValue, { shouldTouch: true });

          setExistingCustomer(data.customer); 
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

  const goToNextStep = async () => {
    setFormSnapshot(form.getValues()); // Save form values before proceeding

    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      const fieldsToValidate = ["firstName", "lastName", "idNumber", "phoneNumber", "email"]; // Updated validation fields
      const result = await form.trigger(fieldsToValidate as any);

      if (result) {
        console.log("🛑 INICIANDO ENFOQUE RADICAL PARA TRANSICIÓN AL PASO 3");

        const formValues = form.getValues();
        console.log("📊 Estado inicial de los datos:", {
          idNumber: formValues.idNumber,
          email: formValues.email,
          ciudad: formValues.city || "(vacío)",
          calle: formValues.street || "(vacío)",
          provincia: formValues.province || "(vacío)",
          instrucciones: formValues.deliveryInstructions || "(vacío)"
        });

        form.unregister('street');
        form.unregister('city');
        form.unregister('province');
        form.unregister('deliveryInstructions');

        const cleanAddressData = {
          street: formValues.street || "",
          city: (formValues.city === formValues.idNumber || 
                 formValues.city === formValues.email || 
                 !formValues.city || 
                 formValues.city.includes('@')) 
                ? "Cuenca"  
                : formValues.city || "Cuenca",
          province: (!formValues.province || 
                    formValues.province.length < 2 || 
                    formValues.province === formValues.idNumber ||
                    formValues.province === formValues.email ||
                    formValues.province.includes('@'))
                   ? "Azuay"  
                   : formValues.province,
          deliveryInstructions: (formValues.deliveryInstructions === formValues.email ||
                                formValues.deliveryInstructions === formValues.idNumber ||
                                (formValues.deliveryInstructions && formValues.deliveryInstructions.includes('@')))
                               ? ""  
                               : formValues.deliveryInstructions || ""
        };

        console.log("✅ Datos de dirección preparados:", cleanAddressData);
        setCurrentStep(3);

        setTimeout(() => {
          console.log("⚙️ Restableciendo campos de dirección de manera forzada...");
          form.setValue('street', cleanAddressData.street, { 
            shouldValidate: true, 
            shouldDirty: false, 
            shouldTouch: true 
          });
          form.setValue('city', cleanAddressData.city, { 
            shouldValidate: true, 
            shouldDirty: false, 
            shouldTouch: true 
          });
          form.setValue('province', cleanAddressData.province, { 
            shouldValidate: true, 
            shouldDirty: false, 
            shouldTouch: true 
          });
          form.setValue('deliveryInstructions', cleanAddressData.deliveryInstructions, { 
            shouldDirty: false, 
            shouldTouch: true 
          });
          form.register('street', { required: true });
          form.register('city', { required: true });
          form.register('province', { required: true });
          form.register('deliveryInstructions');

          const updatedValues = form.getValues();
          console.log("🔍 VERIFICACIÓN FINAL DESPUÉS DE TRANSICIÓN:", {
            city_antes: formValues.city,
            city_ahora: updatedValues.city,
            instrucciones_antes: formValues.deliveryInstructions,
            instrucciones_ahora: updatedValues.deliveryInstructions
          });
        }, 100); 
      } else {
        toast({
          title: "Datos incompletos",
          description: "Por favor complete todos los campos obligatorios",
          variant: "destructive"
        });
      }
    } else if (currentStep === 3) {
      const fieldsToValidate = ["street", "city", "province"];
      const result = await form.trigger(fieldsToValidate as any);

      if (result) {
        const addressValues = form.getValues();
        console.log("✓ Valores de dirección para el resumen:", {
          calle: addressValues.street,
          ciudad: addressValues.city, 
          provincia: addressValues.province,
          instrucciones: addressValues.deliveryInstructions
        });
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

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => (prev - 1) as WizardStep);
      // Restore previous form state if available
      if (formSnapshot) {
        form.reset(formSnapshot);
      }
    }
  };

  const updateCustomerFromWizard = async (customerId: number) => {
    const { firstName, lastName, phoneCountry, phoneNumber, email, street, city, province, deliveryInstructions, idNumber } = form.getValues();
    try {
      const customerData = {
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phone: formatPhoneNumber(phoneCountry, phoneNumber), // Recompose phone number
        email,
        street,
        city, 
        province,
        deliveryInstructions,
        idNumber
      };

      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customerData)
      });

      if (!response.ok) {
        throw new Error('Failed to update customer data');
      }

      console.log('✅ Customer data updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      return false;
    }
  };

  const generateLabel = async (data: ShippingFormValues) => {
    setIsPdfGenerating(true);
    try {
      if (existingCustomer?.id) {
        const success = await updateCustomerFromWizard(existingCustomer.id);
        if (!success) {
          throw new Error('Failed to update customer data');
        }
      }
      const formData = {
        name: `${data.firstName} ${data.lastName}`,
        phone: formatPhoneNumber(data.phoneCountry, data.phoneNumber), // Recompose phone number
        email: data.email,
        street: data.street,
        city: data.city,
        province: data.province,
        idNumber: data.idNumber,
        companyName: "Civetta", 
        deliveryInstructions: data.deliveryInstructions,
        orderNumber: "", 
        saveToDatabase: data.saveToDatabase,
        updateCustomerInfo: true, 
        alwaysUpdateCustomer: customerType === "existing" 
      };

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

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiqueta-envio-${data.firstName}-${data.lastName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Etiqueta generada con éxito",
        description: "La etiqueta de envío se ha descargado correctamente",
        variant: "default"
      });
      setCurrentStep(1);
      form.reset();
      setCustomerType("new");
      setCustomerFound(false);
      setExistingCustomer(null); 

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

  useEffect(() => {
    if (currentStep === 3) {
      console.log("🚨 INTERVENCIÓN PROACTIVA: Tomando control total del paso 3");
      const formValues = form.getValues();
      console.log("🔍 DIAGNÓSTICO PASO 3 - Valores actuales:", {
        idNumber: formValues.idNumber,
        email: formValues.email,
        city: formValues.city,
        street: formValues.street,
        province: formValues.province,
        deliveryInstructions: formValues.deliveryInstructions
      });

      console.log("🧹 Limpiando campos anteriores...");
      form.unregister('street');
      form.unregister('city');
      form.unregister('province');
      form.unregister('deliveryInstructions');

      const defaultValues = {
        street: formValues.street || "",
        city: (formValues.city === formValues.idNumber) ? "Cuenca" : (formValues.city || "Cuenca"),
        province: formValues.province || "Azuay",
        deliveryInstructions: (formValues.deliveryInstructions === formValues.email) ? "" : formValues.deliveryInstructions || ""
      };

      console.log("🔄 Re-registrando campos con valores seguros:", defaultValues);
      setTimeout(() => {
        form.setValue('street', defaultValues.street, { shouldValidate: true, shouldTouch: true });
        form.setValue('city', defaultValues.city, { shouldValidate: true, shouldTouch: true });
        form.setValue('province', defaultValues.province, { shouldValidate: true, shouldTouch: true });
        form.setValue('deliveryInstructions', defaultValues.deliveryInstructions, { shouldTouch: true });
        form.register('street', { required: true });
        form.register('city', { required: true });
        form.register('province', { required: true });
        form.register('deliveryInstructions');

        const finalValues = form.getValues();
        console.log("✅ VERIFICACIÓN FINAL - Campos después de reinicio total:", {
          calle: finalValues.street,
          ciudad: finalValues.city,
          provincia: finalValues.province,
          instrucciones: finalValues.deliveryInstructions
        });
      }, 50);
    }
  }, [currentStep, form]);

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
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2"> {/* Updated phone number input */}
              <FormField
                control={form.control}
                name="phoneCountry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código País *</FormLabel>
                    <FormControl>
                      <Input placeholder="+593" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono *</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de teléfono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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

  const renderStep3 = () => {
    console.log("🚀 INICIANDO RENDERIZADO ULTRA-SEGURO DEL PASO 3");
    const formValues = form.getValues();
    console.log("🔍 DIAGNÓSTICO PASO 3 - Valores actuales:", {
      idNumber: formValues.idNumber,
      email: formValues.email,
      city: formValues.city,
      street: formValues.street,
      province: formValues.province,
      deliveryInstructions: formValues.deliveryInstructions
    });

    let safeCity = formValues.city;
    let safeInstructions = formValues.deliveryInstructions;
    let safeProvince = formValues.province || "Azuay";
    let correctedData = false;

    if (
      formValues.city === formValues.idNumber || 
      formValues.city === formValues.email ||
      formValues.city === null || 
      formValues.city === undefined || 
      formValues.city === "" ||
      formValues.city?.length < 2 
    ) {
      console.log("🛠️ CORRECCIÓN SEVERA: Ciudad inválida:", formValues.city);
      safeCity = "Cuenca";
      correctedData = true;
      form.setValue('city', safeCity, { shouldValidate: true, shouldTouch: true });
    }

    if (
      formValues.deliveryInstructions && (
        formValues.deliveryInstructions === formValues.email || 
        formValues.deliveryInstructions === formValues.idNumber ||
        formValues.deliveryInstructions === formValues.phoneNumber // Posible valor incorrecto adicional
      )
    ) {
      console.log("🛠️ CORRECCIÓN SEVERA: Instrucciones inválidas:", formValues.deliveryInstructions);
      safeInstructions = "";
      correctedData = true;
      form.setValue('deliveryInstructions', safeInstructions, { shouldValidate: true, shouldTouch: true });
    }

    if (!formValues.province || formValues.province.length < 2) {
      console.log("🛠️ CORRECCIÓN SEVERA: Provincia inválida:", formValues.province);
      form.setValue('province', safeProvince, { shouldValidate: true, shouldTouch: true });
      correctedData = true;
    }

    if (correctedData) {
      const finalValues = form.getValues();
      console.log("✅ VALORES FINALES DESPUÉS DE CORRECCIONES:", {
        ciudad_final: finalValues.city,
        instrucciones_final: finalValues.deliveryInstructions,
        provincia_final: finalValues.province
      });

      if (finalValues.city !== safeCity || 
          (safeProvince && finalValues.province !== safeProvince) ||
          (formValues.deliveryInstructions !== undefined && 
           safeInstructions !== undefined &&
           formValues.deliveryInstructions !== safeInstructions && 
           finalValues.deliveryInstructions !== safeInstructions)) {
        console.log("⚠️ ALERTA: Los valores corregidos no fueron aplicados correctamente, reintentando...");
        setTimeout(() => {
          form.setValue('city', safeCity, { shouldValidate: true, shouldTouch: true });
          form.setValue('province', safeProvince, { shouldValidate: true, shouldTouch: true });
          form.setValue('deliveryInstructions', safeInstructions, { shouldTouch: true });
        }, 0);
      }
    }

    return (
      <div className="space-y-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold">Dirección de Envío</h3>
          <p className="text-sm text-muted-foreground">Ingrese los datos de entrega del pedido</p>
        </div>

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

  const renderStep4 = () => {
    const formValues = form.getValues();
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
                  <p className="text-sm">{formatPhoneNumber(formValues.phoneCountry, formValues.phoneNumber)}</p>
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
                'Generar Etiqueta'
              )}
            </Button>
          </form>
        </Form>
      </div>
    );
  };

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

        <div className="mt-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Paso {currentStep} de {TOTAL_STEPS}</span>
            <span>{Math.round(getProgress())}% Completado</span>
          </div>
          <Progress value={getProgress()} className="h-2" />

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
        {renderCurrentStep()}
      </CardContent>

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