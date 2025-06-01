
import { useState, useEffect } from "react";
import { useShippingForm } from "@/hooks/useShippingForm";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import "@/styles/stepAnimations.css";

function Step1_Form() {
  const {
    customerType,
    setCustomerType,
    searchType,
    setSearchType,
    searchIdentifier,
    setSearchIdentifier,
    checkCustomer,
    isCustomerFound,
    customerData,
    isLoading,
  } = useShippingForm();

  const [isSearching, setIsSearching] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  const handleSearch = async () => {
    if (!checkCustomer) return;
    try {
      setIsSearching(true);
      await checkCustomer();
    } catch (error) {
      console.error("❌ Error buscando cliente:", error);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={`step-content ${isVisible ? "fade-in" : "fade-out"}`}>
      <div className="step-title">
        <h2 className="text-xl font-semibold">Tipo de Cliente</h2>
      </div>

      <RadioGroup
        value={customerType}
        onValueChange={(value) => setCustomerType(value as "existing" | "new")}
        className="space-y-3"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="existing" id="existing" />
          <label htmlFor="existing" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            👤 Cliente Existente
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="new" id="new" />
          <label htmlFor="new" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            👥 Nuevo Cliente
          </label>
        </div>
      </RadioGroup>

      {customerType === "existing" && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-medium">Buscar Cliente Existente</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar por</label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as "identification" | "email" | "phone")}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="identification">Cédula / RUC</option>
                <option value="email">Correo</option>
                <option value="phone">Teléfono</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Identificador</label>
              <input
                type="text"
                value={searchIdentifier}
                onChange={(e) => setSearchIdentifier(e.target.value)}
                placeholder={searchType === "identification"
                  ? "Ej: 0103556734"
                  : searchType === "email"
                  ? "Ej: cliente@ejemplo.com"
                  : "Ej: 0991234567"}
                className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSearching || !searchIdentifier.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {isSearching ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>

          {!isCustomerFound && searchIdentifier !== "" && !isSearching && (
            <div className="p-4 text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.94-.833-2.73 0L4.084 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-medium">Cliente no encontrado</span>
              </div>
              <p className="mt-1">No se encontró un cliente con ese identificador. Puedes cambiar a "Nuevo Cliente" para registrarlo.</p>
            </div>
          )}

          {isCustomerFound && customerData && (
            <div className="p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Cliente encontrado</span>
              </div>
              <p className="font-medium">
                {customerData.firstName} {customerData.lastName} - {customerData.email}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Los datos del cliente se cargarán automáticamente en el formulario
              </p>
            </div>
          )}
        </div>
      )}

      {customerType === "new" && (
        <div className="border rounded-md p-4 bg-gray-50 fade-in step-transition mt-6">
          <h3 className="font-semibold">🧾 Nuevo Cliente</h3>
          <p className="text-sm text-gray-600">
            Completa los siguientes pasos para registrar un nuevo cliente y su dirección de envío.
          </p>
        </div>
      )}
    </div>
  );
}

export default Step1_Form;
