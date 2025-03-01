import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Customer, type Sale, brandEnum } from "@db/schema";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CustomerForm } from "./CustomerForm";
import { CustomerSearchSelect } from "./CustomerSearchSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const paymentMethods = [
  { id: "transferencia", name: "Transferencia Bancaria" },
  { id: "tarjeta", name: "Tarjeta de Crédito / Débito" },
  { id: "efectivo", name: "Efectivo" },
  { id: "payphone", name: "PayPhone" },
  { id: "paypal", name: "PayPal" },
  { id: "canje", name: "Canje" },
  { id: "cripto", name: "Cripto" },
  { id: "otros", name: "Otros" }
];

// Product categories by brand
const productCategoriesByBrand = {
  [brandEnum.SLEEPWEAR]: [
    "Pijamas",
    "Ropa Interior",
    "Batas",
    "Conjuntos",
    "Accesorios"
  ],
  [brandEnum.BRIDE]: [
    "Velos",
    "Tocados",
    "Accesorios de Cabello",
    "Joyería",
    "Ligas"
  ]
};

export function SalesForm({
  onComplete,
  sale
}: {
  onComplete: () => void;
  sale?: Sale;
}) {
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<typeof brandEnum.SLEEPWEAR>(brandEnum.SLEEPWEAR);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers, isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Función para extraer productos desde las notas de la venta
  function parseProductsFromSaleNotes(notes: string): Array<{ 
    name: string; 
    category: string; 
    amount: string; 
    quantity: string;
    brand: string;
  }> {
    if (!notes) return [{ name: "", category: "", amount: "", quantity: "1", brand: brandEnum.SLEEPWEAR }];
    
    const products: Array<{ name: string; category: string; amount: string; quantity: string; brand: string }> = [];
    const lines = notes.split('\n');
    
    for (const line of lines) {
      // Si la línea es un cambio de estado o notas, ignorarla
      if (line.includes('Cambio de estado') || line.startsWith('Notas:')) continue;
      
      // Formato esperado: "Producto (Categoría) - $X.XX x Y - Marca"
      const match = line.match(/^(.+) \((.+)\) - \$([0-9.]+) x ([0-9]+) - (.+)$/);
      if (match) {
        const [_, name, category, amount, quantity, brandName] = match;
        const brand = brandName.includes("Bride") ? brandEnum.BRIDE : brandEnum.SLEEPWEAR;
        
        products.push({
          name,
          category,
          amount,
          quantity,
          brand
        });
      }
    }
    
    // Si no se encontraron productos, devolver un producto vacío
    return products.length > 0 ? products : [{ name: "", category: "", amount: "", quantity: "1", brand: brandEnum.SLEEPWEAR }];
  }
  
  // Función para extraer notas personalizadas
  function extractCustomNotesFromSale(notes: string): string {
    const notesMatch = notes.match(/Notas: (.+)/);
    return notesMatch ? notesMatch[1] : "";
  }

  // Definimos un schema personalizado para el formulario
  const productSchema = z.object({
    name: z.string().min(1, "El nombre del producto es requerido"),
    category: z.string().min(1, "La categoría es requerida"),
    amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "El precio debe ser un número mayor que cero"),
    quantity: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 1, "La cantidad debe ser un número mayor o igual a 1"),
    brand: z.string().default(brandEnum.SLEEPWEAR)
  });

  const formSchema = z.object({
    customerId: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, "Debe seleccionar un cliente"),
    products: z.array(productSchema).min(1, "Debe agregar al menos un producto"),
    paymentMethod: z.string(),
    notes: z.string().optional()
  });

  // Inicialización de valores por defecto, con soporte para edición
  const form = useForm({
    defaultValues: sale ? {
      customerId: sale.customerId.toString(),
      products: parseProductsFromSaleNotes(sale.notes || ""),
      paymentMethod: sale.paymentMethod || "transferencia",
      notes: extractCustomNotesFromSale(sale.notes || "")
    } : {
      customerId: "",
      products: [{ name: "", category: "", amount: "", quantity: "1", brand: brandEnum.SLEEPWEAR }],
      paymentMethod: "transferencia",
      notes: ""
    },
    resolver: zodResolver(formSchema)
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products"
  });

  // Update default brand for new products when customer changes
  useEffect(() => {
    const customerId = form.watch("customerId");
    if (customerId && customers) {
      const customerIdNum = parseInt(customerId, 10);
      const customer = customers.find(c => c.id === customerIdNum);
      if (customer && customer.brand) {
        // Set the brand for future product additions
        const customerBrand = customer.brand as typeof brandEnum.SLEEPWEAR;
        setSelectedBrand(customerBrand);
      }
    }
  }, [form.watch("customerId"), customers, form]);

  // Get brand display name
  const getBrandDisplayName = (brandValue: string) => {
    return brandValue === brandEnum.BRIDE ? "Civetta Bride" : "Civetta Sleepwear";
  };

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      // Mostrar todos los valores recibidos para depuración
      console.log("Valores del formulario:", values);
      
      const customerId = parseInt(values.customerId, 10);
      if (!customerId || isNaN(customerId)) {
        throw new Error("Debe seleccionar un cliente válido");
      }

      if (!values.products?.length) {
        throw new Error("Debe agregar al menos un producto");
      }

      // Validaciones más estrictas para cada producto
      for (const product of values.products) {
        if (!product.name?.trim()) {
          throw new Error("Todos los productos deben tener un nombre");
        }
        if (!product.category?.trim()) {
          throw new Error("Todos los productos deben tener una categoría");
        }
        const amount = Number(product.amount);
        const quantity = Number(product.quantity);
        if (isNaN(amount) || amount <= 0) {
          throw new Error(`El precio del producto "${product.name}" debe ser un número mayor que cero`);
        }
        if (isNaN(quantity) || quantity < 1) {
          throw new Error(`La cantidad del producto "${product.name}" debe ser al menos 1`);
        }
      }

      // Calcular el monto total con precisión
      const totalAmount = values.products.reduce(
        (sum: number, product: any) => {
          const amount = Number(product.amount);
          const quantity = Number(product.quantity);
          return sum + (amount * quantity);
        }, 0
      );

      // Calculate brand distribution for analytics
      const brandCounts = values.products.reduce((acc: Record<string, number>, p: any) => {
        const brand = p.brand || brandEnum.SLEEPWEAR;
        acc[brand] = (acc[brand] || 0) + (Number(p.amount) * Number(p.quantity));
        return acc;
      }, {} as Record<string, number>);
      
      // Set the dominant brand (the one with highest total value)
      const dominantBrand = Object.entries(brandCounts).reduce(
        (max: {brand: string, amount: number}, [brand, amount]) => {
          const numAmount = typeof amount === 'number' ? amount : 0;
          return numAmount > max.amount ? { brand, amount: numAmount } : max;
        }, 
        { brand: brandEnum.SLEEPWEAR, amount: 0 }
      ).brand;
      
      // Crear el objeto de datos de venta que coincide exactamente con el schema
      const saleData = {
        customerId,
        amount: Number(totalAmount.toFixed(2)), // Asegurar que es un número con 2 decimales
        status: sale ? sale.status : "new", // Mantener el estado si es edición, nuevo si es creación
        paymentMethod: values.paymentMethod,
        brand: dominantBrand, // The sale is recorded with the dominant brand
        notes: values.products.map((p: any) => 
          `${p.name} (${p.category}) - $${p.amount} x ${p.quantity} - ${getBrandDisplayName(p.brand)}`
        ).join("\n") + (values.notes ? `\n\nNotas: ${values.notes}` : "")
      };

      console.log("Datos a enviar a la API:", saleData);

      // Si es edición (sale existe), hacer PATCH; si es nueva, hacer POST
      const endpoint = sale ? `/api/sales/${sale.id}` : "/api/sales";
      const method = sale ? "PATCH" : "POST";
      
      try {
        const res = await apiRequest(method, endpoint, saleData);
        if (!res.ok) {
          const errorData = await res.json();
          console.error("Error respuesta API:", errorData);
          throw new Error(errorData.error || `Error al ${sale ? 'actualizar' : 'crear'} la venta`);
        }
        return res.json();
      } catch (error) {
        console.error("Error en la mutación:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log(`Sale ${sale ? 'updated' : 'created'} successfully:`, data);
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ 
        title: `Venta ${sale ? 'actualizada' : 'guardada'}`,
        description: `La venta se ha ${sale ? 'actualizado' : 'registrado'} correctamente`
      });
      onComplete();
    },
    onError: (error: Error) => {
      console.error('Sale submission error:', error);
      toast({ 
        title: `Error al ${sale ? 'actualizar' : 'guardar'} la venta`,
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (isLoadingCustomers) {
    return <div>Cargando clientes...</div>;
  }

  // Get product categories based on selected brand
  const productCategories = productCategoriesByBrand[selectedBrand as keyof typeof productCategoriesByBrand] || 
                           productCategoriesByBrand[brandEnum.SLEEPWEAR];

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => {
          console.log("Enviando datos:", data);
          console.log("Errores de formulario:", form.formState.errors);
          mutation.mutate(data);
        })} className="space-y-4">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FormControl>
                      <CustomerSearchSelect
                        customers={customers || []}
                        value={field.value?.toString()}
                        onChange={(value) => field.onChange(value)}
                        isLoading={isLoadingCustomers}
                        placeholder="Buscar y seleccionar cliente..."
                        className="w-full"
                      />
                    </FormControl>
                  </div>
                  <Button type="button" onClick={() => setShowNewCustomer(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="p-3 bg-muted rounded-md">
            <h3 className="text-sm font-medium">Preferencia de marca del cliente: {getBrandDisplayName(selectedBrand)}</h3>
            <p className="text-xs text-muted-foreground">Los productos se añadirán con esta marca por defecto, pero puedes cambiarla en cada producto</p>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="space-y-4 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Producto {index + 1}</h4>
                {index > 0 && (
                  <Button type="button" variant="ghost" onClick={() => remove(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`products.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Producto</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`products.${index}.brand`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar marca" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={brandEnum.SLEEPWEAR}>Civetta Sleepwear</SelectItem>
                          <SelectItem value={brandEnum.BRIDE}>Civetta Bride</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`products.${index}.category`}
                  render={({ field }) => {
                    // Get product categories based on this product's brand
                    const productBrand = form.watch(`products.${index}.brand`) || brandEnum.SLEEPWEAR;
                    const categories = productCategoriesByBrand[productBrand as keyof typeof productCategoriesByBrand] || 
                                      productCategoriesByBrand[brandEnum.SLEEPWEAR];
                    
                    return (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name={`products.${index}.amount`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          {...field} 
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || Number(value) >= 0) {
                              field.onChange(value);
                              // Forzar actualización de la vista cuando cambia el precio
                              form.trigger(`products.${index}.amount`);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`products.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || Number(value) >= 1) {
                              field.onChange(value);
                              // Forzar actualización de la vista cuando cambia la cantidad
                              form.trigger(`products.${index}.quantity`);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-2 text-sm font-medium text-right">
                Subtotal: ${(Number(field.amount) * Number(field.quantity)).toFixed(2)}
              </div>
            </div>
          ))}

          <div className="mt-4 text-lg font-medium text-right border-t pt-2">
            Total: ${fields.reduce((sum, field) => sum + (Number(field.amount) * Number(field.quantity)), 0).toFixed(2)}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ 
              name: "", 
              category: "", 
              amount: "", 
              quantity: "1", 
              brand: selectedBrand
            })}
          >
            Agregar Producto
          </Button>

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de Pago</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onComplete}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {sale ? 'Actualizar' : 'Guardar'} Venta
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Agregue un nuevo cliente para asociarlo con esta venta
            </DialogDescription>
          </DialogHeader>
          <CustomerForm onComplete={() => {
            setShowNewCustomer(false);
            queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          }} />
        </DialogContent>
      </Dialog>
    </>
  );
}