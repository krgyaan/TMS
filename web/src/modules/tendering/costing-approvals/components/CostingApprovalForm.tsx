import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
    ArrowLeft, Save, IndianRupee, Percent,
    Clock, CheckCircle2, AlertTriangle, Building2, User, FileText, FileWarning, ExternalLink, Calendar, Paperclip, Loader2
} from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useEffect } from 'react';
import { useApproveCosting, useUpdateApprovedCosting } from '@/hooks/api/useCostingApprovals';
import type { TenderCostingSheet } from '@/modules/tendering/costing-sheets/helpers/costingSheet.types';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations';
import { formatINR } from '@/hooks/useINRFormatter';
import type { VendorOrganization } from '@/types/api.types';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { useRfqByTenderId } from '@/hooks/api/useRfqs';
import { useRfqResponses } from '@/hooks/api/useRfqResponses';


// Schema for form values (MultiSelectField returns strings)
const CostingApprovalFormSchema = z.object({
    finalPrice: z.string().min(1, 'Final price is required'),
    receiptPrice: z.string().min(1, 'Receipt price is required'),
    budgetPrice: z.string().min(1, 'Budget price is required'),
    grossMargin: z.string(),
    oemVendorIds: z.array(z.string()).min(1, 'At least one vendor must be selected'),
    tlRemarks: z.string().min(1, 'Remarks are required'),
});

type FormValues = z.infer<typeof CostingApprovalFormSchema>;

interface CostingApprovalFormProps {
    costingSheet: TenderCostingSheet;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        dueDate: Date | null;
        teamMemberName: string | null;
    };
    mode: 'approve' | 'edit';
}

