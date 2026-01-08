import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useCreateTenderApproval, useUpdateTenderApproval } from '@/hooks/api/useTenderApprovals';
import { useVendorOrganizations } from '@/hooks/api/useVendorOrganizations';
import { useStatuses } from '@/hooks/api/useStatuses';
import { tlDecisionOptions, documentApprovalOptions, infoSheetFieldOptions } from '@/modules/tendering/tender-approval/helpers/tenderApproval.types';
import type { TenderWithRelations } from '@/types/api.types';
import { TenderApprovalFormSchema } from '../helpers/tenderApproval.schema';
import type { TenderApprovalFormValues } from '../helpers/tenderApproval.types';
import { getInitialValues, mapFormToPayload } from '../helpers/tenderApproval.mappers';
import { dummyFinancialDocuments, dummyTechnicalDocuments } from '../../info-sheet/helpers/tenderInfoSheet.types';

interface TenderApprovalFormProps {
    tenderId: number;
    relationships: TenderWithRelations | undefined;
    isLoading?: boolean;
}

const FormLoadingSkeleton = () => (
    <Card className="max-w-5xl mx-auto">
        <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-[600px] w-full" />
        </CardContent>
    </Card>
);

const InfoSheetMissingAlert = ({ tenderId, onBack }: { tenderId: number, onBack: () => void }) => {
    const navigate = useNavigate();
    return (
        <Card>
            <CardHeader>
                <CardTitle>Info Sheet Required</CardTitle>
                <CardDescription>Tender information sheet must be completed before approval.</CardDescription>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Please complete the tender information sheet first.</AlertDescription>
                </Alert>
                <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
                    <Button onClick={() => navigate(paths.tendering.infoSheetCreate(tenderId))}>Fill Info Sheet</Button>
                </div>
            </CardContent>
        </Card>
    );
};

const formatDocuments = (documents: string[] | Array<{ id?: number; documentName: string }> = []) => {
    if (!documents.length) {
        return <span className="text-muted-foreground">No documents listed</span>
    }

    return (
        <div className="flex flex-wrap gap-2">
            {documents.map((doc, index) => {
                // Handle both string arrays and object arrays
                const docName = typeof doc === 'string' ? doc : doc.documentName;
                const docKey = typeof doc === 'string' ? doc : (doc.id ?? doc.documentName ?? index);

                return (
                    <Badge key={docKey} variant="outline">
                        {docName}
                    </Badge>
                );
            })}
        </div>
    )
}

