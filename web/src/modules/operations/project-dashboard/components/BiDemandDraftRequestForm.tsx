import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, useWatch, type Resolver } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Truck } from 'lucide-react';
import { useCreatePaymentRequest } from '@/hooks/api/usePaymentRequests';
import { useProjectOverview } from '@/hooks/api/useProjectDashboard';
import { useUsers } from '@/hooks/api/useUsers';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/form/NumberInput';
import { SelectField } from '@/components/form/SelectField';
import DateInput from '@/components/form/DateInput';
import { PROJECT_DD_DELIVERY_OPTIONS, PROJECT_DD_PURPOSE_OPTIONS } from '@/modules/tendering/emds-tenderfees/constants';
import {
    ProjectDdRequestSchema,
    type ProjectDdRequestFormValues,
} from '@/modules/tendering/emds-tenderfees/helpers/payment-request.schema';

type FormValues = ProjectDdRequestFormValues;

const DD_PREFIX = 'EMD.details';

interface BiDemandDraftRequestFormProps {
    projectId: number;
}

export function BiDemandDraftRequestForm({ projectId }: BiDemandDraftRequestFormProps) {
    const navigate = useNavigate();
    const createRequest = useCreatePaymentRequest();
    const { data: overview } = useProjectOverview(projectId);
    const { data: employees = [] } = useUsers();

    const projectName = overview?.project?.projectName ?? '';
    const poNo = overview?.project?.poNo ?? '';

    const form = useForm<FormValues>({
        resolver: zodResolver(ProjectDdRequestSchema) as Resolver<FormValues>,
        defaultValues: {
            tenderName: '',
            tenderNo: '',
            EMD: { mode: 'DD', details: {} },
        },
    });

    // Prefill project name + work no. once, when the overview loads.
    const prefilledRef = useRef(false);
    useEffect(() => {
        if (prefilledRef.current) return;
        if (!projectName && !poNo) return;
        prefilledRef.current = true;
        form.setValue('tenderName', projectName);
        form.setValue('tenderNo', poNo);
    }, [projectName, poNo, form]);

    const purpose = useWatch({ control: form.control, name: `${DD_PREFIX}.ddPurpose` });
    const requiresReason = purpose === 'OTHER_PAYMENT' || purpose === 'OTHER_SECURITY';

    const handleSubmit = async (values: FormValues) => {
        const details = values.EMD?.details ?? {};
        const payload: any = {
            type: 'Other Than Tender',
            tenderNo: poNo || values.tenderNo || '',
            tenderName: projectName || values.tenderName || '',
            dueDate: values.tenderDueDate || '',
            projectId,
            EMD: {
                mode: 'DD',
                details: requiresReason
                    ? details
                    : { ...details, ddPurposeReason: undefined },
            },
        };

        try {
            await createRequest.mutateAsync({
                tenderId: 0,
                data: payload,
            });
            toast.success('Demand Draft request created successfully');
            navigate(-1);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">Request Demand Draft (DD)</CardTitle>
                <CardDescription>
                    <p className="text-muted-foreground">
                        Raise a Demand Draft request for this project. It follows the same BI approval flow as an EMD Demand Draft.
                    </p>
                </CardDescription>
                <CardAction>
                    <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Back</span>
                    </Button>
                </CardAction>
            </CardHeader>

            <CardContent>
                <FormProvider {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                            console.error('Form validation errors:', errors);
                            toast.error('Please fix the errors in the form before submitting');
                        })}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start mb-4">
                            <FieldWrapper control={form.control} name="tenderName" label="Project Name">
                                {(field) => <Input {...field} disabled className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed" />}
                            </FieldWrapper>
                            <FieldWrapper control={form.control} name="tenderNo" label="Work No.">
                                {(field) => <Input {...field} disabled className="bg-muted text-muted-foreground disabled:opacity-100 disabled:cursor-not-allowed" />}
                            </FieldWrapper>
                        </div>

                        <div className="border rounded-lg p-6 bg-muted/20">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Demand Draft Details</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                                <SelectField
                                    control={form.control}
                                    name={`${DD_PREFIX}.ddPurpose`}
                                    label="Purpose of the DD *"
                                    options={PROJECT_DD_PURPOSE_OPTIONS}
                                    placeholder="Select Purpose"
                                />
                                <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddAmount`} label="Amount *">
                                    {(field) => <NumberInput value={field.value} onChange={field.onChange} />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddFavouring`} label="DD in Favour of *">
                                    {(field) => <Input {...field} placeholder="e.g., Individual or Company Name" />}
                                </FieldWrapper>
                                <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddPayableAt`} label="DD Payable at *">
                                    {(field) => <Input {...field} placeholder="e.g., Bank Name or Address" />}
                                </FieldWrapper>
                                <SelectField
                                    control={form.control}
                                    name={`${DD_PREFIX}.ddDeliverBy`}
                                    label="DD Needed In *"
                                    options={PROJECT_DD_DELIVERY_OPTIONS}
                                    placeholder="Select"
                                />
                                <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddRemarks`} label="Remarks">
                                    {(field) => <Textarea rows={2} {...field} placeholder="Enter remarks" />}
                                </FieldWrapper>

                                {requiresReason && (
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddPurposeReason`} label="Reason *">
                                            {(field) => (
                                                <Textarea
                                                    {...field}
                                                    rows={2}
                                                    placeholder="Enter the reason for this purpose"
                                                />
                                            )}
                                        </FieldWrapper>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-2 pt-2 border-t">
                                    <Truck className="h-4 w-4 text-primary" />
                                    <h5 className="font-medium text-sm">Courier Request Form</h5>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddCourierOrg`} label="Organization Name *">
                                        {(field) => <Input {...field} placeholder="Enter organization name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddCourierName`} label="Recipient Name *">
                                        {(field) => <Input {...field} placeholder="Enter recipient name" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddCourierPhone`} label="Phone *">
                                        {(field) => <Input {...field} placeholder="Enter phone number" maxLength={10} />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddCourierAddressLine1`} label="Address Line 1 *">
                                        {(field) => <Input {...field} placeholder="Building, Street" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddCourierAddressLine2`} label="Address Line 2">
                                        {(field) => <Input {...field} placeholder="Area, Locality" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddCourierCity`} label="City *">
                                        {(field) => <Input {...field} placeholder="Enter city" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddCourierState`} label="State *">
                                        {(field) => <Input {...field} placeholder="Enter state" />}
                                    </FieldWrapper>
                                    <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddCourierPincode`} label="Pin Code *">
                                        {(field) => <Input {...field} placeholder="Enter 6-digit pin code" maxLength={6} />}
                                    </FieldWrapper>
                                    <SelectField
                                        control={form.control}
                                        name={`${DD_PREFIX}.ddCourierEmpFrom`}
                                        label="Courier From *"
                                        options={employees.map((employee: { id: number | string; name: string }) => ({
                                            value: String(employee.id),
                                            label: employee.name,
                                        }))}
                                        placeholder="Select Employee"
                                        valueType="string"
                                    />
                                    <FieldWrapper control={form.control} name={`${DD_PREFIX}.ddCourierDelDate`} label="Expected Delivery Date *">
                                        {(field) => <DateInput value={field.value || null} onChange={field.onChange} />}
                                    </FieldWrapper>
                                    <SelectField
                                        control={form.control}
                                        name={`${DD_PREFIX}.ddCourierUrgency`}
                                        label="Dispatch Urgency *"
                                        options={[
                                            { value: '1', label: 'Same Day (Urgent)' },
                                            { value: '2', label: 'Next Day' },
                                        ]}
                                        placeholder="Select Urgency"
                                        valueType="string"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 pt-6 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => navigate(-1)}
                                disabled={createRequest.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="lg"
                                disabled={createRequest.isPending}
                                className="min-w-48"
                            >
                                {createRequest.isPending ? (
                                    'Submitting...'
                                ) : (
                                    <>
                                        <Save className="mr-2 h-5 w-5" />
                                        Submit Request
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </FormProvider>
            </CardContent>
        </Card>
    );
}
