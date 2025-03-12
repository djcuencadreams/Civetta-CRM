import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { t } from "@/lib/i18n";
import { type Sale, brandEnum } from "@db/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { es } from "date-fns/locale";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { SearchFilterBar, type FilterState } from "./SearchFilterBar";
import { OrderStatusUpdater } from "./OrderStatusUpdater";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SalesForm } from "./SalesForm";
import { Edit, CheckCircle, Package, Truck, ShoppingBag, XCircle, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { captureError as logError } from "@/lib/error-handling/monitoring";
import { useErrorHandler } from "@/hooks/use-error-handler";

// Definir el tipo Customer basado en lo que devuelve la API
type Customer = {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  city: string | null;
  province: string | null;
  // ... otros campos
};

// Extender el tipo Sale para incluir la propiedad customer que viene de la API
type SaleWithCustomer = Sale & {
  customer?: Customer;
};

// Definición de estados del pedido con sus colores y transiciones permitidas
// Exactamente los mismos que en OrderStatusUpdater para mantener consistencia
type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

// Iconos para los estados de pedido
const orderStatusIcons: Record<string, React.ReactNode> = {
  new: <ShoppingBag className="h-4 w-4" />,
  preparing: <Package className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

const orderStatuses: Record<string, {
  label: string;
  allowedTransitions: string[];
  color: string;
  badgeVariant: BadgeVariant;
}> = {
  new: {
    label: "Nuevo Pedido",
    allowedTransitions: ["preparing", "cancelled"],
    color: "default",
    badgeVariant: "secondary"
  },
  preparing: {
    label: "Preparando Pedido",
    allowedTransitions: ["shipped", "cancelled"],
    color: "secondary",
    badgeVariant: "default"
  },
  shipped: {
    label: "Enviado",
    allowedTransitions: ["completed", "cancelled"],
    color: "blue",
    badgeVariant: "secondary"
  },
  completed: {
    label: "Completado",
    allowedTransitions: [],
    color: "green",
    badgeVariant: "outline"
  },
  cancelled: {
    label: "Cancelado",
    allowedTransitions: [],
    color: "destructive",
    badgeVariant: "destructive"
  },
};

export function SalesList({ brand, filters: externalFilters }: { brand?: string, filters?: FilterState }) {
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [filteredSales, setFilteredSales] = useState<SaleWithCustomer[]>([]);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  
  // Función para manejar la edición de una venta
  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setShowEditDialog(true);
  };
  
  // Función para manejar la confirmación de eliminación
  const handleDeleteConfirm = (sale: Sale) => {
    setSaleToDelete(sale);
    setShowDeleteDialog(true);
  };
  
  // Mutación para eliminar una venta
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest({ method: "DELETE", url: `/api/sales/${id}` });
    },
    onSuccess: (data) => {
      toast({
        title: "Venta eliminada",
        description: "La venta ha sido eliminada correctamente",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setShowDeleteDialog(false);
      setSaleToDelete(null);
    },
    onError: (error: Error) => {
      console.error("Error al eliminar la venta:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la venta. Por favor, intente nuevamente.",
        variant: "destructive"
      });
    }
  });

  // Merge external filters when provided
  useEffect(() => {
    if (externalFilters) {
      setFilters(prevFilters => ({
        ...prevFilters,
        ...externalFilters
      }));
    }
  }, [externalFilters]);

  // Use the query client with the improved error handling
  const { data: sales, isLoading, isError, error } = useQuery<SaleWithCustomer[]>({
    queryKey: ["/api/sales", brand, filters],
    queryFn: getQueryFn<SaleWithCustomer[]>(),
    staleTime: 60000, // 1 minute
    retry: 1,
    select: data => {
      // Ensure we always have an array, even if the API returns null or undefined
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      // Apply brand filter if specified
      if (brand && Array.isArray(data)) {
        return data.filter(sale => sale.brand === brand);
      }
      
      return data;
    }
  });
  
  // Handle any errors with our custom error handler
  useEffect(() => {
    if (isError && error) {
      handleError(error, { 
        context: 'Sales List',
        operation: 'loading sales data',
        showToast: true
      });
    }
  }, [isError, error, handleError]);

  // Apply filters and sorting whenever sales, searchText, or filters change
  useEffect(() => {
    try {
      // Ensure sales is an array (defensive programming)
      const salesArray = Array.isArray(sales) ? sales : [];
      
      if (salesArray.length === 0) {
        setFilteredSales([]);
        return;
      }

      let result = [...salesArray];

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

      // Apply advanced filters - Fixed to use "all" instead of empty string
      if (filters.status && filters.status !== "all") {
        result = result.filter(sale => sale.status === filters.status);
      }

      if (filters.brand && filters.brand !== "all" && !brand) {
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
            // Usar el nombre del cliente o por ID si no está disponible
            valueA = a.customer?.name?.toLowerCase() || String(a.customerId);
            valueB = b.customer?.name?.toLowerCase() || String(b.customerId);
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
    } catch (error) {
      // Log the error with structured error handling
      logError(error, { 
        component: 'SalesList', 
        operation: 'filter_and_sort',
        filters: JSON.stringify(filters),
        brand 
      });
      setFilteredSales([]);
    }
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
      options: [
        { value: "all", label: "Todos los estados" },
        ...Object.entries(orderStatuses).map(([value, status]) => ({
          value,
          label: status.label as string,
        })),
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

  // Show loading state
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
  
  // Show error state
  if (isError) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-medium">Error al cargar los datos</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Se ha producido un error al intentar cargar los datos de ventas. 
              Por favor, intente nuevamente en unos momentos.
            </p>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sales"] })}
              size="sm"
              variant="outline"
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
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
                    <h3 className="font-medium">{sale.customer?.name || `Cliente ID: ${sale.customerId}`}</h3>
                    {brand ? null : (
                      <span className="text-xs text-muted-foreground">
                        {getBrandDisplayName(sale.brand)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEditSale(sale)}
                      className="text-xs h-7 px-2"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDeleteConfirm(sale)}
                      className="text-xs h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Eliminar
                    </Button>
                    <Badge variant={
                      orderStatuses[sale.status as keyof typeof orderStatuses]?.badgeVariant || "default"
                    }
                    className="flex items-center gap-1 py-1"
                    >
                      {orderStatusIcons[sale.status as keyof typeof orderStatusIcons] || null}
                      {orderStatuses[sale.status as keyof typeof orderStatuses]?.label || sale.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Total: ${sale.amount} - {format(new Date(sale.createdAt), "PPp", { locale: es })}
                  </div>
                  
                  {/* Mostrar productos si están incluidos en las notas */}
                  {sale.notes && !sale.notes.startsWith('[') && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Productos:</strong> {
                        // Extraer la información de producto de la primera línea de las notas
                        // Ejemplo: "Pijama Seda (Pijamas) - $150 x 1 - Civetta Sleepwear"
                        (() => {
                          const firstLine = sale.notes.split('\n')[0];
                          // Si tiene formato de producto+precio, extraemos el producto
                          if (firstLine.includes('$')) {
                            const productPart = firstLine.split(' - ')[0];
                            return productPart;
                          }
                          // Si no tiene ese formato, mostramos la primera línea completa
                          return firstLine;
                        })()
                      }
                    </div>
                  )}
                  
                  {/* Historial de cambios de estado */}
                  {sale.notes && (
                    <div className="mt-2">
                      {sale.notes.split('\n').map((line, i) => {
                        // Separamos las notas normales del historial de estados
                        // El formato es [fecha] Cambio a [estado]: [razón]
                        if (line.match(/\[\d+\/\d+\/\d+.*?\] Cambio a/)) {
                          // Extraer el estado del cambio
                          const statusMatch = line.match(/Cambio a (\w+):/);
                          const status = statusMatch ? statusMatch[1] : null;
                          const statusIcon = status ? orderStatusIcons[status as keyof typeof orderStatusIcons] : null;
                          
                          return (
                            <div key={i} className="text-xs text-slate-500 border-l-2 border-slate-300 pl-2 py-1 flex items-start">
                              {statusIcon && <span className="mt-0.5 mr-1 text-muted-foreground">{statusIcon}</span>}
                              <span className="flex-1">{line}</span>
                            </div>
                          );
                        } else if (line.trim() && !line.startsWith('Notas:')) {
                          return (
                            <div key={i} className="text-sm pl-2 py-0.5">
                              {line}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
                
                {/* Componente para actualizar el estado del pedido */}
                <OrderStatusUpdater 
                  orderId={sale.id} 
                  currentStatus={sale.status}
                  onStatusUpdated={() => queryClient.invalidateQueries({ queryKey: ["/api/sales"] })} 
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Diálogo para editar venta */}
      {editingSale && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Editar Venta</DialogTitle>
              <div className="text-sm text-muted-foreground">
                Modifique los detalles de la venta seleccionada
              </div>
            </DialogHeader>
            <div className="py-4">
              {/* Aquí integramos el formulario de edición de venta */}
              {editingSale && (
                <SalesForm 
                  sale={editingSale} 
                  onComplete={() => {
                    setShowEditDialog(false);
                    setEditingSale(null);
                    queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
                  }} 
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Diálogo de confirmación para eliminar venta */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar esta venta? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          {saleToDelete && (
            <div className="py-4">
              <div className="space-y-2 mb-4 p-3 border rounded-md bg-muted/50">
                <div className="font-medium">Detalles de la venta:</div>
                <div className="text-sm">Venta ID: {saleToDelete.id}</div>
                <div className="text-sm">Cliente: {(saleToDelete as SaleWithCustomer).customer?.name || `ID: ${saleToDelete.customerId}`}</div>
                <div className="text-sm">Monto: ${saleToDelete.amount}</div>
                <div className="text-sm">Fecha: {format(new Date(saleToDelete.createdAt), "PPp", { locale: es })}</div>
                <div className="text-sm">Estado: {orderStatuses[saleToDelete.status as keyof typeof orderStatuses]?.label || saleToDelete.status}</div>
              </div>
              
              <div className="flex items-center space-x-2 bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div className="text-sm text-destructive">
                  Esta acción eliminará permanentemente el registro de la venta del sistema.
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setSaleToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => saleToDelete && deleteMutation.mutate(saleToDelete.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar Venta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}