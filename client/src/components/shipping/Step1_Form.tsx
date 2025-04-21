
import { useState, useEffect } from "react";
import { useShippingForm } from "@/hooks/useShippingForm";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchIcon, UserPlusIcon, UserIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import "../../styles/stepAnimations.css";

function Step1_Form() {
  const shippingForm = useShippingForm();
  
  // Early return with error if context is not available
  if (!shippingForm) {
    return (
      <Alert>
        <AlertDescription>Error: Shipping form context not available</AlertDescription>
      </Alert>
    );
  }

  const {
    customerType,
    setCustomerType,
    searchIdentifier,
    setSearchIdentifier,
    searchType,
    setSearchType,
    checkCustomer,
    isLoading,
    isCustomerFound,
    customerData,
  } = shippingForm;
  
  const [isSearching, setIsSearching] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
    return () => {
      setIsVisible(false);
    };
  }, []);
  
  const handleSearch = async () => {
    if (!checkCustomer) return;
    setIsSearching(true);
    try {
      await checkCustomer();
    } catch (error) {
      console.error('Error searching customer:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  return (
    <div className={`step-content ${isVisible ? 'fade-in' : 'fade-out'}`}>
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Tipo de Cliente</h3>
        
        <RadioGroup
          defaultValue={customerType}
          onValueChange={(value) => setCustomerType?.(value as "existing" | "new")}
          className="flex flex-col space-y-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="existing" id="existing" />
            <Label htmlFor="existing" className="flex items-center gap-2 cursor-pointer">
              <UserIcon size={18} />
              Cliente Existente
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="new" id="new" />
            <Label htmlFor="new" className="flex items-center gap-2 cursor-pointer">
              <UserPlusIcon size={18} />
              Nuevo Cliente
            </Label>
          </div>
        </RadioGroup>
        
        {customerType === "existing" && (
          <div className="space-y-4 border rounded-md p-4 bg-gray-50 step-transition">
            <h4 className="font-medium">Buscar Cliente Existente</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <Label htmlFor="searchType">Buscar por</Label>
                <Select
                  value={searchType}
                  onValueChange={(value) => 
                    setSearchType?.(value as "identification" | "email" | "phone")
                  }
                >
                  <SelectTrigger id="searchType">
                    <SelectValue placeholder="Tipo de búsqueda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identification">Cédula / RUC</SelectItem>
                    <SelectItem value="email">Correo Electrónico</SelectItem>
                    <SelectItem value="phone">Teléfono</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2 flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="searchIdentifier">Identificador</Label>
                  <Input
                    id="searchIdentifier"
                    value={searchIdentifier}
                    onChange={(e) => setSearchIdentifier?.(e.target.value)}
                    placeholder={
                      searchType === "identification"
                        ? "Ej: 0103556734"
                        : searchType === "email"
                        ? "Ej: cliente@ejemplo.com"
                        : "Ej: 0995123456"
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={isLoading || !searchIdentifier}
                    className="flex items-center gap-1"
                  >
                    <SearchIcon size={16} />
                    Buscar
                  </Button>
                </div>
              </div>
            </div>
            
            {isSearching && (
              <div className="text-center py-2 fade-in">
                <p className="text-sm text-gray-500">Buscando cliente...</p>
              </div>
            )}
            
            {!isSearching && isCustomerFound && customerData && (
              <Alert className="bg-green-50 border-green-200 fade-in">
                <AlertDescription>
                  <div className="text-green-700">
                    <p className="font-medium">Cliente encontrado</p>
                    <p>
                      {customerData.firstName} {customerData.lastName} - {customerData.email}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {!isSearching && searchIdentifier && !isCustomerFound && (
              <Alert className="bg-yellow-50 border-yellow-200 fade-in">
                <AlertDescription>
                  <div className="text-yellow-700">
                    <p className="font-medium">Cliente no encontrado</p>
                    <p>
                      No se encontró ningún cliente con ese identificador. Puedes registrar un nuevo cliente.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {customerType === "new" && (
          <div className="border rounded-md p-4 bg-gray-50 fade-in step-transition">
            <h4 className="font-medium">Nuevo Cliente</h4>
            <p className="text-sm text-gray-500 mt-1">
              Completa los siguientes pasos para registrar un nuevo cliente y su dirección de envío.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Step1_Form;
