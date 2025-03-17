import React, { useState } from "react";
import { Filter, Calendar, X, User, Package, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface User {
  id: number;
  fullName: string;
}

interface OrderFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  paymentStatusFilter: string;
  onPaymentStatusFilterChange: (status: string) => void;
  assignedToFilter: number | null;
  onAssignedToFilterChange: (userId: number | null) => void;
  users: User[];
  onClearFilters: () => void;
  activeFiltersCount: number;
}

export function OrderFilter({
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  assignedToFilter,
  onAssignedToFilterChange,
  users,
  onClearFilters,
  activeFiltersCount,
}: OrderFilterProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const orderStatusOptions = [
    { value: "all", label: "Todos los estados" },
    { value: "new", label: "Nuevo" },
    { value: "preparing", label: "Preparando" },
    { value: "shipped", label: "Enviado" },
    { value: "completed", label: "Completado" },
    { value: "cancelled", label: "Cancelado" },
  ];

  const paymentStatusOptions = [
    { value: "all", label: "Todos los estados de pago" },
    { value: "pending", label: "Pendiente" },
    { value: "paid", label: "Pagado" },
    { value: "refunded", label: "Reembolsado" },
  ];

  const handleClearFilters = () => {
    onClearFilters();
    setIsOpen(false);
  };

  const handleApplyFilters = () => {
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-dashed"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] md:w-[420px]" align="end">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros</h4>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={handleClearFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
          <Separator />
          
          {/* Filtro de fechas */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Rango de fechas</span>
            </div>
            <DateRangePicker
              date={dateRange}
              onDateChange={onDateRangeChange}
              align={isMobile ? "center" : "start"}
              locale="es"
              showCompare={false}
              className="w-full"
            />
          </div>
          
          <Separator />
          
          {/* Filtro de estados */}
          <div className="space-y-2">
            <div className="flex items-center">
              <Package className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Estado del pedido</span>
            </div>
            <Select
              value={statusFilter}
              onValueChange={onStatusFilterChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un estado" />
              </SelectTrigger>
              <SelectContent>
                {orderStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtro de estados de pago */}
          <div className="space-y-2">
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Estado de pago</span>
            </div>
            <Select
              value={paymentStatusFilter}
              onValueChange={onPaymentStatusFilterChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un estado de pago" />
              </SelectTrigger>
              <SelectContent>
                {paymentStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Filtro de usuario asignado */}
          <div className="space-y-2">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Vendedor responsable</span>
            </div>
            <Select
              value={assignedToFilter?.toString() || "all"}
              onValueChange={(value) => onAssignedToFilterChange(value === "all" ? null : Number(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los vendedores</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button onClick={handleApplyFilters}>
              Aplicar filtros
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}