import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/form/SelectField";
import { Filter, Calendar as CalendarIcon } from "lucide-react";

interface OemFilterCardProps {
    oemOptions: { id: string; name: string }[];
    selectedOemId: number | null | undefined;
    onSelectOem: (id: number | null) => void;
    fromDate: string | null | undefined;
    toDate: string | null | undefined;
    onFromDate: (value: string | null) => void;
    onToDate: (value: string | null) => void;
    onSubmit: () => void;
}

export default function OemFilterCard({ oemOptions, selectedOemId, onSelectOem, fromDate, toDate, onFromDate, onToDate, onSubmit }: OemFilterCardProps) {
    return (
        <Card className="shadow-sm">
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select OEM</label>
                        <Combobox
                            value={selectedOemId ? selectedOemId.toString() : ""}
                            onChange={v => onSelectOem(v ? Number(v) : null)}
                            options={oemOptions}
                            placeholder="Select OEM"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">From Date</label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="date" className="pl-9" value={fromDate ?? ""} onChange={e => onFromDate(e.target.value || null)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">To Date</label>
                        <div className="relative">
                            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input type="date" className="pl-9" value={toDate ?? ""} onChange={e => onToDate(e.target.value || null)} />
                        </div>
                    </div>
                    <Button onClick={onSubmit}>
                        <Filter className="mr-2 h-4 w-4" /> Submit
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
