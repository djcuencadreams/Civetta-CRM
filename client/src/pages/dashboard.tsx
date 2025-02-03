
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { SalesList } from "@/components/crm/SalesList";
import { CustomerList } from "@/components/crm/CustomerList";
import { CustomerForm } from "@/components/crm/CustomerForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { format, subDays, subMonths, subYears, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState("week");
  const [startDate, setStartDate] = useState(() => subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(new Date());

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

  const { data: sales } = useQuery({
    queryKey: ["/api/sales", startDate, endDate],
    select: (data) => data.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startOfDay(startDate) && saleDate <= endDate;
    })
  });

  const totalSales = sales?.reduce((sum, sale) => sum + Number(sale.amount), 0) || 0;
  const totalCustomers = new Set(sales?.map(sale => sale.customerId)).size;

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Panel de Control</h1>
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
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
              <DatePicker date={startDate} onChange={setStartDate} />
              <DatePicker date={endDate} onChange={setEndDate} />
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
            <h3 className="font-medium mb-2">Clientes Nuevos</h3>
            <p className="text-3xl font-bold">{totalCustomers}</p>
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
