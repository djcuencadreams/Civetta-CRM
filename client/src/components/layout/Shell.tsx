import React from "react";
import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useIsMobile } from "../../hooks/use-is-mobile";
import { useToast } from "@/hooks/use-toast";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar 
        className={cn(
          isMobile ? "fixed z-50 h-full" : "hidden md:block"
        )} 
      />
      <main className="flex-1 overflow-y-auto w-full md:ml-0 lg:ml-0">
        {!isOnline && (
          <div className="bg-yellow-100 p-2 text-center text-yellow-800">
            Modo sin conexión - Algunas funciones pueden estar limitadas
          </div>
        )}
        <div className="container px-2 py-4 md:px-6 lg:px-8 mx-auto">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}