import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { type Lead } from "@db/schema";
import { useState, useEffect } from "react";
import { getQueryFn } from "@/lib/queryClient";
import { SearchFilterBar, type FilterState } from "./SearchFilterBar";

interface LeadsListProps {
  onSelect: (lead: Lead) => void;
}

export function LeadsList({ onSelect }: LeadsListProps) {
  const { toast } = useToast();
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);

  const { data: leads, isLoading, isError, error } = useQuery<Lead[]>({ 
    queryKey: ["/api/leads"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 0,
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  useEffect(() => {
    if (isError) {
      console.error('Leads fetch error:', error);
      toast({
        title: "Error al cargar leads",
        description: error instanceof Error ? error.message : "No se pudieron cargar los leads. Por favor, intente nuevamente.",
        variant: "destructive",
      });
    }
  }, [isError, error, toast]);

  // Apply filters whenever leads, searchText, or filters change
  useEffect(() => {
    if (!leads) {
      setFilteredLeads([]);
      return;
    }

    // Start with only active leads (not converted to customers)
    let result = leads.filter(lead => !lead.convertedToCustomer);

    // Apply text search across multiple fields
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(lead => {
        return (
          (lead.name && lead.name.toLowerCase().includes(lowerSearch)) ||
          (lead.email && lead.email.toLowerCase().includes(lowerSearch)) ||
          (lead.phone && lead.phone.toLowerCase().includes(lowerSearch)) ||
          (lead.notes && lead.notes.toLowerCase().includes(lowerSearch))
        );
      });
    }

    // Apply advanced filters
    if (filters.status && filters.status !== "all") {
      result = result.filter(lead => lead.status === filters.status);
    }

    if (filters.source && filters.source !== "all") {
      result = result.filter(lead => lead.source === filters.source);
    }

    if (filters.brand && filters.brand !== "all") {
      result = result.filter(lead => lead.brand === filters.brand);
    }

    // Fix for date filters - safely handle all potential value types
    if (filters.lastContactFrom) {
      // Ensure we're working with a single value, not an array
      const filterValue = Array.isArray(filters.lastContactFrom)
        ? filters.lastContactFrom[0]
        : filters.lastContactFrom;

      if (filterValue) {
        // Convert to Date if it's not already
        const fromDate = filterValue instanceof Date
          ? filterValue
          : new Date(String(filterValue));

        if (!isNaN(fromDate.getTime())) {
          result = result.filter(lead => {
            if (!lead.lastContact) return false;
            const lastContactDate = new Date(lead.lastContact);
            return lastContactDate >= fromDate;
          });
        }
      }
    }

    if (filters.lastContactTo) {
      // Ensure we're working with a single value, not an array
      const filterValue = Array.isArray(filters.lastContactTo)
        ? filters.lastContactTo[0]
        : filters.lastContactTo;

      if (filterValue) {
        // Convert to Date if it's not already
        const toDate = filterValue instanceof Date
          ? filterValue
          : new Date(String(filterValue));

        if (!isNaN(toDate.getTime())) {
          result = result.filter(lead => {
            if (!lead.lastContact) return false;
            const lastContactDate = new Date(lead.lastContact);
            return lastContactDate <= toDate;
          });
        }
      }
    }

    if (filters.nextFollowUpFrom) {
      // Ensure we're working with a single value, not an array
      const filterValue = Array.isArray(filters.nextFollowUpFrom)
        ? filters.nextFollowUpFrom[0]
        : filters.nextFollowUpFrom;

      if (filterValue) {
        // Convert to Date if it's not already
        const fromDate = filterValue instanceof Date
          ? filterValue
          : new Date(String(filterValue));

        if (!isNaN(fromDate.getTime())) {
          result = result.filter(lead => {
            if (!lead.nextFollowUp) return false;
            const nextFollowUpDate = new Date(lead.nextFollowUp);
            return nextFollowUpDate >= fromDate;
          });
        }
      }
    }

    if (filters.nextFollowUpTo) {
      // Ensure we're working with a single value, not an array
      const filterValue = Array.isArray(filters.nextFollowUpTo)
        ? filters.nextFollowUpTo[0]
        : filters.nextFollowUpTo;

      if (filterValue) {
        // Convert to Date if it's not already
        const toDate = filterValue instanceof Date
          ? filterValue
          : new Date(String(filterValue));

        if (!isNaN(toDate.getTime())) {
          result = result.filter(lead => {
            if (!lead.nextFollowUp) return false;
            const nextFollowUpDate = new Date(lead.nextFollowUp);
            return nextFollowUpDate <= toDate;
          });
        }
      }
    }

    setFilteredLeads(result);
  }, [leads, searchText, filters]);

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

  const leadFilterOptions = [
    {
      id: "status",
      label: "Estado",
      type: "select" as const,
      options: Object.entries(stageLabels).map(([value, label]) => ({
        value,
        label,
      })),
    },
    {
      id: "source",
      label: "Fuente",
      type: "select" as const,
      options: [
        { value: "instagram", label: "Instagram" },
        { value: "facebook", label: "Facebook" },
        { value: "tiktok", label: "TikTok" },
        { value: "website", label: "Página Web" },
        { value: "email", label: "Email" },
        { value: "event", label: "Evento" },
        { value: "referral", label: "Referido" },
        { value: "mass_media", label: "Publicidad en medios masivos" },
        { value: "call", label: "Llamada" },
        { value: "other", label: "Otros" },
      ],
    },
    {
      id: "brand",
      label: "Marca",
      type: "select" as const,
      options: [
        { value: "sleepwear", label: "Civetta Sleepwear" },
        { value: "bride", label: "Civetta Bride" },
      ],
    },
    {
      id: "lastContactFrom",
      label: "Último contacto desde",
      type: "date" as const,
    },
    {
      id: "lastContactTo",
      label: "Último contacto hasta",
      type: "date" as const,
    },
    {
      id: "nextFollowUpFrom",
      label: "Próximo seguimiento desde",
      type: "date" as const,
    },
    {
      id: "nextFollowUpTo",
      label: "Próximo seguimiento hasta",
      type: "date" as const,
    },
  ];

  const handleFilterChange = (searchValue: string, filterValues: FilterState) => {
    setSearchText(searchValue);
    setFilters(filterValues);
  };

  const handleResetFilters = () => {
    setSearchText("");
    setFilters({});
  };

  if (isLoading) return <div>Cargando leads...</div>;

  const activeLeads = leads?.filter(lead => !lead.convertedToCustomer) ?? [];

  if (activeLeads.length === 0) {
    return <div className="text-center p-4">No hay leads activos</div>;
  }

  return (
    <div className="space-y-4">
      <SearchFilterBar 
        searchPlaceholder="Buscar por nombre, email, teléfono o notas..."
        filterOptions={leadFilterOptions}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {filteredLeads.length === 0 ? (
        <div className="text-center p-4">No se encontraron leads con los filtros aplicados</div>
      ) : (
        <div className="grid gap-4">
          {filteredLeads.map(lead => (
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
                    {lead.phone && <span>{lead.phone}</span>}
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
      )}
    </div>
  );
}