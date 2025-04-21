import React, { createContext, useContext, useState, useCallback } from 'react';
import { z } from 'zod';

// Tipos y esquemas de validación
type WizardStep = 1 | 2 | 3 | 4;

interface ShippingFormData {
  customerType: "existing" | "new";
  firstName: string;
  lastName: string;
  document: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  province: string;
  instructions?: string;
}

const initialFormData: ShippingFormData = {
  customerType: "new",
  firstName: "",
  lastName: "",
  document: "",
  email: "",
  phoneNumber: "",
  address: "",
  city: "",
  province: "",
  instructions: ""
};

interface ShippingFormContextType {
  formData: ShippingFormData;
  currentStep: WizardStep;
  updateFormData: (field: keyof ShippingFormData, value: string) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  isLoading: boolean;
  errors: Record<string, string>;
  duplicateErrors: Record<string, string>;
  isDraftSaved: boolean;
  checkCustomer: () => Promise<void>;
  submitForm: () => Promise<boolean>;
  showSuccessModal: boolean;
  closeSuccessModal: () => void;
  customerType: "existing" | "new";
  setCustomerType: (type: "existing" | "new") => void;
  searchIdentifier: string;
  setSearchIdentifier: (value: string) => void;
  searchType: "identification" | "email" | "phone";
  setSearchType: (type: "identification" | "email" | "phone") => void;
  isCustomerFound: boolean;
  customerData: any;
}

const ShippingFormContext = createContext<ShippingFormContextType | null>(null);

export const ShippingFormProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [formData, setFormData] = useState<ShippingFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateErrors, setDuplicateErrors] = useState<Record<string, string>>({});
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [customerType, setCustomerType] = useState<"existing" | "new">("new");
  const [searchIdentifier, setSearchIdentifier] = useState("");
  const [searchType, setSearchType] = useState<"identification" | "email" | "phone">("identification");
  const [isCustomerFound, setIsCustomerFound] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);

  const updateFormData = (field: keyof ShippingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDraftSaved(true);
  };

  const goToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const checkCustomer = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/shipping/check-customer-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchType, searchIdentifier })
      });
      const data = await response.json();
      setIsCustomerFound(data.found);
      setCustomerData(data.customer);
      if (data.found) {
        setFormData(prev => ({
          ...prev,
          firstName: data.customer.firstName || '',
          lastName: data.customer.lastName || '',
          email: data.customer.email || '',
          phoneNumber: data.customer.phone || '',
          document: data.customer.document || '',
          address: data.customer.address || '',
          city: data.customer.city || '',
          province: data.customer.province || '',
          instructions: data.customer.deliveryInstructions || ''
        }));
      }
    } catch (error) {
      console.error('Error checking customer:', error);
      setErrors({ search: 'Error al buscar cliente' });
    } finally {
      setIsLoading(false);
    }
  };

  const submitForm = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/shipping/final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        setShowSuccessModal(true);
        return true;
      } else {
        setErrors(data.errors || {});
        return false;
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Error al enviar formulario' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const closeSuccessModal = () => setShowSuccessModal(false);

  const contextValue: ShippingFormContextType = {
    formData,
    currentStep,
    updateFormData,
    goToNextStep,
    goToPreviousStep,
    isLoading,
    errors,
    duplicateErrors,
    isDraftSaved,
    checkCustomer,
    submitForm,
    showSuccessModal,
    closeSuccessModal,
    customerType,
    setCustomerType,
    searchIdentifier,
    setSearchIdentifier,
    searchType,
    setSearchType,
    isCustomerFound,
    customerData,
  };

  return React.createElement(
    ShippingFormContext.Provider,
    { value: contextValue },
    children
  );
};

export const useShippingForm = () => {
  const context = useContext(ShippingFormContext);
  if (!context) {
    throw new Error('useShippingForm must be used within a ShippingFormProvider');
  }
  return context;
};