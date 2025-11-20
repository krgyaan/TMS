import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
    label?: string;
    date?: Date;
    onChange: (date: Date | undefined) => void;
    placeholder?: string;
    className?: string;
    calendarClassName?: string;
}

export function DatePicker({
    label,
    date,
    onChange,
    placeholder = "Pick a date",
    className,
    calendarClassName,
}: DatePickerProps) {
    return (
        <div className={cn("grid gap-2 w-full", className)}>
            {label && <label className="text-sm font-medium">{label}</label>}

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP") : placeholder}
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={onChange}
                        initialFocus
                        className={cn("min-h-[320px]", calendarClassName)}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
