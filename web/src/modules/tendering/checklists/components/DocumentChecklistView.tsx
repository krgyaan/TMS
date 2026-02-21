import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { FileText, ExternalLink } from 'lucide-react';
import type { TenderDocumentChecklist } from '../helpers/documentChecklist.types';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { tenderFilesService } from '@/services/api/tender-files.service';

interface DocumentChecklistViewProps {
    checklist?: TenderDocumentChecklist | null;
    isLoading?: boolean;
    className?: string;
}

export function DocumentChecklistView({
    checklist,
    isLoading = false,
    className = '',
}: DocumentChecklistViewProps) {
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!checklist) {
        return (
            <Card className={className}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Document Checklist
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No document checklist available for this tender yet.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Document Checklist Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Selected Documents */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Selected Documents
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Documents
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {checklist.selectedDocuments && checklist.selectedDocuments.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {checklist.selectedDocuments.map((doc, idx) => (
                                            <Badge key={idx} variant="outline">
                                                {doc}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">No documents selected</span>
                                )}
                            </TableCell>
                        </TableRow>

                        {/* Extra Documents */}
                        {checklist.extraDocuments && checklist.extraDocuments.length > 0 && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Extra Documents ({checklist.extraDocuments.length})
                                    </TableCell>
                                </TableRow>
                                {checklist.extraDocuments.map((doc, idx) => (
                                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="text-sm font-medium text-muted-foreground">
                                            {doc.name}
                                        </TableCell>
                                        <TableCell className="text-sm" colSpan={2}>
                                            {doc.path ? (
                                                <a
                                                    href={tenderFilesService.getFileUrl(doc.path)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-primary hover:underline break-all"
                                                >
                                                    {doc.path.split('/').pop() || doc.path}
                                                </a>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-right">
                                            {doc.path && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => window.open(tenderFilesService.getFileUrl(doc.path!), '_blank')}
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-1" />
                                                    View
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </>
                        )}

                        {/* Timeline */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Timeline
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Created At
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(checklist.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Last Updated
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(checklist.updatedAt)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
