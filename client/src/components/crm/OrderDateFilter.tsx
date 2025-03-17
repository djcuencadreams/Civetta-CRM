import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { addDays, format, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface OrderDateFilterProps {
  dateRange: DateRange | undefined;
  onChangeDateRange: (range: DateRange | undefined) => void;
  align?: "start" | "center" | "end";
  className?: string;
}

export function OrderDateFilter({
  dateRange,
  onChangeDateRange,
  align = "start",
  className,
}: OrderDateFilterProps) {
  // Presets de fechas
  const presets = [
    {
      name: "Hoy",
      range: {
        from: new Date(),
        to: new Date(),
      },
    },
    {
      name: "Ayer",
      range: {
        from: subDays(new Date(), 1),
        to: subDays(new Date(), 1),
      },
    },
    {
      name: "Últimos 7 días",
      range: {
        from: subDays(new Date(), 6),
        to: new Date(),
      },
    },
    {
      name: "Últimos 30 días",
      range: {
        from: subDays(new Date(), 29),
        to: new Date(),
      },
    },
    {
      name: "Este mes",
      range: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
    },
    {
      name: "Mes pasado",
      range: {
        from: new Date(
          new Date().getFullYear(),
          new Date().getMonth() - 1,
          1
        ),
        to: new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          0
        ),
      },
    },
    {
      name: "Últimos 90 días",
      range: {
        from: subDays(new Date(), 89),
        to: new Date(),
      },
    },
    {
      name: "Últimos 6 meses",
      range: {
        from: subMonths(new Date(), 6),
        to: new Date(),
      },
    },
  ];

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            className={cn(
              "justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd/MM/yyyy", { locale: es })} -{" "}
                  {format(dateRange.to, "dd/MM/yyyy", { locale: es })}
                </>
              ) : (
                format(dateRange.from, "dd/MM/yyyy", { locale: es })
              )
            ) : (
              <span>Filtrar por fecha</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <div className="space-y-2 p-2">
            <div className="rounded-md border">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={onChangeDateRange}
                numberOfMonths={2}
                locale={es}
              />
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => onChangeDateRange(preset.range)}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            
            {dateRange && (
              <>
                <Separator />
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full"
                  onClick={() => onChangeDateRange(undefined)}
                >
                  Limpiar filtro
                </Button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}