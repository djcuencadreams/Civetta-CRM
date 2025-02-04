
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  FunnelChart as RechartsChart,
  Funnel,
  LabelList,
  Tooltip,
} from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#9F7AEA', '#48BB78', '#F56565'];

export function FunnelChart() {
  const { data: leads } = useQuery({ queryKey: ["/api/leads"] });
  
  const funnelData = leads?.reduce((acc: any[], lead) => {
    const stage = acc.find(x => x.name === lead.status);
    if (stage) {
      stage.value++;
    } else {
      acc.push({ name: lead.status, value: 1 });
    }
    return acc;
  }, []) || [];

  // Sort funnel stages in correct order
  const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
  funnelData.sort((a, b) => stageOrder.indexOf(a.name) - stageOrder.indexOf(b.name));

  return (
    <Card className="p-6">
      <h2 className="text-lg font-medium mb-4">Pipeline de Ventas</h2>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsChart>
            <Tooltip />
            <Funnel
              data={funnelData}
              dataKey="value"
              nameKey="name"
              fill="#8884d8"
            >
              <LabelList
                position="right"
                fill="#fff"
                stroke="none"
                dataKey="name"
                formatter={(name: string) => 
                  `${name.charAt(0).toUpperCase() + name.slice(1)}: ${
                    funnelData.find(d => d.name === name)?.value || 0
                  }`
                }
              />
              {funnelData.map((_, index) => (
                <Funnel
                  key={index}
                  dataKey="value"
                  fill={COLORS[index % COLORS.length]}
                  stroke="#fff"
                  strokeWidth={2}
                />
              ))}
            </Funnel>
          </RechartsChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
