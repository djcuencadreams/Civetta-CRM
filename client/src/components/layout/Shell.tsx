import React from "react";
import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "../../hooks/use-media-query";
import { useDeviceInfo, useIsMobile } from "../../hooks/use-device-type";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  // Hooks de estado
  const [isOnline, setIsOnline] = React.useState(true);
  const [sidebarVisible, setSidebarVisible] = React.useState(false);
  
  // Custom hooks - Se reorganizan para seguir las reglas de hooks
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { deviceType, isPortrait } = useDeviceInfo();
  const breakpoint = useBreakpoint();
  
  // Get current location path for routing
  const [location] = useLocation();
  
  // Toggle sidebar visibility for small devices
  const toggleSidebar = () => setSidebarVisible(prev => !prev);

  // Auto-hide sidebar when route changes on mobile
  React.useEffect(() => {
    if (deviceType === 'mobile' || (deviceType === 'tablet' && isPortrait)) {
      setSidebarVisible(false);
    }
  }, [location, deviceType, isPortrait]);

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

  // Responsive layout classes using pure Tailwind
  const mainClasses = cn(
    "flex-1 overflow-y-auto w-full transition-all duration-200",
    // Responsive margin and padding
    "ml-0 md:ml-0 lg:ml-0",
    // Bottom padding for mobile navigation area
    "pb-16 md:pb-8 lg:pb-4"
  );

  return (
    <div className="flex min-h-screen bg-background relative">
      {/* Sidebar with responsive visibility control */}
      <Sidebar 
        className={cn(
          // Responsive visibility with proper transitions
          deviceType === 'desktop' ? "relative block w-64" : 
            sidebarVisible ? "fixed z-50 h-full w-full sm:w-72 animate-in slide-in-from-left duration-300" : "hidden",
          "shadow-lg", // Add shadow for better visibility
          "h-screen", // Ensure full height
          "bg-background" // Ensure background color is visible
        )} 
        onClose={() => deviceType !== 'desktop' && setSidebarVisible(false)}
      />
      
      {/* Mobile sidebar trigger button with improved touch area */}
      {(deviceType === 'mobile' || (deviceType === 'tablet' && isPortrait)) && (
        <button 
          onClick={toggleSidebar}
          className="fixed bottom-4 left-4 z-50 rounded-full w-12 h-12 flex items-center justify-center 
                     bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 
                     transition-all touch-manipulation active:scale-95"
          aria-label="Menú"
        >
          <span className="text-xl">{sidebarVisible ? "✕" : "☰"}</span>
        </button>
      )}
      
      <main className={mainClasses}>
        {/* Offline notification banner */}
        {!isOnline && (
          <div className="bg-yellow-100 p-2 text-center text-sm md:text-base text-yellow-800 sticky top-0 z-40 shadow-sm">
            Modo sin conexión - Algunas funciones pueden estar limitadas
          </div>
        )}
        
        {/* Responsive content container */}
        <div className={cn(
          "container mx-auto transition-all",
          // Responsive padding based on screen size
          "px-2 py-2",                           // xxs default
          "xs:px-3 xs:py-3",                     // xs (375px+)
          "sm:px-3 sm:py-3",                     // sm (640px+)
          "md:px-4 md:py-4",                     // md (768px+)
          "lg:px-6 lg:py-5",                     // lg (1024px+)
          "xl:px-8 xl:py-6"                      // xl (1280px+)
        )}>
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
}