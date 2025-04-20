import React, { useState, useEffect, createContext, useContext } from "react";
import { z } from "zod";

// Definición del schema para la validación del formulario
const customerSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  phoneNumber: z.string().min(8, "El teléfono debe tener al menos 8 caracteres"),
  email: z.string().email("Ingrese un email válido"),
  document: z.string().min(5, "El documento debe tener al menos 5 caracteres"),
});

const addressSchema = z.object({
  address: z.string().min(3, "La dirección debe tener al menos 3 caracteres"),
  city: z.string().min(2, "La ciudad debe tener al menos 2 caracteres"),
  province: z.string().min(3, "La provincia debe tener al menos 3 caracteres"),
  instructions: z.string().optional(),
});

const shippingFormSchema = customerSchema.merge(addressSchema);

export type ShippingFormData = z.infer<typeof shippingFormSchema>;

export type WizardStep = 1 | 2 | 3 | 4;

interface ShippingFormContextType {
  formData: ShippingFormData;
  currentStep: WizardStep;
  isLoading: boolean;
  errors: Record<string, string>;
  duplicateErrors: Record<string, string>;
  isDraftSaved: boolean;
  isCustomerFound: boolean;
  customerType: "existing" | "new";
  searchIdentifier: string;
  searchType: "identification" | "email" | "phone";
  customerData: any | null;
  showSuccessModal: boolean;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  updateFormData: (field: string, value: any) => void;
  saveAsDraft: () => Promise<boolean>;
  submitForm: () => Promise<boolean>;
  resetForm: () => void;
  setCustomerType: (type: "existing" | "new") => void;
  setSearchIdentifier: (identifier: string) => void;
  setSearchType: (type: "identification" | "email" | "phone") => void;
  checkCustomer: () => Promise<void>;
  closeSuccessModal: () => void;
}

// Crear contexto con valores por defecto
const ShippingFormContext = createContext<ShippingFormContextType | undefined>(undefined);

// Valores iniciales para el formulario
const initialFormData: ShippingFormData = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  email: "",
  document: "",
  address: "",
  city: "",
  province: "",
  instructions: "",
};

// Hook para exponer el contexto
const useShippingFormHook = (): ShippingFormContextType => {
  const context = useContext(ShippingFormContext);
  if (!context) {
    throw new Error("useShippingForm debe usarse dentro de un ShippingFormProvider");
  }
  return context;
};

