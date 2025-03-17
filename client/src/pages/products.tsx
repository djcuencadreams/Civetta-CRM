import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "../hooks/use-is-mobile";
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
import { Loader2, PlusCircleIcon } from "lucide-react";

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
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Shell } from "@/components/layout/Shell";
import { SearchFilterBar, FilterOption, FilterState } from "@/components/crm/SearchFilterBar";
import { ProductForm } from "@/components/crm/ProductForm";

// Tipo de datos para productos
type Product = {
  id: number;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  priceDiscount?: number | null;
  stock: number;
  active: boolean;
  status?: string;
  brand: string | null;
  category_id: number | null;
  category_name?: string;
  woocommerce_id: number | null;
  woocommerce_parent_id: number | null;
  product_type: string | null;
  weight?: number | null;
  dimensions?: Record<string, any> | null;
  attributes: Record<string, any> | null;
  images: string[] | null;
  relatedProducts?: number[] | null;
  createdAt: string;
  updatedAt: string;
};

// Componente para la gestión de productos
export default function ProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [productToEdit, setProductToEdit] = useState<Product | undefined>(undefined);
  const [showProductForm, setShowProductForm] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});

  // Estados para la tabla
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Paginación del lado del cliente - en el futuro se implementará paginación del servidor
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10, // Número de elementos por página 
  });

  // Cargar productos - memoizado para evitar llamadas innecesarias a la API
  const {
    data: products = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/products"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 1000 * 60 * 5, // 5 minutos antes de considerar los datos obsoletos
  });

  // Eliminar un producto
  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest(`/api/products/${productId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Error al eliminar el producto: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Cambiar estado activo/inactivo
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await apiRequest(`/api/products/${id}`, "PATCH", { active });
    },
    onSuccess: () => {
      toast({
        title: "Producto actualizado",
        description: "El estado del producto ha sido actualizado",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Error al actualizar el producto: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Definición de columnas - memoizado para evitar recreaciones innecesarias
  const columns: ColumnDef<Product>[] = useMemo(() => [
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
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("products.name")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const product = row.original;
        const isVariation = product.product_type === "variation" && product.woocommerce_parent_id;
        
        // Para variaciones, mostrar un indicador visual
        return (
          <div className="font-medium">
            {isVariation && (
              <div className="flex items-center">
                <span className="ml-1 mr-2 text-muted-foreground">↳</span>
                <span>{row.getValue("name")}</span>
              </div>
            )}
            {!isVariation && row.getValue("name")}
          </div>
        );
      },
    },
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <div>{row.getValue("sku")}</div>,
    },
    {
      accessorKey: "price",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("products.price")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("price"));
        const product = row.original;
        const discountPrice = product.priceDiscount ? parseFloat(String(product.priceDiscount)) : null;
        
        const formatted = new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "USD",
        }).format(price);
        
        // Si hay un precio de descuento, mostrarlo junto con el precio regular tachado
        if (discountPrice !== null && !isNaN(discountPrice)) {
          const formattedDiscount = new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: "USD",
          }).format(discountPrice);
          
          return (
            <div className="text-right">
              <span className="line-through text-muted-foreground text-sm mr-1">{formatted}</span>
              <span className="font-medium text-red-600">{formattedDiscount}</span>
            </div>
          );
        }

        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "stock",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("products.stock")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const stockValue = row.getValue("stock");
        // Verificar si el stock es null, undefined o NaN
        if (stockValue === null || stockValue === undefined || isNaN(Number(stockValue))) {
          return <div className="text-right font-medium text-muted-foreground">-</div>;
        }
        
        const stock = parseInt(String(stockValue));
        return (
          <div className={`text-right font-medium ${stock <= 5 ? "text-red-500" : ""}`}>
            {stock}
          </div>
        );
      },
    },
    {
      accessorKey: "active",
      header: t("products.status"),
      cell: ({ row }) => {
        const isActive = row.getValue("active");
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Activo" : "Inactivo"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "brand",
      header: t("products.brand"),
      cell: ({ row }) => {
        const brand = row.getValue("brand") as string;
        return <div>{brand === "bride" ? "Civetta Bride" : "Civetta Sleepwear"}</div>;
      },
    },
    {
      accessorKey: "category_name",
      header: t("products.category"),
      cell: ({ row }) => <div>{row.getValue("category_name") || "Sin categoría"}</div>,
    },
    {
      accessorKey: "product_type",
      header: "Tipo",
      cell: ({ row }) => {
        const productType = row.getValue("product_type") as string;
        const variant = 
          productType === "simple" ? "default" : 
          productType === "variable" ? "success" : 
          productType === "variation" ? "secondary" : "outline";
        
        let label = "Simple";
        if (productType === "variable") label = "Variable";
        if (productType === "variation") label = "Variación";
        
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const product = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menú</span>
                <DotsHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t("products.actions")}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => {
                setProductToEdit(product);
                setShowProductForm(true);
              }}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  toggleActiveMutation.mutate({
                    id: product.id,
                    active: !product.active,
                  });
                }}
              >
                {product.active ? "Desactivar" : "Activar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  if (confirm(`¿Estás seguro de que deseas eliminar el producto "${product.name}"?`)) {
                    deleteMutation.mutate(product.id);
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
  ], []);

  // Filtros disponibles
  const filterOptions: FilterOption[] = useMemo(() => [
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
      id: "active",
      label: "Estado",
      type: "select",
      options: [
        { value: "true", label: "Activo" },
        { value: "false", label: "Inactivo" },
      ],
    },
    {
      id: "product_type",
      label: "Tipo de Producto",
      type: "select",
      options: [
        { value: "simple", label: "Simple" },
        { value: "variable", label: "Variable" },
        { value: "variation", label: "Variación" },
      ],
    },
    // Este filtro de categoría debería obtener categorías dinámicamente en el futuro
    {
      id: "category_name",
      label: "Categoría",
      type: "select",
      options: [
        { value: "Pijamas", label: "Pijamas" },
        { value: "Calzado", label: "Calzado" },
        { value: "Bodas", label: "Bodas" },
        { value: "Accesorios", label: "Accesorios" },
        { value: "Pijamas Mujeres", label: "Pijamas Mujeres" }, // Añadida para Set Abitare
      ],
    },
  ], []);

  // Filtrar productos según los filtros aplicados - usando useMemo para evitar recálculos innecesarios
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    // Si no hay filtros, devolver todos los productos
    if (Object.keys(filters).length === 0) return products;
    
    // Aplicar filtros solo cuando sea necesario
    return products.filter((product: Product) => {
      // Verificar cada filtro
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        
        if (key === "search" && value) {
          const searchTerm = (value as string).toLowerCase();
          return product.name.toLowerCase().includes(searchTerm) || 
                 product.sku.toLowerCase().includes(searchTerm) || 
                 (product.description || "").toLowerCase().includes(searchTerm);
        }
        
        if (key === "active" && value) {
          return product.active === (value === "true");
        }
        
        // Para los filtros de selección, verificar si es "todos" (valor especial)
        if (value === "todos") return true;
        
        // Para los demás filtros, comparar directamente
        return product[key as keyof Product] === value;
      });
    });
  }, [products, filters]); // Solo recalcular cuando cambian los productos o los filtros

  // Inicializar tabla con paginación
  const table = useReactTable({
    data: filteredProducts,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    manualPagination: false, // Cambiará a true cuando se implemente paginación del servidor
    pageCount: Math.ceil(filteredProducts.length / pagination.pageSize),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  // Renderizar el contenido adecuado basado en si hay productos o no
  const renderContent = () => {
    if (Array.isArray(products) && products.length === 0 && !isLoading) {
      return (
        <div className="container mx-auto py-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Inventario</h1>
            <Button 
              className="flex items-center gap-2"
              onClick={() => setShowProductForm(true)}
            >
              <PlusCircleIcon className="h-4 w-4" />
              Nuevo Producto
            </Button>
          </div>
          <Card className="w-full">
            <CardHeader>
              <CardTitle>No hay productos</CardTitle>
              <CardDescription>
                Todavía no hay productos en el inventario. Comienza agregando tu primer producto.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button 
                className="flex items-center gap-2"
                onClick={() => setShowProductForm(true)}
              >
                <PlusCircleIcon className="h-4 w-4" />
                Agregar Producto
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }
    
    // Caso normal: hay productos
    return (
      <div className="container mx-auto py-4">
        <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between items-center'} mb-6`}>
          <h1 className="text-2xl md:text-3xl font-bold">Inventario</h1>
          <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
            <DialogTrigger asChild>
              <Button className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}>
                <PlusCircleIcon className="h-4 w-4" />
                {isMobile ? "Añadir producto" : "Nuevo Producto"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {productToEdit ? "Editar Producto" : "Crear Nuevo Producto"}
                </DialogTitle>
                <DialogDescription>
                  {productToEdit
                    ? "Modifica los detalles del producto existente"
                    : "Ingresa los detalles del nuevo producto"}
                </DialogDescription>
              </DialogHeader>
              <ProductForm 
                product={productToEdit} 
                onClose={() => {
                  setShowProductForm(false);
                  setProductToEdit(undefined);
                }}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                  setShowProductForm(false);
                  setProductToEdit(undefined);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestión de Inventario</CardTitle>
            <CardDescription>
              Administra el inventario de productos para Civetta Sleepwear y Civetta Bride
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <SearchFilterBar
                searchPlaceholder="Buscar por nombre, SKU o descripción..."
                filterOptions={filterOptions}
                onChange={(searchText, filterValues) => {
                  const newFilters: FilterState = { ...filterValues };
                  if (searchText) {
                    newFilters.search = searchText;
                  }
                  setFilters(newFilters);
                }}
                onReset={() => setFilters({})}
              />
            </div>
            <div className="rounded-md border overflow-hidden">
              {isLoading ? (
                <div className="w-full h-96 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
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
                            No se encontraron productos.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <div className={`${isMobile ? 'flex flex-col space-y-4' : 'flex items-center justify-end space-x-2'} py-4`}>
              <div className={`${isMobile ? 'text-center' : 'flex-1'} text-sm text-muted-foreground`}>
                {table.getFilteredSelectedRowModel().rows.length} de{" "}
                {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
              </div>
              <div className={`${isMobile ? 'flex w-full' : 'space-x-2'}`}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className={isMobile ? 'flex-1 mr-2' : ''}
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
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // No necesitamos envolver en Shell porque ya está en App.tsx
  return renderContent();
}