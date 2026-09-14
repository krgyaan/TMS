import { useState, useMemo } from "react";
/* UI Components */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/* Icons */
import { Mail, Eye } from "lucide-react";
import { paths } from "@/app/routes/paths";

import type { RfqSentToOemRow } from "../helpers/oem-performance.types";
import { formatCurrency, usePagination } from "../helpers/oem-performance.mapper";
import { PaginationControls, TableSearch } from "./table-parts";

interface RfqsSentTableProps {
    rfqs: RfqSentToOemRow[];
}

export default function RfqsSentTable({ rfqs }: RfqsSentTableProps) {
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        if (!search.trim()) return rfqs;
        const term = search.toLowerCase();
        return rfqs.filter(
            tender =>
                tender.member?.toLowerCase().includes(term) ||
                tender.tenderName?.toLowerCase().includes(term) ||
                tender.tenderNo?.toLowerCase().includes(term) ||
                tender.team?.toLowerCase().includes(term)
        );
    }, [rfqs, search]);

    const pagination = usePagination(filtered, 10);

    return (
        <Card className="shadow-sm border-0 ring-1 ring-border/50">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Mail className="h-5 w-5 text-purple-600" />
                            RFQs Sent to This OEM
                            <Badge variant="secondary">{rfqs.length}</Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">Detailed list of RFQs sent to this OEM and their response status.</CardDescription>
                    </div>
                    <TableSearch value={search} onChange={setSearch} placeholder="Search RFQs..." />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-semibold">Team</TableHead>
                                <TableHead className="font-semibold">Team Member</TableHead>
                                <TableHead className="font-semibold">Tender</TableHead>
                                <TableHead className="text-right font-semibold">GST Value</TableHead>
                                <TableHead className="font-semibold">Due Date</TableHead>
                                <TableHead className="font-semibold">RFQ Sent On</TableHead>
                                <TableHead className="font-semibold">Response On</TableHead>
                                <TableHead className="text-right font-semibold">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pagination.paginatedData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        {search ? "No matching RFQs found." : "No RFQs found for this category."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pagination.paginatedData.map(tender => (
                                    <TableRow key={tender.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell>
                                            <div className="font-medium">{tender.team}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{tender.member}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium max-w-[200px] truncate" title={tender.tenderName}>
                                                {tender.tenderName}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{tender.tenderNo}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(tender.gstValues)}</TableCell>
                                        <TableCell className="tabular-nums">{tender.dueDate}</TableCell>
                                        <TableCell className="tabular-nums">{tender.rfqSentOn}</TableCell>
                                        <TableCell>
                                            {tender.rfqResponseOn ? (
                                                <Badge variant="default" className="font-normal">
                                                    {tender.rfqResponseOn}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="font-normal">
                                                    Pending
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <button
                                                onClick={ev => {
                                                    ev.stopPropagation();
                                                    window.open(paths.tendering.tenderView(tender.id), "_blank");
                                                }}
                                                className="h-7 w-7 flex items-center justify-center rounded-md
                                                text-muted-foreground hover:text-primary hover:bg-muted"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
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
