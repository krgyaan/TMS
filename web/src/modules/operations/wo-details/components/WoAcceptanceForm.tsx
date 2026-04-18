import React from 'react';
import { useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, X, Plus, Trash2, AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { SelectField } from '@/components/form/SelectField';
import { TenderFileUploader } from '@/components/tender-file-upload/TenderFileUploader';
import { useGetTeamMembers } from '@/hooks/api/useUsers';
import { WoAcceptanceFormSchema } from '../helpers/wo-acceptance.schema';
import type { WoAcceptanceFormValues } from '../helpers/wo-acceptance.types';
import { cn } from '@/lib/utils';

interface WoAcceptanceFormProps {
    initialData: {
        projectName: string;
        woNumber: string;
        projectCode?: string;
        clientName?: string;
        oeAmendments: Array<{
            pageNo: string;
            clauseNo: string;
            currentStatement: string;
            correctedStatement: string;
        }>;
    };
    onSubmit: (values: WoAcceptanceFormValues) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export const WoAcceptanceForm: React.FC<WoAcceptanceFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    isSubmitting
}) => {
    const { data: oeUsers } = useGetTeamMembers(3); // Team 3 = OE

    const form = useForm<WoAcceptanceFormValues>({
        resolver: zodResolver(WoAcceptanceFormSchema) as Resolver<WoAcceptanceFormValues>,
        defaultValues: {
            decision: 'accepted',
            remarks: '',
            amendments: [],
            initiateFollowUp: 'false',
            oeSiteVisitId: null,
            oeDocsPrepId: null,
            signedWoFilePath: null,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'amendments',
    });

    const decision = form.watch('decision');

    const oeOptions = (oeUsers || []).map(u => ({
        value: String(u.id),
        label: u.name,
    }));

    return (
        <Card>
            {/* 1. Project Summary Header */}
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-2xl font-bold text-foreground/90">
                            {initialData.projectName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-md border text-sm font-medium">
                                <FileText className="h-3.5 w-3.5 text-primary" />
                                WO: {initialData.woNumber}
                            </span>
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-background rounded-md border text-sm font-medium">
                                <Badge variant="outline" className="border-none p-0">{initialData.projectCode || 'N/A'}</Badge>
                            </span>
                        </CardDescription>
                    </div>
                    <Badge variant="secondary" className="px-3 py-1 text-sm font-semibold uppercase tracking-wider">
                        {initialData.clientName || 'Client N/A'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className='space-y-6'>
                {/* 2. OE Submitted Amendments Summary */}
                {initialData.oeAmendments.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-4">
                            <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Amendments Identified by OE</CardTitle>
                                <CardDescription>These were submitted during the initial review step.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-20 pl-6">Page #</TableHead>
                                        <TableHead className="w-24">Clause #</TableHead>
                                        <TableHead>Current Statement</TableHead>
                                        <TableHead>Corrected Statement</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialData.oeAmendments.map((am, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/20">
                                            <TableCell className="font-medium pl-6">{am.pageNo}</TableCell>
                                            <TableCell>{am.clauseNo}</TableCell>
                                            <TableCell className="max-w-xs truncate text-muted-foreground italic">&quot;{am.currentStatement}&quot;</TableCell>
                                            <TableCell className="max-w-xs">{am.correctedStatement}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* 3. Decision Form */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <Card>
                            <CardHeader className="border-b bg-muted/10">
                                <CardTitle className="flex items-center gap-2">
                                    Work Order Acceptance Review
                                </CardTitle>
                                <CardDescription>Review the Work Order and make a final decision.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 p-6">
                                {/* Decision Selection */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SelectField
                                        control={form.control}
                                        name="decision"
                                        label="WO Amendment Needed?"
                                        options={[
                                            { value: 'accepted', label: 'No' },
                                            { value: 'amendment_needed', label: 'Yes' },
                                        ]}
                                        placeholder='Select Decision Outcome'
                                    />
                                    {decision === 'amendment_needed' && (
                                        <SelectField
                                            control={form.control}
                                            name="initiateFollowUp"
                                            label="Initiate Follow-up Dashboard Entry"
                                            options={[
                                                { value: 'true', label: 'Yes' },
                                                { value: 'false', label: 'No' },
                                            ]}
                                            placeholder="Select Option"
                                        />
                                    )}
                                </div>

                                {/* Conditional Sub-forms */}
                                {decision === 'amendment_needed' ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Required Amendments</h4>
                                        </div>
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-muted/20 p-4 rounded-xl border relative group transition-colors hover:bg-muted/30">
                                                <div className="md:col-span-2">
                                                    <Input placeholder="Page #" {...form.register(`amendments.${index}.pageNo` as const)} className="bg-background" />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <Input placeholder="Clause #" {...form.register(`amendments.${index}.clauseNo` as const)} className="bg-background" />
                                                </div>
                                                <div className="md:col-span-4">
                                                    <Input placeholder="Current Statement" {...form.register(`amendments.${index}.currentStatement` as const)} className="bg-background" />
                                                </div>
                                                <div className="md:col-span-4">
                                                    <Input placeholder="Corrected Statement" {...form.register(`amendments.${index}.correctedStatement` as const)} className="bg-background" />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute -right-2 -top-2 h-7 w-7 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"
                                                    onClick={() => remove(index)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-dashed border-2 hover:bg-orange-50 hover:text-orange-600 h-10 transition-colors"
                                            onClick={() => append({ pageNo: '', clauseNo: '', currentStatement: '', correctedStatement: '' })}
                                        >
                                            <Plus className="mr-2 h-4 w-4" /> Add Amendment Item
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <SelectField
                                                control={form.control}
                                                name="oeSiteVisitId"
                                                label="Assign OE for Site Visit"
                                                placeholder="Select an executive"
                                                options={oeOptions}
                                            />
                                            <SelectField
                                                control={form.control}
                                                name="oeDocsPrepId"
                                                label="Assign OE for Document Prep"
                                                placeholder="Select an executive"
                                                options={oeOptions}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                Signed Work Order Upload
                                            </label>
                                            <TenderFileUploader
                                                context="wo-signed-copy"
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>
                                )}

                                <FieldWrapper control={form.control} name="remarks" label="TL Review Remarks (Optional)">
                                    {(field) => (
                                        <Textarea
                                            placeholder="Add any internal notes or details regarding your decision..."
                                            className="min-h-[100px] bg-muted/5 border-muted-foreground/20 focus:bg-background transition-colors"
                                            {...field}
                                        />
                                    )}
                                </FieldWrapper>
                            </CardContent>
                        </Card>

                        {/* 4. Action Bar */}
                        <div className="flex justify-end items-center gap-3 pt-4 border-t px-6 pb-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="min-w-[100px]"
                            >
                                <X className="mr-2 h-4 w-4" /> Cancel
                            </Button>
                            <Button
                                type="submit"
                                className={cn(
                                    "min-w-[160px] shadow-sm font-semibold",
                                    decision === 'accepted' ? "bg-green-600 hover:bg-green-700" : "bg-orange-500 hover:bg-orange-600"
                                )}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </span>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {decision === 'accepted' ? 'Confirm Acceptance' : 'Submit Amendment'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};
