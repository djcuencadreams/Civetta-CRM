
import { Sidebar } from "./Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export function Shell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }, []);

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
