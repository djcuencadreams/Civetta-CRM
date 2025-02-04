import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast"
import { type Lead } from "@db/schema";

interface LeadsListProps {
  onSelect: (lead: Lead) => void;
}

export function LeadsList({ onSelect }: LeadsListProps) {
  const { data: leads, isLoading, isError, error } = useQuery<Lead[]>({ 
    queryKey: ["/api/leads"],
    staleTime: 0,
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const funnelStages = {
    new: "bg-blue-500",
    contacted: "bg-purple-500",
    qualified: "bg-indigo-500",
    proposal: "bg-pink-500",
    negotiation: "bg-orange-500",
    won: "bg-green-500",
    lost: "bg-red-500"
  } as const;

  const stageLabels = {
    new: "Nuevo",
    contacted: "Contactado",
    qualified: "Calificado",
    proposal: "Propuesta",
    negotiation: "Negociación",
    won: "Ganado",
    lost: "Perdido"
  } as const;

  if (isLoading) return <div>Cargando leads...</div>;

  if (isError) {
    console.error('Leads fetch error:', error);
    toast({
      title: "Error al cargar leads",
      description: error instanceof Error ? error.message : "No se pudieron cargar los leads. Por favor, intente nuevamente.",
      variant: "destructive",
    });
    return <div className="p-4 text-red-500">Error al cargar leads</div>;
  }

  const activeLeads = leads?.filter(lead => !lead.convertedToCustomer) ?? [];

  if (activeLeads.length === 0) {
    return <div className="text-center p-4">No hay leads activos</div>;
  }

  return (
    <div className="grid gap-4">
      {activeLeads.map(lead => (
        <Card 
          key={lead.id} 
          className="p-4 cursor-pointer hover:shadow-md transition-shadow" 
          onClick={() => onSelect(lead)}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{lead.name}</h3>
              <div className="text-sm text-muted-foreground">
                {lead.email && <span>{lead.email} • </span>}
                {lead.phoneNumber}
              </div>
            </div>
            <Badge className={funnelStages[lead.status as keyof typeof funnelStages] || "bg-gray-500"}>
              {stageLabels[lead.status as keyof typeof stageLabels] || lead.status}
            </Badge>
          </div>
          <div className="mt-2 text-sm space-y-1">
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