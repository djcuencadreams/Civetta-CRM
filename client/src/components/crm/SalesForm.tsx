import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSaleSchema, type Customer, brandEnum } from "@db/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const paymentMethods = [
  { id: "efectivo", name: "Efectivo" },
  { id: "tarjeta", name: "Tarjeta de Crédito/Débito" },
  { id: "transferencia", name: "Transferencia Bancaria" },
  { id: "payphone", name: "Payphone" },
  { id: "paypal", name: "Paypal" },
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
  onComplete
}: {
  onComplete: () => void;
}) {
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>(brandEnum.SLEEPWEAR);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers, isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: getQueryFn({ on401: "throw" })
  });

  const form = useForm({
    defaultValues: {
      customerId: "",
      products: [{ name: "", category: "", amount: "", quantity: "1", brand: brandEnum.SLEEPWEAR }],
      paymentMethod: "efectivo",
      notes: ""
      // Brand is now stored at product level
    },
    resolver: zodResolver(insertSaleSchema)
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products"
  });

  // Update default brand for new products when customer changes
  useEffect(() => {
    const customerId = form.watch("customerId");
    if (customerId && customers) {
      const customer = customers.find(c => c.id === parseInt(customerId));
      if (customer && customer.brand) {
        // Set the brand for future product additions
        const customerBrand = customer.brand as typeof brandEnum.SLEEPWEAR;
        setSelectedBrand(customerBrand);
      }
    }
  }, [form.watch("customerId"), customers, form]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const customerId = parseInt(values.customerId, 10);
      if (!customerId || isNaN(customerId)) {
        throw new Error("Debe seleccionar un cliente válido");
      }

      if (!values.products?.length) {
        throw new Error("Debe agregar al menos un producto");
      }

      const totalAmount = values.products.reduce(
        (sum: number, product: any) => {
          const amount = Number(product.amount);
          const quantity = Number(product.quantity);

          if (isNaN(amount) || isNaN(quantity) || amount < 0 || quantity < 1) {
            throw new Error("Los valores de precio y cantidad deben ser números válidos");
          }
          if (!product.name?.trim()) {
            throw new Error("El nombre del producto es requerido");
          }
          if (!product.category?.trim()) {
            throw new Error("La categoría del producto es requerida");
          }

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
      
      const saleData = {
        customerId,
        amount: totalAmount,
        status: "completed",
        paymentMethod: values.paymentMethod,
        brand: dominantBrand, // The sale is recorded with the dominant brand
        notes: values.products.map((p: any) => 
          `${p.name} (${p.category}) - $${p.amount} x ${p.quantity} - ${getBrandDisplayName(p.brand)}`
        ).join("\n") + (values.notes ? `\n\nNotas: ${values.notes}` : "")
      };

      const res = await apiRequest("POST", "/api/sales", saleData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear la venta");
      }
      return res.json();
    },
    onSuccess: (data) => {
      console.log('Sale created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ 
        title: "Venta guardada",
        description: "La venta se ha registrado correctamente"
      });
      onComplete();
    },
    onError: (error: Error) => {
      console.error('Sale submission error:', error);
      toast({ 
        title: "Error al guardar la venta",
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

  // Get brand display name
  const getBrandDisplayName = (brandValue: string) => {
    return brandValue === brandEnum.BRIDE ? "Civetta Bride" : "Civetta Sleepwear";
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => {
          mutation.mutate(data, {
            onSuccess: () => {
              onComplete();
            },
            onError: (error: Error) => {
              toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
              });
            }
          });
        })} className="space-y-4">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <div className="flex gap-2">
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} ({getBrandDisplayName(customer.brand || brandEnum.SLEEPWEAR)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            onClick={() => append({ name: "", category: "", amount: "", quantity: "1", brand: selectedBrand })}
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
              Guardar
            </Button>
          </div>
        </form>
      </Form>

      <Dialog open={showNewCustomer} onOpenChange={setShowNewCustomer}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
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