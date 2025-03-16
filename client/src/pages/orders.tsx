import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { t } from "@/lib/i18n";

// UI
import { CaretSortIcon, DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2, Plus, ShoppingCart, Eye, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OrderForm } from "@/components/crm/OrderForm";
import { OrderStatusUpdater } from "@/components/crm/OrderStatusUpdater";
import { OrderPaymentStatusUpdater } from "@/components/crm/OrderPaymentStatusUpdater";
import { OrderDetailsSheet } from "@/components/crm/OrderDetailsSheet";
import { SearchFilterBar, FilterOption, FilterState } from "@/components/crm/SearchFilterBar";

// Tipos
type Order = {
  id: number;
  customerId: number;
  leadId: number | null;
  orderNumber: string | null;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  source: string | null;
  woocommerceId: number | null;
  brand: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  assignedUserId?: number | null;
  shippingMethod?: string | null;
  trackingNumber?: string | null;
  shippingCost?: number;
  tax?: number;
  discount?: number;
  subtotal?: number;
  paymentDate?: string | null;
  customer?: {
    name: string;
    id: number;
  };
  assignedUser?: {
    id: number;
    fullName: string;
  };
  items?: OrderItem[];
};

type OrderItem = {
  id: number;
  orderId: number;
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  attributes?: Record<string, any>;
  createdAt: string;
};

// Utilizar las mismas variantes del componente Badge
import { BadgeProps } from "@/components/ui/badge";
// Definir variantes con los valores específicos que usamos
type BadgeVariant = "default" | "secondary" | "destructive" | "success" | "outline" | "pending" | "status" | "info";

