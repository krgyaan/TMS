import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, AlertCircle, Plus, Trash2, FileText, Sparkles, Check } from 'lucide-react';
import { CompactFileUploader } from '@/components/file-upload';
import { paths } from '@/app/routes/paths';
import { MultiSelectField } from '@/components/form/MultiSelectField';
import { useEffect, useMemo, useState } from 'react';
import {
    useCreateDocumentChecklist,
    useUpdateDocumentChecklist,
    useSuggestedBiddingRequirements,
} from '@/hooks/api/useDocumentChecklists';
import type {
    CreateDocumentChecklistDto,
    SuggestedBiddingRequirement,
    TenderDocumentChecklist,
    UpdateDocumentChecklistDto,
} from '../helpers/documentChecklist.types';
import { formatDateTime } from '@/hooks/useFormatedDate';
import { DocumentChecklistFormSchema } from '../helpers/documentChecklist.schema';

const CATEGORY_BADGE_VARIANT: Record<SuggestedBiddingRequirement['category'], 'default' | 'secondary' | 'outline'> = {
    oem: 'default',
    standard: 'secondary',
    company: 'secondary',
    other: 'outline',
};

const CATEGORY_LABEL: Record<SuggestedBiddingRequirement['category'], string> = {
    oem: 'OEM',
    standard: 'Standard',
    company: 'Company Library',
    other: 'Other',
};

type FormValues = z.infer<typeof DocumentChecklistFormSchema>;

interface DocumentChecklistFormProps {
    tenderId: number;
    tenderDetails: {
        tenderNo: string;
        tenderName: string;
        dueDate: Date | null;
        teamMemberName: string | null;
    };
    mode: 'create' | 'edit';
    existingData?: TenderDocumentChecklist;
}

// Standard document options
const standardDocumentOptions = [
    { value: 'PAN & GST', label: 'PAN & GST' },
    { value: 'MSME', label: 'MSME' },
    { value: 'Cancelled Cheque', label: 'Cancelled Cheque' },
    { value: 'Incorporation/Registration', label: 'Incorporation/Registration' },
    { value: 'Board Resolution/POA', label: 'Board Resolution/POA' },
    { value: 'Electrical License', label: 'Electrical License' },
    { value: 'Mandate form', label: 'Mandate form' },
];

