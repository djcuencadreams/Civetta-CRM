import { useShippingForm } from "@/hooks/useShippingForm";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import "../../styles/stepAnimations.css";

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

// Validaciones simples para dirección
const validateAddressField = (field: string, value: string) => {
  switch (field) {
    case 'address':
      return value.length >= 3 ? null : 'La dirección debe tener al menos 3 caracteres';
    case 'city':
      return value.length >= 2 ? null : 'La ciudad debe tener al menos 2 caracteres';
    case 'province':
      return value.length >= 3 ? null : 'Debe seleccionar una provincia';
    default:
      return null;
  }
};

function Step3_Form() {
  const { formData, updateFormData, errors: formErrors } = useShippingForm();
  const [isVisible, setIsVisible] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  // Efecto para animar la entrada del componente
  useEffect(() => {
    setIsVisible(true);
    return () => {
      setIsVisible(false);
    };
  }, []);

  // Manejar cambios en los campos
  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    updateFormData(field, value);
    
    // Validar el campo
    const error = validateAddressField(field, value);
    setLocalErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  return (
    <div className={`step-content ${isVisible ? 'fade-in' : 'fade-out'}`}>
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Dirección de Envío</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="address">Dirección Completa</Label>
            <Input
              id="address"
              type="text"
              value={formData.address || ""}
              placeholder="Ej: Av. 9 de Octubre 123 y Malecón"
              className="bg-background"
              onChange={(e) => handleFieldChange("address", e.target.value)}
            />
            {(localErrors.address || formErrors.address) && (
              <p className="text-sm text-red-500 mt-1">
                {localErrors.address || formErrors.address}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                type="text"
                value={formData.city || ""}
                placeholder="Ej: Cuenca"
                className="bg-background"
                onChange={(e) => handleFieldChange("city", e.target.value)}
              />
              {(localErrors.city || formErrors.city) && (
                <p className="text-sm text-red-500 mt-1">
                  {localErrors.city || formErrors.city}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="province">Provincia</Label>
              <Select
                value={formData.province || ""}
                onValueChange={(value) => handleFieldChange("province", value)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecciona una provincia" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCIAS_ECUADOR.map((provincia) => (
                    <SelectItem key={provincia} value={provincia}>
                      {provincia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(localErrors.province || formErrors.province) && (
                <p className="text-sm text-red-500 mt-1">
                  {localErrors.province || formErrors.province}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="instructions">Instrucciones de Entrega (Opcional)</Label>
            <Textarea
              id="instructions"
              value={formData.instructions || ""}
              placeholder="Ej: Casa de color azul, timbre no funciona, llamar al llegar"
              className="bg-background min-h-[80px]"
              onChange={(e) => handleFieldChange("instructions", e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              Proporciona detalles adicionales para facilitar la entrega (opcional)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step3_Form;