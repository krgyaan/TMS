import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Filter, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { cn } from "@/lib/utils";

export interface SortOption {
    colId: string;
    sort: 'asc' | 'desc';
}

export interface TableSortFilterProps {
    columnDefs: ColDef[];
    currentSort?: SortOption;
    onSortChange: (sort: SortOption | null) => void;
    className?: string;
}

interface ColumnInfo {
    colId: string;
    headerName: string;
    type: 'date' | 'amount';
}

export function TableSortFilter({
    columnDefs,
    currentSort,
    onSortChange,
    className,
}: TableSortFilterProps) {
    const [open, setOpen] = React.useState(false);

    // Extract date and amount columns
    const { dateColumns, amountColumns } = React.useMemo(() => {
        const dateCols: ColumnInfo[] = [];
        const amountCols: ColumnInfo[] = [];

        const datePattern = /date|created|updated|due|expiry|deadline|submission|dispatch|approval|rejection/i;
        const amountPattern = /amount|price|value|fee|cost|total|sum|gst|emd|tenderfee|processingfee|fdr|cheque|dd|bg|bt|pop/i;

        columnDefs.forEach((col) => {
            const colId = col.colId || col.field || '';
            const headerName = col.headerName || col.field || colId;

            if (!colId || !headerName) return;

            const fieldLower = colId.toLowerCase();
            const headerLower = headerName.toLowerCase();

            if (datePattern.test(fieldLower) || datePattern.test(headerLower)) {
                dateCols.push({ colId, headerName: String(headerName), type: 'date' });
            } else if (amountPattern.test(fieldLower) || amountPattern.test(headerLower)) {
                amountCols.push({ colId, headerName: String(headerName), type: 'amount' });
            }
        });

        return {
            dateColumns: dateCols,
            amountColumns: amountCols,
        };
    }, [columnDefs]);

    const handleSort = (colId: string, type: 'date' | 'amount') => {
        // Toggle sort direction if same column, otherwise set to desc
        if (currentSort?.colId === colId) {
            const newSort: SortOption = {
                colId,
                sort: currentSort.sort === 'asc' ? 'desc' : 'asc',
            };
            onSortChange(newSort);
        } else {
            onSortChange({ colId, sort: 'desc' });
        }
        setOpen(false);
    };

    const handleClearSort = () => {
        onSortChange(null);
        setOpen(false);
    };

    const getCurrentSortLabel = () => {
        if (!currentSort) return null;

        const allColumns = [...dateColumns, ...amountColumns];
        const column = allColumns.find((col) => col.colId === currentSort.colId);

        if (!column) return null;

        return `${column.headerName} (${currentSort.sort === 'asc' ? 'Asc' : 'Desc'})`;
    };

    const hasSortableColumns = dateColumns.length > 0 || amountColumns.length > 0;

    if (!hasSortableColumns) {
        return null;
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("gap-2", className)}
                >
                    <Filter className="h-4 w-4" />
                    <span>Sort By </span>
                    {currentSort && (
                        <span className="ml-1 text-xs text-muted-foreground">
                            ({getCurrentSortLabel()})
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">Sort Options</h4>
                        {currentSort && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearSort}
                                className="h-7 text-xs"
                            >
                                <X className="h-3 w-3 mr-1" />
                                Clear
                            </Button>
                        )}
                    </div>

                    {dateColumns.length > 0 && (
                        <div className="space-y-2">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Sort by Date
                            </h5>
                            <div className="space-y-1">
                                {dateColumns.map((col) => {
                                    const isActive = currentSort?.colId === col.colId;
                                    const isAsc = currentSort?.sort === 'asc' && isActive;
                                    const isDesc = currentSort?.sort === 'desc' && isActive;

                                    return (
                                        <button
                                            key={col.colId}
                                            type="button"
                                            onClick={() => handleSort(col.colId, col.type)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                                                isActive
                                                    ? "bg-accent text-accent-foreground"
                                                    : "hover:bg-accent/50"
                                            )}
                                        >
                                            <span>{col.headerName}</span>
                                            <div className="flex items-center gap-1">
                                                {isAsc && <ArrowUp className="h-4 w-4" />}
                                                {isDesc && <ArrowDown className="h-4 w-4" />}
                                                {!isActive && (
                                                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {dateColumns.length > 0 && amountColumns.length > 0 && (
                        <Separator />
                    )}

                    {amountColumns.length > 0 && (
                        <div className="space-y-2">
                            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Sort by Amount
                            </h5>
                            <div className="space-y-1">
                                {amountColumns.map((col) => {
                                    const isActive = currentSort?.colId === col.colId;
                                    const isAsc = currentSort?.sort === 'asc' && isActive;
                                    const isDesc = currentSort?.sort === 'desc' && isActive;

                                    return (
                                        <button
                                            key={col.colId}
                                            type="button"
                                            onClick={() => handleSort(col.colId, col.type)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                                                isActive
                                                    ? "bg-accent text-accent-foreground"
                                                    : "hover:bg-accent/50"
                                            )}
                                        >
                                            <span>{col.headerName}</span>
                                            <div className="flex items-center gap-1">
                                                {isAsc && <ArrowUp className="h-4 w-4" />}
                                                {isDesc && <ArrowDown className="h-4 w-4" />}
                                                {!isActive && (
                                                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