export default function DocumentChecklistForm({
    tenderId,
    tenderDetails,
    mode,
    existingData
}: DocumentChecklistFormProps) {
    const navigate = useNavigate();
    const createMutation = useCreateDocumentChecklist();
    const updateMutation = useUpdateDocumentChecklist();
    const suggestMutation = useSuggestedBiddingRequirements();
    const [addedSuggestions, setAddedSuggestions] = useState<Set<string>>(new Set());

    const form = useForm<FormValues>({
        resolver: zodResolver(DocumentChecklistFormSchema),
        defaultValues: {
            tenderId: tenderId,
            selectedDocuments: [],
            extraDocuments: [],
        },
    });

    useEffect(() => {
        if (existingData) {
            form.reset({
                tenderId: tenderId,
                selectedDocuments: existingData.selectedDocuments || [],
                extraDocuments: existingData.extraDocuments || [],
            });
        }
    }, [existingData, form, tenderId]);

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'extraDocuments',
    });

    const isSubmitting = form.formState.isSubmitting;

    const existingExtraDocNames = useMemo(
        () => new Set((form.watch('extraDocuments') || []).map((d) => (d?.name || '').trim().toLowerCase())),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [fields],
    );

    const handleAddSuggestion = (requirement: SuggestedBiddingRequirement) => {
        const key = requirement.documentName.trim().toLowerCase();
        if (existingExtraDocNames.has(key)) {
            setAddedSuggestions((prev) => new Set(prev).add(key));
            return;
        }
        append({ name: requirement.documentName, path: '' });
        setAddedSuggestions((prev) => new Set(prev).add(key));
    };

    const isSuggestionAdded = (requirement: SuggestedBiddingRequirement) => {
        const key = requirement.documentName.trim().toLowerCase();
        return addedSuggestions.has(key) || existingExtraDocNames.has(key);
    };

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        try {
            // Filter out empty extra documents (those with empty names)
            const filteredExtraDocuments = data.extraDocuments?.filter(
                doc => doc.name && doc.name.trim().length > 0
            );

            // Clean up extra documents: convert empty strings to undefined for optional path field
            const cleanedExtraDocuments = filteredExtraDocuments?.map(doc => ({
                name: doc.name.trim(),
                path: doc.path && doc.path.trim().length > 0 ? doc.path.trim() : undefined,
            }));

            // Prepare payload: use undefined for empty arrays to match backend expectations
            const payload = {
                tenderId: data.tenderId,
                selectedDocuments: data.selectedDocuments && data.selectedDocuments.length > 0
                    ? data.selectedDocuments
                    : undefined,
                extraDocuments: cleanedExtraDocuments && cleanedExtraDocuments.length > 0
                    ? cleanedExtraDocuments
                    : undefined,
            };

            if (mode === 'create') {
                await createMutation.mutateAsync(payload as CreateDocumentChecklistDto);
            } else if (existingData?.id) {
                await updateMutation.mutateAsync({
                    id: existingData.id,
                    ...payload,
                } as UpdateDocumentChecklistDto);
            }
            navigate(paths.tendering.checklists);
        } catch (error) {
            console.error('Error submitting document checklist:', error);
            // Error is already handled by the mutation hooks with toast notifications
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{mode === 'create' ? 'Submit' : 'Edit'} Document Checklist</CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'create'
                                ? 'Submit document checklist for this tender'
                                : 'Update document checklist information'}
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
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        {/* Tender Basic Details */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Tender Information
                            </h4>
                            <div className="grid gap-4 md:grid-cols-5 bg-muted/30 p-4 rounded-lg">
                                <div>
                                    <p className="font-medium text-muted-foreground">Tender No</p>
                                    <p className="font-semibold">{tenderDetails.tenderNo}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-muted-foreground">Team Member</p>
                                    <p className="font-semibold">{tenderDetails.teamMemberName || '—'}</p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="font-medium text-muted-foreground">Tender Name</p>
                                    <p className="font-semibold">{tenderDetails.tenderName}</p>
                                </div>
                                <div>
                                    <p className="font-medium text-muted-foreground">Due Date</p>
                                    <p className="font-semibold">
                                        {tenderDetails.dueDate
                                            ? formatDateTime(tenderDetails.dueDate)
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* AI-Suggested Requirements */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="font-semibold text-base text-primary">
                                    Suggested Requirements (AI)
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => suggestMutation.mutate(tenderId)}
                                    disabled={suggestMutation.isPending}
                                >
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    {suggestMutation.isPending ? 'Analyzing tender documents…' : 'Analyze Tender Documents'}
                                </Button>
                            </div>

                            {suggestMutation.isPending && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        Reading the tender's main and ATC documents and identifying bidding
                                        requirements — this can take up to a minute for large tenders.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {suggestMutation.isSuccess && suggestMutation.data.requirements.length === 0 && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        No additional document requirements were identified in the tender's documents.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {suggestMutation.data && suggestMutation.data.requirements.length > 0 && (
                                <div className="border rounded-lg divide-y">
                                    {suggestMutation.data.requirements.map((requirement, index) => {
                                        const added = isSuggestionAdded(requirement);
                                        return (
                                            <div
                                                key={`${requirement.documentName}-${index}`}
                                                className="p-3 flex items-start justify-between gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-medium text-sm">{requirement.documentName}</span>
                                                        <Badge variant={CATEGORY_BADGE_VARIANT[requirement.category]}>
                                                            {CATEGORY_LABEL[requirement.category]}
                                                        </Badge>
                                                        {requirement.required && (
                                                            <Badge variant="destructive">Required</Badge>
                                                        )}
                                                        <Badge variant="outline">{requirement.confidence} confidence</Badge>
                                                        {requirement.matchedLibraryId && (
                                                            <Badge variant="success">Library match</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                        {requirement.source.document === 'main' ? 'Main' : 'ATC'} p.{requirement.source.page}
                                                        {': '}"{requirement.source.snippet}"
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant={added ? 'secondary' : 'outline'}
                                                    size="sm"
                                                    onClick={() => handleAddSuggestion(requirement)}
                                                    disabled={added}
                                                    className="shrink-0"
                                                >
                                                    {added ? (
                                                        <>
                                                            <Check className="mr-1 h-4 w-4" /> Added
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus className="mr-1 h-4 w-4" /> Add
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Standard Documents Selection */}
                        <div className="space-y-4">
                            <h4 className="font-semibold text-base text-primary border-b pb-2">
                                Standard Documents
                            </h4>
                            <MultiSelectField
                                control={form.control}
                                name="selectedDocuments"
                                label="Select Required Documents"
                                options={standardDocumentOptions}
                                placeholder="Select standard documents"
                            />
                        </div>

                        {/* Extra Documents */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h4 className="font-semibold text-base text-primary">
                                    Additional Documents (Optional)
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ name: '', path: '' })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Document
                                </Button>
                            </div>

                            {fields.length === 0 && (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        No additional documents added. Click "Add Document" to include extra documents.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {fields.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-muted">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Sr. No.</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">Document Name</th>
                                                <th className="px-4 py-3 text-left text-sm font-semibold">File</th>
                                                <th className="px-4 py-3 text-center text-sm font-semibold w-20">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {fields.map((field, index) => (
                                                <tr key={field.id} className="hover:bg-muted/30">
                                                    <td className="px-4 py-3 text-sm font-medium">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`extraDocuments.${index}.name`}
                                                            label=""
                                                        >
                                                            {(field) => (
                                                                <div className="relative">
                                                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                    <Input
                                                                        {...field}
                                                                        className="pl-10"
                                                                        placeholder="Enter document name"
                                                                    />
                                                                </div>
                                                            )}
                                                        </FieldWrapper>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`extraDocuments.${index}.path`}
                                                            label=""
                                                        >
                                                            {(field) => (
                                                                <CompactFileUploader
                                                                    context="checklists"
                                                                    value={field.value || undefined}
                                                                    onChange={(path) => field.onChange(path || '')}
                                                                    disabled={isSubmitting}
                                                                />
                                                            )}
                                                        </FieldWrapper>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => remove(index)}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
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
                                onClick={() => {
                                    if (mode === 'edit' && existingData) {
                                        form.reset({
                                            tenderId: tenderId,
                                            selectedDocuments: existingData.selectedDocuments || [],
                                            extraDocuments: existingData.extraDocuments || [],
                                        });
                                    } else {
                                        form.reset({
                                            tenderId: tenderId,
                                            selectedDocuments: [],
                                            extraDocuments: [],
                                        });
                                    }
                                }}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                {mode === 'create' ? 'Submit' : 'Update'} Checklist
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
