
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSaleSchema, type Customer } from "@db/schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
  { id: "yappy", name: "Yappy" },
  { id: "nequi", name: "Nequi" }
];

const productCategories = [
  "Ropa",
  "Accesorios",
  "Calzado",
  "Cosméticos",
  "Joyería",
  "Otros"
];

export function SalesForm({
  onComplete
}: {
  onComplete: () => void;
}) {
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });
  
  const form = useForm({
    defaultValues: {
      customerId: "",
      products: [{ name: "", category: "", amount: "", quantity: "1" }],
      paymentMethod: "efectivo",
      notes: ""
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products"
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const totalAmount = values.products.reduce(
        (sum: number, product: any) => sum + (Number(product.amount) * Number(product.quantity)),
        0
      );

      const saleData = {
        customerId: parseInt(values.customerId),
        amount: totalAmount,
        paymentMethod: values.paymentMethod,
        notes: `${values.products.map((p: any) => 
          `${p.name} (${p.category}) - $${p.amount} x ${p.quantity}`
        ).join("\n")}${values.notes ? `\n\nNotas: ${values.notes}` : ""}`
      };

      const res = await apiRequest("POST", "/api/sales", saleData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      toast({ title: t("common.success") });
      onComplete();
    },
    onError: (error) => {
      toast({ 
        title: t("common.error"),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <div className="flex gap-2">
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name}
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
                  name={`products.${index}.category`}
                  render={({ field }) => (
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
                          {productCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
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
                  name={`products.${index}.amount`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
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
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ name: "", category: "", amount: "", quantity: "1" })}
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
