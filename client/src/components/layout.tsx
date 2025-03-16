import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutGrid,
  Users,
  UserPlus,
  ShoppingCart,
  Tag,
  Boxes,
  Calendar,
  Settings,
  PieChart,
  Menu,
  X,
  ChevronDown,
  Bell,
  User
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { Separator } from './ui/separator';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
  subItems?: NavItem[];
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  
  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);
  
  // Definición de los ítems de navegación
  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/',
      icon: <LayoutGrid className="w-5 h-5" />,
      active: location === '/'
    },
    {
      label: 'Clientes',
      href: '/customers',
      icon: <Users className="w-5 h-5" />,
      active: location === '/customers'
    },
    {
      label: 'Leads',
      href: '/leads',
      icon: <UserPlus className="w-5 h-5" />,
      active: location === '/leads'
    },
    {
      label: 'Pedidos',
      href: '/orders',
      icon: <ShoppingCart className="w-5 h-5" />,
      active: location === '/orders'
    },
    {
      label: 'Productos',
      href: '/products',
      icon: <Tag className="w-5 h-5" />,
      active: location === '/products'
    },
    {
      label: 'Inventario',
      href: '/inventory',
      icon: <Boxes className="w-5 h-5" />,
      active: location === '/inventory'
    },
    {
      label: 'Actividades',
      href: '/activities',
      icon: <Calendar className="w-5 h-5" />,
      active: location.startsWith('/activities')
    },
    {
      label: 'Reportes',
      href: '/reports',
      icon: <PieChart className="w-5 h-5" />,
      active: location === '/reports',
      subItems: [
        {
          label: 'Ventas',
          href: '/reports/sales',
          icon: <PieChart className="w-5 h-5" />,
          active: location === '/reports/sales'
        },
        {
          label: 'Clientes',
          href: '/reports/customers',
          icon: <PieChart className="w-5 h-5" />,
          active: location === '/reports/customers'
        }
      ]
    },
    {
      label: 'Configuración',
      href: '/configuration',
      icon: <Settings className="w-5 h-5" />,
      active: location === '/configuration'
    }
  ];
  
  // Renderizar un ítem de navegación
  const renderNavItem = (item: NavItem, mobile = false) => {
    // Si tiene subelementos
    if (item.subItems && item.subItems.length > 0) {
      return (
        <Collapsible
          key={item.href}
          open={openSubMenu === item.href}
          onOpenChange={() => setOpenSubMenu(openSubMenu === item.href ? null : item.href)}
          className={`w-full ${mobile ? '' : 'pr-2'}`}
        >
          <CollapsibleTrigger asChild>
            <div className={`
              flex items-center justify-between ${mobile ? 'px-2 py-2' : 'px-3 py-2'} rounded-md 
              cursor-pointer
              ${item.active ? 'bg-muted text-primary' : 'hover:bg-muted hover:text-primary'}
            `}>
              <div className="flex items-center">
                {item.icon}
                <span className={`ml-3 ${mobile ? 'text-base' : 'text-sm'}`}>{item.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${openSubMenu === item.href ? 'transform rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="ml-4">
            {item.subItems.map((subItem) => (
              <Link key={subItem.href} href={subItem.href}>
                <a className={`
                  flex items-center ${mobile ? 'px-2 py-2 text-base' : 'px-3 py-2 text-sm'} rounded-md mt-1
                  ${subItem.active ? 'bg-muted text-primary' : 'hover:bg-muted hover:text-primary'}
                `}>
                  {subItem.icon}
                  <span className="ml-3">{subItem.label}</span>
                </a>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }
    
    // Si es un ítem normal
    return (
      <Link key={item.href} href={item.href}>
        <a className={`
          flex items-center ${mobile ? 'px-2 py-2 text-base' : 'px-3 py-2 text-sm'} rounded-md
          ${item.active ? 'bg-muted text-primary' : 'hover:bg-muted hover:text-primary'}
        `}>
          {item.icon}
          <span className="ml-3">{item.label}</span>
        </a>
      </Link>
    );
  };
  
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col w-64 border-r">
        <div className="p-4 flex items-center justify-between">
          <Link href="/">
            <a className="text-xl font-bold text-primary">CRM Pro</a>
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 overflow-y-auto p-2">
          {navItems.map(item => renderNavItem(item))}
        </nav>
        <Separator />
        <div className="p-4 flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Usuario</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </aside>
      
      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra superior (móvil y desktop) */}
        <header className="bg-background border-b px-4 h-14 flex items-center">
          {/* Menú para móvil */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="p-4 text-left">
                <SheetTitle>CRM Pro</SheetTitle>
                <SheetDescription>
                  Gestión de Clientes y Ventas
                </SheetDescription>
              </SheetHeader>
              <Separator />
              <nav className="flex-1 overflow-y-auto p-2">
                {navItems.map(item => renderNavItem(item, true))}
              </nav>
              <Separator />
              <div className="p-4 flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className="font-medium">Usuario</p>
                  <p className="text-sm text-muted-foreground">Admin</p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Logo para móvil */}
          <Link href="/">
            <a className="lg:hidden text-xl font-bold text-primary mx-auto">
              CRM Pro
            </a>
          </Link>
          
          {/* Espacio flexible para el título en desktop */}
          <div className="hidden lg:block flex-1" />
          
          {/* Íconos de la derecha */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Perfil</DropdownMenuItem>
                <DropdownMenuItem>Configuración</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Cerrar sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto bg-muted/10">
          {children}
        </main>
      </div>
    </div>
  );
}