// Proveedor del contexto
const ShippingFormProviderComponent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado del formulario
  const [formData, setFormData] = useState<ShippingFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateErrors, setDuplicateErrors] = useState<Record<string, string>>({});
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [isCustomerFound, setIsCustomerFound] = useState(false);
  const [customerType, setCustomerType] = useState<"existing" | "new">("new");
  const [searchIdentifier, setSearchIdentifier] = useState("");
  const [searchType, setSearchType] = useState<"identification" | "email" | "phone">("identification");
  const [customerData, setCustomerData] = useState<any | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [draftOrderId, setDraftOrderId] = useState<number | null>(null);

  // Función para validar el paso actual
  const validateCurrentStep = (): boolean => {
    try {
      if (currentStep === 2) {
        customerSchema.parse(formData);
        return true;
      } else if (currentStep === 3) {
        addressSchema.parse(formData);
        return true;
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Función para avanzar al siguiente paso
  const goToNextStep = () => {
    if (validateCurrentStep()) {
      setErrors({});
      if (currentStep < 4) {
        saveAsDraft().then((success) => {
          if (success) {
            setCurrentStep((prev) => (prev < 4 ? (prev + 1) as WizardStep : prev));
          }
        });
      }
    }
  };

  // Función para retroceder al paso anterior
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev > 1 ? (prev - 1) as WizardStep : prev));
    }
  };

  // Función para actualizar datos del formulario
  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Limpiar error específico cuando se actualiza el campo
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Limpiar error de duplicado si se actualiza un campo relacionado
    if (duplicateErrors[field]) {
      setDuplicateErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Función para guardar como borrador
  const saveAsDraft = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Verificar duplicados si estamos en el paso 2 (datos personales)
      if (currentStep === 2 && customerType === "new") {
        const duplicateCheck = await checkDuplicates();
        if (!duplicateCheck) {
          setIsLoading(false);
          return false;
        }
      }
      
      const response = await fetch("/api/shipping/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData,
          orderId: draftOrderId,
          step: currentStep,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsDraftSaved(true);
        // Guardar el ID de la orden borrador para futuras actualizaciones
        if (data.orderId) {
          setDraftOrderId(data.orderId);
        }
        setIsLoading(false);
        return true;
      } else {
        console.error("Error al guardar borrador:", data.error);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Error al guardar borrador:", error);
      setIsLoading(false);
      return false;
    }
  };

  // Función para enviar el formulario final
  const submitForm = async (): Promise<boolean> => {
    try {
      if (!validateCurrentStep()) {
        return false;
      }
      
      setIsLoading(true);
      
      const response = await fetch("/api/shipping/final", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formData,
          orderId: draftOrderId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Actualizar la lista de órdenes sin recargar
        await refreshOrdersList();
        
        setShowSuccessModal(true);
        setIsLoading(false);
        return true;
      } else {
        console.error("Error al enviar formulario:", data.error);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Error al enviar formulario:", error);
      setIsLoading(false);
      return false;
    }
  };

  // Función para verificar duplicados
  const checkDuplicates = async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/shipping/check-duplicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document: formData.document,
          email: formData.email,
          phone: formData.phoneNumber,
        }),
      });
      
      const data = await response.json();
      
      if (data.duplicates) {
        const newDuplicateErrors: Record<string, string> = {};
        
        if (data.duplicates.document) {
          newDuplicateErrors.document = "Este número de documento ya existe en la base de datos";
        }
        
        if (data.duplicates.email) {
          newDuplicateErrors.email = "Este correo electrónico ya existe en la base de datos";
        }
        
        if (data.duplicates.phone) {
          newDuplicateErrors.phoneNumber = "Este número de teléfono ya existe en la base de datos";
        }
        
        setDuplicateErrors(newDuplicateErrors);
        return Object.keys(newDuplicateErrors).length === 0;
      }
      
      setDuplicateErrors({});
      return true;
    } catch (error) {
      console.error("Error al verificar duplicados:", error);
      return false;
    }
  };

  // Función para refrescar la lista de órdenes
  const refreshOrdersList = async (orderId?: number): Promise<void> => {
    try {
      // Emitir un evento personalizado que otros componentes pueden escuchar
      // Incluir el ID de orden en el detalle del evento
      window.dispatchEvent(new CustomEvent("shipping-form:order-created", { 
        detail: { orderId } 
      }));
      
      // Emitir también un evento 'orderSaved' como se solicita en los requisitos
      window.dispatchEvent(new CustomEvent("orderSaved", { 
        detail: { orderId } 
      }));
      
      // También podríamos hacer un fetch directo para actualizar datos en caché
      const response = await fetch("/api/shipping/list");
      const data = await response.json();
      
      // Los datos están disponibles si otros componentes necesitan acceder a ellos
      window.localStorage.setItem("shipping-orders-cache", JSON.stringify(data));
    } catch (error) {
      console.error("Error al refrescar lista de órdenes:", error);
    }
  };

  // Función para restablecer el formulario
  const resetForm = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
    setErrors({});
    setDuplicateErrors({});
    setIsDraftSaved(false);
    setIsCustomerFound(false);
    setCustomerType("new");
    setSearchIdentifier("");
    setCustomerData(null);
    setDraftOrderId(null);
  };

  // Efecto para guardar como borrador al cambiar de paso
  useEffect(() => {
    // Solo guardamos cuando el usuario ha avanzado más allá del paso 1
    if (currentStep > 1) {
      // Guardamos el formulario como borrador
      saveAsDraft().then((success) => {
        console.log(`Guardado automático en paso ${currentStep}: ${success ? 'Exitoso' : 'Fallido'}`);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]); // Se ejecuta cuando cambia el paso

  // Función para verificar cliente existente
  const checkCustomer = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/shipping/check-customer-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: searchIdentifier,
          type: searchType,
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.found) {
        setIsCustomerFound(true);
        setCustomerData(data.customer);
        
        // Rellenar el formulario con los datos del cliente
        setFormData((prev) => ({
          ...prev,
          firstName: data.customer.firstName || "",
          lastName: data.customer.lastName || "",
          email: data.customer.email || "",
          phoneNumber: data.customer.phone || "",
          document: data.customer.idNumber || "",
          ...(data.address && {
            address: data.address.street || "",
            city: data.address.city || "",
            province: data.address.province || "",
            instructions: data.address.instructions || "",
          }),
        }));
      } else {
        setIsCustomerFound(false);
        setCustomerData(null);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error al verificar cliente:", error);
      setIsLoading(false);
      setIsCustomerFound(false);
      setCustomerData(null);
    }
  };

  // Función para cerrar el modal de éxito
  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    resetForm();
  };

  // Proveemos los valores y funciones a través del contexto
  const value: ShippingFormContextType = {
    formData,
    currentStep,
    isLoading,
    errors,
    duplicateErrors,
    isDraftSaved,
    isCustomerFound,
    customerType,
    searchIdentifier,
    searchType,
    customerData,
    showSuccessModal,
    goToNextStep,
    goToPreviousStep,
    updateFormData,
    saveAsDraft,
    submitForm,
    resetForm,
    setCustomerType,
    setSearchIdentifier,
    setSearchType,
    checkCustomer,
    closeSuccessModal,
  };

  return React.createElement(ShippingFormContext.Provider, { value }, children);
};

export const useShippingForm = useShippingFormHook;
export const ShippingFormProvider = ShippingFormProviderComponent;