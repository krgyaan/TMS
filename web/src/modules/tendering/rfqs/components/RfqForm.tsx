import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Resolver, type SubmitHandler, useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Save, ArrowLeft } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Custom Form Components
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { DateTimeInput } from '@/components/form/DateTimeInput';
import { TenderFileUploader } from '@/components/tender-file-upload';
import { SelectField } from '@/components/form/SelectField';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { NumberInput } from '@/components/form/NumberInput';

// Hooks & Types
import { useCreateRfq, useUpdateRfq } from '@/hooks/api/useRfqs';
// import { useRfqVendors } from '@/hooks/api/useRfqs';
import { useVendorOrganizationsWithRelations } from '@/hooks/api/useVendorOrganizations';
import type { Rfq, RfqDashboardRow } from '../helpers/rfq.types';
import { Input } from '@/components/ui/input';

const RfqFormSchema = z.object({
    dueDate: z.date({ message: "Due date is required" }),

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

    // const { data: allowedVendors, isLoading: isLoadingVendors } = useRfqVendors(tenderData.rfqTo);
    const { data: allVendorOrganizations, isLoading: isLoadingVendors, error: vendorOrgsError } = useVendorOrganizationsWithRelations();

    // Debug logging
    console.log('allVendorOrganizations:', allVendorOrganizations);
    console.log('isLoadingVendors:', isLoadingVendors);
    console.log('vendorOrgsError:', vendorOrgsError);

    const isEditMode = !!initialData;
    const isSubmitting = createRfq.isPending || updateRfq.isPending;

    // Initialize Form
    const form = useForm<FormValues>({
        resolver: zodResolver(RfqFormSchema) as Resolver<FormValues>,
        defaultValues: {
            dueDate: undefined,
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
        if (initialData && allVendorOrganizations) {
            // Map flat requestedVendor string ("101,102") back to structured rows
            const currentVendorIds = (initialData.requestedVendor || '').split(',').filter(Boolean);

            // Group IDs by Organization to rebuild the UI rows
            const reconstructedRows: FormValues['vendorRows'] = [];

            // if (initialData && allowedVendors) {
            //     allowedVendors.forEach(org => {
            //         const personsInThisOrg = org.persons
            //             .filter(p => currentVendorIds.includes(String(p.id)))
            //             .map(p => String(p.id));

            //         if (personsInThisOrg.length > 0) {
            //             reconstructedRows.push({
            //                 orgId: String(org.id),
            //                 personIds: personsInThisOrg
            //             });
            //         }
            //     });
            // }

            allVendorOrganizations.forEach(org => {
                const personsInThisOrg = org.persons
                    .filter(p => currentVendorIds.includes(String(p.id)))
                    .map(p => String(p.id));

                if (personsInThisOrg.length > 0) {
                    reconstructedRows.push({
                        orgId: String(org.id),
                        personIds: personsInThisOrg
                    });
                }
            });

            // Group documents by docType
            const scopeOfWorkDocs = initialData.documents
                ?.filter(d => d.docType === 'SCOPE_OF_WORK')
                .map(d => d.path) || [];
            const techSpecsDocs = initialData.documents
                ?.filter(d => d.docType === 'TECH_SPECS')
                .map(d => d.path) || [];
            const detailedBoqDocs = initialData.documents
                ?.filter(d => d.docType === 'DETAILED_BOQ')
                .map(d => d.path) || [];
            const mafFormatDocs = initialData.documents
                ?.filter(d => d.docType === 'MAF_FORMAT')
                .map(d => d.path) || [];
            const miiFormatDocs = initialData.documents
                ?.filter(d => d.docType === 'MII_FORMAT')
                .map(d => d.path) || [];

            const dueDateValue = initialData.dueDate ? new Date(initialData.dueDate) : new Date();
            form.reset({
                dueDate: dueDateValue,
                docList: initialData.docList || '',
                items: initialData.items.map(i => ({
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
    }, [initialData, allVendorOrganizations, form]);

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
        // 1. Flatten Vendor IDs to CSV
        const allSelectedPersonIds = values.vendorRows?.flatMap(row => row.personIds) || [];
        // Remove duplicates just in case
        const uniquePersonIds = Array.from(new Set(allSelectedPersonIds)).join(',');

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
        <Card>
            <CardHeader className="border-b bg-muted/10 pb-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle>{isEditMode ? 'Edit' : 'Create'} RFQ</CardTitle>
                        <CardDescription>
                            Configure requirements and select vendors for this tender.
                            {/* Tender Info Summary */}
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-background p-3 rounded-md border">
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
                                    {(field) => (
                                        <DateTimeInput
                                            value={field.value ? (field.value instanceof Date ? field.value.toISOString().slice(0, 16) : String(field.value)) : ''}
                                            onChange={(value) => field.onChange(value ? new Date(value) : undefined)}
                                            placeholder="Select date and time"
                                        />
                                    )}
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
                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || isLoadingVendors}>
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {isEditMode ? 'Update RFQ' : 'Create RFQ'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
