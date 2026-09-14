import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Search } from "lucide-react";

/* ================================
   PAGINATION COMPONENT
================================ */
interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    startIndex: number;
    endIndex: number;
    onFirstPage: () => void;
    onPrevPage: () => void;
    onNextPage: () => void;
    onLastPage: () => void;
    onPageChange: (page: number) => void;
}

export function PaginationControls({ currentPage, totalPages, totalItems, startIndex, endIndex, onFirstPage, onPrevPage, onNextPage, onLastPage }: PaginationControlsProps) {
    if (totalItems === 0) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{startIndex}</span> to <span className="font-medium">{endIndex}</span> of <span className="font-medium">{totalItems}</span>{" "}
                results
            </div>
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onFirstPage} disabled={currentPage === 1}>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onPrevPage} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-2">
                    <span className="text-sm font-medium">{currentPage}</span>
                    <span className="text-sm text-muted-foreground">/</span>
                    <span className="text-sm text-muted-foreground">{totalPages || 1}</span>
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onNextPage} disabled={currentPage === totalPages || totalPages === 0}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={onLastPage} disabled={currentPage === totalPages || totalPages === 0}>
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

/* ================================
   SEARCH INPUT COMPONENT
================================ */
interface TableSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function TableSearch({ value, onChange, placeholder = "Search..." }: TableSearchProps) {
    return (
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="text" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="pl-9 h-9" />
        </div>
    );
}
