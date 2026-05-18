import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Resolver, type SubmitHandler, useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { 
    Trash2, Plus, Save, ArrowLeft, Clock, CheckCircle2, 
    AlertTriangle, Building2, User, FileText, FileWarning, ExternalLink,
    Calendar, Paperclip, Loader2
} from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';

// Custom Form Components
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { DateTimeInput } from '@/components/form/DateTimeInput';
import { TenderFileUploader } from '@/components/tender-file-upload';
import { SelectField } from '@/components/form/SelectField';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { NumberInput } from '@/components/form/NumberInput';

// Hooks & Types
import { useCreateRfq, useRfqByTenderId, useUpdateRfq } from '@/hooks/api/useRfqs';
// import { useRfqVendors } from '@/hooks/api/useRfqs';
import { useVendorOrganizationsWithRelations } from '@/hooks/api/useVendorOrganizations';
import { useRfqResponses } from '@/hooks/api/useRfqResponses';
import type { Rfq, RfqDashboardRow } from '../helpers/rfq.types';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/hooks/useFormatedDate';

const RfqFormSchema = z.object({
    dueDate: z.coerce.date({ message: "Due date is required" }),

    scopeOfWorkPaths: z.array(z.string()).default([]),
    techSpecsPaths: z.array(z.string()).default([]),
    detailedBoqPaths: z.array(z.string()).default([]),
    mafFormatPaths: z.array(z.string()).default([]),
    miiFormatPaths: z.array(z.string()).default([]),

    docList: z.string().optional(),
    items: z.array(z.object({
        requirement: z.string().min(1, "Requirement is required"),
        unit: z.string().min(1, "Unit is required"),
        qty: z.number().min(0.01, "Quantity must be greater than 0"),
    })).min(1, "At least one requirement is needed"),

    vendorRows: z.array(z.object({
        orgId: z.string().min(1, "Organization is required"),
        personIds: z.array(z.string()).min(1, "Select at least one contact person"),
    })).optional(),
}).refine(
    (data) => {
        // Calculate total file count
        const totalFiles =
            data.scopeOfWorkPaths.length +
            data.techSpecsPaths.length +
            data.detailedBoqPaths.length +
            data.mafFormatPaths.length +
            data.miiFormatPaths.length;

        // Max 15 files total (3 per field × 5 fields)
        return totalFiles <= 15;
    },
    {
        message: "Maximum 15 files total allowed (3 per field)",
        path: ["scopeOfWorkPaths"],
    }
);

type FormValues = z.infer<typeof RfqFormSchema>;

interface RfqFormProps {
    tenderData: RfqDashboardRow; // Contains tenderNo, tenderName, rfqTo, etc.
    initialData?: Rfq; // For Edit Mode
}

