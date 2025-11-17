import { useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { NumberInput } from '@/components/form/NumberInput';
import { SelectField } from '@/components/form/SelectField';
import { DateTimeInput } from '@/components/form/DateTimeInput';
import { DateInput } from '@/components/form/DateInput';
import { FileUploadField } from '@/components/form/FileUploadField';
import { useCreateTender, useUpdateTender } from '@/hooks/api/useTenders';
import type { TenderInfoWithNames } from '@/types/api.types';
import { paths } from '@/app/routes/paths';
import { ArrowLeft, Sparkles } from 'lucide-react';

import {
    useTeamOptions,
    useOrganizationOptions,
    useUserOptions,
    useLocationOptions,
    useWebsiteOptions,
    useItemOptions,
} from '@/hooks/useSelectOptions';

const ManualFormSchema = z.object({
    team: z.coerce.number().int().positive({ message: 'Team is required' }),
    tenderNo: z.string().min(1, { message: 'Tender No is required' }),
    tenderName: z.string().min(1, { message: 'Tender Name is required' }),
    organization: z.coerce.number().int().positive().optional(),
    gstValues: z.coerce.number().nonnegative({ message: 'Enter a valid amount' }).default(0),
    tenderFees: z.coerce.number().nonnegative({ message: 'Enter a valid amount' }).default(0),
    emd: z.coerce.number().nonnegative({ message: 'Enter a valid amount' }).default(0),
    teamMember: z.coerce.number().int().positive({ message: 'Team member is required' }),
    dueDate: z.string().min(1, { message: 'Due date and time is required' }),
    location: z.coerce.number().int().positive().optional(),
    website: z.coerce.number().int().positive().optional(),
    item: z.coerce.number().int().positive({ message: 'Item is required' }),
    status: z.coerce.number().int().min(0).default(1),
    documents: z.any().optional(),
    remarks: z.string().max(200).optional(),

    deleteStatus: z.enum(["0", "1"]).optional(),
    tlStatus: z.enum(["0", "1", "2", "3"]).optional(),
    tlRemarks: z.string().max(200).optional(),
    rfqTo: z.string().max(15).optional(),
    courierAddress: z.string().optional(),
});

const AiFormSchema = z.object({
    team: z.coerce.number().int().positive({ message: 'Team is required' }),
    tenderNo: z.string().min(1, { message: 'Tender No is required' }),
    startDate: z.string().min(1, { message: 'Start date is required' }),
    closingDate: z.string().min(1, { message: 'Closing date is required' }),
    files: z.any().optional(),
});

type ManualFormValues = z.infer<typeof ManualFormSchema>;
type AiFormValues = z.infer<typeof AiFormSchema>;

interface TenderFormProps {
    tender?: TenderInfoWithNames;
    mode: 'create' | 'edit';
}

export function TenderForm({ tender, mode }: TenderFormProps) {
    const navigate = useNavigate();
    const createTender = useCreateTender();
    const updateTender = useUpdateTender();

    const teamOptions = useTeamOptions([1, 2]);
    const organizationOptions = useOrganizationOptions();
    const userOptions = useUserOptions();
    const locationOptions = useLocationOptions();
    const websiteOptions = useWebsiteOptions();
    const itemOptions = useItemOptions();

    const manualForm = useForm<ManualFormValues>({
        resolver: zodResolver(ManualFormSchema) as any,
        defaultValues: {
            team: undefined as any,
            tenderNo: '',
            tenderName: '',
            organization: undefined,
            gstValues: 0,
            tenderFees: 0,
            emd: 0,
            teamMember: undefined as any,
            dueDate: '',
            location: undefined,
            website: undefined,
            item: undefined as any,
            status: 1,
            documents: undefined,
            remarks: '',
        },
    });

    const aiForm = useForm<AiFormValues>({
        resolver: zodResolver(AiFormSchema) as any,
        defaultValues: {
            team: undefined as any,
            tenderNo: '',
            startDate: '',
            closingDate: '',
            files: undefined,
        },
    });

    useEffect(() => {
        if (!tender || mode !== 'edit') {
            return;
        }
        try {
            manualForm.reset({
                team: Number(tender.team) || undefined as any,
                tenderNo: tender.tenderNo || '',
                tenderName: tender.tenderName || '',
                organization: tender.organization ? Number(tender.organization) : undefined,
                gstValues: tender.gstValues != null ? Number(tender.gstValues) : 0,
                tenderFees: tender.tenderFees != null ? Number(tender.tenderFees) : 0,
                emd: tender.emd != null ? Number(tender.emd) : 0,
                teamMember: Number(tender.teamMember) || undefined as any,
                dueDate: tender.dueDate || '',
                location: tender.location ? Number(tender.location) : undefined,
                website: tender.website ? Number(tender.website) : undefined,
                item: Number(tender.item) || undefined as any,
                status: Number(tender.status) ?? 1,
                remarks: tender.remarks || '',
            });
        } catch (err) {
            console.error('Error resetting form:', err);
        }
    }, [tender, mode]);

    const handleManualSubmit: SubmitHandler<ManualFormValues> = async (values) => {
        try {
            const payload = {
                team: values.team,
                tenderNo: values.tenderNo,
                tenderName: values.tenderName,
                organization: values.organization,
                gstValues: values.gstValues,
                tenderFees: values.tenderFees,
                emd: values.emd,
                teamMember: values.teamMember,
                dueDate: values.dueDate,
                location: values.location || undefined,
                website: values.website || undefined,
                item: values.item,
                status: values.status,
                remarks: values.remarks || undefined,
            };
            if (mode === 'create') {
                await createTender.mutateAsync(payload);
            } else if (tender) {
                await updateTender.mutateAsync({ id: tender.id, data: payload });
            }

            navigate(paths.tendering.tenders);
        } catch (error) {
            console.error('Form submission error:', error);
        }
    };

    const handleAiSubmit: SubmitHandler<AiFormValues> = async (_values) => {
        try {
            // TODO: Implement AI-based tender creation workflow
            // await createTender.mutateAsync(payload);
            // navigate(paths.tendering.tenders);
        } catch (error) {
            console.error('AI form error:', error);
        }
    };

    const saving = createTender.isPending || updateTender.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === 'create' ? 'Create Tender' : 'Edit Tender'}</CardTitle>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.tendering.tenders)}>
                        <ArrowLeft /> Return Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="manually" className="w-full">
                    <TabsList className={mode == 'edit' ? 'hidden' : 'm-auto mb-6'}>
                        <TabsTrigger value="manually">Manually Enter Details</TabsTrigger>
                        <TabsTrigger value="useAi">
                            Use AI <Sparkles className="ml-1 h-4 w-4" />
                        </TabsTrigger>
                    </TabsList>

                    {/* AI FORM TAB */}
                    <TabsContent value="useAi">
                        <Form {...aiForm}>
                            <form onSubmit={aiForm.handleSubmit(handleAiSubmit)} className="space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <SelectField<AiFormValues, 'team'>
                                        control={aiForm.control}
                                        name="team"
                                        label="Team"
                                        options={teamOptions}
                                        placeholder="Select Team"
                                    />

                                    <FieldWrapper<AiFormValues, 'tenderNo'>
                                        control={aiForm.control}
                                        name="tenderNo"
                                        label="Tender No"
                                    >
                                        {(field) => <Input placeholder="Tender No" {...field} />}
                                    </FieldWrapper>

                                    <FieldWrapper<AiFormValues, 'startDate'>
                                        control={aiForm.control}
                                        name="startDate"
                                        label="Start Date"
                                    >
                                        {(field) => (
                                            <DateInput value={field.value ?? ''} onChange={field.onChange} />
                                        )}
                                    </FieldWrapper>

                                    <FieldWrapper<AiFormValues, 'closingDate'>
                                        control={aiForm.control}
                                        name="closingDate"
                                        label="Closing Date"
                                    >
                                        {(field) => (
                                            <DateInput value={field.value ?? ''} onChange={field.onChange} />
                                        )}
                                    </FieldWrapper>
                                </div>

                                <div className="w-full md:w-1/2">
                                    <FileUploadField<AiFormValues, 'files'>
                                        control={aiForm.control}
                                        name="files"
                                        label="Choose Files"
                                        allowMultiple
                                        acceptedFileTypes={['application/pdf']}
                                    />
                                </div>

                                <div className="w-full flex items-center justify-center gap-2">
                                    <Button type="submit" disabled={saving}>
                                        {saving ? 'Processing...' : 'Submit with AI'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => aiForm.reset()}
                                        disabled={saving}
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>

                    {/* MANUAL FORM TAB */}
                    <TabsContent value="manually">
                        <Form {...manualForm}>
                            <form
                                onSubmit={manualForm.handleSubmit(handleManualSubmit)}
                                className="space-y-8"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Team */}
                                    <SelectField<ManualFormValues, 'team'>
                                        control={manualForm.control}
                                        name="team"
                                        label="Team Name"
                                        options={teamOptions}
                                        placeholder="Select Team"
                                    />

                                    {/* Tender No */}
                                    <FieldWrapper<ManualFormValues, 'tenderNo'>
                                        control={manualForm.control}
                                        name="tenderNo"
                                        label="Tender No"
                                    >
                                        {(field) => <Input placeholder="Tender No" {...field} />}
                                    </FieldWrapper>

                                    {/* Tender Name */}
                                    <FieldWrapper<ManualFormValues, 'tenderName'>
                                        control={manualForm.control}
                                        name="tenderName"
                                        label="Tender Name"
                                    >
                                        {(field) => <Input placeholder="Tender Name" {...field} />}
                                    </FieldWrapper>

                                    {/* Organization */}
                                    <SelectField<ManualFormValues, 'organization'>
                                        control={manualForm.control}
                                        name="organization"
                                        label="Organization"
                                        options={organizationOptions}
                                        placeholder="Select Organization"
                                    />

                                    {/* GST Values */}
                                    <FieldWrapper<ManualFormValues, 'gstValues'>
                                        control={manualForm.control}
                                        name="gstValues"
                                        label="Tender Value (GST Inclusive)"
                                    >
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="Amount"
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>

                                    {/* Tender Fees */}
                                    <FieldWrapper<ManualFormValues, 'tenderFees'>
                                        control={manualForm.control}
                                        name="tenderFees"
                                        label="Tender Fee"
                                    >
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="Amount"
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>

                                    {/* EMD */}
                                    <FieldWrapper<ManualFormValues, 'emd'>
                                        control={manualForm.control}
                                        name="emd"
                                        label="EMD"
                                    >
                                        {(field) => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="Amount"
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>

                                    {/* Team Member */}
                                    <SelectField<ManualFormValues, 'teamMember'>
                                        control={manualForm.control}
                                        name="teamMember"
                                        label="Team Member"
                                        options={userOptions}
                                        placeholder="Select User"
                                    />

                                    {/* Due Date & Time */}
                                    <FieldWrapper<ManualFormValues, 'dueDate'>
                                        control={manualForm.control}
                                        name="dueDate"
                                        label="Due Date and Time"
                                    >
                                        {(field) => (
                                            <DateTimeInput
                                                value={field.value}
                                                onChange={field.onChange}
                                                className="bg-background"
                                            />
                                        )}
                                    </FieldWrapper>

                                    {/* Location */}
                                    <SelectField<ManualFormValues, 'location'>
                                        control={manualForm.control}
                                        name="location"
                                        label="Location"
                                        options={locationOptions}
                                        placeholder="Select Location"
                                    />

                                    {/* Website */}
                                    <SelectField<ManualFormValues, 'website'>
                                        control={manualForm.control}
                                        name="website"
                                        label="Website"
                                        options={websiteOptions}
                                        placeholder="Select Website"
                                    />

                                    {/* Item */}
                                    <SelectField<ManualFormValues, 'item'>
                                        control={manualForm.control}
                                        name="item"
                                        label="Item"
                                        options={itemOptions}
                                        placeholder="Select Item"
                                    />

                                    {/* Documents */}
                                    <FileUploadField<ManualFormValues, 'documents'>
                                        control={manualForm.control}
                                        name="documents"
                                        label="Upload Documents"
                                        description="Upload relevant tender documents (optional)"
                                        allowMultiple
                                        layout="grid"
                                        gridCols={3}
                                        acceptedFileTypes={['image/*', 'application/pdf']}
                                    />

                                    {/* Remarks */}
                                    <FieldWrapper<ManualFormValues, 'remarks'>
                                        control={manualForm.control}
                                        name="remarks"
                                        label="Remarks"
                                        className="md:col-span-2"
                                    >
                                        {(field) => (
                                            <textarea
                                                className="border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                placeholder="Remarks"
                                                maxLength={200}
                                                {...field}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>

                                <div className="w-full flex items-center justify-center gap-2">
                                    <Button type="submit" disabled={saving}>
                                        {saving
                                            ? 'Saving...'
                                            : mode === 'create'
                                                ? 'Create Tender'
                                                : 'Update Tender'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => navigate(paths.tendering.tenders)}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => manualForm.reset()}
                                        disabled={saving}
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
