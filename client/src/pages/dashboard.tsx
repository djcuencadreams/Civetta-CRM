import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { SalesList } from "@/components/crm/SalesList";
import { CustomerList } from "@/components/crm/CustomerList";
import { DatePicker } from "@/components/ui/date-picker";
import { format, subDays, subMonths, subYears, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { FunnelChart } from "@/components/crm/FunnelChart";
import { type Lead, type Sale } from "@db/schema";

type DateRangeType = "day" | "week" | "month" | "year" | "custom";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRangeType>("week");
  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "day": return subDays(now, 1);
      case "week": return subDays(now, 7);
      case "month": return subMonths(now, 1);
      case "year": return subYears(now, 1);
      default: return startDate;
    }
  };

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    select: (data) => data.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= startOfDay(startDate) && leadDate <= endDate;
    })
  });

  const { data: sales } = useQuery<Sale[]>({
    queryKey: ["/api/sales", startDate, endDate],
    select: (data) => data.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startOfDay(startDate) && saleDate <= endDate;
    })
  });

  const totalSales = sales?.reduce((sum: number, sale) => sum + Number(sale.amount), 0) || 0;
  const totalCustomers = sales ? new Set(sales.map(sale => sale.customerId)).size : 0;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Panel de Control</h1>
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={(value: DateRangeType) => setDateRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Último día</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="year">Último año</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {dateRange === "custom" && (
            <div className="flex gap-2">
              <DatePicker 
                value={startDate} 
                onChange={(date) => date && setStartDate(date)}
              />
              <DatePicker 
                value={endDate} 
                onChange={(date) => date && setEndDate(date)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-2">Ventas Totales</h3>
            <p className="text-3xl font-bold">${totalSales.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <FunnelChart />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="text-sm">
                <div className="font-medium">Leads</div>
                <div className="text-muted-foreground">
                  {leads?.filter((l: Lead) => !l.convertedToCustomer).reduce((acc: Record<string, number>, lead: Lead) => {
                    const counts = acc;
                    counts[lead.status] = (counts[lead.status] || 0) + 1;
                    return counts;
                  }, {} as Record<string, number>) &&
                    Object.entries(leads?.filter((l: Lead) => !l.convertedToCustomer).reduce((acc: Record<string, number>, lead: Lead) => {
                      const counts = acc;
                      counts[lead.status] = (counts[lead.status] || 0) + 1;
                      return counts;
                    }, {} as Record<string, number>)).map(([status, count]) => (
                      <div key={status}>{status}: {count}</div>
                    ))
                  }
                </div>
                <div className="mt-2">
                  <div className="font-medium">Por Año</div>
                  {leads && Object.entries(
                    leads.reduce((acc: Record<number, number>, lead: Lead) => {
                      const year = new Date(lead.createdAt).getFullYear();
                      acc[year] = (acc[year] || 0) + 1;
                      return acc;
                    }, {} as Record<number, number>)
                  ).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, count]) => (
                    <div key={year}>{year}: {count} leads</div>
                  ))}
                </div>
              </div>
              <div className="text-sm border-l pl-2">
                <div className="font-medium">Clientes Activos</div>
                <div className="text-muted-foreground">
                  Total: {totalCustomers}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-medium mb-4">Ventas Recientes</h2>
            <SalesList />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-medium mb-4">Clientes Recientes</h2>
            <CustomerList onSelect={() => {}} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}