export function RfqForm({ tenderData, initialData }: RfqFormProps) {
    const navigate = useNavigate();
    const createRfq = useCreateRfq();
    const updateRfq = useUpdateRfq();
    const params = useParams();
    const tenderId = params.tenderId ? Number(params.tenderId) : null;

    // const { data: allowedVendors, isLoading: isLoadingVendors } = useRfqVendors(tenderData.rfqTo);
    const { data: allVendorOrganizations, isLoading: isLoadingVendors, error: vendorOrgsError } = useVendorOrganizationsWithRelations();
    const { data: rfqs, isLoading: isLoadingRfqData } = useRfqByTenderId(tenderId);

    const isEditMode = !!initialData;
    const isSubmitting = createRfq.isPending || updateRfq.isPending;

    const latestRfq = useMemo(() => {
        if (!rfqs || rfqs.length === 0) return null;
        // Sort descending by ID to find the latest
        return [...rfqs].sort((a, b) => b.id - a.id)[0];
    }, [rfqs]);

    // Initialize Form
    const form = useForm<FormValues>({
        resolver: zodResolver(RfqFormSchema) as Resolver<FormValues>,
        defaultValues: {
            dueDate: tenderData?.dueDate ? new Date(tenderData.dueDate) : undefined,
            items: [{ requirement: '', unit: '', qty: undefined }],
            vendorRows: [],
            docList: '',
            scopeOfWorkPaths: [],
            techSpecsPaths: [],
            detailedBoqPaths: [],
            mafFormatPaths: [],
            miiFormatPaths: [],
        },
    });

    // Watch file paths for display
    const scopeOfWorkPaths = form.watch('scopeOfWorkPaths');
    const techSpecsPaths = form.watch('techSpecsPaths');
    const detailedBoqPaths = form.watch('detailedBoqPaths');
    const mafFormatPaths = form.watch('mafFormatPaths');
    const miiFormatPaths = form.watch('miiFormatPaths');

    const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
        control: form.control,
        name: "items"
    });

    const { fields: vendorFields, append: appendVendor, remove: removeVendor } = useFieldArray({
        control: form.control,
        name: "vendorRows"
    });

    // Compute initial due date from tender data
    const initialDueDate = useMemo(() => {
        if (!isEditMode && tenderData?.dueDate) {
            if (tenderData.dueDate instanceof Date) {
                return isNaN(tenderData.dueDate.getTime()) ? undefined : tenderData.dueDate;
            } else if (typeof tenderData.dueDate === 'string') {
                const date = new Date(tenderData.dueDate);
                return isNaN(date.getTime()) ? undefined : date;
            }
        }
        return undefined;
    }, [isEditMode, tenderData?.dueDate]);

    // Initialize due date from tender data when creating new RFQ
    useEffect(() => {
        if (!isEditMode && initialDueDate) {
            form.setValue('dueDate', initialDueDate, {
                shouldValidate: false,
                shouldDirty: false,
                shouldTouch: false
            });
        }
    }, [isEditMode, initialDueDate, form]);

    useEffect(() => {
        const targetData = isEditMode ? initialData : latestRfq;

        if (targetData && allVendorOrganizations) {
            const reconstructedRows: FormValues['vendorRows'] = [];
            // Group documents by docType
            const scopeOfWorkDocs = targetData.documents
                ?.filter(d => d.docType === 'SCOPE_OF_WORK')
                .map(d => d.path) || [];
            const techSpecsDocs = targetData.documents
                ?.filter(d => d.docType === 'TECH_SPECS')
                .map(d => d.path) || [];
            const detailedBoqDocs = targetData.documents
                ?.filter(d => d.docType === 'DETAILED_BOQ')
                .map(d => d.path) || [];
            const mafFormatDocs = targetData.documents
                ?.filter(d => d.docType === 'MAF_FORMAT')
                .map(d => d.path) || [];
            const miiFormatDocs = targetData.documents
                ?.filter(d => d.docType === 'MII_FORMAT')
                .map(d => d.path) || [];

            // Reconstruct vendorRows from comma-separated list of organization and vendor IDs
            if (targetData.requestedOrganization) {
                const orgIds = targetData.requestedOrganization.split(',').filter(id => !!id);
                const selectedPersonIds = targetData.requestedVendor ? targetData.requestedVendor.split(',').filter(id => !!id) : [];

                orgIds.forEach(orgId => {
                    const org = allVendorOrganizations.find(o => String(o.id) === orgId);
                    if (org) {
                        // Find which of the selectedPersonIds belong to this organization's persons list
                        const orgPersonIds = org.persons
                            .map(p => String(p.id))
                            .filter(pId => selectedPersonIds.includes(pId));

                        reconstructedRows.push({
                            orgId: String(org.id),
                            personIds: orgPersonIds,
                        });
                    }
                });
            }

            // For Create mode, prioritize the initialDueDate from tender details over the old RFQ due date
            const dueDateValue = isEditMode
                ? (targetData.dueDate ? new Date(targetData.dueDate) : new Date())
                : (initialDueDate || (targetData.dueDate ? new Date(targetData.dueDate) : undefined));

            form.reset({
                dueDate: dueDateValue,
                docList: targetData.docList || '',
                items: targetData.items.map(i => ({
                    requirement: i.requirement,
                    unit: i.unit || '',
                    qty: Number(i.qty)
                })),
                vendorRows: reconstructedRows,
                scopeOfWorkPaths: scopeOfWorkDocs,
                techSpecsPaths: techSpecsDocs,
                detailedBoqPaths: detailedBoqDocs,
                mafFormatPaths: mafFormatDocs,
                miiFormatPaths: miiFormatDocs,
            });
        }
    }, [isEditMode, initialData, latestRfq, allVendorOrganizations, form, initialDueDate]);

    // Reset personIds when orgId changes for any vendor row
    useEffect(() => {
        const subscription = form.watch((_value, { name }) => {
            if (name && name.startsWith('vendorRows.') && name.endsWith('.orgId')) {
                const indexMatch = name.match(/vendorRows\.(\d+)\.orgId/);
                if (indexMatch) {
                    const index = parseInt(indexMatch[1], 10);
                    const currentPersonIds = form.getValues(`vendorRows.${index}.personIds`);
                    if (currentPersonIds && currentPersonIds.length > 0) {
                        form.setValue(`vendorRows.${index}.personIds`, []);
                    }
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [form]);

    const handleSubmit: SubmitHandler<FormValues> = async (values) => {
        // 1. Collect Vendor and Organization IDs
        const allSelectedPersonIds = values.vendorRows?.flatMap(row => row.personIds) || [];
        const allSelectedOrgIds = values.vendorRows?.map(row => row.orgId).filter(id => !!id) || [];

        // Remove duplicates and join to CSV
        const uniquePersonIds = Array.from(new Set(allSelectedPersonIds)).join(',');
        const uniqueOrgIds = Array.from(new Set(allSelectedOrgIds)).join(',');

        // 2. Convert file paths to documents array format expected by API
        const documents = [
            ...values.scopeOfWorkPaths.map(path => ({ docType: 'SCOPE_OF_WORK', path })),
            ...values.techSpecsPaths.map(path => ({ docType: 'TECH_SPECS', path })),
            ...values.detailedBoqPaths.map(path => ({ docType: 'DETAILED_BOQ', path })),
            ...values.mafFormatPaths.map(path => ({ docType: 'MAF_FORMAT', path })),
            ...values.miiFormatPaths.map(path => ({ docType: 'MII_FORMAT', path })),
        ];

        const payload = {
            tenderId: tenderData.tenderId,
            dueDate: values.dueDate.toISOString(),
            docList: values.docList,
            requestedOrganization: uniqueOrgIds,
            requestedVendor: uniquePersonIds,
            items: values.items.map(i => ({
                ...i,
                qty: Number(i.qty) // ensure number
            })),
            documents: documents.length > 0 ? documents : undefined,
        };

        try {
            if (isEditMode && initialData) {
                await updateRfq.mutateAsync({ id: initialData.id, data: payload });
            } else {
                await createRfq.mutateAsync(payload);
            }
            // Navigate back
            navigate(-1);
        } catch (error) {
            console.error("Error submitting RFQ", error);
        }
    };

    // Helper to get options for dropdowns
    // const vendorOrgOptions = allowedVendors?.map(v => ({ label: v.name, value: String(v.id) })) || [];
    const vendorOrgOptions = useMemo(() => {
        const options = allVendorOrganizations?.map(v => ({ label: v.name, value: String(v.id) })) || [];
        console.log('vendorOrgOptions:', options);
        return options;
    }, [allVendorOrganizations]);



    return (
        <div className="space-y-6 text-foreground">
            {/* Sent RFQs Accordion Panel */}
            {rfqs && rfqs.length > 0 && (
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
                                                    <Building2 className="h-3 w-3 mr-1 text-violet-500 inline" /> {rfq.requestedOrganizationNames?.length || 0} Org{rfq.requestedOrganizationNames?.length === 1 ? '' : 's'}
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
                                                                            href={doc.path} 
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

                                            {/* Right Column: Live Responses Tracker -> Cool shit */}
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
            )}

            <Card className="border border-muted shadow-sm">
                <CardHeader className="border-b border-muted bg-muted/10 pb-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle>{isEditMode ? 'Edit' : 'Create'} RFQ</CardTitle>
                        <CardDescription>
                            Configure requirements and select vendors for this tender.
                            {/* Tender Info Summary */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm bg-background p-3 rounded-md border">
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase font-bold">Tender Number</span>
                                    <span className="font-medium">{tenderData.tenderNo}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase font-bold">Tender Name</span>
                                    <span className="font-medium">{tenderData.tenderName}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase font-bold">Item Name</span>
                                    <span className="font-medium">{tenderData.itemName}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase font-bold">Tender Due Date</span>
                                    <span className="font-medium">{formatDateTime(tenderData.dueDate)}</span>
                                </div>
                            </div>
                        </CardDescription>
                    </div>
                    <CardAction>
                        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                </div>

            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">

                        {/* SECTION 1: General Info & Docs */}
                        <div className="space-y-4">
                            <div className="w-full md:w-1/3">
                                <FieldWrapper control={form.control} name="dueDate" label="Due Date">
                                    {(field) => {
                                        // Convert Date to datetime-local format: "YYYY-MM-DDTHH:mm"
                                        const toDateTimeLocalString = (date: Date | undefined | null): string => {
                                            if (!date || isNaN(date.getTime())) return '';
                                            const year = date.getFullYear();
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const day = String(date.getDate()).padStart(2, '0');
                                            const hours = String(date.getHours()).padStart(2, '0');
                                            const minutes = String(date.getMinutes()).padStart(2, '0');
                                            return `${year}-${month}-${day}T${hours}:${minutes}`;
                                        };

                                        return (
                                            <DateTimeInput
                                                value={toDateTimeLocalString(field.value)}
                                                onChange={(value) => field.onChange(value ? new Date(value) : undefined)}
                                                placeholder="Select date and time"
                                            />
                                        );
                                    }}
                                </FieldWrapper>
                            </div>

                            <div className="space-y-4 pt-2">
                                <Alert>
                                    <AlertDescription className="text-sm">
                                        Maximum 3 files per field. Total combined size should not exceed 25MB for Gmail compatibility.
                                    </AlertDescription>
                                </Alert>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <TenderFileUploader
                                        context="rfq-scope-of-work"
                                        value={scopeOfWorkPaths}
                                        onChange={(paths) => form.setValue("scopeOfWorkPaths", paths)}
                                        label="Scope of Work"
                                        disabled={isSubmitting}
                                    />
                                    <TenderFileUploader
                                        context="rfq-tech-specs"
                                        value={techSpecsPaths}
                                        onChange={(paths) => form.setValue("techSpecsPaths", paths)}
                                        label="Technical Specifications"
                                        disabled={isSubmitting}
                                    />
                                    <TenderFileUploader
                                        context="rfq-detailed-boq"
                                        value={detailedBoqPaths}
                                        onChange={(paths) => form.setValue("detailedBoqPaths", paths)}
                                        label="Detailed BOQ"
                                        disabled={isSubmitting}
                                    />
                                    <TenderFileUploader
                                        context="rfq-maf-format"
                                        value={mafFormatPaths}
                                        onChange={(paths) => form.setValue("mafFormatPaths", paths)}
                                        label="MAF Format"
                                        disabled={isSubmitting}
                                    />
                                    <TenderFileUploader
                                        context="rfq-mii-format"
                                        value={miiFormatPaths}
                                        onChange={(paths) => form.setValue("miiFormatPaths", paths)}
                                        label="MII Format"
                                        disabled={isSubmitting}
                                    />
                                    <FieldWrapper control={form.control} name="docList" label="Other Documents Needed">
                                        {(field) => (
                                            <textarea
                                                {...field}
                                                className="flex min-h-[42px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                placeholder="List any other required docs..."
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Dynamic Requirements */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Requirements</h3>
                                <Button type="button" variant="secondary" size="sm" onClick={() => appendItem({ requirement: '', unit: '', qty: 0 })}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Item
                                </Button>
                            </div>
                            <Separator />

                            <div className="space-y-3">
                                {itemFields.map((field, index) => (
                                    <div key={field.id} className="flex items-center gap-4 p-3 border rounded-md bg-muted/5 group">
                                        <div className="flex-1">
                                            <FieldWrapper control={form.control} name={`items.${index}.requirement`} label={index === 0 ? "Requirement" : undefined}>
                                                {(f) => <Input {...f} placeholder="Item description..." />}
                                            </FieldWrapper>
                                        </div>
                                        <div className="w-48">
                                            <FieldWrapper control={form.control} name={`items.${index}.unit`} label={index === 0 ? "Unit" : undefined}>
                                                {(f) => <input {...f} className="w-full h-[38px] px-2 text-sm border rounded bg-background" placeholder="Nos/Kg" />}
                                            </FieldWrapper>
                                        </div>
                                        <div className="w-48">
                                            <FieldWrapper control={form.control} name={`items.${index}.qty`} label={index === 0 ? "Quantity" : undefined}>
                                                {(f) => <NumberInput {...f} placeholder="0.00" />}
                                            </FieldWrapper>
                                        </div>
                                        <div className={index === 0 ? "pt-7" : ""}>
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeItem(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SECTION 3: Vendor Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Select Vendors</h3>
                                <Button type="button" variant="secondary" size="sm" onClick={() => appendVendor({ orgId: '', personIds: [] })}>
                                    <Plus className="h-4 w-4 mr-2" /> Add Vendor
                                </Button>
                            </div>
                            <Separator />

                            {/* Error handling for vendor organizations */}
                            {vendorOrgsError && (
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        Error loading vendor organizations: {vendorOrgsError instanceof Error ? vendorOrgsError.message : 'Unknown error'}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Loading state indicator */}
                            {isLoadingVendors && (
                                <Alert>
                                    <AlertDescription>
                                        Loading vendor organizations...
                                    </AlertDescription>
                                </Alert>
                            )}

                            {vendorFields.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                                    No vendors selected. Click "Add Vendor" to start.
                                </div>
                            )}

                            <div className="space-y-4">
                                {vendorFields.map((field, index) => {
                                    // Logic to filter Person dropdown based on Org selection for THIS specific row
                                    const currentOrgId = form.watch(`vendorRows.${index}.orgId`);
                                    // const selectedOrg = allowedVendors?.find(v => String(v.id) === currentOrgId);
                                    const selectedOrg = allVendorOrganizations?.find(v => String(v.id) === currentOrgId);
                                    const personOptions = selectedOrg?.persons.map(p => ({
                                        label: p.name,
                                        value: String(p.id)
                                    })) || [];

                                    return (
                                        <div key={field.id} className="flex flex-col md:flex-row items-start gap-4 p-4 border rounded-lg bg-card shadow-sm">
                                            <Badge variant="outline" className="md:hidden mb-2">Vendor {index + 1}</Badge>

                                            <div className="flex-1 w-full md:w-1/3">
                                                <SelectField
                                                    control={form.control}
                                                    name={`vendorRows.${index}.orgId`}
                                                    label="Organization"
                                                    placeholder="Select Organization"
                                                    options={vendorOrgOptions}
                                                />
                                            </div>

                                            <div className="flex-1 w-full md:w-2/3">
                                                <MultiSelectField
                                                    control={form.control}
                                                    name={`vendorRows.${index}.personIds`}
                                                    label="Contact Persons"
                                                    placeholder={currentOrgId ? "Select people..." : "Select Organization first"}
                                                    options={personOptions}
                                                />
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:bg-destructive/10 mt-8"
                                                onClick={() => removeVendor(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end gap-3 pt-6 border-t border-muted/30">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || isLoadingVendors}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground/70" />}
                                <Save className="mr-2 h-4 w-4 text-foreground/80" />
                                {isEditMode ? 'Update RFQ' : 'Create RFQ'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
        </div>
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
            <div className="grid grid-cols-1 gap-4">
                
                {/* Responses Received */}
                <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        RESPONSES RECEIVED ({received.length})
                    </span>
                    {received.length > 0 ? (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                            <Accordion type="single" collapsible className="w-full space-y-1.5">
                                {received.map((res: any, idx: number) => {
                                    const valueId = `resp-${res.id || idx}`;
                                    return (
                                        <AccordionItem key={res.id || idx} value={valueId} className="border border-muted rounded bg-muted/20 hover:bg-muted/30 transition-all text-xs overflow-hidden last:border-b">
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
                                            <AccordionContent className="p-3 pt-2 bg-background space-y-3.5">
                                                {/* Remarks callout */}
                                                {res.remarks && (
                                                    <div className="p-2 bg-muted/30 border border-muted border-dashed rounded text-[10px] text-muted-foreground italic leading-relaxed">
                                                        &ldquo;{res.remarks}&rdquo;
                                                    </div>
                                                )}

                                                {/* Quotation Details */}
                                                {String(res.responseStatus) === '1' && (
                                                    <div className="grid grid-cols-3 gap-2 py-1.5 px-2 bg-muted/20 border border-muted rounded text-[10px] text-muted-foreground">
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
                                                                        <th className="p-1.5 pl-2">Item Description</th>
                                                                        <th className="p-1.5 w-20 text-right">Unit Price</th>
                                                                        <th className="p-1.5 w-16 text-right pr-2">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {res.items.map((it: any, iIdx: number) => (
                                                                        <tr key={it.id || iIdx} className="border-b border-muted last:border-0 hover:bg-muted/10 transition-colors text-foreground">
                                                                            <td className="p-1.5 pl-2 font-medium truncate max-w-[120px]">{it.requirement}</td>
                                                                            <td className="p-1.5 text-right font-medium">₹{it.unitPrice ? Number(it.unitPrice).toLocaleString('en-IN') : '0'}</td>
                                                                            <td className="p-1.5 text-right font-semibold pr-2">₹{it.totalPrice ? Number(it.totalPrice).toLocaleString('en-IN') : '0'}</td>
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
                                                        <div className="grid grid-cols-1 gap-1.5">
                                                            {res.documents.map((doc: any, dIdx: number) => {
                                                                const filename = doc.path.split('/').pop() || 'Document';
                                                                return (
                                                                    <a 
                                                                        key={doc.id || dIdx} 
                                                                        href={doc.path} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="p-2 border border-muted rounded flex items-center justify-between hover:bg-muted transition-all text-primary font-medium truncate bg-background text-[10px]"
                                                                    >
                                                                        <div className="flex items-center gap-1.5 truncate">
                                                                            <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                            <span className="font-semibold uppercase text-[9px] text-muted-foreground border px-1 rounded shrink-0">{doc.docType.replace('_', ' ')}</span>
                                                                            <span className="truncate text-muted-foreground">{filename}</span>
                                                                        </div>
                                                                        <ExternalLink className="h-3 w-3 text-primary shrink-0 ml-1" />
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="text-[9px] text-right text-muted-foreground font-medium pt-1.5 border-t border-dashed border-muted">
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

                {/* Pending Responses */}
                <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        AWAITING RESPONSES ({pending.length})
                    </span>
                    {pending.length > 0 ? (
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                            {pending.map((org: any, idx: number) => (
                                <div key={org.organizationId || idx} className="p-2.5 border border-muted rounded bg-muted/20 flex items-center justify-between text-xs hover:bg-muted/40 transition-all">
                                    <div>
                                        <span className="font-semibold text-foreground flex items-center gap-1 text-[11px]">
                                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                            {org.organizationName}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                                            {org.vendors?.length ? `${org.vendors.length} vendors requested` : 'No specific vendors'}
                                        </span>
                                    </div>
                                    <Badge variant="outline" className="text-amber-700 bg-amber-500/10 border border-amber-500/35 text-[9px] font-semibold uppercase animate-pulse rounded shadow-none">Awaiting</Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold p-4 border border-emerald-500/20 rounded bg-emerald-500/10 text-center flex flex-col items-center justify-center gap-1.5">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-bounce" />
                            All requested vendors responded!
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
