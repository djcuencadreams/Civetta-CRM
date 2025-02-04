
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function LeadForm({ lead = {}, onClose }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: lead || {}
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/leads", {
        method: lead.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      onClose();
    }
  });

  const leadSources = ["Website", "Referral", "Social Media", "Email", "Other"];
  const leadStatuses = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
        <div className="space-y-4">
          <Input {...register("name")} placeholder="Nombre" />
          <Input {...register("email")} type="email" placeholder="Correo" />
          <Input {...register("phone")} placeholder="Teléfono" />
          
          <Select defaultValue={lead?.source} onValueChange={(v) => setValue("source", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Origen" />
            </SelectTrigger>
            <SelectContent>
              {leadSources.map(source => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select defaultValue={lead?.status} onValueChange={(v) => setValue("status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {leadStatuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea {...register("notes")} placeholder="Notas" />
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
