import { useState, useMemo } from "react";
/* UI Components */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { paths } from "@/app/routes/paths";
import type { OemKpiSummary, TendersByKpi } from "../helpers/oem-performance.types";
import { formatCurrency, usePagination } from "../helpers/oem-performance.mapper";
import { PaginationControls, TableSearch } from "./table-parts";

interface WorkedWithOemTableProps {
    summary: OemKpiSummary;
    tendersByKpi: TendersByKpi;
}

export default function WorkedWithOemTable({ summary, tendersByKpi }: WorkedWithOemTableProps) {
    const [search, setSearch] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const toggleExpand = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    const workedWithData = useMemo(() => {
        return [
            {
                category: "Total",
                count: summary.totalTendersWithOem,
                value: summary.totalValueAssigned,
                tenders: tendersByKpi.total || [],
            },
            {
                category: "Won",
                count: summary.tendersWon,
                value: summary.totalValueWon,
                tenders: tendersByKpi.tendersWon || [],
            },
            {
                category: "Lost",
                count: summary.tendersLost,
                value: summary.totalValueLost,
                tenders: tendersByKpi.tendersLost || [],
            },
            {
                category: "Submitted",
                count: summary.tendersSubmitted,
                value: summary.totalValueSubmitted,
                tenders: tendersByKpi.tendersSubmitted || [],
            },
        ];
    }, [summary, tendersByKpi]);

    const filtered = useMemo(() => {
        if (!search.trim()) return workedWithData;
        const term = search.toLowerCase();
        return workedWithData.filter(item => item.category.toLowerCase().includes(term) || item.tenders.some(t => t.tenderName?.toLowerCase().includes(term)));
    }, [workedWithData, search]);

    const pagination = usePagination(filtered, 10);

    return (
        <Card className="shadow-sm border-0 ring-1 ring-border/50">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle className="text-lg">Worked With This OEM</CardTitle>
                    <TableSearch value={search} onChange={setSearch} placeholder="Search by category or tender..." />
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-semibold">Category</TableHead>
                                <TableHead className="font-semibold">Count</TableHead>
                                <TableHead className="font-semibold">Value</TableHead>
                                <TableHead className="font-semibold">Tenders</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {pagination.paginatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        {search ? "No matching data found." : "No data available."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pagination.paginatedData.map(val => {
                                    const isExpanded = expandedCategories.has(val.category);
                                    const visibleTenders = isExpanded ? val.tenders : val.tenders.slice(0, 3);
                                    return (
                                        <TableRow key={val.category} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium">{val.category}</TableCell>
                                            <TableCell className="tabular-nums">{val.count}</TableCell>
                                            <TableCell className="tabular-nums">{formatCurrency(val.value)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1 max-w-md">
                                                    {visibleTenders.map(t => (
                                                        <Badge
                                                            key={t.id}
                                                            variant="secondary"
                                                            className="font-normal truncate max-w-[150px] cursor-pointer hover:bg-muted"
                                                            title={`${t.tenderNo} — ${formatCurrency(t.value)}`}
                                                            onClick={() => window.open(paths.tendering.tenderView(t.id), "_blank")}
                                                        >
                                                            {t.tenderName}
                                                        </Badge>
                                                    ))}

                                                    {val.tenders.length > 3 && (
                                                        <Badge variant="outline" className="font-normal cursor-pointer" onClick={() => toggleExpand(val.category)}>
                                                            {isExpanded ? "Show less" : `+${val.tenders.length - 3} more`}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
                <PaginationControls
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    startIndex={pagination.startIndex}
                    endIndex={pagination.endIndex}
                    onFirstPage={pagination.firstPage}
                    onPrevPage={pagination.prevPage}
                    onNextPage={pagination.nextPage}
                    onLastPage={pagination.lastPage}
                    onPageChange={pagination.goToPage}
                />
            </CardContent>
        </Card>
    );
}
