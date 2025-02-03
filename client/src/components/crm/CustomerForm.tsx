import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCustomerSchema, type Customer } from "@db/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";

export function CustomerForm({
  customer,
  onComplete
}: {
  customer?: Customer;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: customer || {
      name: "",
      email: "",
      phone: "",
      whatsapp: "",
      address: "",
      notes: ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: ReturnType<typeof form.getValues>) => {
      const res = await apiRequest("POST", "/api/customers", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("customers.name")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("customers.email")}</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("customers.phone")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="whatsapp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("customers.whatsapp")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("customers.address")}</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("customers.notes")}</FormLabel>
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
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
