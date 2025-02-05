import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

export function Shell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        const MAX_RETRIES = 3;
        let retryCount = 0;

        const register = async (): Promise<ServiceWorkerRegistration | null> => {
          try {
            const swUrl = '/src/service-worker.ts';
            const swType = 'module';

            const registration = await navigator.serviceWorker.register(swUrl, {
              scope: '/',
              type: swType
            });

            console.log('Service Worker registrado exitosamente:', registration.scope);
            return registration;
          } catch (error) {
            console.error('Intento de registro del Service Worker fallido:', error);
            return null;
          }
        };

        while (retryCount < MAX_RETRIES) {
          const registration = await register();
          if (registration) {
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
            break;
          }

          retryCount++;
          if (retryCount < MAX_RETRIES) {
            const backoffTime = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
        }

        if (retryCount === MAX_RETRIES) {
          if (!navigator.onLine) {
            toast({
              title: "Modo sin conexión",
              description: "La aplicación está funcionando sin conexión. Algunas características pueden estar limitadas.",
              duration: 5000,
            });
          } else {
            toast({
              title: "Error de registro",
              description: "No se pudo registrar el service worker después de varios intentos. La aplicación puede tener funcionalidad limitada.",
              duration: 5000,
            });
          }
        }
      }
    };

    registerServiceWorker();
  }, [toast]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar className={cn(
        isMobile ? "absolute z-50 h-full" : "hidden md:block"
      )} />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="container px-4 py-6 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}