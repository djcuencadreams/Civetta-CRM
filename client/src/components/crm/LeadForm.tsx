
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";

const leadSources = ["Website", "Referral", "Social Media", "Email", "Cold Call", "Event", "Other"];
const leadStatuses = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];

export function LeadForm({ lead = {}, onClose }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      firstName: lead?.firstName || "",
      lastName: lead?.lastName || "",
      email: lead?.email || "",
      phone: lead?.phone || "",
      source: lead?.source || "",
      status: lead?.status || "new",
      notes: lead?.notes || "",
      lastContact: lead?.lastContact ? new Date(lead.lastContact) : null,
      nextFollowUp: lead?.nextFollowUp ? new Date(lead.nextFollowUp) : null,
    }
  });

  const mutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch("/api/leads", {
        method: lead?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead?.id,
          ...data,
          name: `${data.firstName} ${data.lastName}`.trim()
        })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      onClose();
    }
  });

  return (
    <form onSubmit={handleSubmit((data) => {
      if (mutation.isPending) return;
      mutation.mutate(data);
    })} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input {...register("firstName")} placeholder="Nombres" />
        <Input {...register("lastName")} placeholder="Apellidos" />
      </div>

      <Input {...register("email")} type="email" placeholder="Correo" />
      <Input {...register("phone")} placeholder="Teléfono" />

      <Select defaultValue={watch("source")} onValueChange={(v) => setValue("source", v)}>
        <SelectTrigger>
          <SelectValue placeholder="Fuente" />
        </SelectTrigger>
        <SelectContent>
          {leadSources.map(source => (
            <SelectItem key={source} value={source}>{source}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select defaultValue={watch("status")} onValueChange={(v) => setValue("status", v)}>
        <SelectTrigger>
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          {leadStatuses.map(status => (
            <SelectItem key={status} value={status}>{status}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Último Contacto</label>
          <DatePicker
            value={watch("lastContact")}
            onChange={(date) => setValue("lastContact", date)}
          />
        </div>
        <div>
          <label className="text-sm">Próximo Seguimiento</label>
          <DatePicker
            value={watch("nextFollowUp")}
            onChange={(date) => setValue("nextFollowUp", date)}
          />
        </div>
      </div>

      <Textarea {...register("notes")} placeholder="Notas" />
      
      <div className="flex justify-between gap-2">
        {lead?.id && (
          <Button 
            variant="destructive" 
            onClick={async () => {
              if (confirm('¿Estás seguro de eliminar este lead?')) {
                await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
                queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
                onClose();
              }
            }}
          >
            Eliminar
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </form>
  );
}
