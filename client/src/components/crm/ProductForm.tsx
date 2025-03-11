import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "../../hooks/use-is-mobile";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Loader2, Plus, Trash, Settings2, Info as InfoIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert";

// Define el tipo de categoría
type Category = {
  id: number;
  name: string;
  brand: string | null;
};

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
  category_id: number | null;
  woocommerce_id: number | null;
  woocommerce_parent_id: number | null;
  product_type: string | null;
  attributes: Record<string, any> | null;
  images: any[] | null;
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
  category_id: z.coerce.number().nullable().optional(),
  product_type: z.string().default("simple"),
  woocommerce_parent_id: z.coerce.number().nullable().optional(),
  // Atributos para manejo especial
  talla: z.string().optional(),
  color: z.string().optional(),
  // Otros atributos se manejarán como objeto JSON
  attributes: z.record(z.string(), z.any()).optional(),
});

// Componente de formulario para productos
export function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productType, setProductType] = useState(product?.product_type || "simple");
  const [parentProducts, setParentProducts] = useState<Product[]>([]);
  const isMobile = useIsMobile();

  // Obtener categorías de productos
  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/categories");
      return response as Category[];
    },
    staleTime: 60000, // 1 minuto de caché
  });
  
  // Asegurarse de que categories sea siempre un array
  const categories = Array.isArray(categoriesData) ? categoriesData : [];

  // Obtener productos padre (tipo variable) para selección de variantes
  const { data: allProductsData } = useQuery<Product[]>({
    queryKey: ["/api/products", "variables"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/products?type=variable");
      return response as Product[];
    },
    staleTime: 60000, // 1 minuto de caché
    enabled: productType === "variation", // Solo ejecutar si es una variante
  });
  
  // Asegurarse de que allProducts sea siempre un array
  const allProducts = Array.isArray(allProductsData) ? allProductsData : [];

  // Filtrar productos padre cuando cambie la lista
  useEffect(() => {
    if (productType === "variation" && allProducts.length > 0) {
      // Filtrar solo productos variables (que pueden tener variantes)
      const variables = allProducts.filter(p => p.product_type === "variable");
      setParentProducts(variables);
    }
  }, [allProducts, productType]);

  // Extraer atributos del producto si existen
  const extractAttributes = (product?: Product) => {
    if (!product || !product.attributes) return { talla: "", color: "" };
    
    let attributes = {};
    
    try {
      const attrs = typeof product.attributes === 'string' 
        ? JSON.parse(product.attributes) 
        : product.attributes;
      
      // Buscar atributos de talla y color con las diferentes grafías que pueden tener
      const talla = attrs.Talla || attrs.Tallas || attrs.talla || attrs.tallas || "";
      const color = attrs.Color || attrs.Colores || attrs.color || attrs.colores || "";
      
      return { talla, color };
    } catch (e) {
      console.error("Error al parsear atributos:", e);
      return { talla: "", color: "" };
    }
  };

  const { talla, color } = extractAttributes(product);

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
      category_id: product?.category_id || null,
      product_type: product?.product_type || "simple",
      woocommerce_parent_id: product?.woocommerce_parent_id || null,
      talla: talla || "",
      color: color || "",
      attributes: product?.attributes || {},
    },
  });

  // Manejar cambio en el tipo de producto
  const handleProductTypeChange = (type: string) => {
    setProductType(type);
    form.setValue("product_type", type);
  };

  // Mutación para crear o actualizar producto
  const productMutation = useMutation({
    mutationFn: async (values: z.infer<typeof productSchema>) => {
      // Preparar los atributos para enviar al servidor
      const attributes: Record<string, any> = { ...values.attributes } || {};
      
      // Añadir talla y color a los atributos si existen
      if (values.talla) {
        attributes["Talla"] = values.talla;
      }
      
      if (values.color) {
        attributes["Color"] = values.color;
      }
      
      // Crear copia sin los campos personalizados
      const { talla, color, ...restValues } = values;
      
      // Preparar datos finales
      const finalData = {
        ...restValues,
        attributes
      };
      
      if (product) {
        // Actualizar producto existente
        return await apiRequest("PATCH", `/api/products/${product.id}`, finalData);
      } else {
        // Crear nuevo producto
        return await apiRequest("POST", "/api/products", finalData);
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

  // Lista de tallas y colores comunes
  const tallasDisponibles = [
    { value: "S", label: "S" },
    { value: "M", label: "M" },
    { value: "L", label: "L" },
    { value: "XL", label: "XL" },
    { value: "XXL", label: "XXL" },
    { value: "Única", label: "Única" }
  ];

  const coloresDisponibles = [
    { value: "Negro", label: "Negro" },
    { value: "Blanco", label: "Blanco" },
    { value: "Menta", label: "Menta" },
    { value: "Salmón", label: "Salmón" },
    { value: "Verde Esmeralda", label: "Verde Esmeralda" },
    { value: "Azul", label: "Azul" },
    { value: "Rojo", label: "Rojo" },
    { value: "Rosa", label: "Rosa" },
    { value: "Morado", label: "Morado" },
    { value: "Amarillo", label: "Amarillo" }
  ];

  // Determinar si el producto tiene variaciones
  const tieneVariaciones = productType === "variable" || form.getValues("product_type") === "variable";

  // Componente para mostrar las categorías como badge
  const CategoryBadge = ({ categoryId }: { categoryId: number | null }) => {
    if (!categoryId) return <Badge variant="outline">Sin categoría</Badge>;
    
    const category = categories.find(c => c.id === categoryId);
    return (
      <Badge variant="secondary">{category?.name || `Categoría ${categoryId}`}</Badge>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex flex-row items-center justify-between rounded-lg border p-3 mb-4">
          <div className="space-y-0.5">
            <FormLabel>Producto con Variaciones</FormLabel>
            <div className="text-sm text-muted-foreground">
              Habilitar si este producto tiene variaciones de talla, color u otros atributos
            </div>
          </div>
          <Switch
            checked={tieneVariaciones}
            onCheckedChange={(checked) => {
              // Al cambiar este switch, actualizamos el tipo de producto internamente
              const newType = checked ? "variable" : "simple";
              setProductType(newType);
              form.setValue("product_type", newType);
              
              // Si es un producto con variaciones, los atributos son importantes
              if (checked) {
                // Asegurarse que tenga valores para talla y color para facilitar las variaciones
                if (!form.getValues("talla")) {
                  form.setValue("talla", "S, M, L, XL");
                }
                if (!form.getValues("color")) {
                  form.setValue("color", "Negro, Blanco");
                }
              }
            }}
          />
        </div>
        
        {/* Campo oculto que mantiene el tipo de producto para compatibilidad */}
        <input type="hidden" {...form.register("product_type")} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Nombre del Producto</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del producto" className="w-full" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input placeholder="SKU del producto" className="w-full" {...field} />
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
            <FormItem className="w-full">
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descripción del producto"
                  className="w-full"
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
              <FormItem className="w-full">
                <FormLabel>Precio</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full"
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
              <FormItem className="w-full">
                <FormLabel>Stock</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    className="w-full"
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
              <FormItem className="w-full">
                <FormLabel>Marca</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || "sleepwear"}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
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
            name="category_id"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>Categoría</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  defaultValue={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona una categoría">
                        {field.value && <CategoryBadge categoryId={field.value} />}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">Sin categoría</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Sección de atributos */}
        <div className="mb-4">
          <div className={`rounded-lg border p-3 ${tieneVariaciones ? 'bg-blue-50 dark:bg-blue-950' : ''}`}>
            <h3 className="text-lg font-semibold flex items-center mb-2">
              <Settings2 className="h-5 w-5 mr-2" />
              Atributos del Producto
              {tieneVariaciones && (
                <Badge variant="outline" className="ml-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Necesarios para variaciones
                </Badge>
              )}
            </h3>
            
            {tieneVariaciones && (
              <p className="text-sm text-muted-foreground mb-4">
                Para productos con variaciones, definir atributos como talla y color es esencial. Estos atributos 
                se usarán para crear las variaciones en WooCommerce.
              </p>
            )}
            
            <div className="space-y-4 py-2">
              {/* Talla y color son manejados especialmente porque son los más comunes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="talla"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Talla</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona la talla" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sin talla</SelectItem>
                          {tallasDisponibles.map((talla) => (
                            <SelectItem key={talla.value} value={talla.value}>
                              {talla.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Color</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona el color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sin color</SelectItem>
                          {coloresDisponibles.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              {color.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {tieneVariaciones && (
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>Formato para múltiples valores</AlertTitle>
                  <AlertDescription>
                    Para productos variables, puedes especificar múltiples valores separados por comas.
                    Por ejemplo: "S, M, L, XL" para tallas o "Negro, Blanco, Rojo" para colores.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
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

        <div className="flex flex-col-reverse md:flex-row space-y-2 space-y-reverse md:space-y-0 md:justify-end md:space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            type="button"
            disabled={isSubmitting}
            className="w-full md:w-auto mt-2 md:mt-0"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full md:w-auto"
          >
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