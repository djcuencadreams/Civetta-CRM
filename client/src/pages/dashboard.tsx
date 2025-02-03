import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Sale, type Customer } from "@db/schema";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { subDays, subMonths, subYears, isWithinInterval, startOfDay } from "date-fns";

const timeRanges = {
  day: { label: "Último día", fn: () => subDays(new Date(), 1) },
  week: { label: "Última semana", fn: () => subDays(new Date(), 7) },
  month: { label: "Último mes", fn: () => subMonths(new Date(), 1) },
  year: { label: "Último año", fn: () => subYears(new Date(), 1) }
};

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState("month");

  const { data: customers = [], isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"]
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"]
  });

  const startDate = timeRanges[timeRange].fn();
  const filteredSales = sales.filter(sale => 
    isWithinInterval(new Date(sale.createdAt), {
      start: startDate,
      end: new Date()
    })
  );

  const filteredCustomers = customers.filter(customer =>
    isWithinInterval(new Date(customer.createdAt), {
      start: startDate,
      end: new Date()
    })
  );

  const totalSales = filteredSales.reduce((acc, sale) => acc + Number(sale.amount), 0);
  const averageSale = totalSales / (filteredSales.length || 1);

  const chartData = filteredSales?.reduce((acc: any[], sale) => {
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
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(timeRanges).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total de Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalSales.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Venta Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${averageSale.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Clientes Nuevos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredCustomers.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.length}
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