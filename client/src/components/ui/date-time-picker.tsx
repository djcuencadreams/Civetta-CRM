import * as React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
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

interface DateTimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  locale?: any;
  disabled?: boolean;
}

export function DateTimePicker({
  date,
  setDate,
  locale = es,
  disabled = false
}: DateTimePickerProps) {
  // Crear nuevas referencias para evitar modificar el objeto original
  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setDate(undefined);
      return;
    }

    const currentDate = date ? new Date(date) : new Date();
    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();

    selectedDate.setHours(hours);
    selectedDate.setMinutes(minutes);
    
    setDate(selectedDate);
  };

  const handleTimeChange = (type: "hours" | "minutes", value: number) => {
    if (!date) return;
    
    const newDate = new Date(date);
    
    if (type === "hours") {
      newDate.setHours(value);
    } else {
      newDate.setMinutes(value);
    }
    
    setDate(newDate);
  };

  // Generar opciones para horas y minutos
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "PPP 'a las' HH:mm", { locale })
          ) : (
            <span>Seleccionar fecha y hora</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={locale}
          initialFocus
        />
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex flex-col space-y-1">
              <span className="text-xs font-medium">Hora</span>
              <Select
                value={date ? date.getHours().toString() : undefined}
                onValueChange={(value) => handleTimeChange("hours", parseInt(value))}
                disabled={!date || disabled}
              >
                <SelectTrigger className="w-[75px]">
                  <SelectValue placeholder="Hora" />
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour.toString()}>
                      {hour.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-lg">:</span>
            <div className="flex flex-col space-y-1">
              <span className="text-xs font-medium">Minuto</span>
              <Select
                value={date ? date.getMinutes().toString() : undefined}
                onValueChange={(value) => handleTimeChange("minutes", parseInt(value))}
                disabled={!date || disabled}
              >
                <SelectTrigger className="w-[75px]">
                  <SelectValue placeholder="Min" />
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={minute.toString()}>
                      {minute.toString().padStart(2, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}