export function TenderApprovalForm({ tenderId, relationships, isLoading: isParentLoading }: TenderApprovalFormProps) {
    const navigate = useNavigate();
    const { data: vendorOrganizations, isLoading: isVendorOrgsLoading } = useVendorOrganizations();
    const { data: statuses, isLoading: isStatusesLoading } = useStatuses();
    const createApproval = useCreateTenderApproval();
    const updateApproval = useUpdateTenderApproval();

    const isSubmitting = createApproval.isPending || updateApproval.isPending;
    const isPageLoading = isParentLoading || isVendorOrgsLoading || isStatusesLoading;

    // Safe derived state (after hooks)
    const safeRelationships = relationships;
    const infoSheet = safeRelationships?.infoSheet ?? null;
    const approval = safeRelationships?.approval ?? null;
    const mode = approval ? 'edit' : 'create';

    // Form hooks (now safe - always called)
    const form = useForm<TenderApprovalFormValues>({
        resolver: zodResolver(TenderApprovalFormSchema) as Resolver<TenderApprovalFormValues>,
        defaultValues: getInitialValues(approval),
    });

    useEffect(() => {
        if (approval) form.reset(getInitialValues(approval));
    }, [approval, form]);

    // Add this after line 153 (after form declaration) for debugging
    useEffect(() => {
        const errors = form.formState.errors;
        if (Object.keys(errors).length > 0) {
            console.log('❌ Form validation errors:', errors);
        }
    }, [form.formState.errors]);

    const tlDecision = form.watch('tlDecision');
    const tenderStatus = form.watch('tenderStatus');
    const techDocs = form.watch('approvePqrSelection');
    const finDocs = form.watch('approveFinanceDocSelection');

    // Clear irrelevant fields when tlDecision changes
    useEffect(() => {
        if (tlDecision === '1') {
            // Clear rejection and incomplete fields
            form.setValue('tenderStatus', undefined);
            form.setValue('oemNotAllowed', undefined);
            form.setValue('remarks', undefined);
            form.setValue('incompleteFields', []);
        } else if (tlDecision === '2') {
            // Clear approval and incomplete fields
            form.setValue('rfqTo', []);
            form.setValue('processingFeeMode', undefined);
            form.setValue('tenderFeeMode', undefined);
            form.setValue('emdMode', undefined);
            form.setValue('approvePqrSelection', undefined);
            form.setValue('approveFinanceDocSelection', undefined);
            form.setValue('alternativeTechnicalDocs', []);
            form.setValue('alternativeFinancialDocs', []);
            form.setValue('incompleteFields', []);
        } else if (tlDecision === '3') {
            // Clear approval and rejection fields
            form.setValue('rfqTo', []);
            form.setValue('processingFeeMode', undefined);
            form.setValue('tenderFeeMode', undefined);
            form.setValue('emdMode', undefined);
            form.setValue('approvePqrSelection', undefined);
            form.setValue('approveFinanceDocSelection', undefined);
            form.setValue('alternativeTechnicalDocs', []);
            form.setValue('alternativeFinancialDocs', []);
            form.setValue('tenderStatus', undefined);
            form.setValue('oemNotAllowed', undefined);
            form.setValue('remarks', undefined);
        } else if (tlDecision === '0') {
            // Clear all conditional fields
            form.setValue('rfqTo', []);
            form.setValue('processingFeeMode', undefined);
            form.setValue('tenderFeeMode', undefined);
            form.setValue('emdMode', undefined);
            form.setValue('approvePqrSelection', undefined);
            form.setValue('approveFinanceDocSelection', undefined);
            form.setValue('alternativeTechnicalDocs', []);
            form.setValue('alternativeFinancialDocs', []);
            form.setValue('tenderStatus', undefined);
            form.setValue('oemNotAllowed', undefined);
            form.setValue('remarks', undefined);
            form.setValue('incompleteFields', []);
        }
    }, [tlDecision, form]);

    const vendorOrgOptions = useMemo(() =>
        vendorOrganizations?.map(org => ({ value: String(org.id), label: org.name })) ?? [],
        [vendorOrganizations]
    );

    const tenderStatusOptions = useMemo(() =>
        statuses?.filter(s => s.tenderCategory === 'dnb').map(s => ({ value: String(s.id), label: s.name })) ?? [],
        [statuses]
    );

    const processingFeeModeOptions = useMemo(() =>
        infoSheet?.processingFeeMode?.map(mode => ({ value: mode, label: mode })) ?? [],
        [infoSheet]
    );

    const tenderFeeModeOptions = useMemo(() =>
        infoSheet?.tenderFeeMode?.map(mode => ({ value: mode, label: mode })) ?? [],
        [infoSheet]
    );

    const emdModeOptions = useMemo(() =>
        infoSheet?.emdMode?.map(mode => ({ value: mode, label: mode })) ?? [],
        [infoSheet]
    );

    const isNotAllowedByOem = useMemo(() => {
        if (!tenderStatus || !statuses) return false;
        const statusName = statuses.find(s => s.id === Number(tenderStatus))?.name.toLowerCase();
        return statusName?.includes('not allowed by oem');
    }, [statuses, tenderStatus]);

    const handleSubmit: SubmitHandler<TenderApprovalFormValues> = async (values) => {
        console.log('🚀 Submit called with values:', values);

        // Trigger validation
        const isValid = await form.trigger();
        if (!isValid) {
            const errors = form.formState.errors;
            const errorMessages = Object.values(errors)
                .map(err => err?.message)
                .filter(Boolean);
            if (errorMessages.length > 0) {
                toast.error(`Validation errors: ${errorMessages.join(', ')}`);
            } else {
                toast.error('Please fix the form errors before submitting');
            }
            return;
        }

        try {
            const payload = mapFormToPayload(values);
            console.log('📦 Mapped payload:', payload);
            const mutation = mode === 'create' ? createApproval : updateApproval;
            await mutation.mutateAsync({ tenderId, data: payload });
            toast.success(mode === 'create' ? 'Approval submitted successfully' : 'Approval updated successfully');
            navigate(paths.tendering.tenderApproval);
        } catch (error: any) {
            console.error('❌ Submission error', error);
            if (error?.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to save approval. Please try again.');
            }
        }
    };

    // ✅ GUARDS AFTER ALL HOOKS
    if (!safeRelationships || isPageLoading) {
        return <FormLoadingSkeleton />;
    }

    if (!infoSheet) {
        return <InfoSheetMissingAlert tenderId={tenderId} onBack={() => navigate(-1)} />;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{mode === 'create' ? 'Submit' : 'Edit'} Tender Approval</CardTitle>
                        <CardDescription className="mt-2">
                            <span className="font-medium">{safeRelationships.tenderName ?? 'N/A'}</span> • Tender No: {safeRelationships.tenderNo ?? 'N/A'}
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
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        {/* TE Recommendation */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">TE Recommendation</h4>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        {infoSheet.teRecommendation === 'YES' ? (
                                            <>
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <Badge className="bg-green-600">Recommended</Badge>
                                            </>
                                        ) : (
                                            <>
                                                <XCircle className="h-5 w-5 text-red-600" />
                                                <Badge variant="destructive">Not Recommended</Badge>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {infoSheet.teFinalRemark && (
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-muted-foreground">Remarks</p>
                                        <p className="text-sm mt-1">{infoSheet.teFinalRemark}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <SelectField
                            control={form.control}
                            name="tlDecision"
                            label="TL's Decision to Bid"
                            options={tlDecisionOptions}
                            placeholder="Select decision"
                        />
                        {form.formState.errors.tlDecision && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.tlDecision.message}</p>
                        )}

                        {tlDecision === '1' && (
                            <div className="space-y-8 animate-in fade-in-50 duration-300">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-base text-primary border-b pb-2">Bidding Details</h4>
                                    <MultiSelectField
                                        control={form.control}
                                        name="rfqTo"
                                        label="Send RFQ to"
                                        options={vendorOrgOptions}
                                        placeholder="Select vendors"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <SelectField
                                                control={form.control}
                                                name="processingFeeMode"
                                                label="Processing Fee Mode"
                                                options={processingFeeModeOptions}
                                                placeholder="Select processing fee mode"
                                            />
                                            {infoSheet && (infoSheet.processingFeeAmount || (infoSheet.processingFeeMode && infoSheet.processingFeeMode.length > 0)) && (
                                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                                    {infoSheet.processingFeeAmount && (
                                                        <div>
                                                            <strong>Amount:</strong> ₹{(() => {
                                                                const amount = typeof infoSheet.processingFeeAmount === 'number'
                                                                    ? infoSheet.processingFeeAmount
                                                                    : parseFloat(String(infoSheet.processingFeeAmount));
                                                                return isNaN(amount) ? '0.00' : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                            })()}
                                                        </div>
                                                    )}
                                                    {infoSheet.processingFeeMode && infoSheet.processingFeeMode.length > 0 && (
                                                        <div>
                                                            <strong>Available Modes:</strong> {infoSheet.processingFeeMode.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <SelectField
                                                control={form.control}
                                                name="tenderFeeMode"
                                                label="Tender Fee Mode"
                                                options={tenderFeeModeOptions}
                                                placeholder="Select tender fee mode"
                                            />
                                            {infoSheet && (infoSheet.tenderFeeAmount || (infoSheet.tenderFeeMode && infoSheet.tenderFeeMode.length > 0)) && (
                                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                                    {infoSheet.tenderFeeAmount && (
                                                        <div>
                                                            <strong>Amount:</strong> ₹{(() => {
                                                                const amount = typeof infoSheet.tenderFeeAmount === 'number'
                                                                    ? infoSheet.tenderFeeAmount
                                                                    : parseFloat(String(infoSheet.tenderFeeAmount));
                                                                return isNaN(amount) ? '0.00' : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                            })()}
                                                        </div>
                                                    )}
                                                    {infoSheet.tenderFeeMode && infoSheet.tenderFeeMode.length > 0 && (
                                                        <div>
                                                            <strong>Available Modes:</strong> {infoSheet.tenderFeeMode.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <SelectField
                                                control={form.control}
                                                name="emdMode"
                                                label="EMD Mode"
                                                options={emdModeOptions}
                                                placeholder="Select EMD mode"
                                            />
                                            {infoSheet && (infoSheet.emdAmount || (infoSheet.emdMode && infoSheet.emdMode.length > 0)) && (
                                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded space-y-1">
                                                    {infoSheet.emdAmount && (
                                                        <div>
                                                            <strong>Amount:</strong> ₹{(() => {
                                                                const amount = typeof infoSheet.emdAmount === 'number'
                                                                    ? infoSheet.emdAmount
                                                                    : parseFloat(String(infoSheet.emdAmount));
                                                                return isNaN(amount) ? '0.00' : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                            })()}
                                                        </div>
                                                    )}
                                                    {infoSheet.emdMode && infoSheet.emdMode.length > 0 && (
                                                        <div>
                                                            <strong>Available Modes:</strong> {infoSheet.emdMode.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-base text-primary border-b pb-2">Document Approval</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <SelectField
                                                control={form.control}
                                                name="approvePqrSelection"
                                                label="Approve PQR/Technical Docs"
                                                options={documentApprovalOptions}
                                                placeholder="Select PQR/Technical Docs approval"
                                            />
                                            {infoSheet.technicalWorkOrders && infoSheet.technicalWorkOrders?.length > 0 && (
                                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                                    <strong>Selected:</strong> {formatDocuments(infoSheet.technicalWorkOrders || [])}
                                                </div>
                                            )}
                                            {
                                                techDocs === '2' && (
                                                    <>
                                                        <MultiSelectField
                                                            control={form.control}
                                                            name="alternativeTechnicalDocs"
                                                            label="Alternative Technical Docs"
                                                            options={dummyTechnicalDocuments}
                                                            placeholder="Select documents"
                                                        />
                                                        {form.formState.errors.alternativeTechnicalDocs && (
                                                            <p className="text-sm text-destructive mt-1">{form.formState.errors.alternativeTechnicalDocs.message}</p>
                                                        )}
                                                    </>
                                                )
                                            }
                                        </div>
                                        <div className="space-y-2">
                                            <SelectField
                                                control={form.control}
                                                name="approveFinanceDocSelection"
                                                label="Approve Finance Docs"
                                                options={documentApprovalOptions}
                                                placeholder="Select Finance Docs approval"
                                            />
                                            {infoSheet.commercialDocuments && infoSheet.commercialDocuments?.length > 0 && (
                                                <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                                    <strong>Selected:</strong> {formatDocuments(infoSheet.commercialDocuments || [])}
                                                </div>
                                            )}
                                            {
                                                finDocs === '2' && (
                                                    <>
                                                        <MultiSelectField
                                                            control={form.control}
                                                            name="alternativeFinancialDocs"
                                                            label="Alternative Financial Docs"
                                                            options={dummyFinancialDocuments}
                                                            placeholder="Select documents"
                                                        />
                                                        {form.formState.errors.alternativeFinancialDocs && (
                                                            <p className="text-sm text-destructive mt-1">{form.formState.errors.alternativeFinancialDocs.message}</p>
                                                        )}
                                                    </>
                                                )
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tlDecision === '2' && (
                            <div className="space-y-8 animate-in fade-in-50 duration-300">
                                <h4 className="font-semibold text-base text-primary border-b pb-2">Rejection Details</h4>
                                <SelectField
                                    control={form.control}
                                    name="tenderStatus"
                                    label="Tender Status"
                                    options={tenderStatusOptions}
                                    placeholder="Select tender status"
                                />
                                {isNotAllowedByOem && (
                                    <>
                                        <SelectField
                                            control={form.control}
                                            name="oemNotAllowed"
                                            label="OEM who didn't allow"
                                            options={vendorOrgOptions}
                                            placeholder="Select OEM who didn't allow"
                                        />
                                        <FieldWrapper control={form.control} name="remarks" label="Remarks">
                                            {(field) => (
                                                <textarea
                                                    {...field}
                                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                    placeholder="Enter rejection remarks..."
                                                    maxLength={1000}
                                                />
                                            )}
                                        </FieldWrapper>
                                    </>
                                )}
                            </div>
                        )}

                        {tlDecision === '3' && (
                            <div className="space-y-6 animate-in fade-in-50 duration-300">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h4 className="font-semibold text-base text-primary">Mark Incomplete Fields</h4>
                                        {(form.watch('incompleteFields')?.length ?? 0) > 0 && (
                                            <Badge variant="secondary">
                                                {form.watch('incompleteFields')?.length ?? 0} field(s) marked
                                            </Badge>
                                        )}
                                    </div>
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            Select the fields that need correction and provide specific comments for each field.
                                        </AlertDescription>
                                    </Alert>
                                    {form.formState.errors.incompleteFields && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{form.formState.errors.incompleteFields.message}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {infoSheetFieldOptions.map((field) => {
                                        const incompleteFields = form.watch('incompleteFields') || [];
                                        const isChecked = incompleteFields.some(f => f.fieldName === field.value);
                                        const fieldComment = incompleteFields.find(f => f.fieldName === field.value)?.comment || '';

                                        const handleCheckboxChange = (checked: boolean) => {
                                            const currentFields = form.getValues('incompleteFields') || [];
                                            if (checked) {
                                                // Add field
                                                form.setValue('incompleteFields', [
                                                    ...currentFields,
                                                    { fieldName: field.value, comment: '' }
                                                ]);
                                            } else {
                                                // Remove field
                                                form.setValue('incompleteFields',
                                                    currentFields.filter(f => f.fieldName !== field.value)
                                                );
                                            }
                                        };

                                        const handleCommentChange = (comment: string) => {
                                            const currentFields = form.getValues('incompleteFields') || [];
                                            form.setValue('incompleteFields',
                                                currentFields.map(f =>
                                                    f.fieldName === field.value
                                                        ? { ...f, comment }
                                                        : f
                                                )
                                            );
                                        };

                                        return (
                                            <div key={field.value} className="space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={field.value}
                                                        checked={isChecked}
                                                        onCheckedChange={handleCheckboxChange}
                                                    />
                                                    <Label
                                                        htmlFor={field.value}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                    >
                                                        {field.label}
                                                    </Label>
                                                </div>
                                                {isChecked && (
                                                    <div className="space-y-1">
                                                        <textarea
                                                            value={fieldComment}
                                                            onChange={(e) => handleCommentChange(e.target.value)}
                                                            className={`flex min-h-[60px] w-full rounded-md border ${fieldComment.trim() === '' ? 'border-red-500' : 'border-input'
                                                                } bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50`}
                                                            placeholder={`What's wrong with ${field.label}?`}
                                                        />
                                                        {fieldComment.trim() === '' && (
                                                            <p className="text-xs text-red-500">Comment is required</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {(createApproval.error || updateApproval.error) && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {(createApproval.error || updateApproval.error)?.message || 'An error occurred while saving. Please try again.'}
                                </AlertDescription>
                            </Alert>
                        )}
                        <div className="flex justify-end gap-2 pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => form.reset(getInitialValues(approval))}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === 'create' ? 'Submit' : 'Update'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
