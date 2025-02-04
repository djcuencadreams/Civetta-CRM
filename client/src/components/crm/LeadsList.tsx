
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function LeadsList({ onSelect }) {
  const { data: leads } = useQuery({ queryKey: ["/api/leads"] });

  const funnelStages = {
    new: "bg-blue-500",
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
              <h3 className="font-medium">{lead.firstName} {lead.lastName}</h3>
              <div className="text-sm text-muted-foreground">
                {lead.email} • {lead.phone}
              </div>
            </div>
            <Badge className={funnelStages[lead.status]}>
              {lead.status}
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
