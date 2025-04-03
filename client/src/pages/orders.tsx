import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { DateRange } from "react-day-picker";
import { format, isAfter, isBefore, isEqual, parseISO, startOfDay, endOfDay } from "date-fns";

// UI
import { CaretSortIcon, DotsHorizontalIcon, ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
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
  ExpandedState,
} from "@tanstack/react-table";
import { 
  Loader2, 
  Plus, 
  ShoppingCart, 
  Eye, 
  Calendar, 
  User, 
  CreditCard, 
  Clock, 
  Filter, 
  ChevronDown, 
  Package,
  FileText,
  Truck,
  DollarSign
} from "lucide-react";

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { OrderForm } from "@/components/crm/OrderForm";
import { OrderStatusUpdater } from "@/components/crm/OrderStatusUpdater";
import { OrderPaymentStatusUpdater } from "@/components/crm/OrderPaymentStatusUpdater";
import { OrderDetailsSheet } from "@/components/crm/OrderDetailsSheet";
import { SearchFilterBar, FilterOption, FilterState } from "@/components/crm/SearchFilterBar";
import { OrderItemsExpanded } from "@/components/crm/OrderItemsExpanded";
import { OrderDateFilter } from "@/components/crm/OrderDateFilter";

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
  wooCommerceId: number | null; // API devuelve wooCommerceId con C mayúscula
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
      case "pendiente_de_completar":
        return "secondary"; // Usamos secondary para un aspecto de advertencia
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
      case "pendiente_de_completar":
        return "Pendiente de completar";
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
      id: "expand",
      header: () => null,
      cell: ({ row }) => {
        const hasItems = row.original.items && row.original.items.length > 0;
        return (
          hasItems ? (
            <Button
              variant="ghost"
              onClick={() => row.toggleExpanded(!row.getIsExpanded())}
              className="p-0 h-8 w-8"
            >
              {row.getIsExpanded() ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </Button>
          ) : null
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
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
            className="whitespace-nowrap"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
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
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="whitespace-nowrap"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Fecha pedido
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        const formatted = formatDate(row.original.createdAt);
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="font-medium text-sm">
                  {formatted}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {new Date(row.original.createdAt).toLocaleString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "customer.name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="whitespace-nowrap"
          >
            <User className="mr-2 h-4 w-4" />
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
            className="whitespace-nowrap"
          >
            <DollarSign className="mr-2 h-4 w-4" />
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
            className="whitespace-nowrap"
          >
            <Package className="mr-2 h-4 w-4" />
            Estado
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const paymentStatus = row.original.paymentStatus || "pending";
        
        // Añadir icono de advertencia si el pedido está "pendiente_de_completar"
        return (
          <div className="flex items-center">
            {status === "pendiente_de_completar" && (
              <div className="relative mr-2 rounded-full bg-orange-100 p-1 text-orange-600 flex items-center justify-center w-6 h-6" aria-label="Warning" title="Pedido incompleto">
                <span className="text-sm font-bold">!</span>
              </div>
            )}
            <OrderStatusUpdater
              orderId={row.original.id}
              currentStatus={status}
              currentPaymentStatus={paymentStatus}
              onStatusUpdate={() => refetch()}
            />
          </div>
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
            className="whitespace-nowrap"
          >
            <CreditCard className="mr-2 h-4 w-4" />
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
      accessorKey: "paymentMethod",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="whitespace-nowrap"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Forma de pago
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="text-sm">
          {getPaymentMethodText(row.original.paymentMethod)}
        </div>
      ),
    },
    {
      accessorKey: "assignedUser.fullName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="whitespace-nowrap"
          >
            <User className="mr-2 h-4 w-4" />
            Responsable
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div>
          {row.original.assignedUser ? (
            <span className="text-muted-foreground text-sm">
              {row.original.assignedUser.fullName}
            </span>
          ) : (
            <span className="text-gray-400 text-xs italic">No asignado</span>
          )}
        </div>
      ),
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
                <FileText className="h-4 w-4 mr-2" />
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
  const { data: users = [] } = useQuery<any[]>({
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
        { value: "pendiente_de_completar", label: "Pendiente de completar" },
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

  // Estado para el filtro de fechas
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Estado para filas expandidas
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Manejar la selección de rango de fechas
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  // Formato para fechas
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch (e) {
      return "Fecha inválida";
    }
  };
  
  // Obtener texto para método de pago
  const getPaymentMethodText = (method: string | null): string => {
    if (!method) return 'No especificado';
    switch (method) {
      case "cash": return "Efectivo";
      case "credit_card": return "Tarjeta de crédito";
      case "debit_card": return "Tarjeta de débito";
      case "transfer": return "Transferencia";
      case "paypal": return "PayPal";
      default: return method;
    }
  };

  // Filtrar pedidos según los filtros aplicados - versión optimizada
  const filteredOrders = React.useMemo(() => {
    // Si no hay pedidos, devolver un arreglo vacío
    if (!orders) return [] as Order[];
    
    // Comenzar con todos los pedidos
    let filtered = [...orders];
    
    // Filtrar por rango de fechas si existe
    if (dateRange && dateRange.from) {
      const fromDate = startOfDay(dateRange.from);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      
      filtered = filtered.filter(order => {
        const orderDate = parseISO(order.createdAt);
        return (
          (isAfter(orderDate, fromDate) || isEqual(orderDate, fromDate)) &&
          (isBefore(orderDate, toDate) || isEqual(orderDate, toDate))
        );
      });
    }
    
    // Si no hay más filtros, devolver lo filtrado por fecha
    if (Object.keys(filters).length === 0) return filtered;
    
    // Extraer el término de búsqueda para no calcularlo en cada iteración
    const searchTerm = filters.search ? (filters.search as string).toLowerCase() : null;
    
    // Preparar otros filtros para no repetir accesos en cada iteración
    const otherFilters = Object.entries(filters).filter(([key]) => key !== "search" && filters[key]);
    
    return filtered.filter((order: Order) => {
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
        const notes = order.notes?.toLowerCase() || "";
        
        return customerName.includes(searchTerm) || 
               orderNumber.includes(searchTerm) || 
               orderId.includes(searchTerm) ||
               notes.includes(searchTerm);
      }
      
      return true;
    });
  }, [orders, filters, dateRange]);

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
    onExpandedChange: setExpanded,
    getSubRows: (row: Order) => undefined, // No hay filas secundarias en este caso
    getRowCanExpand: () => true, // Todas las filas pueden expandirse
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded
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
          <div className="space-y-4">
            {/* Barra de búsqueda con filtros */}
            <div className="mb-2">
              <SearchFilterBar
                searchPlaceholder="Buscar por cliente, número de pedido o notas..."
                filterOptions={filterOptions}
                filters={filters}
                setFilters={setFilters}
              />
            </div>
            
            {/* Filtro de fechas */}
            <div className="flex gap-4 flex-wrap">
              <OrderDateFilter 
                dateRange={dateRange}
                onChangeDateRange={handleDateRangeChange}
              />
              
              <div className="flex items-center text-sm text-muted-foreground">
                {filteredOrders.length} pedidos encontrados
                {dateRange?.from && (
                  <span className="ml-2">
                    en el período seleccionado
                  </span>
                )}
              </div>
            </div>
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
                <Table className="border-collapse">
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="bg-muted/40">
                        {headerGroup.headers.map((header) => (
                          <TableHead 
                            key={header.id} 
                            className={cn(
                              isMobile ? "text-xs px-2" : "py-3",
                              "whitespace-nowrap"
                            )}
                            style={{ 
                              width: header.id === "expandedToggle" ? "40px" : 
                                     header.id === "orderNumber" ? "180px" : 
                                     header.id === "createdAt" ? "120px" :
                                     header.id === "customer.name" ? "180px" :
                                     header.id === "totalAmount" ? "120px" :
                                     header.id === "status" ? "220px" :
                                     header.id === "paymentStatus" ? "150px" :
                                     header.id === "actions" ? "60px" : "auto" 
                            }}
                          >
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
                        <React.Fragment key={row.id}>
                          <TableRow
                            data-state={row.getIsSelected() && "selected"}
                            className={cn(
                              row.getIsExpanded() ? "border-b-0" : undefined,
                              "hover:bg-muted/30",
                              row.index % 2 === 0 ? "bg-background" : "bg-muted/10"
                            )}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell 
                                key={cell.id} 
                                className={cn(
                                  isMobile ? "text-xs px-2 py-3" : "py-3.5 align-middle",
                                  cell.column.id === "status" || cell.column.id === "paymentStatus" 
                                    ? "whitespace-nowrap" : ""
                                )}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                          {/* Fila expandible para mostrar productos */}
                          {row.getIsExpanded() && (
                            <TableRow>
                              <TableCell colSpan={columns.length} className="bg-muted/10 p-2">
                                <div className="rounded border p-3 bg-background shadow-sm">
                                  <div className="flex items-center mb-3 text-sm font-medium text-primary">
                                    <Package className="mr-2 h-4 w-4" />
                                    Productos del pedido
                                  </div>
                                  <OrderItemsExpanded items={row.original.items} />
                                  
                                  {row.original.notes && (
                                    <div className="mt-4 pt-3 border-t border-border">
                                      <div className="flex items-center mb-2 text-sm font-medium text-muted-foreground">
                                        <FileText className="mr-2 h-4 w-4" />
                                        Notas internas
                                      </div>
                                      <div className="text-sm p-3 bg-muted/20 rounded-md">
                                        {row.original.notes}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No se encontraron pedidos que coincidan con los filtros.
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
              className={cn(
                isMobile ? 'flex-1' : '',
                "rounded-full border-primary/20 text-primary hover:bg-primary/5"
              )}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={cn(
                isMobile ? 'flex-1' : '',
                "rounded-full border-primary/20 text-primary hover:bg-primary/5"
              )}
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