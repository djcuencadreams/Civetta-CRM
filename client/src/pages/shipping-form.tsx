import { useEffect } from 'react';
import { useLocation } from 'wouter';

// Este componente simplemente redirecciona a la versión pública
export default function ShippingFormLegacy() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Redireccionar a la versión pública del formulario
    setLocation('/etiqueta');
  }, [setLocation]);
  
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl">Redirigiendo...</h2>
      <p className="text-muted-foreground">Por favor espere, será redirigido automáticamente.</p>
    </div>
  );
}