import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
  align?: "center" | "start" | "end";
  locale?: string;
  showCompare?: boolean;
  // Alias de propiedades para compatibilidad
  value?: DateRange | undefined;
  onChange?: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
  align = "center",
  locale = "es",
  showCompare = true,
  value,
  onChange,
}: DateRangePickerProps) {
  // Usar alias si las propiedades principales no están definidas
  const finalDate = date || value;
  const finalOnDateChange = onDateChange || onChange || (() => {});
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateChange = (newDate: DateRange | undefined) => {
    finalOnDateChange(newDate);
    if (newDate?.from && newDate?.to) {
      setIsOpen(false);
    }
  };

  // Opciones para comparación rápida
  const rangeOptions = [
    {
      label: "Hoy",
      range: {
        from: new Date(),
        to: new Date(),
      },
    },
    {
      label: "Ayer",
      range: {
        from: new Date(new Date().setDate(new Date().getDate() - 1)),
        to: new Date(new Date().setDate(new Date().getDate() - 1)),
      },
    },
    {
      label: "Últimos 7 días",
      range: {
        from: new Date(new Date().setDate(new Date().getDate() - 7)),
        to: new Date(),
      },
    },
    {
      label: "Últimos 30 días",
      range: {
        from: new Date(new Date().setDate(new Date().getDate() - 30)),
        to: new Date(),
      },
    },
    {
      label: "Este mes",
      range: {
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
      },
    },
    {
      label: "Mes pasado",
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
  ];

  const handleSelectRange = (value: string) => {
    const selectedOption = rangeOptions.find(
      (option) => option.label === value
    );
    if (selectedOption) {
      finalOnDateChange(selectedOption.range);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {finalDate?.from ? (
              finalDate.to ? (
                <>
                  {format(finalDate.from, "dd MMM, yyyy", { locale: es })} -{" "}
                  {format(finalDate.to, "dd MMM, yyyy", { locale: es })}
                </>
              ) : (
                format(finalDate.from, "dd MMM, yyyy", { locale: es })
              )
            ) : (
              <span>Seleccione un rango de fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto" align={align} side="bottom">
          <div className="grid gap-4">
            {showCompare && (
              <div className="grid gap-2">
                <Select onValueChange={handleSelectRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione rango" />
                  </SelectTrigger>
                  <SelectContent>
                    {rangeOptions.map((option) => (
                      <SelectItem key={option.label} value={option.label}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={finalDate?.from}
                locale={es}
                selected={finalDate}
                onSelect={handleDateChange}
                numberOfMonths={2}
                className="rounded-md border"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}