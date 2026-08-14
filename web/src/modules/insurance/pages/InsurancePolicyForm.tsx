import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { ArrowLeft, Save } from 'lucide-react';
import { paths } from '@/app/routes/paths';
import { useCreateInsurancePolicy, useUpdateInsurancePolicy } from '@/hooks/api/useInsurancePolicies';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InsuranceDetailsForm } from '../components/InsuranceDetailsForm';
import type { InsurancePolicyRow } from '../helpers/insurance.types';
import type { InsuranceFieldsValues } from '../helpers/insurance.schema';
import { insuranceFieldsSchema, validateInsuranceFields } from '../helpers/insurance.schema';

type InsurancePolicyFormValues = InsuranceFieldsValues;

const insurancePolicyFormSchema = insuranceFieldsSchema.superRefine((data, ctx) => {
    validateInsuranceFields(data, ctx, true);
});

interface InsurancePolicyFormProps {
    mode: 'create' | 'edit';
    existingData?: InsurancePolicyRow | null;
}

const buildDefaultValues = (): InsurancePolicyFormValues => ({
    insuranceType: null,
    policyNumber: null,
    insurerName: null,
    startDate: null,
    endDate: null,
    policyDocument: [],
    sumAssured: null,
    noOfManpower: null,
    manpowerNames: null,
    location: null,
    itemsCovered: null,
    lrCopy: [],
});

const mapPolicyToForm = (policy: InsurancePolicyRow): InsurancePolicyFormValues => ({
    insuranceType: policy.insuranceType ?? null,
    policyNumber: policy.policyNumber ?? null,
    insurerName: policy.insurerName ?? null,
    startDate: policy.startDate ?? null,
    endDate: policy.endDate ?? null,
    policyDocument: policy.policyDocument ?? [],
    sumAssured: policy.sumAssured ? Number(policy.sumAssured) : null,
    noOfManpower: policy.noOfManpower ?? null,
    manpowerNames: policy.manpowerNames ?? null,
    location: policy.location ?? null,
    itemsCovered: policy.itemsCovered ?? null,
    lrCopy: policy.lrCopy ?? [],
});

export function InsurancePolicyForm({ mode, existingData }: InsurancePolicyFormProps) {
    const navigate = useNavigate();
    const createMutation = useCreateInsurancePolicy();
    const updateMutation = useUpdateInsurancePolicy();

    const initialValues = useMemo(
        () => (mode === 'edit' && existingData ? mapPolicyToForm(existingData) : buildDefaultValues()),
        [mode, existingData]
    );

    const form = useForm<InsurancePolicyFormValues>({
        resolver: zodResolver(insurancePolicyFormSchema) as unknown as Resolver<InsurancePolicyFormValues>,
        defaultValues: initialValues,
    });

    useEffect(() => {
        form.reset(initialValues);
    }, [initialValues, form]);

    const handleSubmit: SubmitHandler<InsurancePolicyFormValues> = async (values) => {
        const payload = {
            insuranceType: values.insuranceType!,
            policyNumber: values.policyNumber || null,
            insurerName: values.insurerName || null,
            startDate: values.startDate || '',
            endDate: values.endDate || '',
            policyDocument: values.policyDocument,
            sumAssured: values.sumAssured ?? 0,
            noOfManpower: values.noOfManpower ?? null,
            manpowerNames: values.manpowerNames || null,
            location: values.location || null,
            itemsCovered: values.itemsCovered || null,
            lrCopy: values.lrCopy.length ? values.lrCopy : null,
        };

        if (mode === 'edit' && existingData) {
            await updateMutation.mutateAsync({ id: existingData.id, data: payload });
        } else {
            await createMutation.mutateAsync(payload);
        }
        navigate(paths.accounts.insurance);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                    </CardAction>
                    <CardTitle>{mode === 'edit' ? 'Edit Insurance Policy' : 'Create Insurance Policy'}</CardTitle>
                    <CardDescription>
                        {mode === 'edit' ? 'Update policy details' : 'Add a new insurance policy to the dashboard'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSubmit, (errors) => console.log(errors))} className="space-y-8">
                            {(createMutation.isError || updateMutation.isError) && (
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        Failed to {mode === 'edit' ? 'update' : 'create'} the insurance policy. Please try again.
                                    </AlertDescription>
                                </Alert>
                            )}

                            <InsuranceDetailsForm />

                            <div className="flex justify-end gap-2">
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                    <Save className="h-4 w-4" /> {mode === 'edit' ? 'Update Policy' : 'Save Policy'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}