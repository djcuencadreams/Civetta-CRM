import React from 'react';
import { useLocation, Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { 
  DollarSign, 
  ShoppingCart, 
  ArrowRight, 
  Package, 
  TruckIcon,
  Users,
  Clipboard
} from 'lucide-react';

interface NavigationItemProps {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  active: boolean;
}

// Item de navegación individual
const NavigationItem = ({ href, label, description, icon: Icon, active }: NavigationItemProps) => {
  return (
    <Link href={href}>
      <a className={cn(
        "relative flex h-full w-full cursor-pointer flex-col rounded-md border p-4 transition-colors",
        active 
          ? "border-primary bg-primary/5 text-primary" 
          : "border-border hover:border-primary/50 hover:bg-primary/5"
      )}>
        {active && (
          <div className="absolute right-2 top-2">
            <ArrowRight className="h-5 w-5" />
          </div>
        )}
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background">
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-medium">{label}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
        </div>
      </a>
    </Link>
  );
};

// Componente de navegación principal del CRM
export function CrmNavigation() {
  const [location] = useLocation();
  const isMobile = useIsMobile();

  // Determinar área activa
  const isSalesArea = location.startsWith('/sales');
  const isOrdersArea = location.startsWith('/orders');
  const isCustomerArea = location.startsWith('/customers') || location.startsWith('/leads');
  const isProductArea = location.startsWith('/products');

  // Elementos de navegación del CRM
  const navigationItems = [
    {
      href: '/sales',
      label: 'Ventas',
      description: 'Gestión de oportunidades, transacciones y ciclo de ventas',
      icon: DollarSign,
      active: isSalesArea,
      area: 'sales'
    },
    {
      href: '/orders',
      label: 'Pedidos',
      description: 'Gestión de órdenes, envíos y logística',
      icon: ShoppingCart,
      active: isOrdersArea,
      area: 'orders'
    },
    {
      href: '/customers',
      label: 'Clientes',
      description: 'Administración de clientes y leads',
      icon: Users,
      active: isCustomerArea,
      area: 'customers'
    },
    {
      href: '/products',
      label: 'Productos',
      description: 'Catálogo e inventario de productos',
      icon: Package,
      active: isProductArea,
      area: 'products'
    }
  ];

  return (
    <Card className="w-full mb-6">
      <CardContent className="p-4">
        <div className={cn(
          "grid gap-4",
          isMobile ? "grid-cols-1" : "grid-cols-4"
        )}>
          {navigationItems.map((item) => (
            <NavigationItem
              key={item.href}
              href={item.href}
              label={item.label}
              description={item.description}
              icon={item.icon}
              active={item.active}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente secundario para mostrar subáreas dentro de una sección
export function CrmSubnavigation({ area }: { area: 'sales' | 'orders' | 'customers' | 'products' }) {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  
  // Definir subelementos basados en el área
  const getSubItems = () => {
    switch (area) {
      case 'sales':
        return [
          {
            href: '/sales',
            label: 'Todas las ventas',
            description: 'Ver y gestionar ventas',
            icon: DollarSign,
            active: location === '/sales'
          },
          {
            href: '/sales/opportunities',
            label: 'Oportunidades',
            description: 'Seguimiento de oportunidades de venta',
            icon: Clipboard,
            active: location === '/sales/opportunities'
          }
        ];
      case 'orders':
        return [
          {
            href: '/orders',
            label: 'Todos los pedidos',
            description: 'Ver y gestionar pedidos',
            icon: ShoppingCart,
            active: location === '/orders'
          },
          {
            href: '/orders/shipping',
            label: 'Envíos',
            description: 'Gestión de envíos y entregas',
            icon: TruckIcon,
            active: location === '/orders/shipping'
          }
        ];
      case 'customers':
        return [
          {
            href: '/customers',
            label: 'Clientes',
            description: 'Ver y gestionar clientes',
            icon: Users,
            active: location === '/customers'
          },
          {
            href: '/leads',
            label: 'Leads',
            description: 'Gestión de leads y prospección',
            icon: Users,
            active: location === '/leads'
          }
        ];
      case 'products':
        return [
          {
            href: '/products',
            label: 'Catálogo',
            description: 'Ver y gestionar productos',
            icon: Package,
            active: location === '/products'
          }
        ];
      default:
        return [];
    }
  };

  const subItems = getSubItems();

  // No mostrar si no hay subelementos
  if (subItems.length <= 1) return null;

  return (
    <div className="mb-6">
      <div className={cn(
        "grid gap-2",
        isMobile ? "grid-cols-1" : `grid-cols-${Math.min(subItems.length, 4)}`
      )}>
        {subItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center gap-2 rounded-md border p-3 transition-colors",
              item.active 
                ? "border-primary bg-primary/5 text-primary" 
                : "border-border hover:border-primary/50 hover:bg-primary/5"
            )}>
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </div>
  );
}