// Componente principal
export default function OrdersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<Order | undefined>(undefined);
  const [detailsOrderId, setDetailsOrderId] = useState<number | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});

  // Estados para la tabla
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Cargar pedidos
  const {
    data: orders = [] as Order[],
    isLoading,
    error,
    refetch,
  } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Eliminar un pedido
  const deleteMutation = useMutation({
    mutationFn: async (orderId: number) => {
      await apiRequest("DELETE", `/api/orders/${orderId}`);
    },
    onSuccess: () => {
      toast({
        title: "Pedido eliminado",
        description: "El pedido ha sido eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Error al eliminar el pedido: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Función para obtener la variante del badge según el estado
  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case "completed":
        return "success";
      case "shipped":
        return "info"; // Cambiado de default a info para mejor visibilidad
      case "preparing":
        return "pending"; // Cambiado de secondary a pending para consistencia
      case "new":
        return "status"; // Nuevo estado con variante status
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Obtener el texto en español para los estados
  const getStatusText = (status: string): string => {
    switch (status) {
      case "new":
        return "Nuevo";
      case "preparing":
        return "Preparando";
      case "shipped":
        return "Enviado";
      case "completed":
        return "Completado";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  // Obtener el texto en español para los estados de pago
  const getPaymentStatusText = (status: string): string => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "paid":
        return "Pagado";
      case "refunded":
        return "Reembolsado";
      default:
        return status;
    }
  };

  // Definición de columnas
  const columns: ColumnDef<Order>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Seleccionar todo"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Seleccionar fila"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "orderNumber",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Nº Pedido
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.orderNumber || `ORD-${row.original.id.toString().padStart(6, "0")}`}
        </div>
      ),
    },
    {
      accessorKey: "customer.name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Cliente
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div>
          {row.original.customer ? (
            <Link href={`/customers/${row.original.customerId}`}>
              <span className="text-blue-600 hover:underline">
                {row.original.customer.name}
              </span>
            </Link>
          ) : (
            <span className="text-gray-500">Cliente #{row.original.customerId}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Total
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("totalAmount") as string);
        const formatted = new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "USD",
        }).format(amount);

        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Estado
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <OrderStatusUpdater
            orderId={row.original.id}
            currentStatus={status}
            onStatusUpdated={() => refetch()}
          />
        );
      },
    },
    {
      accessorKey: "paymentStatus",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Pago
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const status = row.getValue("paymentStatus") as string;
        return (
          <OrderPaymentStatusUpdater
            orderId={row.original.id}
            currentStatus={status}
            onStatusUpdated={() => refetch()}
          />
        );
      },
    },
    {
      accessorKey: "source",
      header: "Origen",
      cell: ({ row }) => (
        <div>{row.original.source || "Directo"}</div>
      ),
    },
    {
      accessorKey: "brand",
      header: "Marca",
      cell: ({ row }) => (
        <div>{row.original.brand === "bride" ? "Civetta Bride" : "Civetta Sleepwear"}</div>
      ),
    },
    {
      accessorKey: "assignedUser.fullName",
      header: "Responsable",
      cell: ({ row }) => (
        <div>
          {row.original.assignedUser ? (
            <span className="text-muted-foreground">
              {row.original.assignedUser.fullName}
            </span>
          ) : (
            <span className="text-gray-400 text-sm italic">No asignado</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Fecha
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        const formatted = new Intl.DateTimeFormat("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(date);

        return <div>{formatted}</div>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const order = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <DotsHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => {
                setDetailsOrderId(order.id);
                setDetailsSheetOpen(true);
              }}>
                <Eye className="h-4 w-4 mr-2" />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                setOrderToEdit(order);
                setDialogOpen(true);
              }}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  if (confirm(`¿Estás seguro de que deseas eliminar este pedido?`)) {
                    deleteMutation.mutate(order.id);
                  }
                }}
              >
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Cargar usuarios para filtrar por responsable
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Filtros disponibles
  const filterOptions: FilterOption[] = [
    {
      id: "status",
      label: "Estado",
      type: "select",
      options: [
        { value: "new", label: "Nuevo" },
        { value: "preparing", label: "Preparando" },
        { value: "shipped", label: "Enviado" },
        { value: "completed", label: "Completado" },
        { value: "cancelled", label: "Cancelado" },
      ],
    },
    {
      id: "paymentStatus",
      label: "Estado de pago",
      type: "select",
      options: [
        { value: "pending", label: "Pendiente" },
        { value: "paid", label: "Pagado" },
        { value: "refunded", label: "Reembolsado" },
      ],
    },
    {
      id: "brand",
      label: "Marca",
      type: "select",
      options: [
        { value: "sleepwear", label: "Civetta Sleepwear" },
        { value: "bride", label: "Civetta Bride" },
      ],
    },
    {
      id: "source",
      label: "Origen",
      type: "select",
      options: [
        { value: "woocommerce", label: "WooCommerce" },
        { value: "whatsapp", label: "WhatsApp" },
        { value: "instagram", label: "Instagram" },
        { value: "direct", label: "Directo" },
      ],
    },
    {
      id: "assignedUserId",
      label: "Responsable",
      type: "select",
      options: [
        { value: "unassigned", label: "Sin asignar" },
        ...users.map((user: any) => ({
          value: user.id.toString(),
          label: user.fullName
        }))
      ],
    }
  ];

  // Filtrar pedidos según los filtros aplicados - versión optimizada
  const filteredOrders = React.useMemo(() => {
    // Si no hay filtros, devolver todos los pedidos
    if (!orders || Object.keys(filters).length === 0) return orders;
    
    // Extraer el término de búsqueda para no calcularlo en cada iteración
    const searchTerm = filters.search ? (filters.search as string).toLowerCase() : null;
    
    // Preparar otros filtros para no repetir accesos en cada iteración
    const otherFilters = Object.entries(filters).filter(([key]) => key !== "search" && filters[key]);
    
    return orders.filter((order: Order) => {
      // Primero verificar filtros específicos que son más rápidos
      if (otherFilters.length > 0) {
        const passesSpecificFilters = otherFilters.every(([key, value]) => {
          // Caso especial para filtrar por responsable no asignado
          if (key === "assignedUserId" && value === "unassigned") {
            return order.assignedUserId === null || order.assignedUserId === undefined;
          }
          return order[key as keyof Order] === value;
        });
        
        if (!passesSpecificFilters) return false;
      }
      
      // Luego, si hay término de búsqueda, verificar
      if (searchTerm) {
        const customerName = order.customer?.name?.toLowerCase() || "";
        const orderNumber = order.orderNumber?.toLowerCase() || "";
        const orderId = order.id.toString().toLowerCase();
        
        return customerName.includes(searchTerm) || 
               orderNumber.includes(searchTerm) || 
               orderId.includes(searchTerm);
      }
      
      return true;
    });
  }, [orders, filters]);

  // Inicializar tabla
  const table = useReactTable({
    data: filteredOrders,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Cerrar el formulario después de guardar
  const handleFormClose = () => {
    setDialogOpen(false);
    setOrderToEdit(undefined);
  };

  return (
    <div className="space-y-6">
      <div className={`flex items-center ${isMobile ? 'flex-col space-y-4 justify-center' : 'justify-between'}`}>
        <h1 className={`text-2xl font-bold tracking-tight ${isMobile ? 'text-center' : ''}`}>
          {t("common.orders")}
        </h1>
        <Button 
          onClick={() => setDialogOpen(true)} 
          className="gap-2"
          size={isMobile ? "sm" : "default"}
        >
          <Plus className="h-4 w-4" />
          {t("orders.newOrder")}
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Gestión de Pedidos</CardTitle>
          <CardDescription>
            Administra pedidos, entregas y seguimiento logístico
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <SearchFilterBar
              searchPlaceholder="Buscar por cliente o número de pedido..."
              filterOptions={filterOptions}
              filters={filters}
              setFilters={setFilters}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Cargando pedidos...</span>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">
              Error al cargar los pedidos. Por favor, intenta de nuevo.
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="w-full overflow-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className={isMobile ? "text-xs px-2" : ""}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className={isMobile ? "text-xs px-2 py-3" : ""}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No se encontraron pedidos.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className={`flex ${isMobile ? 'flex-col space-y-4' : 'justify-between'}`}>
          <div className={`flex items-center gap-2 text-sm text-muted-foreground ${isMobile ? 'justify-center' : ''}`}>
            <div>
              Página {table.getState().pagination.pageIndex + 1} de{" "}
              {table.getPageCount()}
            </div>
          </div>
          <div className={`flex items-center gap-2 ${isMobile ? 'justify-center w-full' : ''}`}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={isMobile ? 'flex-1' : ''}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={isMobile ? 'flex-1' : ''}
            >
              Siguiente
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {orderToEdit ? "Editar Pedido" : "Crear Nuevo Pedido"}
            </DialogTitle>
            <DialogDescription>
              {orderToEdit
                ? "Modifica los detalles del pedido existente"
                : "Ingresa los detalles del nuevo pedido"}
            </DialogDescription>
          </DialogHeader>
          <OrderForm 
            order={orderToEdit} 
            onClose={handleFormClose}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
              handleFormClose();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Panel lateral para detalles de pedido */}
      <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
        <SheetContent className="w-full sm:max-w-[650px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalles del Pedido</SheetTitle>
            <SheetDescription>
              Información completa y artículos del pedido
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            {detailsOrderId ? (
              <OrderDetailsSheet 
                orderId={detailsOrderId} 
                onEdit={(order) => {
                  // Asegura la compatibilidad de tipos con la orden esperada
                  const orderForEdit = {
                    ...order,
                    woocommerceId: order.wooCommerceId // Corregir la diferencia de nomenclatura
                  };
                  setOrderToEdit(orderForEdit as any);
                  setDetailsSheetOpen(false);
                  setDialogOpen(true);
                }} 
              />
            ) : (
              <div className="flex justify-center items-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
          
          <div className="mt-8 flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDetailsSheetOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}