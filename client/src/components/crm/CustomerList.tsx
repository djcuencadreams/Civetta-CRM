import { Card, CardContent } from "@/components/ui/card";
import { User, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { t } from "@/lib/i18n";
import { type Customer, brandEnum } from "@db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { SearchFilterBar, type FilterState } from "./SearchFilterBar";

// Extended Customer type with optional mode for view/edit
type CustomerWithMode = Customer & {
  mode?: 'view' | 'edit';
};

export function CustomerList({
  onSelect,
  brand
}: {
  onSelect: (customer: CustomerWithMode) => void;
  brand?: string;
}) {
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers", brand],
    queryFn: getQueryFn({ on401: "throw" }),
    select: (data) => {
      // Filter customers by name (non-empty) and brand if specified
      let filtered = data?.filter(customer => customer.name?.trim());

      // Apply brand filter if specified
      if (brand) {
        filtered = filtered.filter(customer => customer.brand === brand);
      }

      return filtered;
    }
  });

  // Apply filters whenever customers, searchText, or filters change
  useEffect(() => {
    if (!customers) {
      setFilteredCustomers([]);
      return;
    }

    let result = [...customers];

    // Apply text search across multiple fields
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(customer => {
        return (
          (customer.name && customer.name.toLowerCase().includes(lowerSearch)) ||
          (customer.email && customer.email.toLowerCase().includes(lowerSearch)) ||
          (customer.phone && customer.phone.toLowerCase().includes(lowerSearch)) ||
          (customer.address && customer.address.toLowerCase().includes(lowerSearch))
        );
      });
    }

    // Apply advanced filters
    if (filters.source && filters.source !== "") {
      result = result.filter(customer => customer.source === filters.source);
    }

    if (filters.brand && filters.brand !== "" && !brand) {
      // Only apply brand filter here if not already filtered by prop
      result = result.filter(customer => customer.brand === filters.brand);
    }

    if (filters.city && filters.city !== "") {
      result = result.filter(customer => 
        customer.address && 
        customer.address.toLowerCase().includes(filters.city as string)
      );
    }

    if (filters.province && filters.province !== "") {
      result = result.filter(customer => 
        customer.address && 
        customer.address.toLowerCase().includes(filters.province as string)
      );
    }

    setFilteredCustomers(result);
  }, [customers, searchText, filters, brand]);

  // Get brand display name
  const getBrandDisplayName = (brandValue: string | null) => {
    switch(brandValue) {
      case brandEnum.BRIDE: return "Bride";
      case brandEnum.SLEEPWEAR: return "Sleepwear";
      default: return "";
    }
  };

  const customerFilterOptions = [
    {
      id: "source",
      label: "Fuente",
      type: "select" as const,
      options: [
        { value: "website", label: "Sitio Web" },
        { value: "referral", label: "Referido" },
        { value: "social_media", label: "Redes Sociales" },
        { value: "email", label: "Correo Electrónico" },
        { value: "cold_call", label: "Llamada en Frío" },
        { value: "event", label: "Evento" },
        { value: "other", label: "Otro" },
      ],
    },
    ...(!brand ? [{
      id: "brand",
      label: "Marca",
      type: "select" as const,
      options: [
        { value: "sleepwear", label: "Civetta Sleepwear" },
        { value: "bride", label: "Civetta Bride" },
      ],
    }] : []),
    {
      id: "city",
      label: "Ciudad",
      type: "text" as const,
    },
    {
      id: "province",
      label: "Provincia",
      type: "select" as const,
      options: [
        { value: "Azuay", label: "Azuay" },
        { value: "Bolívar", label: "Bolívar" },
        { value: "Cañar", label: "Cañar" },
        { value: "Carchi", label: "Carchi" },
        { value: "Chimborazo", label: "Chimborazo" },
        { value: "Cotopaxi", label: "Cotopaxi" },
        { value: "El Oro", label: "El Oro" },
        { value: "Esmeraldas", label: "Esmeraldas" },
        { value: "Galápagos", label: "Galápagos" },
        { value: "Guayas", label: "Guayas" },
        { value: "Imbabura", label: "Imbabura" },
        { value: "Loja", label: "Loja" },
        { value: "Los Ríos", label: "Los Ríos" },
        { value: "Manabí", label: "Manabí" },
        { value: "Morona Santiago", label: "Morona Santiago" },
        { value: "Napo", label: "Napo" },
        { value: "Orellana", label: "Orellana" },
        { value: "Pastaza", label: "Pastaza" },
        { value: "Pichincha", label: "Pichincha" },
        { value: "Santa Elena", label: "Santa Elena" },
        { value: "Santo Domingo", label: "Santo Domingo" },
        { value: "Sucumbíos", label: "Sucumbíos" },
        { value: "Tungurahua", label: "Tungurahua" },
        { value: "Zamora Chinchipe", label: "Zamora Chinchipe" },
      ],
    },
  ];

  const handleFilterChange = (searchValue: string, filterValues: FilterState) => {
    setSearchText(searchValue);
    setFilters(filterValues);
  };

  const handleResetFilters = () => {
    setSearchText("");
    setFilters({});
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchFilterBar 
        searchPlaceholder="Buscar por nombre, email, teléfono o dirección..."
        filterOptions={customerFilterOptions}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {filteredCustomers.length === 0 ? (
        <div className="text-center p-4">No se encontraron clientes con los filtros aplicados</div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div className="flex flex-col">
                    <h3 className="font-medium">{customer.name}</h3>
                    {brand ? null : (
                      <span className="text-xs text-muted-foreground">
                        {getBrandDisplayName(customer.brand)}
                      </span>
                    )}
                  </div>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Phone className="h-4 w-4" />
                    {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4" />
                    {customer.address}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => onSelect({...customer, mode: 'view'})}
                  >
                    Ver
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => onSelect({...customer, mode: 'edit'})}
                  >
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}