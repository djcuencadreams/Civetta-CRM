import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  stock: number;
  active: boolean;
  brand: string | null;
  category: string | null;
  wooCommerceId: number | null;
  createdAt: string;
  updatedAt: string;
};

// Componente para la gestión de productos
export default function ProductsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});

  // Estados para la tabla
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  // Cargar productos
  const {
    data: products = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["/api/products"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Eliminar un producto
  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      await apiRequest(`/api/products/${productId}`, {
        method: "DELETE",
      });
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
      await apiRequest(`/api/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
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

  // Definición de columnas
  const columns: ColumnDef<Product>[] = [
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
            Nombre
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
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
            Precio
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("price"));
        const formatted = new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "USD",
        }).format(price);

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
            Stock
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const stock = parseInt(row.getValue("stock"));
        return (
          <div className={`text-right font-medium ${stock <= 5 ? "text-red-500" : ""}`}>
            {stock}
          </div>
        );
      },
    },
    {
      accessorKey: "active",
      header: "Estado",
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
      header: "Marca",
      cell: ({ row }) => {
        const brand = row.getValue("brand") as string;
        return <div>{brand === "bride" ? "Civetta Bride" : "Civetta Sleepwear"}</div>;
      },
    },
    {
      accessorKey: "category",
      header: "Categoría",
      cell: ({ row }) => <div>{row.getValue("category")}</div>,
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
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
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
  ];

  // Filtros disponibles
  const filterOptions: FilterOption[] = [
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
      id: "category",
      label: "Categoría",
      type: "select",
      options: [
        { value: "Pijamas", label: "Pijamas" },
        { value: "Calzado", label: "Calzado" },
        { value: "Bodas", label: "Bodas" },
        { value: "Accesorios", label: "Accesorios" },
      ],
    },
  ];

  // Filtrar productos según los filtros aplicados
  const filteredProducts = Array.isArray(products) ? products.filter((product: Product) => {
    // Si no hay filtros, mostrar todos
    if (Object.keys(filters).length === 0) return true;

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
      
      // Para los demás filtros, comparar directamente
      return product[key as keyof Product] === value;
    });
  }) : [];

  // Inicializar tabla
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
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Mostrar mensaje si no hay productos
  if (Array.isArray(products) && products.length === 0 && !isLoading) {
    return (
      <Shell>
        <div className="container mx-auto py-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Inventario</h1>
            <Button className="flex items-center gap-2">
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
              <Button className="flex items-center gap-2">
                <PlusCircleIcon className="h-4 w-4" />
                Agregar Producto
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Inventario</h1>
          <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <PlusCircleIcon className="h-4 w-4" />
                Nuevo Producto
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
                  setProductToEdit(null);
                }}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                  setShowProductForm(false);
                  setProductToEdit(null);
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
            <div className="rounded-md border">
              {isLoading ? (
                <div className="w-full h-96 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
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
                            <TableCell key={cell.id}>
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
              )}
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                {table.getFilteredSelectedRowModel().rows.length} de{" "}
                {table.getFilteredRowModel().rows.length} fila(s) seleccionada(s).
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}