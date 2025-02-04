
import { FileDown, LayoutDashboard, Users, DollarSign, AppWindow, Menu } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

const navigation = [
  {
    title: "Panel",
    href: "/",
    icon: LayoutDashboard
  },
  {
    title: "Clientes",
    href: "/customers",
    icon: Users
  },
  {
    title: "Ventas",
    href: "/sales",
    icon: DollarSign
  },
  {
    title: "Integraciones",
    href: "/integrations",
    icon: AppWindow
  }
];

export function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  
  if (isMobile && !isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-background border rounded-md shadow-md"
      >
        <Menu className="h-6 w-6" />
      </button>
    );
  }

  return (
    <aside className={cn("h-screen w-64 border-r bg-background", 
      isMobile && "shadow-lg",
      className
    )}>
      <div className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold">CIVETTA CRM</h1>
        {isMobile && (
          <button onClick={() => setIsOpen(false)} className="p-2">
            ✕
          </button>
        )}
      </div>
      <nav className="flex h-full flex-col bg-background px-3 py-4">
        <div className="flex-1 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setIsOpen(false)}
                className={cn(
                  "group flex items-center rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  location === item.href ? "bg-accent" : "transparent"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
