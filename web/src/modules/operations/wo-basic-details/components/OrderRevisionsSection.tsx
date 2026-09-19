import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOrderRevisions } from "@/hooks/api/useWoBasicDetails";
import { formatDateTime } from "@/hooks/useFormatedDate";
import { formatINR } from "@/hooks/useINRFormatter";
import { History } from "lucide-react";

interface OrderRevisionsSectionProps {
    woBasicDetailId: number;
}

export function OrderRevisionsSection({ woBasicDetailId }: OrderRevisionsSectionProps) {
    const { data: revisions, isLoading } = useOrderRevisions(woBasicDetailId);

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    if (!revisions || revisions.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4" />
                    Order Revision History
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
                <Table>
                    <TableBody>
                        {revisions.map((rev) => (
                            <TableRow key={rev.id} className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm font-semibold w-24">
                                    <Badge variant="secondary">v{rev.revisionNumber}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                    <span className="font-medium">{rev.woNumber || '—'}</span>
                                    <span className="block text-xs text-muted-foreground">
                                        {rev.woDate ? formatDateTime(rev.woDate) : '—'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-sm">
                                    {rev.woValuePreGst
                                        ? formatINR(parseFloat(String(rev.woValuePreGst)))
                                        : '—'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {rev.revisionNotes || '—'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                    {rev.revisedByName || `User ${rev.revisedBy ?? ''}`} · {rev.revisionDate ? formatDateTime(rev.revisionDate) : ''}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}