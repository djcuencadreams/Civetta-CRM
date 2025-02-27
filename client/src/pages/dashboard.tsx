import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { SalesList } from "@/components/crm/SalesList";
import { CustomerList } from "@/components/crm/CustomerList";
import { DatePicker } from "@/components/ui/date-picker";
import { format, subDays, subMonths, subYears, startOfDay, isFuture, differenceInDays, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { FunnelChart } from "@/components/crm/FunnelChart";
import { type Lead, type Sale, type Customer, brandEnum } from "@db/schema";
import { getQueryFn } from "@/lib/queryClient";
import { FilterState } from "@/components/crm/SearchFilterBar";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  PhoneForwarded,
  Activity,
  UserPlus,
  FileText,
  PlusCircle
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LeadForm } from "@/components/crm/LeadForm";
import { CustomerForm } from "@/components/crm/CustomerForm";
import { SalesForm } from "@/components/crm/SalesForm";

type DateRangeType = "day" | "week" | "month" | "year" | "custom";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRangeType>("week");
  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  // Add filters for dashboard search
  const [leadFilters, setLeadFilters] = useState<FilterState>({});
  const [saleFilters, setSaleFilters] = useState<FilterState>({});
  const [customerFilters, setCustomerFilters] = useState<FilterState>({});

  // Dialog states for quick actions
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);

  const isMobile = useIsMobile();

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
    queryKey: ["/api/leads", selectedBrand, leadFilters],
    queryFn: getQueryFn({ on401: "throw" }),
    select: (data) => data.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      const brandMatch = selectedBrand === "all" || lead.brand === selectedBrand;
      return leadDate >= startOfDay(startDate) && leadDate <= endDate && brandMatch;
    })
  });

  const { data: sales } = useQuery<Sale[]>({
    queryKey: ["/api/sales", startDate, endDate, selectedBrand, saleFilters],
    queryFn: getQueryFn({ on401: "throw" }),
    select: (data) => data.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const brandMatch = selectedBrand === "all" || sale.brand === selectedBrand;
      return saleDate >= startOfDay(startDate) && saleDate <= endDate && brandMatch;
    })
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers", selectedBrand, customerFilters],
    queryFn: getQueryFn({ on401: "throw" }),
    select: (data) => data.filter(customer => {
      const customerDate = new Date(customer.createdAt);
      const brandMatch = selectedBrand === "all" || customer.brand === selectedBrand;
      return customerDate >= startOfDay(startDate) && customerDate <= endDate && brandMatch;
    })
  });

  // Calculate KPIs and metrics
  const totalSales = sales?.reduce((sum: number, sale) => sum + Number(sale.amount), 0) || 0;
  const totalCustomers = customers?.length || 0;
  const activeLeads = leads?.filter(lead => !lead.convertedToCustomer)?.length || 0;
  const wonLeads = leads?.filter(lead => lead.status === 'won')?.length || 0;
  const conversionRate = activeLeads > 0 ? Math.round((wonLeads / activeLeads) * 100) : 0;

  // Calculate sales trends for chart
  const salesByDay = sales?.reduce((acc: Record<string, number>, sale) => {
    const day = format(new Date(sale.createdAt), 'yyyy-MM-dd');
    acc[day] = (acc[day] || 0) + Number(sale.amount);
    return acc;
  }, {}) || {};

  const salesTrendData = Object.entries(salesByDay).map(([day, value]) => ({
    day: format(new Date(day), 'dd/MM'),
    value
  })).sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());

  // Calculate brand distribution for pie chart
  const salesByBrand = sales?.reduce((acc: Record<string, number>, sale) => {
    if (sale.brand) {
      acc[sale.brand] = (acc[sale.brand] || 0) + Number(sale.amount);
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const brandPieData = Object.entries(salesByBrand).map(([brand, value]) => ({
    name: brand === 'bride' ? 'Civetta Bride' : 'Civetta Sleepwear',
    value
  }));

  const BRAND_COLORS = ['#9F7AEA', '#4E7ADE'];

  // Find upcoming follow-ups
  const upcomingFollowUps = leads?.filter(lead =>
    lead.nextFollowUp &&
    isFuture(new Date(lead.nextFollowUp)) &&
    differenceInDays(new Date(lead.nextFollowUp), new Date()) <= 7
  ).sort((a, b) => new Date(a.nextFollowUp!).getTime() - new Date(b.nextFollowUp!).getTime()) || [];

  // Get brand display name
  const getBrandDisplayName = (brandValue: string) => {
    switch (brandValue) {
      case brandEnum.BRIDE: return "Civetta Bride";
      case brandEnum.SLEEPWEAR: return "Civetta Sleepwear";
      default: return "Todas las marcas";
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className={`flex flex-col items-${isMobile ? 'center' : 'start'} gap-2`}>
          <div className="flex items-center justify-center">
            <img
              src="/media/logoCivetta01.png"
              alt="Civetta Logo"
              className={isMobile ? "h-20 object-contain" : "h-40 object-contain"}
            />
          </div>
          <h1 className="text-2xl font-bold">
            {isMobile ? "CRM Civetta" : "Panel de Control"}
          </h1>
        </div>
        {/* Mobile layout - Quick Action Buttons above filters */}
        {isMobile && (
          <div className="grid gap-4 grid-cols-3 w-full">
            <Button variant="outline" className="w-full h-14 gap-2" onClick={() => setLeadDialogOpen(true)}>
              <PhoneForwarded className="h-4 w-4 text-purple-500" />
              <span className="text-xs">Nuevo Lead</span>
            </Button>
            <Button variant="outline" className="w-full h-14 gap-2" onClick={() => setCustomerDialogOpen(true)}>
              <UserPlus className="h-4 w-4 text-blue-500" />
              <span className="text-xs">Nuevo Cliente</span>
            </Button>
            <Button variant="outline" className="w-full h-14 gap-2" onClick={() => setSaleDialogOpen(true)}>
              <FileText className="h-4 w-4 text-green-500" />
              <span className="text-xs">Nueva Venta</span>
            </Button>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las marcas</SelectItem>
              <SelectItem value={brandEnum.SLEEPWEAR}>Civetta Sleepwear</SelectItem>
              <SelectItem value={brandEnum.BRIDE}>Civetta Bride</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={(value: DateRangeType) => setDateRange(value)}>
            <SelectTrigger className="w-full sm:w-40">
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
            <div className="flex flex-col sm:flex-row gap-2">
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

      {/* Desktop layout - Quick Action Buttons */}
      {!isMobile && (
        <div className="grid gap-4 md:grid-cols-3">
          <Button variant="outline" className="w-full h-16 gap-3" onClick={() => setLeadDialogOpen(true)}>
            <PhoneForwarded className="h-5 w-5 text-purple-500" />
            <span className="flex flex-col items-start">
              <span className="font-medium">Nuevo Lead</span>
              <span className="text-xs text-muted-foreground">Registrar un prospecto</span>
            </span>
          </Button>
          <Button variant="outline" className="w-full h-16 gap-3" onClick={() => setCustomerDialogOpen(true)}>
            <UserPlus className="h-5 w-5 text-blue-500" />
            <span className="flex flex-col items-start">
              <span className="font-medium">Nuevo Cliente</span>
              <span className="text-xs text-muted-foreground">Agregar un cliente</span>
            </span>
          </Button>
          <Button variant="outline" className="w-full h-16 gap-3" onClick={() => setSaleDialogOpen(true)}>
            <FileText className="h-5 w-5 text-green-500" />
            <span className="flex flex-col items-start">
              <span className="font-medium">Nueva Venta</span>
              <span className="text-xs text-muted-foreground">Registrar una venta</span>
            </span>
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ventas Totales</p>
                <h3 className="text-2xl font-bold mt-1">${totalSales.toFixed(2)}</h3>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">{getBrandDisplayName(selectedBrand)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clientes</p>
                <h3 className="text-2xl font-bold mt-1">{totalCustomers}</h3>
              </div>
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">{getBrandDisplayName(selectedBrand)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leads Activos</p>
                <h3 className="text-2xl font-bold mt-1">{activeLeads}</h3>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-full">
                <PhoneForwarded className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">{getBrandDisplayName(selectedBrand)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasa de Conversión</p>
                <h3 className="text-2xl font-bold mt-1">{conversionRate}%</h3>
              </div>
              <div className="p-2 bg-green-500/10 rounded-full">
                <Activity className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Leads convertidos a clientes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Enhanced Sales Pipeline Chart */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Pipeline de Ventas</CardTitle>
            <CardDescription>
              Visión del embudo de ventas y conversión por etapa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelChart brand={selectedBrand === "all" ? undefined : selectedBrand} />
          </CardContent>
        </Card>

        {/* Sales Trend Chart */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Tendencia de Ventas</CardTitle>
            <CardDescription>
              Evolución de ventas durante el periodo seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {salesTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={salesTrendData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#4E7ADE"
                      strokeWidth={2}
                      name="Ventas ($)"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No hay suficientes datos para mostrar la tendencia
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPI row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Brand Distribution */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Distribución por Marca</CardTitle>
            <CardDescription>
              Porcentaje de ventas por marca
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {brandPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={brandPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {brandPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value}`, 'Ventas']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No hay suficientes datos para mostrar la distribución
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Próximos Seguimientos</CardTitle>
            <CardDescription>
              Seguimientos programados para los próximos 7 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[250px] overflow-auto">
              {upcomingFollowUps.length > 0 ? (
                upcomingFollowUps.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">{lead.email || lead.phone || 'Sin contacto'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${isToday(new Date(lead.nextFollowUp!)) ? 'text-red-500' : ''}`}>
                        {format(new Date(lead.nextFollowUp!), 'PPP', { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {differenceInDays(new Date(lead.nextFollowUp!), new Date()) === 0
                          ? 'Hoy'
                          : `En ${differenceInDays(new Date(lead.nextFollowUp!), new Date())} días`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No hay seguimientos programados para los próximos 7 días
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lists Section */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Ventas Recientes</CardTitle>
            <CardDescription>
              Últimas transacciones realizadas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <SalesList brand={selectedBrand === "all" ? undefined : selectedBrand} filters={saleFilters} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Clientes Recientes</CardTitle>
            <CardDescription>
              Últimos clientes agregados al sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <CustomerList
              onSelect={() => { }}
              brand={selectedBrand === "all" ? undefined : selectedBrand}
              filters={customerFilters} />
          </CardContent>
        </Card>
      </div>

      {/* Dialog for creating a new lead directly from the dashboard */}
      <Dialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Lead</DialogTitle>
          </DialogHeader>
          <LeadForm
            onClose={() => setLeadDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog for creating a new customer directly from the dashboard */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onComplete={() => setCustomerDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog for creating a new sale directly from the dashboard */}
      <Dialog open={saleDialogOpen} onOpenChange={setSaleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Venta</DialogTitle>
          </DialogHeader>
          <SalesForm
            onComplete={() => setSaleDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}