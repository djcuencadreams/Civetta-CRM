import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  FunnelChart as RechartsChart,
  Funnel,
  LabelList,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import { type Lead, brandEnum } from "@db/schema";
import { getQueryFn } from "@/lib/queryClient";
import { useMemo } from "react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { ChartTooltipContent } from "@/components/ui/chart";
import { logError } from "@/lib/errorHandler";

// Paleta de colores armonizada con Civetta para el embudo de ventas
const COLORS = [
  '#8b5cf6', // Violeta principal (Civetta Sleepwear)
  '#c4b5fd', // Violeta claro
  '#ec4899', // Rosa (Civetta Bride)
  '#f9a8d4', // Rosa claro
  '#3b82f6', // Azul
  '#10b981', // Verde éxito
  '#f59e0b'  // Ámbar/Naranja
];

// Labels for stages to be more user-friendly
const STAGE_LABELS = {
  new: "Nuevos",
  contacted: "Contactados",
  qualified: "Calificados",
  proposal: "Propuestas",
  negotiation: "Negociación",
  won: "Ganados",
  lost: "Perdidos"
};

type FunnelDataItem = {
  name: string;
  value: number;
  label: string;
  // Added fields for additional information
  conversionRate?: number;
  avgAge?: number;
  totalValue?: number;
  color?: string;
};

export function FunnelChart({ brand }: { brand?: string }) {
  const { data: leads } = useQuery<Lead[]>({ 
    queryKey: ["/api/leads", brand],
    queryFn: getQueryFn({ on401: "throw" }),
    select: (data) => {
      // Filter leads by brand if specified
      if (brand) {
        return data.filter(lead => lead.brand === brand);
      }
      return data;
    },
    placeholderData: [] 
  });

  // Enhanced funnel data with more metrics for better insights
  const funnelData = useMemo(() => {
    // Ensure leads is an array and not undefined
    const leadsArray = Array.isArray(leads) ? leads : [];
    
    if (leadsArray.length === 0) return [];

    // Sort stages in the correct order - defined outside try/catch for scope
    const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    
    // Calculate total count for conversion rates
    const leadCounts: Record<string, number> = {};
    const leadValues: Record<string, number> = {};
    const leadAges: Record<string, number[]> = {};

    try {
      // Using safer .forEach with explicit array check
      leadsArray.forEach(lead => {
        const stage = lead.status || 'new';

        // Count leads by stage
        leadCounts[stage] = (leadCounts[stage] || 0) + 1;

        // Calculate potential value (estimate based on customer data if available)
        // Using a simplistic model where leads further in the pipeline have higher values
        const estimatedValue = lead.convertedCustomerId ? 1000 : 
          stage === 'negotiation' ? 800 :
          stage === 'proposal' ? 600 :
          stage === 'qualified' ? 400 :
          stage === 'contacted' ? 200 : 100;

        leadValues[stage] = (leadValues[stage] || 0) + estimatedValue;

        // Calculate age of lead in days
        const createdDate = new Date(lead.createdAt);
        const ageInDays = differenceInDays(new Date(), createdDate);
        if (!leadAges[stage]) leadAges[stage] = [];
        leadAges[stage].push(ageInDays);
      });
    } catch (error) {
      // Log and handle the error
      console.error("Error processing funnel chart data:", error);
      return []; // Return empty array on error
    }

    try {
      // Generate funnel data items
      let previousCount = leadCounts['new'] || 0;
      const result: FunnelDataItem[] = stageOrder
        .filter((stage: string) => leadCounts[stage]) // Only include stages with leads
      .map((stage: string, index: number) => {
        const count = leadCounts[stage];
        const conversionRate = previousCount > 0 ? Math.round((count / previousCount) * 100) : 0;
        const avgAge = leadAges[stage]?.length > 0 
          ? Math.round(leadAges[stage].reduce((a, b) => a + b, 0) / leadAges[stage].length) 
          : 0;

        const item: FunnelDataItem = {
          name: stage,
          value: count,
          label: STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage,
          conversionRate: index > 0 ? conversionRate : 100,
          avgAge,
          totalValue: leadValues[stage] || 0,
          color: COLORS[index % COLORS.length]
        };

        previousCount = count;
        return item;
      });

      return result;
    } catch (error) {
      console.error("Error generating funnel data:", error);
      return []; // Return empty array on error
    }
  }, [leads]);

  // Create a custom tooltip component for funnel chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload as FunnelDataItem;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-md">
        <h3 className="font-medium">{data.label}</h3>
        <div className="space-y-1 mt-1 text-sm">
          <p>Cantidad: <span className="font-medium">{data.value}</span></p>
          <p>Tasa de conversión: <span className="font-medium">{data.conversionRate}%</span></p>
          <p>Tiempo promedio: <span className="font-medium">{data.avgAge} días</span></p>
          <p>Valor estimado: <span className="font-medium">${data.totalValue?.toLocaleString()}</span></p>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-medium mb-4">
        Pipeline de Ventas
        {brand === brandEnum.BRIDE ? " (Civetta Bride)" : 
         brand === brandEnum.SLEEPWEAR ? " (Civetta Sleepwear)" : ""}
      </h2>
      <div className="text-sm text-muted-foreground mb-2">
        Mostrando flujo de conversión y métricas por etapa
      </div>

      <div className="h-[400px]">
        {funnelData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsChart>
              <Tooltip content={<CustomTooltip />} />
              <Funnel
                dataKey="value"
                data={funnelData}
                isAnimationActive
              >
                <Legend />
                {funnelData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                  />
                ))}
                <LabelList
                  position="right"
                  fill="#000"
                  stroke="none"
                  dataKey="label"
                  formatter={(name: string, entry: any) => {
                    // Add null check to ensure entry is valid
                    if (!entry || typeof entry !== 'object') return name;

                    // Safely cast entry to our expected type
                    const data = entry as Partial<FunnelDataItem>;

                    // Provide fallbacks for missing properties
                    const value = data.value !== undefined ? data.value : 0;
                    const rate = data.conversionRate !== undefined ? data.conversionRate : 0;

                    return `${name}: ${value} (${rate}%)`;
                  }}
                />
              </Funnel>
            </RechartsChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No hay suficientes datos para mostrar el pipeline
          </div>
        )}
      </div>

      {/* Additional metrics dashboard */}
      {funnelData.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <div className="font-medium">Etapa con más leads</div>
            <div className="text-lg font-semibold">
              {funnelData.reduce((max, item) => item.value > max.value ? item : max, funnelData[0]).label}
            </div>
          </div>
          <div>
            <div className="font-medium">Tasa de conversión general</div>
            <div className="text-lg font-semibold">
              {funnelData.find(item => item.name === 'won')?.value && funnelData.find(item => item.name === 'new')?.value
                ? `${Math.round((funnelData.find(item => item.name === 'won')!.value / funnelData.find(item => item.name === 'new')!.value) * 100)}%`
                : 'N/A'}
            </div>
          </div>
          <div>
            <div className="font-medium">Valor estimado total</div>
            <div className="text-lg font-semibold">
              ${funnelData.reduce((sum, item) => sum + (item.totalValue || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}