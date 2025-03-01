import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerSearchSelect } from "@/components/crm/CustomerSearchSelect";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, PlusIcon, TrashIcon } from "lucide-react";

// Tipos
interface OrderFormProps {
  order?: Order;
  onClose: () => void;
  onSuccess?: () => void;
}

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
  brand: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
};

type OrderItem = {
  id?: number;
  orderId?: number;
  productId: number | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
};

type Customer = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  price: number;
  brand: string;
};

// Esquema de validación
const orderFormSchema = z.object({
  customerId: z.coerce.number().min(1, { message: "Cliente requerido" }),
  orderNumber: z.string().optional().nullable(),
  totalAmount: z.coerce.number().min(0, { message: "El monto total debe ser mayor o igual a 0" }),
  status: z.string(),
  paymentStatus: z.string(),
  paymentMethod: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  brand: z.string(),
  notes: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.coerce.number().nullable(),
      productName: z.string().min(1, { message: "Nombre del producto requerido" }),
      quantity: z.coerce.number().min(1, { message: "La cantidad debe ser al menos 1" }),
      unitPrice: z.coerce.number().min(0, { message: "El precio unitario debe ser mayor o igual a 0" }),
      discount: z.coerce.number().min(0, { message: "El descuento debe ser mayor o igual a 0" }),
      subtotal: z.coerce.number().min(0, { message: "El subtotal debe ser mayor o igual a 0" }),
    })
  ).min(1, { message: "Debe agregar al menos un producto" }),
});

export function OrderForm({ order, onClose, onSuccess }: OrderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    order?.customerId ? String(order.customerId) : ""
  );

  // Cargar clientes y productos
  const { data: customers = [] as Customer[], isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: products = [] as Product[], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Mutación para crear/actualizar pedido
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof orderFormSchema>) => {
      if (order) {
        return apiRequest("PATCH", `/api/orders/${order.id}`, data);
      } else {
        return apiRequest("POST", "/api/orders", data);
      }
    },
    onSuccess: () => {
      toast({
        title: order ? "Pedido actualizado" : "Pedido creado",
        description: order
          ? "El pedido ha sido actualizado correctamente"
          : "El pedido ha sido creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Error al ${order ? "actualizar" : "crear"} el pedido: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Inicializar formulario
  const form = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: order?.customerId || 0,
      orderNumber: order?.orderNumber || null,
      totalAmount: order?.totalAmount || 0,
      status: order?.status || "new",
      paymentStatus: order?.paymentStatus || "pending",
      paymentMethod: order?.paymentMethod || null,
      source: order?.source || "direct",
      brand: order?.brand || "sleepwear",
      notes: order?.notes || null,
      items: order?.items?.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        subtotal: item.subtotal,
      })) || [
        {
          productId: null,
          productName: "",
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          subtotal: 0,
        }
      ],
    },
  });

  // Control para los items de pedido
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Cuando cambia la selección de cliente
  useEffect(() => {
    if (selectedCustomerId) {
      form.setValue("customerId", parseInt(selectedCustomerId));
    }
  }, [selectedCustomerId, form]);

  // Calcular subtotal automáticamente
  const calculateSubtotal = (index: number) => {
    const quantity = form.getValues(`items.${index}.quantity`);
    const unitPrice = form.getValues(`items.${index}.unitPrice`);
    const discount = form.getValues(`items.${index}.discount`);
    
    const subtotal = quantity * unitPrice - discount;
    form.setValue(`items.${index}.subtotal`, subtotal);
    
    // Actualizar el monto total del pedido
    updateTotalAmount();
  };

  // Actualizar monto total del pedido
  const updateTotalAmount = () => {
    const items = form.getValues("items");
    const total = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    form.setValue("totalAmount", total);
  };

  // Actualizar precio al seleccionar un producto
  const updateProductDetails = (index: number, productId: number | null) => {
    if (!productId) return;
    
    const product = products.find((p: Product) => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.productName`, product.name);
      form.setValue(`items.${index}.unitPrice`, product.price);
      calculateSubtotal(index);
    }
  };

  // Enviar formulario
  const onSubmit = (data: z.infer<typeof orderFormSchema>) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Selección de cliente */}
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Cliente</FormLabel>
                <FormControl>
                  <CustomerSearchSelect
                    customers={customers as any[]}
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    isLoading={isLoadingCustomers}
                    placeholder="Selecciona un cliente..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Número de pedido */}
          <FormField
            control={form.control}
            name="orderNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de pedido</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Automático" 
                    {...field} 
                    value={field.value || ""} 
                  />
                </FormControl>
                <FormDescription>
                  Opcional, se genera automáticamente
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estado */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="new">Nuevo</SelectItem>
                    <SelectItem value="preparing">Preparando</SelectItem>
                    <SelectItem value="shipped">Enviado</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Estado de pago */}
          <FormField
            control={form.control}
            name="paymentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado de pago</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado de pago" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="refunded">Reembolsado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Método de pago */}
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de pago</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un método de pago" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Origen */}
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origen</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || "direct"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un origen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="direct">Directo</SelectItem>
                    <SelectItem value="woocommerce">WooCommerce</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Marca */}
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

          {/* Notas */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Notas</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Notas adicionales sobre el pedido..."
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Items del pedido */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Productos</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({
                  productId: null,
                  productName: "",
                  quantity: 1,
                  unitPrice: 0,
                  discount: 0,
                  subtotal: 0,
                })
              }
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          </div>

          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Producto */}
                  <div className="col-span-2 md:col-span-1">
                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Producto</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value ? parseInt(value) : null);
                              updateProductDetails(index, value ? parseInt(value) : null);
                            }}
                            value={field.value?.toString() || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona un producto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingProducts ? (
                                <div className="flex items-center justify-center p-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                </div>
                              ) : (
                                products.map((product: Product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name} ({product.sku})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Nombre del producto (personalizado) */}
                  <div className="col-span-2 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.productName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nombre o descripción del producto"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Cantidad */}
                  <div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                calculateSubtotal(index);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Precio unitario */}
                  <div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio unitario</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                calculateSubtotal(index);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Descuento */}
                  <div>
                    <FormField
                      control={form.control}
                      name={`items.${index}.discount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descuento</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                calculateSubtotal(index);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Subtotal (calculado automáticamente) */}
                  <div className="relative">
                    <FormField
                      control={form.control}
                      name={`items.${index}.subtotal`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subtotal</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              readOnly
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-1 right-0"
                        onClick={() => {
                          remove(index);
                          // Actualizar el total después de eliminar un item
                          setTimeout(() => updateTotalAmount(), 0);
                        }}
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Total del pedido */}
        <FormField
          control={form.control}
          name="totalAmount"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel className="text-lg font-bold">Total del Pedido</FormLabel>
                <div className="text-xl font-bold">
                  {new Intl.NumberFormat("es-ES", {
                    style: "currency",
                    currency: "USD",
                  }).format(field.value)}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botones */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {order ? "Actualizar Pedido" : "Crear Pedido"}
          </Button>
        </div>
      </form>
    </Form>
  );
}