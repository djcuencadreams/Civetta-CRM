import { useShippingForm } from "@/hooks/useShippingForm";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import "../styles/stepAnimations.css";

// Lista de provincias de Ecuador
const PROVINCIAS_ECUADOR = [
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
  "Zamora Chinchipe",
];

// Esquema de validación para dirección
const shippingAddressSchema = z.object({
  address: z.string().min(3, "La dirección debe tener al menos 3 caracteres"),
  city: z.string().min(2, "La ciudad debe tener al menos 2 caracteres"),
  province: z.string().min(3, "Debe seleccionar una provincia"),
  instructions: z.string().optional(),
});

type ShippingAddressForm = z.infer<typeof shippingAddressSchema>;

function Step3_Form() {
  const { formData, updateFormData, errors: formErrors } = useShippingForm();
  const [isVisible, setIsVisible] = useState(false);
  
  // Efecto para animar la entrada del componente
  useEffect(() => {
    setIsVisible(true);
    return () => {
      setIsVisible(false);
    };
  }, []);
  
  // Inicializar el formulario con datos existentes
  const form = useForm<ShippingAddressForm>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: {
      address: formData.address || "",
      city: formData.city || "",
      province: formData.province || "",
      instructions: formData.instructions || "",
    },
  });
  
  // Manejar cambios en los campos
  const handleFieldChange = (field: keyof ShippingAddressForm, value: string) => {
    form.setValue(field, value);
    updateFormData(field, value);
  };
  
  return (
    <div className={`step-content ${isVisible ? 'fade-in' : 'fade-out'}`}>
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Dirección de Envío</h3>
        
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Ej: Av. Principal 123 y Secundaria"
                    onChange={(e) => handleFieldChange("address", e.target.value)}
                  />
                </FormControl>
                <FormMessage />
                {formErrors.address && (
                  <p className="text-sm text-red-500">{formErrors.address}</p>
                )}
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ciudad</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ej: Quito"
                      onChange={(e) => handleFieldChange("city", e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                  {formErrors.city && (
                    <p className="text-sm text-red-500">{formErrors.city}</p>
                  )}
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
                    onValueChange={(value) => handleFieldChange("province", value)}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una provincia" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PROVINCIAS_ECUADOR.map((provincia) => (
                        <SelectItem key={provincia} value={provincia}>
                          {provincia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {formErrors.province && (
                    <p className="text-sm text-red-500">{formErrors.province}</p>
                  )}
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instrucciones de Entrega (Opcional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Ej: Edificio azul, piso 3, timbre 302. Entregar en horario de oficina."
                    rows={3}
                    onChange={(e) => handleFieldChange("instructions", e.target.value)}
                  />
                </FormControl>
                <FormDescription>
                  Cualquier información adicional para facilitar la entrega.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}

export default Step3_Form;