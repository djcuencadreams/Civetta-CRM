import { useShippingForm } from "@/hooks/useShippingForm";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import "../../styles/stepAnimations.css";

// Validaciones simples
const validateField = (field: string, value: string) => {
  switch (field) {
    case 'firstName':
    case 'lastName':
      return value.length >= 2 ? null : 'Debe tener al menos 2 caracteres';
    case 'phoneNumber':
      return value.length >= 8 ? null : 'Debe tener al menos 8 caracteres';
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Email inválido';
    case 'document':
      return value.length >= 5 ? null : 'Debe tener al menos 5 caracteres';
    default:
      return null;
  }
};

function Step2_Form() {
  const { 
    formData, 
    updateFormData, 
    errors: formErrors, 
    duplicateErrors 
  } = useShippingForm();
  
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
    const error = validateField(field, value);
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
            <Label htmlFor="firstName">Nombre</Label>
            <Input
              id="firstName"
              type="text"
              value={formData.firstName || ""}
              placeholder="Ej: Juan"
              className="bg-background"
              onChange={(e) => handleFieldChange("firstName", e.target.value)}
            />
            {(localErrors.firstName || formErrors.firstName) && (
              <p className="text-sm text-red-500 mt-1">
                {localErrors.firstName || formErrors.firstName}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="lastName">Apellido</Label>
            <Input
              id="lastName"
              type="text"
              value={formData.lastName || ""}
              placeholder="Ej: Pérez"
              className="bg-background"
              onChange={(e) => handleFieldChange("lastName", e.target.value)}
            />
            {(localErrors.lastName || formErrors.lastName) && (
              <p className="text-sm text-red-500 mt-1">
                {localErrors.lastName || formErrors.lastName}
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="document">Cédula / RUC</Label>
            <Input
              id="document"
              type="text"
              value={formData.document || ""}
              placeholder="Ej: 0103556734"
              className="bg-background"
              onChange={(e) => handleFieldChange("document", e.target.value)}
            />
            {duplicateErrors.document ? (
              <p className="text-sm text-red-500 mt-1">{duplicateErrors.document}</p>
            ) : (localErrors.document || formErrors.document) ? (
              <p className="text-sm text-red-500 mt-1">
                {localErrors.document || formErrors.document}
              </p>
            ) : null}
          </div>
          
          <div>
            <Label htmlFor="phoneNumber">Teléfono</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={formData.phoneNumber || ""}
              placeholder="Ej: +593995815652"
              className="bg-background"
              onChange={(e) => handleFieldChange("phoneNumber", e.target.value)}
            />
            {duplicateErrors.phoneNumber ? (
              <p className="text-sm text-red-500 mt-1">{duplicateErrors.phoneNumber}</p>
            ) : (localErrors.phoneNumber || formErrors.phoneNumber) ? (
              <p className="text-sm text-red-500 mt-1">
                {localErrors.phoneNumber || formErrors.phoneNumber}
              </p>
            ) : null}
          </div>
          
          <div className="md:col-span-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ""}
              placeholder="Ej: cliente@ejemplo.com"
              className="bg-background"
              onChange={(e) => handleFieldChange("email", e.target.value)}
            />
            {duplicateErrors.email ? (
              <p className="text-sm text-red-500 mt-1">{duplicateErrors.email}</p>
            ) : (localErrors.email || formErrors.email) ? (
              <p className="text-sm text-red-500 mt-1">
                {localErrors.email || formErrors.email}
              </p>
            ) : null}
            <p className="text-sm text-gray-500 mt-1">
              Le enviaremos una confirmación a este correo electrónico.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step2_Form;