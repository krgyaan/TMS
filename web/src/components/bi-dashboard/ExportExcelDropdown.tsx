import { Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface ExportOption {
    value: string;
    label: string;
}

interface ExportExcelDropdownProps {
    exportTab: string;
    setExportTab: (value: string) => void;
    exporting: boolean;
    handleExport: () => void;
    exportOptions: ExportOption[];
}

export function ExportExcelDropdown({ exportTab, setExportTab, exporting, handleExport, exportOptions }: ExportExcelDropdownProps) {
    return (
        <div className="flex items-center gap-2">
            <Select value={exportTab} onValueChange={setExportTab}>
                <SelectTrigger className="w-44">
                    <SelectValue placeholder="Choose tab to export" />
                </SelectTrigger>
                <SelectContent>
                    {exportOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!exportTab || exporting}
            >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? 'Exporting...' : 'Download Excel'}
            </Button>
        </div>
    );
}
