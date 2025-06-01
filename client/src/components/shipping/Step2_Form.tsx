import { useShippingForm } from "@/hooks/useShippingForm";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import "../../styles/stepAnimations.css";

// Esquema de validación para datos personales
const customerDataSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  phoneNumber: z.string().min(8, "El teléfono debe tener al menos 8 caracteres"),
  email: z.string().email("Ingrese un email válido"),
  document: z.string().min(5, "El documento debe tener al menos 5 caracteres"),
});

type CustomerDataForm = z.infer<typeof customerDataSchema>;

function Step2_Form() {
  const { 
    formData, 
    updateFormData, 
    errors: formErrors, 
    duplicateErrors 
  } = useShippingForm();
  
  const [isVisible, setIsVisible] = useState(false);
  
  // Efecto para animar la entrada del componente
  useEffect(() => {
    setIsVisible(true);
    return () => {
      setIsVisible(false);
    };
  }, []);
  
  // Inicializar el formulario con datos existentes
  const form = useForm<CustomerDataForm>({
    resolver: zodResolver(customerDataSchema),
    defaultValues: {
      firstName: formData.firstName || "",
      lastName: formData.lastName || "",
      phoneNumber: formData.phoneNumber || "",
      email: formData.email || "",
      document: formData.document || "",
    },
  });
  
  // Manejar cambios en los campos
  const handleFieldChange = (field: keyof CustomerDataForm, value: string) => {
    form.setValue(field, value);
    updateFormData(field, value);
  };
  
  // Verificar si hay errores de duplicados para mostrar alertas
  const hasDuplicateErrors = Object.keys(duplicateErrors).length > 0;
  
  return (
    <div className={`step-content ${isVisible ? 'fade-in' : 'fade-out'}`}>
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Datos Personales</h3>
        
        {hasDuplicateErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error de duplicado</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                {Object.entries(duplicateErrors).map(([field, message]) => (
                  <li key={field}>{message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Juan"
                      onChange={(e) => handleFieldChange("firstName", e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                  {formErrors.firstName && (
                    <p className="text-sm text-red-500">{formErrors.firstName}</p>
                  )}
                </FormItem>
              )}
            />
          </div>
          
          <div>
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Pérez"
                      onChange={(e) => handleFieldChange("lastName", e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                  {formErrors.lastName && (
                    <p className="text-sm text-red-500">{formErrors.lastName}</p>
                  )}
                </FormItem>
              )}
            />
          </div>
          
          <div>
            <FormField
              control={form.control}
              name="document"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cédula / RUC</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: 0103556734"
                      onChange={(e) => handleFieldChange("document", e.target.value)}
                    />
                  </FormControl>
                  {duplicateErrors.document ? (
                    <p className="text-sm text-red-500">{duplicateErrors.document}</p>
                  ) : (
                    <FormMessage />
                  )}
                  {formErrors.document && !duplicateErrors.document && (
                    <p className="text-sm text-red-500">{formErrors.document}</p>
                  )}
                </FormItem>
              )}
            />
          </div>
          
          <div>
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      placeholder="Ej: +593995815652"
                      className="bg-background"
                      onChange={(e) => handleFieldChange("phoneNumber", e.target.value)}
                    />
                  </FormControl>
                  {duplicateErrors.phoneNumber ? (
                    <p className="text-sm text-red-500">{duplicateErrors.phoneNumber}</p>
                  ) : (
                    <FormMessage />
                  )}
                  {formErrors.phoneNumber && !duplicateErrors.phoneNumber && (
                    <p className="text-sm text-red-500">{formErrors.phoneNumber}</p>
                  )}
                </FormItem>
              )}
            />
          </div>
          
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="Ej: cliente@ejemplo.com"
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                    />
                  </FormControl>
                  {duplicateErrors.email ? (
                    <p className="text-sm text-red-500">{duplicateErrors.email}</p>
                  ) : (
                    <FormMessage />
                  )}
                  {formErrors.email && !duplicateErrors.email && (
                    <p className="text-sm text-red-500">{formErrors.email}</p>
                  )}
                  <FormDescription>
                    Le enviaremos una confirmación a este correo electrónico.
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step2_Form;