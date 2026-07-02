import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { formatDateTime } from '@/hooks/useFormatedDate';
import RfqResponsesViewer from './RfqResponsesViewer';
import {
    AlertCircle, Building2, Calendar, Clock, ExternalLink, FileText, MessageCircleOff, Paperclip,
} from 'lucide-react';

export default function SentRfqsResponsesHistory({ tenderId, rfqRequired }: { tenderId: number; rfqRequired?: string | null }) {
    console.log({rfqRequired})
    const { data: rfqs, isLoading: isLoadingRfqData, error } = useRfqByTenderId(
        rfqRequired === 'no' ? null : tenderId
    );

    if (rfqRequired === 'no') {
        return (
            <Card className="border border-muted shadow-sm bg-background">
                <CardHeader className="border-b border-muted bg-muted/10 pb-4">
                    <div className="flex items-center justify-between">
                        <CardDescription>
                            RFQs were not required for this tender by the approving authority.
                        </CardDescription>
                        <Badge variant="secondary" className="text-[10px] font-medium px-2.5 py-0.5 shadow-none">
                            Not Required
                        </Badge>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    if (isLoadingRfqData) {
        return (
            <Card className="border border-muted shadow-sm bg-background">
                <CardHeader className="border-b border-muted bg-muted/10 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                        <FileText className="h-4 w-4 text-primary" />
                        Sent RFQs & Responses History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!rfqs || rfqs.length === 0) {
        return (
            <Card className="border border-muted shadow-sm bg-background">
                <CardHeader className="border-b border-muted bg-muted/10 pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                        <MessageCircleOff className="h-4 w-4 text-muted-foreground" />
                        Sent RFQs & Responses History
                    </CardTitle>
                    <CardDescription>
                        No RFQs have been sent for this tender yet.
                    </CardDescription>
                </CardHeader>
                {error && (
                    <CardContent className="p-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>Failed to load RFQ data</AlertDescription>
                        </Alert>
                    </CardContent>
                )}
            </Card>
        );
    }

    return (
        <Card className="border border-muted shadow-sm overflow-hidden bg-background">
            <CardHeader className="border-b border-muted bg-muted/10 pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                            <FileText className="h-4 w-4 text-primary" />
                            Sent RFQs & Responses History
                        </CardTitle>
                        <CardDescription className="text-[11px] text-muted-foreground mt-0.5">
                            View all previously sent RFQs for this tender and their live response statuses.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {rfqRequired && (
                            <Badge variant="outline" className="text-[10px] font-medium px-2.5 py-0.5 shadow-none">
                                {rfqRequired === 'yes' ? 'Required' : 'Not Required'}
                            </Badge>
                        )}
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-none">
                            {rfqs.length} {rfqs.length === 1 ? 'RFQ' : 'RFQs'} Sent
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 bg-card">
                <Accordion type="single" collapsible className="w-full">
                    {rfqs.map((rfq) => (
                        <AccordionItem key={rfq.id} value={String(rfq.id)} className="border-b border-muted last:border-b-0">
                            <AccordionTrigger className="hover:bg-muted/50 transition-all py-3.5 px-6 hover:no-underline [&[data-state=open]]:bg-muted/30">
                                <div className="flex flex-col md:flex-row md:items-center justify-between w-full pr-4 text-left gap-2 text-[11px]">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-xs text-foreground">RFQ #{rfq.id}</span>
                                        <span className="text-muted-foreground text-[10px] bg-muted px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                                            <Clock className="h-3 w-3 text-muted-foreground" /> Sent: {formatDateTime(rfq.createdAt)}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-medium shadow-none">
                                            <FileText className="h-3 w-3 mr-1 text-primary inline" /> {rfq.items.length} {rfq.items.length === 1 ? 'Item' : 'Items'}
                                        </Badge>
                                        <Badge variant="outline" className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20 text-[10px] font-medium shadow-none">
                                            <Building2 className="h-3 w-3 mr-1 text-violet-500 inline" /> {rfq.vendorOrganizations?.length || 0} Org{rfq.vendorOrganizations?.length === 1 ? '' : 's'}
                                        </Badge>
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] font-medium shadow-none">
                                            <Calendar className="h-3 w-3 mr-1 text-amber-500 inline" /> Due: {formatDateTime(rfq.dueDate)}
                                        </Badge>
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6 pt-4 bg-background">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-5 pr-0 lg:pr-6 lg:border-r border-muted">
                                        <div>
                                            <h4 className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-2.5 flex items-center gap-1.5">
                                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                Requirements Sent
                                            </h4>
                                            <div className="border border-muted rounded-md overflow-hidden bg-background shadow-none">
                                                <table className="w-full text-[11px] text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-muted border-b border-muted text-[10px] uppercase font-semibold text-muted-foreground">
                                                            <th className="p-2 pl-3">Item Description</th>
                                                            <th className="p-2 w-20">Unit</th>
                                                            <th className="p-2 w-20 text-right pr-3">Qty</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {rfq.items.map((item, idx) => (
                                                            <tr key={item.id || idx} className="border-b border-muted last:border-0 hover:bg-muted/30 transition-colors text-foreground">
                                                                <td className="p-2 pl-3 font-medium">{item.requirement}</td>
                                                                <td className="p-2 text-muted-foreground">{item.unit || '-'}</td>
                                                                <td className="p-2 text-right pr-3 font-semibold text-foreground">{item.qty || '0'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <h4 className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-2.5 flex items-center gap-1.5">
                                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                                    Attached Documents
                                                </h4>
                                                {rfq.documents && rfq.documents.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                        {rfq.documents.map((doc, idx) => {
                                                            const filename = doc.path.split('/').pop() || 'Document';
                                                            return (
                                                                <a
                                                                    key={doc.id || idx}
                                                                    href={"/uploads/tendering/" + doc.path}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-2 border border-muted rounded flex items-center gap-2 hover:bg-muted transition-all text-primary font-medium truncate bg-background shadow-none text-[11px]"
                                                                >
                                                                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                    <span className="truncate">{filename}</span>
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-[11px] text-muted-foreground italic p-2.5 border border-dashed border-muted rounded bg-muted/10 text-center">
                                                        No documents attached.
                                                    </div>
                                                )}
                                            </div>

                                            {rfq.docList && (
                                                <div>
                                                    <h4 className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-1.5">
                                                        Additional Instructions
                                                    </h4>
                                                    <p className="text-[11px] text-foreground p-2.5 border border-dashed border-muted rounded bg-muted/20 leading-relaxed whitespace-pre-line">
                                                        {rfq.docList}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pl-0">
                                        <RfqResponsesViewer rfqId={rfq.id} />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}
