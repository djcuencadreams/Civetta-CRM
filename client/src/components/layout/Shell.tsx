import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

export function Shell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Conexión restaurada",
        description: "La aplicación está conectada nuevamente.",
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Sin conexión",
        description: "La aplicación está funcionando en modo offline.",
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('Service Worker registrado exitosamente:', registration.scope);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast({
                    title: "Actualización disponible",
                    description: "Hay una nueva versión de la aplicación disponible. Recarga para actualizar.",
                    duration: 5000,
                  });
                }
              });
            }
          });
        } catch (error) {
          console.error('Error al registrar el Service Worker:', error);
          toast({
            title: "Funcionalidad offline limitada",
            description: "Algunas características pueden no estar disponibles sin conexión.",
            duration: 5000,
          });
        }
      }
    };

    registerServiceWorker();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar className={cn(
        isMobile ? "absolute z-50 h-full" : "hidden md:block"
      )} />
      <main className="flex-1 overflow-y-auto w-full">
        {!isOnline && (
          <div className="bg-yellow-100 p-2 text-center text-yellow-800">
            Modo sin conexión - Algunas funciones pueden estar limitadas
          </div>
        )}
        <div className="container px-4 py-6 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}