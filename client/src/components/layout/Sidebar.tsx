
import { FileDown, LayoutDashboard, Users, DollarSign, AppWindow } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

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

export function Sidebar() {
  const [location] = useLocation();
  
  return (
    <aside className="h-screen w-64 border-r">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">CIVETTA CRM</h1>
      </div>
      <nav className="flex h-full flex-col bg-background px-3 py-4">
        <div className="flex-1 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
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
