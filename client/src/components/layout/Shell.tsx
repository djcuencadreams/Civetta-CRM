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
        try {
          // In development, use the TypeScript file, in production use the compiled JS
          const swUrl = import.meta.env.DEV 
            ? '/src/service-worker.ts'
            : '/service-worker.js';

          const registration = await navigator.serviceWorker.register(swUrl, {
            scope: '/',
            type: import.meta.env.DEV ? 'module' : 'classic'
          });

          console.log('Service Worker registered successfully:', registration.scope);

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
          console.error('Service Worker registration failed:', error);

          // Check if the error is due to being offline
          if (!navigator.onLine) {
            toast({
              title: "Modo sin conexión",
              description: "La aplicación está funcionando sin conexión. Algunas características pueden estar limitadas.",
              duration: 5000,
            });
          } else {
            // Log the actual error for debugging
            console.error('Service Worker error details:', error);
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