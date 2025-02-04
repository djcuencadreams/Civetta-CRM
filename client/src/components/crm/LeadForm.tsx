
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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

export function LeadForm({
  lead,
  onClose
}: {
  lead?: any;
  onClose: () => void;
}) {
  const [isViewMode, setIsViewMode] = useState(!!lead);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: lead || {
      name: "",
      email: "",
      phone: "",
      source: "",
      notes: ""
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest(lead ? "PUT" : "POST", `/api/leads${lead ? `/${lead.id}` : ''}`, values);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead saved successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error saving lead",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!lead?.id) return;
      const res = await apiRequest("DELETE", `/api/leads/${lead.id}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead deleted successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error deleting lead",
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
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} readOnly={isViewMode} />
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} type="email" readOnly={isViewMode} />
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
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input {...field} readOnly={isViewMode} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source</FormLabel>
              <FormControl>
                <Input {...field} readOnly={isViewMode} />
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
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} readOnly={isViewMode} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          {lead && (
            <>
              {isViewMode ? (
                <Button type="button" onClick={() => setIsViewMode(false)}>
                  Edit Lead
                </Button>
              ) : (
                <Button type="button" onClick={() => setIsViewMode(true)}>
                  View Lead
                </Button>
              )}
              <Button 
                type="button" 
                onClick={() => deleteMutation.mutate()} 
                disabled={deleteMutation.isPending}
                variant="destructive"
              >
                Delete Lead
              </Button>
            </>
          )}
          {!isViewMode && (
            <Button type="submit" disabled={mutation.isPending}>
              Save
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
