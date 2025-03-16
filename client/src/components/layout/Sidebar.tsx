import { FileDown, LayoutDashboard, Users, DollarSign, Settings, Menu, BarChart, 
  PieChart, LineChart, TrendingUp, ShoppingCart, Package, Kanban, MessageSquare, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useIsMobile } from "../../hooks/use-is-mobile";
import { useState } from "react";

const navigation = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard
  },
  {
    href: "/leads",
    label: "Leads",
    icon: Users
  },
  {
    href: "/customers",
    label: "Clientes",
    icon: Users
  },
  {
    href: "/sales",
    label: "Ventas",
    icon: DollarSign
  },
  {
    href: "/orders",
    label: "Pedidos",
    icon: ShoppingCart
  },
  {
    href: "/opportunities",
    label: "Oportunidades",
    icon: Kanban
  },
  {
    href: "/interactions",
    label: "Interacciones",
    icon: MessageSquare
  },
  {
    href: "/activities",
    label: "Actividades",
    icon: Calendar
  },
  {
    href: "/products",
    label: "Productos",
    icon: Package
  },
  {
    href: "/reports",
    label: "Informes",
    icon: BarChart
  },
  {
    href: "/configuration",
    label: "Configuración",
    icon: Settings
  }
];

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export function Sidebar({ className, onClose }: SidebarProps) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  
  // Handler for closing sidebar and notifying parent component
  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  // Solo muestra el botón de menú en dispositivos móviles cuando el menú está cerrado
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
    <aside className={cn(
      "h-screen border-r bg-background transition-all duration-300", 
      isMobile ? "w-full sm:w-72 shadow-lg fixed z-50" : "w-64 relative",
      "flex flex-col", // Use flexbox for better layout
      className
    )}>
      <div className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold">CIVETTA CRM</h1>
        {isMobile && (
          <button 
            onClick={handleClose} 
            className="p-2 rounded-full hover:bg-muted"
            aria-label="Cerrar menú"
          >
            <span className="text-lg">✕</span>
          </button>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto bg-background px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={isMobile ? handleClose : undefined}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive ? "bg-accent text-accent-foreground" : "text-foreground",
                  isMobile ? "text-base py-3" : "text-sm py-2.5"
                )}
              >
                <Icon className={cn(
                  "mr-3 h-4 w-4",
                  isMobile && "h-5 w-5"
                )} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}