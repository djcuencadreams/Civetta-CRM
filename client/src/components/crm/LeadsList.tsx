import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LeadForm } from "./LeadForm";

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
        <Card key={lead.id} className="p-4 cursor-pointer hover:shadow-md" onClick={() => onSelect(lead)}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{lead.name}</h3>
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
            {lead.customerLifecycleStage && (
              <div>Etapa: {lead.customerLifecycleStage}</div>
            )}
            {lead.notes && (
              <div className="mt-2 text-muted-foreground">{lead.notes}</div>
            )}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Creado: {format(new Date(lead.createdAt), "PPp", { locale: es })}
          </div>
        </Card>
      ))}
    </div>
  );
}