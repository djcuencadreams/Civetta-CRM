import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { Search, User, ShoppingBag, Users } from "lucide-react";

export function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [, navigate] = useLocation();
  
  // Atajo de teclado para abrir la búsqueda (Ctrl+K o Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Consultas para clientes, ventas y leads
  const { data: customers } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    enabled: open, // Solo cargar cuando la búsqueda está abierta
  });

  const { data: sales } = useQuery<any[]>({
    queryKey: ["/api/sales"],
    enabled: open, // Solo cargar cuando la búsqueda está abierta
  });

  const { data: leads } = useQuery<any[]>({
    queryKey: ["/api/leads"],
    enabled: open, // Solo cargar cuando la búsqueda está abierta
  });

  // Función para normalizar texto para búsquedas (quitar acentos, etc.)
  const normalizeText = (text: string | null | undefined) => {
    if (!text) return "";
    return text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // Filtra los resultados basados en el valor de búsqueda
  const getFilteredResults = () => {
    const searchQuery = normalizeText(searchValue);
    if (!searchQuery) return { customers: [], sales: [], leads: [] };

    // Filtrar clientes
    const filteredCustomers = (customers || [])
      .filter(customer => {
        const name = normalizeText(customer.name);
        const email = normalizeText(customer.email);
        const city = normalizeText(customer.city);
        const province = normalizeText(customer.province);
        return name.includes(searchQuery) || 
               (email && email.includes(searchQuery)) || 
               (city && city.includes(searchQuery)) || 
               (province && province.includes(searchQuery));
      })
      .slice(0, 5); // Limitar a 5 resultados por categoría
    
    // Filtrar ventas por el ID, monto o estado
    const filteredSales = (sales || [])
      .filter(sale => {
        const id = String(sale.id);
        const amount = String(sale.amount);
        const status = normalizeText(sale.status);
        const notes = normalizeText(sale.notes);
        return id.includes(searchQuery) || 
               amount.includes(searchQuery) || 
               status.includes(searchQuery) ||
               notes.includes(searchQuery);
      })
      .slice(0, 5);
    
    // Filtrar leads
    const filteredLeads = (leads || [])
      .filter(lead => {
        const name = normalizeText(lead.name);
        const email = normalizeText(lead.email);
        const status = normalizeText(lead.status);
        return name.includes(searchQuery) || 
               (email && email.includes(searchQuery)) || 
               status.includes(searchQuery);
      })
      .slice(0, 5);

    return {
      customers: filteredCustomers,
      sales: filteredSales,
      leads: filteredLeads
    };
  };

  const results = getFilteredResults();
  const hasResults = results.customers.length > 0 || results.sales.length > 0 || results.leads.length > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start text-muted-foreground" 
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Buscar...</span>
        <kbd className="ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Busca clientes, ventas o leads..." 
          value={searchValue}
          onValueChange={setSearchValue}
        />
        <CommandList>
          {!hasResults && searchValue && (
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          )}
          
          {/* Resultados de Clientes */}
          {results.customers.length > 0 && (
            <CommandGroup heading="Clientes">
              {results.customers.map((customer) => (
                <CommandItem
                  key={`customer-${customer.id}`}
                  onSelect={() => {
                    navigate(`/customers?id=${customer.id}`);
                    setOpen(false);
                  }}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{customer.name}</span>
                  {customer.city && (
                    <span className="ml-2 text-muted-foreground text-xs">
                      {customer.city}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
          {/* Resultados de Ventas */}
          {results.sales.length > 0 && (
            <CommandGroup heading="Ventas">
              {results.sales.map((sale) => (
                <CommandItem
                  key={`sale-${sale.id}`}
                  onSelect={() => {
                    navigate(`/sales?id=${sale.id}`);
                    setOpen(false);
                  }}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  <span>Venta #{sale.id}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    ${sale.amount} - {sale.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
          {/* Resultados de Leads */}
          {results.leads.length > 0 && (
            <CommandGroup heading="Leads">
              {results.leads.map((lead) => (
                <CommandItem
                  key={`lead-${lead.id}`}
                  onSelect={() => {
                    navigate(`/leads?id=${lead.id}`);
                    setOpen(false);
                  }}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>{lead.name}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    {lead.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          
          {/* Enlaces Rápidos */}
          <CommandSeparator />
          <CommandGroup heading="Enlaces Rápidos">
            <CommandItem
              onSelect={() => {
                navigate("/customers");
                setOpen(false);
              }}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Todos los clientes</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/sales");
                setOpen(false);
              }}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              <span>Todas las ventas</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/leads");
                setOpen(false);
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              <span>Todos los leads</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}