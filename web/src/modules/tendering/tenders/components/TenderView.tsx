import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import type { TenderInfoWithNames } from '../helpers/tenderInfo.types'
import { formatINR } from '@/hooks/useINRFormatter';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { tenderFilesService } from '@/services/api/tender-files.service';

interface TenderViewProps {
    tender: TenderInfoWithNames;
    isLoading?: boolean;
    className?: string;
}

/**
 * Parse documents field from JSON string to array of file paths
 */
const parseDocuments = (documents: string | null): string[] => {
    if (!documents) return [];
    try {
        const parsed = JSON.parse(documents);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
        return [];
    }
};

/**
 * Extract filename from file path
 */
const getFileName = (filePath: string): string => {
    // Handle paths like "tender-documents/filename.pdf" or just "filename.pdf"
    const parts = filePath.split('/');
    return parts[parts.length - 1] || filePath;
};

export function TenderView({
    tender,
    isLoading = false,
    className = '',
}: TenderViewProps) {
    const documents = parseDocuments(tender.documents);
    if (isLoading) {
        return (
            <Card className={className}>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
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
                    Tender Details
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Basic Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Basic Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Tender No
                            </TableCell>
                            <TableCell className="text-sm font-semibold w-1/4">
                                {tender.tenderNo || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
                                Status
                            </TableCell>
                            <TableCell className="w-1/4">
                                <Badge variant="outline">{tender.statusName || '—'}</Badge>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Name
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {tender.tenderName || '—'}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Organization
                            </TableCell>
                            <TableCell className="text-sm">
                                {tender.organizationName || '—'}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Item
                            </TableCell>
                            <TableCell className="text-sm">
                                {tender.itemName || '—'}
                            </TableCell>
                        </TableRow>

                        {/* Financial Information */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Financial Information
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Value (GST Inclusive)
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {formatINR(tender.gstValues ?? 0)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Tender Fee
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {formatINR(tender.tenderFees ?? 0)}
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                EMD
                            </TableCell>
                            <TableCell className="text-sm font-semibold">
                                {formatINR(tender.emd ?? 0)}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Due Date & Time
                            </TableCell>
                            <TableCell className="text-sm">
                                {formatDateTime(tender.dueDate)}
                            </TableCell>
                        </TableRow>

                        {/* Assignment & Location */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Assignment & Location
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Team Member
                            </TableCell>
                            <TableCell className="text-sm">
                                {tender.teamMemberName || (
                                    <span className="text-muted-foreground italic">Unassigned</span>
                                )}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Location
                            </TableCell>
                            <TableCell className="text-sm">
                                {tender.locationName || '—'} <span className='text-gray-400'>({tender.locationState})</span>
                            </TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <TableCell className="text-sm font-medium text-muted-foreground">
                                Website
                            </TableCell>
                            <TableCell className="text-sm" colSpan={3}>
                                {tender.websiteLink ? (() => {
                                    const url = tender.websiteLink.startsWith('http://') || tender.websiteLink.startsWith('https://')
                                        ? tender.websiteLink
                                        : `https://${tender.websiteLink}`;
                                    return (
                                        <a
                                            href={url}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className='hover:text-primary underline'
                                        >
                                            {tender.websiteName || tender.websiteLink.replace(/^https?:\/\//i, "")}
                                        </a>
                                    );
                                })() : (
                                    '—'
                                )}
                            </TableCell>
                        </TableRow>

                        {/* Additional Information */}
                        {tender.remarks && (
                            <>
                                <TableRow className="bg-muted/50">
                                    <TableCell colSpan={4} className="font-semibold text-sm">
                                        Additional Information
                                    </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Remarks
                                    </TableCell>
                                    <TableCell className="text-sm break-words" colSpan={3}>
                                        {tender.remarks}
                                    </TableCell>
                                </TableRow>
                            </>
                        )}

                        {/* Documents */}
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="font-semibold text-sm">
                                Documents ({documents.length})
                            </TableCell>
                        </TableRow>
                        {documents.length > 0 ? (
                            documents.map((filePath, index) => (
                                <TableRow key={index} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="text-sm font-medium text-muted-foreground">
                                        Document {index + 1}
                                    </TableCell>
                                    <TableCell className="text-sm" colSpan={2}>
                                        <span className="text-xs text-muted-foreground font-mono break-all">
                                            {getFileName(filePath)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(tenderFilesService.getFileUrl(filePath), '_blank')}
                                        >
                                            <ExternalLink className="h-4 w-4 mr-1" />
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <TableCell className="text-sm text-muted-foreground" colSpan={4}>
                                    No documents uploaded
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
