import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function DateRangePicker({
  value,
  onChange,
  disabled,
}: {
  value?: DateRange | undefined
  onChange?: (date: DateRange | undefined) => void
  disabled?: boolean
}) {
  const [date, setDate] = React.useState<DateRange | undefined>(value)
  
  // Actualizar el estado interno cuando cambie la prop value
  React.useEffect(() => {
    setDate(value)
  }, [value])
  
  // Actualizar el state y llamar al onChange cuando cambie la fecha
  const handleDateChange = (newValue: DateRange | undefined) => {
    setDate(newValue)
    onChange?.(newValue)
  }
  
  return (
    <div className={cn("grid gap-2", disabled && "opacity-50 pointer-events-none")}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground w-full"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: es })} - {" "}
                  {format(date.to, "LLL dd, y", { locale: es })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: es })
              )
            ) : (
              <span>Seleccionar fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
            locale={es}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}