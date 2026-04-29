import { format, isValid, startOfDay, endOfDay, subDays } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange, SelectRangeEventHandler } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onSelect: SelectRangeEventHandler;
  className?: string;
  align?: "start" | "center" | "end";
}

export function DateRangePicker({
  dateRange,
  onSelect,
  className,
  align = "end",
}: DateRangePickerProps) {
  const isMobile = useIsMobile();

  const handleSelect: SelectRangeEventHandler = (range, selectedDay, activeModifiers, e) => {
    const from = range?.from && isValid(range.from) ? startOfDay(range.from) : undefined;
    const to = range?.to && isValid(range.to) ? endOfDay(range.to) : undefined;
    onSelect({ from, to }, selectedDay, activeModifiers || {}, e);
  };

  const handleQuickSelect = (days: number) => {
    const today = new Date();
    let fromDate: Date;
    let toDate: Date;

    if (days === 0) { // Today
      fromDate = startOfDay(today);
      toDate = endOfDay(today);
    } else if (days === 1) { // Yesterday
      fromDate = startOfDay(subDays(today, 1));
      toDate = endOfDay(subDays(today, 1));
    } else { // Last N Days
      fromDate = startOfDay(subDays(today, days - 1));
      toDate = endOfDay(today);
    }
    // Pass null with a type assertion for the event argument
    onSelect({ from: fromDate, to: toDate }, fromDate, {}, null as unknown as React.MouseEvent<Element, MouseEvent>);
  };

  const quickSelectButtons = (
    <div className="flex flex-col p-2 border-r border-border">
      <Button variant="ghost" className="justify-start" onClick={() => handleQuickSelect(0)}>Today</Button>
      <Button variant="ghost" className="justify-start" onClick={() => handleQuickSelect(1)}>Yesterday</Button>
      <Button variant="ghost" className="justify-start" onClick={() => handleQuickSelect(7)}>Last 7 Days</Button>
      <Button variant="ghost" className="justify-start" onClick={() => handleQuickSelect(30)}>Last 30 Days</Button>
    </div>
  );

  const calendarContent = (
    <Calendar
      initialFocus
      mode="range"
      defaultMonth={dateRange?.from && isValid(dateRange.from) ? dateRange.from : new Date()}
      selected={dateRange}
      onSelect={handleSelect}
      numberOfMonths={isMobile ? 1 : 2}
      disabled={(date: Date) => date > new Date() || date < new Date("1900-01-01")}
      className="p-3"
      classNames={{}}
    />
  );

  const trigger = (
    <Button
      id="date-range-picker"
      variant={"outline"}
      className={cn(
        "w-full justify-start text-left font-normal",
        !dateRange?.from && "text-muted-foreground",
        className
      )}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {dateRange?.from && isValid(dateRange.from) ? (
        dateRange.to && isValid(dateRange.to) ? (
          <>
            {format(dateRange.from, "LLL dd, y")} -{" "}
            {format(dateRange.to, "LLL dd, y")}
          </>
        ) : (
          format(dateRange.from, "LLL dd, y")
        )
      ) : (
        <span>Pick a date range</span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Select Date Range</DrawerTitle>
          </DrawerHeader>
          <div className="flex flex-col sm:flex-row justify-center pb-4">
            {quickSelectButtons}
            {calendarContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0 flex", className)} align={align}>
        {quickSelectButtons}
        {calendarContent}
      </PopoverContent>
    </Popover>
  );
}