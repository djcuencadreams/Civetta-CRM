import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parsePhoneNumber, joinPhoneNumber, synchronizePhoneFields } from '../../utils/phone-utils';
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
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast, useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Loader2, Search, CheckCircle2 } from "lucide-react";

// Added isValidPhoneNumber function (placeholder - replace with actual validation)
const isValidPhoneNumber = (value: string): boolean => {
  // Replace this with your actual phone number validation logic
  return value.length >= 7; 
};

// Schema de validación para el formulario
const shippingFormSchema = z.object({
  customerType: z.enum(["existing", "new"]).optional(), // Added customer type field
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
  }), // Changed to single phone field
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
  const [existingCustomer, setExistingCustomer] = useState<{ 
    id: number; 
    name: string;
    firstName?: string;
    lastName?: string;
    street?: string; 
    city?: string; 
    province?: string;
    phone?: string;
    email?: string;
    idNumber?: string;
    deliveryInstructions?: string;
  } | null>(null); 
  const [formSnapshots, setFormSnapshots] = useState<Record<number, Partial<ShippingFormValues>>>({
    1: {},
    2: {},
    3: {},
    4: {}
  });

  const step2Snapshot = formSnapshots[2];
  const step3Snapshot = formSnapshots[3];

  const preserveStepData = (step: number) => {
    const currentValues = form.getValues();
    console.log(`📸 Guardando snapshot completo del paso ${step}:`, currentValues);

    setFormSnapshots(prev => ({
      ...prev,
      [step]: {...currentValues}
    }));
  };

  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      customerType: "new", 
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
    mode: "onChange" 
  });

  useEffect(() => {
    form.setValue('customerType', customerType);
  }, [customerType, form]);

  useEffect(() => {
    if (currentStep === 3) {
      setTimeout(() => {
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

            return value;
          };

          form.setValue('firstName', firstName);
          form.setValue('lastName', lastName);
          const fullPhone = getFieldValue('phone', 'phone', '');
          const phoneCountry = getFieldValue('phoneCountry', 'phone_country', '');
          const phoneNumber = getFieldValue('phoneNumber', 'phone_number', '');

          console.log("🔍 Phone data:", { fullPhone, phoneCountry, phoneNumber });

          const phoneFields = synchronizePhoneFields(fullPhone, phoneCountry, phoneNumber);
          console.log("📱 Synchronized phone fields:", phoneFields);

          form.setValue('phone', phoneFields.phone); // Set single phone field
          form.setValue('email', getFieldValue('email', 'email'));
          form.setValue('idNumber', getFieldValue('idNumber', 'id_number'));
          form.setValue('street', getFieldValue('street', 'street_address', ''));
          form.setValue('city', getFieldValue('city', 'city_name', ''));
          form.setValue('province', getFieldValue('province', 'province_name', ''));
          form.setValue('deliveryInstructions', getFieldValue('deliveryInstructions', 'delivery_instructions', ''));

          setExistingCustomer(data.customer); 
        setCustomerFound(true);

        toast({
          title: "Cliente encontrado",
          description: "Los datos del cliente han been cargados automáticamente",
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
    if (currentStep === 1) {
      preserveStepData(1);
      setCurrentStep(2 as WizardStep);
    } else if (currentStep === 2) {
      const fieldsToValidate = ["firstName", "lastName", "idNumber", "phone", "email"];
      const result = await form.trigger(fieldsToValidate as any);

      if (result) {
        const currentValues = form.getValues();
        setFormSnapshots(prev => ({
          ...prev,
          2: {
            firstName: currentValues.firstName,
            lastName: currentValues.lastName,
            idNumber: currentValues.idNumber,
            phone: currentValues.phone,
            email: currentValues.email
          }
        }));

        console.log("Paso 2 - Datos personales guardados:", formSnapshots[2]);

        form.setValue("street", "");
        form.setValue("city", "");
        form.setValue("province", "");
        form.setValue("deliveryInstructions", "");

        if (customerType === "existing" && customerFound && existingCustomer) {
          const street = existingCustomer.street || "";
          const city = existingCustomer.city || "";
          const province = existingCustomer.province || "";
          const instructions = existingCustomer.deliveryInstructions || "";

          form.setValue("street", street);
          form.setValue("city", city);
          form.setValue("province", province);
          form.setValue("deliveryInstructions", instructions);

        } else if (formSnapshots[3] && Object.keys(formSnapshots[3]).length > 0) {
          const step3Data = formSnapshots[3];
          console.log("Cliente nuevo - restaurando dirección previa:", step3Data);

          form.setValue("street", step3Data.street || "");
          form.setValue("city", step3Data.city || "");
          form.setValue("province", step3Data.province || "");
          form.setValue("deliveryInstructions", step3Data.deliveryInstructions || "");
        }

        console.log("Datos finales de dirección preparados:", {
          street: form.getValues("street"),
          city: form.getValues("city"),
          province: form.getValues("province"),
          deliveryInstructions: form.getValues("deliveryInstructions")
        });

        setCurrentStep(3 as WizardStep);
      } else {
        toast({
          title: "Datos incompletos",
          description: "Por favor complete todos los campos obligatorios personales",
          variant: "destructive"
        });
      }
    } else if (currentStep === 3) {
      const fieldsToValidate = ["street", "city", "province"];
      const result = await form.trigger(fieldsToValidate as any);

      if (result) {
        const values = form.getValues();
        setFormSnapshots(prev => ({
          ...prev,
          3: {
            street: values.street,
            city: values.city,
            province: values.province,
            deliveryInstructions: values.deliveryInstructions
          }
        }));

        console.log("Paso 3 - Datos de dirección guardados:", {
          street: values.street,
          city: values.city,
          province: values.province,
          deliveryInstructions: values.deliveryInstructions
        });

        setCurrentStep(4 as WizardStep);
      } else {
        toast({
          title: "Datos de dirección incompletos",
          description: "Por favor complete todos los campos obligatorios de dirección",
          variant: "destructive"
        });
      }
    }
  };

  const preservedStepFields = {
    1: ["customerType"],
    2: ["firstName", "lastName", "email", "idNumber", "phone"],
    3: ["street", "city", "province", "deliveryInstructions"],
  } as const;

  const resetToStep = (step: number) => {
    console.log(`🔄 SOLUCIÓN RADICAL: Restaurando al paso ${step} con enfoque simplificado`);

    if (step === 1) {
      form.reset({ 
        ...form.formState.defaultValues as any,
        customerType: customerType
      });
      return;
    }

    if (step === 2) {
      form.setValue('firstName', '');
      form.setValue('lastName', '');
      form.setValue('phone', '');
      form.setValue('email', '');
      form.setValue('idNumber', '');
      form.setValue('street', '');
      form.setValue('city', '');
      form.setValue('province', '');
      form.setValue('deliveryInstructions', '');

      if (formSnapshots[2] && Object.keys(formSnapshots[2]).length > 0) {
        const stepSnapshot = formSnapshots[2];
        console.log("🧩 Restaurando datos personales del snapshot para paso 2:", stepSnapshot);

        form.setValue('firstName', stepSnapshot.firstName || '');
        form.setValue('lastName', stepSnapshot.lastName || '');
        form.setValue('phone', stepSnapshot.phone || '');
        form.setValue('email', stepSnapshot.email || '');
        form.setValue('idNumber', stepSnapshot.idNumber || '');
      } else if (customerType === "existing" && existingCustomer) {
        console.log("👤 Restaurando datos personales del cliente existente para paso 2");

        const firstName = existingCustomer.firstName || existingCustomer.name?.split(' ')[0] || '';
        const lastName = existingCustomer.lastName || 
                        (existingCustomer.name ? existingCustomer.name.split(' ').slice(1).join(' ') : '');

        form.setValue('firstName', firstName);
        form.setValue('lastName', lastName);
        form.setValue('phone', existingCustomer.phone || '');
        form.setValue('email', existingCustomer.email || '');
        form.setValue('idNumber', existingCustomer.idNumber || '');
      }
    } else if (step === 3) {
      form.setValue('street', '');
      form.setValue('city', '');
      form.setValue('province', '');
      form.setValue('deliveryInstructions', '');

      if (formSnapshots[3] && Object.keys(formSnapshots[3]).length > 0) {
        const step3Data = formSnapshots[3];
        console.log("📍 Restaurando datos de dirección del snapshot para paso 3:", step3Data);

        form.setValue('street', step3Data.street || '');
        form.setValue('city', step3Data.city || '');
        form.setValue('province', step3Data.province || '');
        form.setValue('deliveryInstructions', step3Data.deliveryInstructions || '');
      } else if (customerType === "existing" && existingCustomer) {
        console.log("🏠 Restaurando datos de dirección del cliente existente para paso 3");

        form.setValue('street', existingCustomer.street || '');
        form.setValue('city', existingCustomer.city || '');
        form.setValue('province', existingCustomer.province || '');
        form.setValue('deliveryInstructions', existingCustomer.deliveryInstructions || '');
      }
    }

    console.log("✅ Datos restaurados finales:", {
      paso: step,
      datos: {
        personales: {
          firstName: form.getValues('firstName'),
          lastName: form.getValues('lastName'),
          phone: form.getValues('phone'),
          email: form.getValues('email'),
          idNumber: form.getValues('idNumber')
        },
        direccion: {
          street: form.getValues('street'),
          city: form.getValues('city'),
          province: form.getValues('province'),
          deliveryInstructions: form.getValues('deliveryInstructions')
        }
      }
    });
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      const previousStep = currentStep - 1;
      setCurrentStep(previousStep as WizardStep);
      resetToStep(previousStep);
    }
  };

  useEffect(() => {
    if (currentStep === 2 && customerType === "new") {
      form.setValue("street", '');
      form.setValue("city", '');
      form.setValue("province", '');
      form.setValue("deliveryInstructions", '');
    }

    console.log(`📝 Cambiando al paso ${currentStep} - Tipo de cliente: ${customerType}`);
    console.log(`🔍 Estado actual del formulario en paso ${currentStep}:`, form.getValues());
  }, [currentStep, customerType, form]);

  const updateCustomerFromWizard = async (customerId: number) => {
    const { firstName, lastName, phone, email, street, city, province, deliveryInstructions, idNumber } = form.getValues();
    try {
      const customerData = {
        name: `${firstName} ${lastName}`,
        firstName,
        lastName,
        phone, 
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
      const formValues = form.getValues();

      console.log("📱 Generating label with phone:", formValues.phone);

      const dataToSubmit = {
        ...formSnapshots[2],
        ...formSnapshots[3],
        ...formValues,
        phone: formValues.phone
      };

      console.log("📤 Enviando datos completos a la API:", dataToSubmit);


      const response = await fetch('/api/shipping/generate-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSubmit)
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
      setCurrentStep(1 as WizardStep);
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
                    <Input {...field} placeholder="Nombres" />
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
                    <Input {...field} placeholder="Apellidos" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2"> {/* Updated phone number input */}
            <FormField
              control={form.control}
              name="idNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cédula/Pasaporte/RUC *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Documento de identidad" />
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
                    <PhoneInput
                      {...field}
                      international
                      defaultCountry="EC"
                      placeholder="Ej. 0999999999 (se convertirá automáticamente a formato internacional)"
                      onChange={(value) => field.onChange(value)}
                    />
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
                  <Input {...field} placeholder="Email" type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </div>
  );

  const renderStep3 = () => (
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
                  <Textarea {...field} placeholder="Escriba aquí la calle principal, intersección y número de casa. Agregue alguna referencia de ser necesario." rows={3} />
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
                    <Input {...field} placeholder="Ciudad" />
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
                    <Select {...field}>
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
                  <Textarea {...field} placeholder="Referencias adicionales o instrucciones especiales para la entrega" rows={2} />
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
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
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
            onClick={handlePreviousStep}
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