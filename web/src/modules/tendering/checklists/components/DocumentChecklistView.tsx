import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { FileText, ExternalLink, Download } from 'lucide-react';
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
                                <TableRow>
                                    <TableCell colSpan={4} className="p-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                                            {checklist.extraDocuments.map((doc, idx) => (
                                                <div key={idx} className="flex flex-col border rounded-md p-3 bg-card shadow-sm gap-2">
                                                    <div className="flex items-start gap-2 overflow-hidden">
                                                        <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="font-medium text-sm truncate" title={doc.name}>
                                                                {doc.name}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground truncate" title={doc.path?.split('/').pop() || doc.path}>
                                                                {doc.path ? (doc.path.split('/').pop() || doc.path) : 'No file path'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-auto">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="flex-1 h-8 text-xs gap-1"
                                                            disabled={!doc.path}
                                                            onClick={() => doc.path && window.open(tenderFilesService.getFileUrl(doc.path), '_blank')}
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="flex-1 h-8 text-xs gap-1"
                                                            disabled={!doc.path}
                                                            onClick={() => {
                                                                if (doc.path) {
                                                                    const a = document.createElement('a');
                                                                    a.href = tenderFilesService.getFileUrl(doc.path);
                                                                    a.download = doc.path.split('/').pop() || doc.name;
                                                                    a.click();
                                                                }
                                                            }}
                                                        >
                                                            <Download className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
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
