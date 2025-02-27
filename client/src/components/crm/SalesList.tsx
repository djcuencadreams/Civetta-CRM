import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { t } from "@/lib/i18n";
import { type Sale, brandEnum } from "@db/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { es } from "date-fns/locale";
import { getQueryFn } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { SearchFilterBar, type FilterState } from "./SearchFilterBar";

type SaleWithCustomer = Sale & {
  customer: {
    name: string;
  };
};

const statusVariants = {
  pending: "default",
  completed: "default",
  cancelled: "destructive"
} as const;

const statusLabels = {
  pending: "Pendiente",
  completed: "Completado",
  cancelled: "Cancelado"
};

export function SalesList({ brand, filters: externalFilters }: { brand?: string, filters?: FilterState }) {
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [filteredSales, setFilteredSales] = useState<SaleWithCustomer[]>([]);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Merge external filters when provided
  useEffect(() => {
    if (externalFilters) {
      setFilters(prevFilters => ({
        ...prevFilters,
        ...externalFilters
      }));
    }
  }, [externalFilters]);

  const { data: sales, isLoading } = useQuery<SaleWithCustomer[]>({
    queryKey: ["/api/sales", brand, filters],
    queryFn: getQueryFn({ on401: "throw" }),
    select: (data) => {
      // Apply brand filter if specified
      if (brand) {
        return data.filter(sale => sale.brand === brand);
      }
      return data;
    }
  });

  // Apply filters and sorting whenever sales, searchText, or filters change
  useEffect(() => {
    if (!sales) {
      setFilteredSales([]);
      return;
    }

    let result = [...sales];

    // Apply text search across multiple fields
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(sale => {
        return (
          (sale.customer?.name && sale.customer.name.toLowerCase().includes(lowerSearch)) ||
          (sale.notes && sale.notes.toLowerCase().includes(lowerSearch)) ||
          (sale.amount && sale.amount.toString().includes(lowerSearch))
        );
      });
    }

    // Apply advanced filters
    if (filters.status && filters.status !== "") {
      result = result.filter(sale => sale.status === filters.status);
    }

    if (filters.brand && filters.brand !== "" && !brand) {
      // Only apply brand filter here if not already filtered by prop
      result = result.filter(sale => sale.brand === filters.brand);
    }

    if (filters.minAmount && !isNaN(Number(filters.minAmount))) {
      const minAmount = Number(filters.minAmount);
      result = result.filter(sale => Number(sale.amount) >= minAmount);
    }

    if (filters.maxAmount && !isNaN(Number(filters.maxAmount))) {
      const maxAmount = Number(filters.maxAmount);
      result = result.filter(sale => Number(sale.amount) <= maxAmount);
    }

    if (filters.dateFrom && filters.dateFrom instanceof Date) {
      result = result.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= (filters.dateFrom as Date);
      });
    }

    if (filters.dateTo && filters.dateTo instanceof Date) {
      result = result.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate <= (filters.dateTo as Date);
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;

      switch (sortField) {
        case "amount":
          valueA = Number(a.amount);
          valueB = Number(b.amount);
          break;
        case "customerName":
          valueA = a.customer?.name?.toLowerCase() || "";
          valueB = b.customer?.name?.toLowerCase() || "";
          break;
        case "status":
          valueA = a.status;
          valueB = b.status;
          break;
        case "createdAt":
        default:
          valueA = new Date(a.createdAt).getTime();
          valueB = new Date(b.createdAt).getTime();
      }

      // Apply sort direction
      if (sortDirection === "asc") {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    setFilteredSales(result);
  }, [sales, searchText, filters, brand, sortField, sortDirection]);

  // Get brand display name
  const getBrandDisplayName = (brandValue: string | null) => {
    switch(brandValue) {
      case brandEnum.BRIDE: return "Bride";
      case brandEnum.SLEEPWEAR: return "Sleepwear";
      default: return "";
    }
  };

  const salesFilterOptions = [
    {
      id: "status",
      label: "Estado",
      type: "select" as const,
      options: Object.entries(statusLabels).map(([value, label]) => ({
        value,
        label,
      })),
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
      id: "minAmount",
      label: "Monto Mínimo",
      type: "text" as const,
    },
    {
      id: "maxAmount",
      label: "Monto Máximo",
      type: "text" as const,
    },
    {
      id: "dateFrom",
      label: "Fecha desde",
      type: "date" as const,
    },
    {
      id: "dateTo",
      label: "Fecha hasta",
      type: "date" as const,
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

  const sortOptions = [
    { label: "Fecha", value: "createdAt" },
    { label: "Cliente", value: "customerName" },
    { label: "Monto", value: "amount" },
    { label: "Estado", value: "status" }
  ];

  const handleSortChange = (field: string) => {
    if (field === sortField) {
      // Toggle direction if same field clicked
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc"); // Default to descending for new field
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchFilterBar 
        searchPlaceholder="Buscar por cliente, notas o monto..."
        filterOptions={salesFilterOptions}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Sorting controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium">Ordenar por:</span>
        {sortOptions.map(option => (
          <Badge 
            key={option.value}
            variant={sortField === option.value ? "default" : "outline"}
            className="cursor-pointer hover:bg-muted"
            onClick={() => handleSortChange(option.value)}
          >
            {option.label} {sortField === option.value && (sortDirection === "asc" ? "↑" : "↓")}
          </Badge>
        ))}
      </div>

      {filteredSales.length === 0 ? (
        <div className="text-center p-4">No se encontraron ventas con los filtros aplicados</div>
      ) : (
        <div className="space-y-4">
          {filteredSales.map((sale) => (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{sale.customer.name}</h3>
                    {brand ? null : (
                      <span className="text-xs text-muted-foreground">
                        {getBrandDisplayName(sale.brand)}
                      </span>
                    )}
                  </div>
                  <Badge variant={statusVariants[sale.status as keyof typeof statusVariants]}>
                    {t(`sales.${sale.status}`)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {sale.notes?.split('\n').map((line, i) => (
                    line.startsWith('Notas:') ? null : 
                    <div key={i} className="text-sm text-muted-foreground pl-2">
                      {line}
                    </div>
                  ))}
                  <div className="text-sm font-medium">
                    Total: ${sale.amount} - {format(new Date(sale.createdAt), "PPp", { locale: es })}
                  </div>
                </div>
                {sale.notes && (
                  <div className="mt-2 text-sm">{sale.notes}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}