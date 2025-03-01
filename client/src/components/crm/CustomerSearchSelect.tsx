import { useState, useRef, useEffect, forwardRef } from "react";
import { type Customer, brandEnum } from "@db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, ChevronsUpDown, User, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerSearchSelectProps {
  customers: Customer[];
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const CustomerSearchSelect = forwardRef<HTMLButtonElement, CustomerSearchSelectProps>(({
  customers,
  value,
  onChange,
  isLoading = false,
  placeholder = "Seleccionar cliente",
  className,
}, ref) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [visibleCustomers, setVisibleCustomers] = useState<Customer[]>([]);
  
  // Número máximo de clientes a mostrar inicialmente
  const INITIAL_DISPLAY_COUNT = 50;
  
  // Función para filtrar clientes por término de búsqueda
  const filterCustomers = (term: string) => {
    if (!term.trim()) {
      return customers.slice(0, INITIAL_DISPLAY_COUNT);
    }
    
    const normalizedTerm = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return customers.filter(customer => {
      const normalizedName = (customer.name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedFirstName = (customer.firstName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedLastName = (customer.lastName || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedIdNumber = (customer.idNumber || "").toLowerCase();
      const normalizedEmail = (customer.email || "").toLowerCase();
      const normalizedCity = (customer.city || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const normalizedProvince = (customer.province || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      return normalizedName.includes(normalizedTerm) || 
             normalizedFirstName.includes(normalizedTerm) || 
             normalizedLastName.includes(normalizedTerm) ||
             normalizedIdNumber.includes(normalizedTerm) ||
             normalizedEmail.includes(normalizedTerm) ||
             normalizedCity.includes(normalizedTerm) ||
             normalizedProvince.includes(normalizedTerm);
    });
  };

  // Actualizar clientes visibles cuando cambia la búsqueda
  useEffect(() => {
    setVisibleCustomers(filterCustomers(searchTerm));
    setFocusedIndex(-1);
  }, [searchTerm, customers]);

  // Inicializar visibleCustomers al montar el componente
  useEffect(() => {
    setVisibleCustomers(customers.slice(0, INITIAL_DISPLAY_COUNT));
  }, [customers]);

  // Obtener cliente seleccionado (si existe)
  const selectedCustomer = value 
    ? customers.find(c => c.id.toString() === value) 
    : undefined;

  // Manejar navegación con teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(prev => 
        prev < visibleCustomers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      const customer = visibleCustomers[focusedIndex];
      if (customer) {
        onChange(customer.id.toString());
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  // Scroll al elemento seleccionado
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [focusedIndex]);

  // Auto-enfocar en el input cuando se abre el popover
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchTerm("");
    }
  }, [open]);

  // Obtener el nombre de la marca
  const getBrandDisplayName = (brandValue: string | null) => {
    return brandValue === brandEnum.BRIDE ? "Civetta Bride" : "Civetta Sleepwear";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-left h-10", className)}
          onClick={() => setOpen(!open)}
          type="button"
        >
          {selectedCustomer ? (
            <div className="flex items-center gap-2 truncate">
              <User className="h-4 w-4 shrink-0 opacity-50" />
              <span className="truncate">{selectedCustomer.name}</span>
              {selectedCustomer.brand && (
                <span className="ml-auto text-xs text-muted-foreground">
                  ({getBrandDisplayName(selectedCustomer.brand)})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px] sm:w-[450px]" align="start">
        <div className="flex flex-col">
          <div className="p-2 flex items-center border-b">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            <Input
              ref={inputRef}
              placeholder="Buscar por nombre, cédula o ubicación..."
              className="flex-1 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {isLoading && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <ScrollArea className="h-[300px]">
            <div className="py-1" ref={listRef}>
              {visibleCustomers.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No se encontraron clientes
                  </p>
                </div>
              ) : (
                visibleCustomers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className={cn(
                      "relative flex flex-col cursor-pointer select-none rounded-sm py-2 px-3",
                      focusedIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                      value === customer.id.toString() && "bg-primary/10"
                    )}
                    data-index={index}
                    onClick={() => {
                      onChange(customer.id.toString());
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{customer.name}</div>
                      {value === customer.id.toString() && (
                        <Check className="h-4 w-4 text-primary ml-2" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {customer.idNumber && (
                          <span>Cédula: {customer.idNumber}</span>
                        )}
                        {customer.city && (
                          <span>{customer.city}</span>
                        )}
                        {customer.brand && (
                          <span>{getBrandDisplayName(customer.brand)}</span>
                        )}
                      </div>
                      {customer.email && (
                        <div className="mt-1 truncate">{customer.email}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {customers.length > visibleCustomers.length && searchTerm.trim() === "" && (
                <div className="py-2 px-3 text-center text-xs text-muted-foreground border-t">
                  Mostrando {visibleCustomers.length} de {customers.length} clientes.
                  Escribe para filtrar más resultados.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
});