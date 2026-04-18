import { useState } from 'react';
import { useRfqResponse } from '@/hooks/api/useRfqResponses';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText, Download, ExternalLink } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { formatINR } from '@/hooks/useINRFormatter';
import type { RfqResponseListItem } from '../helpers/rfqResponse.types';

interface RfqResponseDetailAccordionProps {
    responseSummary: RfqResponseListItem;
}

export function RfqResponseDetailAccordion({ responseSummary }: RfqResponseDetailAccordionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Only fetch response details when the accordion is expanded
    const { data: response, isLoading, error } = useRfqResponse(
        isExpanded ? responseSummary.id : null
    );

    return (
        <Accordion
            type="single"
            collapsible
            className="w-full bg-card rounded-lg border shadow-sm"
            onValueChange={(val) => setIsExpanded(val === 'item-1')}
        >
            <AccordionItem value="item-1" className="border-b-0">
                <AccordionTrigger className="px-6 hover:no-underline hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between w-full pr-4 text-left">
                        <div className="flex flex-col gap-1">
                            <span className="font-semibold text-base">
                                Response Details
                            </span>
                            <span className="text-sm text-muted-foreground">
                                Receipt: {formatDateTime(responseSummary.receiptDatetime)}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge variant="secondary">
                                ID: #{responseSummary.id}
                            </Badge>
                        </div>
                    </div>
                </AccordionTrigger>

                <AccordionContent className="px-6 pb-6 pt-2 border-t">
                    {!isExpanded ? null : isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-48 w-full" />
                        </div>
                    ) : error || !response ? (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                Failed to load response details.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="space-y-6">
                            {/* Vendor & Conditions Summary */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-md">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Delivery Time</p>
                                    <p className="text-sm font-medium mt-1">{response.deliveryTime ? `${response.deliveryTime} days` : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Freight Type</p>
                                    <p className="text-sm font-medium mt-1">{response.freightType ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">GST Type</p>
                                    <p className="text-sm font-medium mt-1">{response.gstType ?? '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">GST %</p>
                                    <p className="text-sm font-medium mt-1">{response.gstPercentage ? `${response.gstPercentage}%` : '—'}</p>
                                </div>
                            </div>

                            {/* Notes */}
                            {response.notes && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Notes
                                    </p>
                                    <div className="bg-muted/20 p-4 rounded-md border text-sm whitespace-pre-wrap">
                                        {response.notes}
                                    </div>
                                </div>
                            )}

                            {/* Quoted Items */}
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Quoted Items ({response.items.length})
                                </p>
                                {response.items.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">No items recorded.</p>
                                ) : (
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>Requirement</TableHead>
                                                    <TableHead>Qty</TableHead>
                                                    <TableHead className="text-right">Unit Price</TableHead>
                                                    <TableHead className="text-right">Total Price</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {response.items.map((item) => (
                                                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                                        <TableCell className="font-medium whitespace-normal [overflow-wrap:anywhere]">{item.requirement}</TableCell>
                                                        <TableCell>
                                                            {item.qty ?? '—'} <span className="text-muted-foreground text-xs">{item.unit || ''}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {item.unitPrice != null ? formatINR(parseFloat(item.unitPrice)) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-primary">
                                                            {item.totalPrice != null ? formatINR(parseFloat(item.totalPrice)) : '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>

                            {/* Documents */}
                            {response.documents.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Attached Documents ({response.documents.length})
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                                        {response.documents.map((doc) => (
                                            <div key={doc.id} className="flex flex-col border rounded-md p-3 bg-card shadow-sm gap-2">
                                                <div className="flex items-start gap-2 overflow-hidden">
                                                    <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-medium text-sm truncate" title={doc.docType.replace(/_/g, ' ')}>
                                                            {doc.docType.replace(/_/g, ' ')}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground truncate" title={doc.path.split("\\").pop() || doc.path}>
                                                            {doc.path.split("\\").pop() || doc.path}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-auto">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs gap-1"
                                                        onClick={() => window.open("/uploads/tendering/" + doc.path, '_blank')}
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="flex-1 h-8 text-xs gap-1"
                                                        onClick={() => {
                                                            const a = document.createElement('a');
                                                            a.href = "/uploads/tendering/" + doc.path;
                                                            a.download = doc.path.split("\\").pop() || doc.docType;
                                                            a.click();
                                                        }}
                                                    >
                                                        <Download className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
