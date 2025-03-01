import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

// Define el tipo de producto
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

// Props para el formulario
interface ProductFormProps {
  product?: Product;
  onClose: () => void;
  onSuccess?: () => void;
}

// Esquema de validación con Zod
const productSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  sku: z.string().min(3, "El SKU debe tener al menos 3 caracteres"),
  description: z.string().nullable().optional(),
  price: z.coerce.number().positive("El precio debe ser mayor que 0"),
  stock: z.coerce.number().int().nonnegative("El stock no puede ser negativo"),
  active: z.boolean().default(true),
  brand: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

// Componente de formulario para productos
export function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Configurar el formulario
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      sku: product?.sku || "",
      description: product?.description || "",
      price: product?.price || 0,
      stock: product?.stock || 0,
      active: product?.active ?? true,
      brand: product?.brand || "sleepwear",
      category: product?.category || "",
    },
  });

  // Mutación para crear o actualizar producto
  const productMutation = useMutation({
    mutationFn: async (values: z.infer<typeof productSchema>) => {
      if (product) {
        // Actualizar producto existente
        return await apiRequest("PATCH", `/api/products/${product.id}`, values);
      } else {
        // Crear nuevo producto
        return await apiRequest("POST", "/api/products", values);
      }
    },
    onSuccess: () => {
      toast({
        title: product ? "Producto actualizado" : "Producto creado",
        description: product
          ? "El producto ha sido actualizado correctamente"
          : "El producto ha sido creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Error al ${
          product ? "actualizar" : "crear"
        } el producto: ${error.message}`,
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Manejar envío del formulario
  function onSubmit(values: z.infer<typeof productSchema>) {
    setIsSubmitting(true);
    productMutation.mutate(values);
  }

  // Categorías disponibles
  const categories = [
    { value: "Pijamas", label: "Pijamas" },
    { value: "Calzado", label: "Calzado" },
    { value: "Bodas", label: "Bodas" },
    { value: "Accesorios", label: "Accesorios" },
    { value: "Complementos", label: "Complementos" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Producto</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del producto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="SKU del producto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descripción del producto"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || "sleepwear"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una marca" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sleepwear">Civetta Sleepwear</SelectItem>
                    <SelectItem value="bride">Civetta Bride</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>Producto Activo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Los productos inactivos no serán visibles en las ventas
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            type="button"
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {product ? "Actualizar" : "Crear"} Producto
          </Button>
        </div>
      </form>
    </Form>
  );
}