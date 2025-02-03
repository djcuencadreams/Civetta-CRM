import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Sale, type Customer } from "@db/schema";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: customers, isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });
  
  const { data: sales, isLoading: loadingSales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"]
  });

  const totalSales = sales?.reduce((acc, sale) => acc + Number(sale.amount), 0) || 0;
  const averageSale = totalSales / (sales?.length || 1);
  
  const chartData = sales?.reduce((acc: any[], sale) => {
    const date = new Date(sale.createdAt).toLocaleDateString();
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.amount += Number(sale.amount);
    } else {
      acc.push({ date, amount: Number(sale.amount) });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingSales ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `$${totalSales.toFixed(2)}`
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Venta Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingSales ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `$${averageSale.toFixed(2)}`
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingCustomers ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                customers?.length || 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas por Día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {loadingSales ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="amount"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
