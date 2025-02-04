
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function LeadsList({ onSelect }) {
  const { data: leads } = useQuery({ 
    queryKey: ["/api/leads"],
    select: (data) => data?.map(lead => ({
      ...lead,
      created_at: new Date(lead.created_at),
      updated_at: new Date(lead.updated_at),
      last_contact: lead.last_contact ? new Date(lead.last_contact) : null,
      next_follow_up: lead.next_follow_up ? new Date(lead.next_follow_up) : null
    }))
  });

  const funnelStages = {
    new: "bg-blue-500",
    contacted: "bg-purple-500",
    qualified: "bg-indigo-500",
    proposal: "bg-pink-500",
    negotiation: "bg-orange-500",
    won: "bg-green-500",
    lost: "bg-red-500"
  };

  const stageLabels = {
    new: "Nuevo",
    contacted: "Contactado",
    qualified: "Calificado",
    proposal: "Propuesta",
    negotiation: "Negociación",
    won: "Ganado",
    lost: "Perdido"
  };
    contacted: "bg-yellow-500", 
    qualified: "bg-purple-500",
    proposal: "bg-orange-500",
    negotiation: "bg-pink-500",
    won: "bg-green-500",
    lost: "bg-red-500"
  };

  return (
    <div className="grid gap-4">
      {leads?.map(lead => (
        <Card 
          key={lead.id} 
          className="p-4 cursor-pointer hover:shadow-md" 
          onClick={() => onSelect && onSelect(lead)}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{lead.name}</h3>
              <div className="text-sm text-muted-foreground">
                {lead.email} • {lead.phone}
              </div>
            </div>
            <Badge className={funnelStages[lead.status] || "bg-gray-500"}>
              {stageLabels[lead.status] || lead.status}
            </Badge>
          </div>
          <div className="mt-2 text-sm space-y-1">
            <div>Fuente: {lead.source}</div>
            {lead.lastContact && (
              <div>Último contacto: {format(new Date(lead.lastContact), "PPp", { locale: es })}</div>
            )}
            {lead.nextFollowUp && (
              <div>Próximo seguimiento: {format(new Date(lead.nextFollowUp), "PPp", { locale: es })}</div>
            )}
            {lead.notes && (
              <div className="mt-2 text-muted-foreground">{lead.notes}</div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
