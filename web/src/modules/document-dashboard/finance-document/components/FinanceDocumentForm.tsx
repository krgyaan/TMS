import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/form/SelectField';
import { FileUploadField } from '@/components/form/FileUploadField';
import { ArrowLeft, Save } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { FinanceDocumentFormSchema } from '../helpers/financeDocument.schema';
import type { FinanceDocumentFormValues, FinanceDocumentResponse } from '../helpers/financeDocument.types';
import { buildDefaultValues, mapResponseToForm, mapFormToCreatePayload, mapFormToUpdatePayload } from '../helpers/financeDocument.mappers';
import { useFinancialYears } from '@/hooks/api/useFinancialYear';

interface FinanceDocumentFormProps {
    mode: 'create' | 'edit';
    existingData?: FinanceDocumentResponse;
}

const FormLoadingSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-[400px] w-full" />
        </CardContent>
    </Card>
);

// TODO: Replace with actual document type hook when available
const useDocumentTypeOptions = () => {
    // Placeholder - replace with actual API hook
    return useMemo(() => [
        { id: '1', name: 'Type 1' },
        { id: '2', name: 'Type 2' },
    ], []);
};

export function FinanceDocumentForm({ mode, existingData }: FinanceDocumentFormProps) {
    const navigate = useNavigate();
    const { data: financialYears = [] } = useFinancialYears();
    const documentTypeOptions = useDocumentTypeOptions();

    const financialYearOptions = useMemo(
        () => financialYears.map((fy) => ({ id: String(fy.id), name: fy.name })),
        [financialYears]
    );

    // TODO: Replace with actual API hooks when available
    // const createMutation = useCreateFinanceDocument();
    // const updateMutation = useUpdateFinanceDocument();

    // Compute initial values
    const initialValues = useMemo(() => {
        if (mode === 'edit' && existingData) {
            return mapResponseToForm(existingData);
        }
        return buildDefaultValues();
    }, [mode, existingData]);

    const form = useForm<FinanceDocumentFormValues>({
        resolver: zodResolver(FinanceDocumentFormSchema) as Resolver<FinanceDocumentFormValues>,
        defaultValues: initialValues,
    });

    // Reset form when initial values change
    useEffect(() => {
        form.reset(initialValues);
    }, [form, initialValues]);

    const isSubmitting = false; // TODO: Replace with actual mutation state
    // const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleSubmit: SubmitHandler<FinanceDocumentFormValues> = async (values) => {
        try {
            if (mode === 'create') {
                const payload = mapFormToCreatePayload(values);
                // await createMutation.mutateAsync(payload);
                console.log('Create payload:', payload);
            } else if (existingData?.id) {
                const payload = mapFormToUpdatePayload(existingData.id, values);
                // await updateMutation.mutateAsync(payload);
                console.log('Update payload:', payload);
            }
            // navigate(paths.documentDashboard.financeDocument);
            navigate(-1);
        } catch (error) {
            console.error('Error submitting Finance Document:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>
                            {mode === 'create' ? 'Create' : 'Edit'} Finance Document
                        </CardTitle>
                        <CardDescription className="mt-2">
                            {mode === 'create'
                                ? 'Create a new finance document'
                                : 'Update finance document information'}
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
                        <div className="grid gap-4 md:grid-cols-2">
                            <FieldWrapper
                                control={form.control}
                                name="documentName"
                                label="Document Name**"
                            >
                                {(field) => (
                                    <Input
                                        {...field}
                                        placeholder="Document Name"
                                    />
                                )}
                            </FieldWrapper>
                            <SelectField
                                control={form.control}
                                name="documentType"
                                label="Document Type**"
                                options={documentTypeOptions}
                                placeholder="Select Option"
                            />
                            <SelectField
                                control={form.control}
                                name="financialYear"
                                label="Financial Year**"
                                options={financialYearOptions}
                                placeholder="Select Option"
                            />
                            <FileUploadField
                                control={form.control}
                                name="uploadFile"
                                label="Upload File*"
                            />
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
                                onClick={() => form.reset(initialValues)}
                                disabled={isSubmitting}
                            >
                                Reset
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                {isSubmitting && <span className="animate-spin mr-2">⏳</span>}
                                <Save className="mr-2 h-4 w-4" />
                                Submit
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default FinanceDocumentForm;