export default function CostingApprovalForm({
    costingSheet,
    tenderDetails,
    mode
}: CostingApprovalFormProps) {
    const navigate = useNavigate();
    const approveMutation = useApproveCosting();
    const updateMutation = useUpdateApprovedCosting();
    const { data: vendors } = useVendorOrganizations();

    const vendorOptions = vendors?.map((v: VendorOrganization) => ({
        value: v.id.toString(),
        label: v.name,
    })) || [];

    // Determine default values based on mode
    // Note: MultiSelectField works with strings, so we convert numbers to strings
    const getDefaultValues = () => {
        if (mode === 'edit') {
            // In edit mode, use approved values
            return {
                finalPrice: costingSheet.finalPrice || '',
                receiptPrice: costingSheet.receiptPrice || '',
                budgetPrice: costingSheet.budgetPrice || '',
                grossMargin: costingSheet.grossMargin || '0.00',
                oemVendorIds: (costingSheet.oemVendorIds || []).map(id => id.toString()),
                tlRemarks: costingSheet.tlRemarks || '',
            };
        } else {
            // In approve mode, use submitted values as starting point
            return {
                finalPrice: costingSheet.submittedFinalPrice || '',
                receiptPrice: costingSheet.submittedReceiptPrice || '',
                budgetPrice: costingSheet.submittedBudgetPrice || '',
                grossMargin: costingSheet.submittedGrossMargin || '0.00',
                oemVendorIds: [],
                tlRemarks: '',
            };
        }
    };

    const defaultValues = getDefaultValues();

    const form = useForm<FormValues>({
        resolver: zodResolver(CostingApprovalFormSchema),
        defaultValues,
    });

    const receiptPrice = form.watch('receiptPrice');
    const budgetPrice = form.watch('budgetPrice');

    // Auto-calculate gross margin
    useEffect(() => {
        const receipt = parseFloat(receiptPrice) || 0;
        const budget = parseFloat(budgetPrice) || 0;

        // grossMargin = receipt > 0 ? ((receipt - budget) / receipt) * 100 : 0;
        if (receipt > 0) {
            const margin = ((receipt - budget) / receipt) * 100;
            form.setValue('grossMargin', margin.toFixed(2));
        } else {
            form.setValue('grossMargin', '0.00');
        }
    }, [receiptPrice, budgetPrice, form]);

    const isSubmitting = form.formState.isSubmitting;

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            // Transform form data: convert string vendor IDs to numbers
            const transformedData = {
                ...data,
                oemVendorIds: data.oemVendorIds.map(id => Number(id)),
            };

            if (mode === 'approve') {
                await approveMutation.mutateAsync({
                    id: costingSheet.id,
                    data: transformedData,
                });
            } else {
                await updateMutation.mutateAsync({
                    id: costingSheet.id,
                    data: transformedData,
                });
            }
            navigate(paths.tendering.costingApprovals);
        } catch (error) {
            console.error('Error processing approval:', error);
            // Error toast is handled by the mutation hooks
        }
    };

    const onError = (errors: any) => {
        console.error('Form validation errors:', errors);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === 'approve' ? 'Approve Costing Sheet' : 'Edit Approved Costing'}
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'approve'
                                ? 'Review and approve the costing details submitted by the team engineer'
                                : 'Update the approved costing details'}
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
                        {/* Tender Basic Details */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Tender Information
                            </h4>
                            <div className="grid gap-4 md:grid-cols-2 bg-muted/30 p-4 rounded-lg">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Tender No</p>
                                    <p className="text-base font-semibold">{tenderDetails.tenderNo}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Team Member</p>
                                    <p className="text-base font-semibold">{tenderDetails.teamMemberName || '—'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Tender Name</p>
                                    <p className="text-base font-semibold">{tenderDetails.tenderName}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                                    <p className="text-base font-semibold">
                                        {tenderDetails.dueDate ? formatDateTime(tenderDetails.dueDate) : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* RFQ & Responses Details */}
                        <SentRfqsResponsesHistory tenderId={costingSheet.tenderId} />

                        {/* Side-by-Side Comparison */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Costing Details Comparison
                            </h4>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Left Side - TE Submitted Values (Read-only) */}
                                <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                        <h5 className="font-semibold text-sm text-blue-700 dark:text-blue-300">
                                            TE Submitted Values
                                        </h5>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Final Price (GST Inclusive)</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                            {costingSheet.submittedFinalPrice
                                                ? formatINR(parseFloat(costingSheet.submittedFinalPrice))
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Receipt (Pre GST)</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                            {costingSheet.submittedReceiptPrice
                                                ? formatINR(parseFloat(costingSheet.submittedReceiptPrice))
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Budget (Pre GST)</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                            {costingSheet.submittedBudgetPrice
                                                ? formatINR(parseFloat(costingSheet.submittedBudgetPrice))
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Gross Margin</p>
                                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                            {costingSheet.submittedGrossMargin
                                                ? `${costingSheet.submittedGrossMargin}%`
                                                : '—'}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">TE Remarks</p>
                                        <p className="text-sm text-muted-foreground">
                                            {costingSheet.teRemarks || '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Right Side - TL Approval Values (Editable) */}
                                <div className="space-y-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                        <h5 className="font-semibold text-sm text-green-700 dark:text-green-300">
                                            TL Approved Values
                                        </h5>
                                    </div>

                                    <FieldWrapper
                                        control={form.control}
                                        name="finalPrice"
                                        label="Final Price (GST Inclusive)"
                                    >
                                        {(field) => (
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    step="0.01"
                                                    className="pl-10"
                                                    placeholder="Enter final price"
                                                />
                                            </div>
                                        )}
                                    </FieldWrapper>

                                    <FieldWrapper
                                        control={form.control}
                                        name="receiptPrice"
                                        label="Receipt (Pre GST)"
                                    >
                                        {(field) => (
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    step="0.01"
                                                    className="pl-10"
                                                    placeholder="Enter receipt price"
                                                />
                                            </div>
                                        )}
                                    </FieldWrapper>

                                    <FieldWrapper
                                        control={form.control}
                                        name="budgetPrice"
                                        label="Budget (Pre GST)"
                                    >
                                        {(field) => (
                                            <div className="relative">
                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    step="0.01"
                                                    className="pl-10"
                                                    placeholder="Enter budget price"
                                                />
                                            </div>
                                        )}
                                    </FieldWrapper>

                                    <FieldWrapper
                                        control={form.control}
                                        name="grossMargin"
                                        label="Gross Margin %"
                                    >
                                        {(field) => (
                                            <div className="relative">
                                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    {...field}
                                                    type="text"
                                                    className="pl-10 bg-muted"
                                                    placeholder="Auto-calculated"
                                                    readOnly
                                                />
                                            </div>
                                        )}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {/* OEM/Vendor Selection */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    Vendor Selection
                                </h4>
                                <MultiSelectField
                                    control={form.control}
                                    name="oemVendorIds"
                                    label="OEM/Vendor Organizations"
                                    options={vendorOptions}
                                    placeholder="Select vendors"
                                />
                            </div>
                            {/* TL Remarks */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">
                                    TL Remarks
                                </h4>
                                <FieldWrapper
                                    control={form.control}
                                    name="tlRemarks"
                                    label="Remarks"
                                >
                                    {(field) => (
                                        <Textarea
                                            {...field}
                                            rows={4}
                                            placeholder="Enter your remarks about this costing approval"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex justify-end gap-2 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate(-1)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => form.reset(defaultValues)}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                variant="default"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === 'approve' ? 'Approve' : 'Update'} Costing
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

/**
 * Modern real-time status tracker for sent RFQs
 */
function RfqResponsesViewer({ rfqId }: { rfqId: number }) {
    const { data: responsesData, isLoading } = useRfqResponses(rfqId);

    if (isLoading) {
        return (
            <div className="space-y-3 py-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-20 w-full" />
            </div>
        );
    }

    const received = responsesData?.currentRfqResponses || [];
    const pending = responsesData?.pendingTenderResponses || [];

    const getStatusBadge = (status: any) => {
        const s = String(status);
        switch (s) {
            case '1':
                return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold rounded shadow-none">Quotation Received</Badge>;
            case '2':
                return <Badge variant="destructive" className="text-[10px] font-semibold rounded shadow-none">Product not available</Badge>;
            case '3':
                return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold rounded shadow-none">OEM docs not provided</Badge>;
            case '4':
                return <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20 text-[10px] font-semibold rounded shadow-none">Not allowed by OEM</Badge>;
            case '5':
                return <Badge className="bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20 text-[10px] font-semibold rounded shadow-none">Not Quoted by OEM</Badge>;
            default:
                return <Badge variant="outline" className="text-[10px] font-semibold border-muted rounded shadow-none">Awaiting Response</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Responses Tracker
            </h4>
            
            {/* Awaiting Responses (Pending) on Top */}
            {(received.length + pending.length) === 0 ? (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-md p-3 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    No vendors requested for this RFQ.
                </div>
            ) : pending.length > 0 ? (
                <div className="bg-muted/10 border border-muted rounded-md p-3 space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Awaiting Responses ({pending.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {pending.map((org: any, idx: number) => (
                            <Badge 
                                key={org.organizationId || idx} 
                                variant="outline" 
                                className="bg-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] py-1 px-2.5 font-medium flex items-center gap-1.5 rounded-full shadow-none"
                            >
                                <Building2 className="h-3 w-3 text-amber-500" />
                                {org.organizationName}
                            </Badge>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-md p-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    All requested vendors responded!
                </div>
            )}

            {/* Responses Received (Detailed Accordion) Below */}
            <div className="space-y-2 pt-1">
                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Responses Received ({received.length})
                </span>
                {received.length > 0 ? (
                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                        <Accordion type="single" collapsible className="w-full space-y-1.5">
                            {received.map((res: any, idx: number) => {
                                const valueId = `resp-${res.id || idx}`;
                                return (
                                    <AccordionItem key={res.id || idx} value={valueId} className="border border-muted rounded bg-muted/20 hover:bg-muted/30 transition-all text-xs overflow-hidden last:border-b-0">
                                        <AccordionTrigger className="hover:bg-muted/40 transition-all p-3 hover:no-underline [&[data-state=open]]:bg-muted/40 [&[data-state=open]]:border-b border-muted">
                                            <div className="flex items-start justify-between gap-2 w-full pr-4 text-left">
                                                <div className="text-foreground">
                                                    <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {res.organizationName || 'Unknown Org'}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 font-normal">
                                                        <User className="h-3 w-3 text-muted-foreground" /> Submitted by {res.vendorName}
                                                    </span>
                                                </div>
                                                <div className="shrink-0">
                                                    {getStatusBadge(res.responseStatus)}
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="p-4 pt-2 bg-background space-y-3.5">
                                            {/* Remarks callout */}
                                            {res.remarks && (
                                                <div className="p-2 bg-muted/30 border border-muted border-dashed rounded text-[10px] text-muted-foreground italic leading-relaxed">
                                                    &ldquo;{res.remarks}&rdquo;
                                                </div>
                                            )}

                                            {/* Quotation Details */}
                                            {String(res.responseStatus) === '1' && (
                                                <div className="grid grid-cols-3 gap-2 py-1.5 px-2.5 bg-muted/20 border border-muted rounded text-[10px] text-muted-foreground">
                                                    <div>
                                                        <span className="block font-semibold text-foreground">Delivery</span>
                                                        <span className="text-muted-foreground">{res.deliveryTime ?? 'N/A'} days</span>
                                                    </div>
                                                    <div>
                                                        <span className="block font-semibold text-foreground">GST</span>
                                                        <span className="text-muted-foreground">{res.gstPercentage != null ? `${res.gstPercentage}%` : 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block font-semibold text-foreground">Freight</span>
                                                        <span className="capitalize text-muted-foreground">{res.freightType || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Quoted Pricing Items */}
                                            {res.items && res.items.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <span className="block text-[9px] font-bold text-muted-foreground tracking-wider uppercase">Quoted Pricing</span>
                                                    <div className="border border-muted rounded-md overflow-hidden bg-background">
                                                        <table className="w-full text-[10px] text-left border-collapse">
                                                            <thead>
                                                                <tr className="bg-muted border-b border-muted text-[8px] uppercase font-semibold text-muted-foreground">
                                                                    <th className="p-2 pl-3">Item Description</th>
                                                                    <th className="p-2 w-24 text-right">Unit Price</th>
                                                                    <th className="p-2 w-24 text-right pr-3">Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {res.items.map((it: any, iIdx: number) => (
                                                                    <tr key={it.id || iIdx} className="border-b border-muted last:border-0 hover:bg-muted/10 transition-colors text-foreground">
                                                                        <td className="p-2 pl-3 font-medium truncate max-w-[250px]">{it.requirement}</td>
                                                                        <td className="p-2 text-right font-medium">₹{it.unitPrice ? Number(it.unitPrice).toLocaleString('en-IN') : '0'}</td>
                                                                        <td className="p-2 text-right font-semibold pr-3">₹{it.totalPrice ? Number(it.totalPrice).toLocaleString('en-IN') : '0'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Quoted Documents */}
                                            {res.documents && res.documents.length > 0 && (
                                                <div className="space-y-1.5">
                                                    <span className="block text-[9px] font-bold text-muted-foreground tracking-wider uppercase">Submitted Docs</span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {res.documents.map((doc: any, dIdx: number) => {
                                                            const filename = doc.path.split('/').pop() || 'Document';
                                                            return (
                                                                <a 
                                                                    key={doc.id || dIdx} 
                                                                    href={doc.path.startsWith('http') ? doc.path : doc.path.startsWith('/') ? `/uploads/tendering${doc.path}` : `/uploads/tendering/${doc.path}`} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="p-2.5 border border-muted rounded flex items-center justify-between hover:bg-muted transition-all text-primary font-medium truncate bg-background text-[10px]"
                                                                >
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                        <span className="font-semibold uppercase text-[8px] text-muted-foreground border px-1.5 py-0.5 rounded bg-muted/30 shrink-0">{doc.docType.replace('_', ' ')}</span>
                                                                        <span className="truncate text-muted-foreground">{filename}</span>
                                                                    </div>
                                                                    <ExternalLink className="h-3 w-3 text-primary shrink-0 ml-1" />
                                                                </a>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="text-[9px] text-right text-muted-foreground font-medium pt-2 border-t border-dashed border-muted">
                                                Received: {formatDateTime(res.receiptDatetime)}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </div>
                ) : (
                    <div className="text-[11px] text-muted-foreground italic p-4 border border-dashed border-muted rounded bg-muted/10 text-center flex flex-col items-center justify-center gap-1.5">
                        <FileWarning className="h-5 w-5 text-muted-foreground" />
                        No responses received yet.
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Sent RFQs Accordion Panel
 */
export function SentRfqsResponsesHistory({ tenderId }: { tenderId: number }) {
    const { data: rfqs, isLoading: isLoadingRfqData } = useRfqByTenderId(tenderId);

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

    if (!rfqs || rfqs.length === 0) return null;

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
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-none">
                        {rfqs.length} {rfqs.length === 1 ? 'RFQ' : 'RFQs'} Sent
                    </Badge>
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
                                    {/* Left Column: Requirements and Docs */}
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

                                    {/* Right Column: Live Responses Tracker */}
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
