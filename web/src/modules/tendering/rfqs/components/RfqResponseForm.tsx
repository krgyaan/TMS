import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type Resolver, type SubmitHandler, useForm, useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Trash2, Save, ArrowLeft } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldWrapper } from '@/components/form/FieldWrapper';
import { DateTimeInput } from '@/components/form/DateTimeInput';
import { TenderFileUploader } from '@/components/tender-file-upload';
import { SelectField } from '@/components/form/SelectField';
import { NumberInput } from '@/components/form/NumberInput';
import { Input } from '@/components/ui/input';

import { useCreateRfqResponse } from '@/hooks/api/useRfqs';
import { useItemOptions } from '@/hooks/useSelectOptions';
import type { Rfq } from '../helpers/rfq.types';
import { RfqResponseFormSchema, type RfqResponseFormValues } from '../helpers/rfq-response.schema';

const GST_TYPE_FREIGHT_OPTIONS = [
    { value: 'inclusive', label: 'Inclusive' },
    { value: 'exclusive', label: 'Exclusive' },
];

interface RfqResponseFormProps {
    rfqId: number;
    rfqData: Rfq;
    vendorName: string;
    vendorId: number;
}

function buildInitialItems(rfqData: Rfq, masterItemOptions: Array<{ id: string; name: string }>) {
    return (rfqData.items || []).map((rfqItem) => {
        const masterMatch = masterItemOptions.find(
            (m) => m.name && rfqItem.requirement && m.name.trim().toLowerCase() === rfqItem.requirement.trim().toLowerCase()
        );
        return {
            itemId: rfqItem.id,
            masterItemId: masterMatch ? masterMatch.id : ('' as unknown as number),
            requirement: rfqItem.requirement ?? '',
            unit: rfqItem.unit ?? 'Nos',
            qty: rfqItem.qty ? Number(rfqItem.qty) : 1,
            unitPrice: 0,
        };
    });
}

export function RfqResponseForm({ rfqId, rfqData, vendorName, vendorId }: RfqResponseFormProps) {
    const navigate = useNavigate();
    const createResponse = useCreateRfqResponse();
    const isSubmitting = createResponse.isPending;

    const masterItemOptions = useItemOptions();
    const itemOptionsFromUseItems = useMemo(
        () => masterItemOptions.map((o) => ({ value: o.id, label: o.name })),
        [masterItemOptions],
    );

    const initialItems = useMemo(
        () => buildInitialItems(rfqData, masterItemOptions),
        [rfqData.items, masterItemOptions],
    );

    const form = useForm<RfqResponseFormValues>({
        resolver: zodResolver(RfqResponseFormSchema) as Resolver<RfqResponseFormValues>,
        defaultValues: {
            receiptDatetime: undefined,
            items: initialItems,
            gstPercentage: 0,
            gstType: '',
            deliveryTime: 0,
            freightType: '',
            quotationPaths: [],
            technicalPaths: [],
            mafPaths: [],
            miiPaths: [],
        },
    });

    useEffect(() => {
        if (initialItems.length > 0) {
            form.reset({
                ...form.getValues(),
                items: initialItems,
            });
        }
    }, [rfqData.id, initialItems.length, masterItemOptions.length]);

    const quotationPaths = form.watch('quotationPaths');
    const technicalPaths = form.watch('technicalPaths');
    const mafPaths = form.watch('mafPaths');
    const miiPaths = form.watch('miiPaths');

    const { fields: itemFields, remove: removeItem } = useFieldArray({
        control: form.control,
        name: 'items',
    });

    const handleSubmit: SubmitHandler<RfqResponseFormValues> = async (values) => {
        const items = values.items.map((row) => {
            const qty = Number(row.qty) || 0;
            const unitPrice = Number(row.unitPrice) || 0;
            const totalPrice = qty * unitPrice;
            return {
                itemId: typeof row.itemId === 'string' ? parseInt(row.itemId, 10) : row.itemId,
                requirement: row.requirement,
                unit: row.unit,
                qty,
                unitPrice,
                totalPrice,
            };
        });

        const documents: Array<{ docType: string; path: string }> = [
            ...quotationPaths.map((path) => ({ docType: 'QUOTATION', path })),
            ...technicalPaths.map((path) => ({ docType: 'TECHNICAL', path })),
            ...mafPaths.map((path) => ({ docType: 'MAF_FORMAT', path })),
            ...miiPaths.map((path) => ({ docType: 'MII_FORMAT', path })),
        ].filter((d) => d.path);

        await createResponse.mutateAsync({
            rfqId,
            data: {
                vendorId,
                receiptDatetime: values.receiptDatetime.toISOString(),
                gstPercentage: values.gstPercentage,
                gstType: values.gstType,
                deliveryTime: values.deliveryTime,
                freightType: values.freightType,
                items,
                documents: documents.length ? documents : undefined,
            },
        });
        navigate(-1);
    };

    return (
        <Card>
            <CardHeader className="border-b bg-muted/10 pb-4">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle>RFQ Response Capture form</CardTitle>
                        <CardDescription>
                            Record quotation receipt for this RFQ.
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-background p-3 rounded-md border">
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase font-bold">RFQ ID</span>
                                    <span className="font-medium">#{rfqData.id}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase font-bold">Tender</span>
                                    <span className="font-medium">{rfqData.tenderNo} – {rfqData.tenderName}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs uppercase font-bold">Vendor</span>
                                    <span className="font-medium">{vendorName}</span>
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
                        <div className="space-y-4">
                            <div className="w-full md:w-1/3">
                                <FieldWrapper
                                    control={form.control}
                                    name="receiptDatetime"
                                    label="Quotation Receipt Date and Time*"
                                >
                                    {(field) => (
                                        <DateTimeInput
                                            value={
                                                field.value
                                                    ? field.value instanceof Date
                                                        ? field.value.toISOString().slice(0, 16)
                                                        : String(field.value)
                                                    : ''
                                            }
                                            onChange={(value) => field.onChange(value ? new Date(value) : undefined)}
                                            placeholder="yyyy-mm-ddT--:--"
                                        />
                                    )}
                                </FieldWrapper>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Item Details</h3>
                            </div>
                            <Separator />

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="text-left p-2 w-12">Sr. No.</th>
                                            <th className="text-left p-2">Item</th>
                                            <th className="text-left p-2">Description</th>
                                            <th className="text-left p-2 w-24">Quantity</th>
                                            <th className="text-left p-2 w-20">Unit</th>
                                            <th className="text-left p-2 w-28">Unit Price</th>
                                            <th className="text-left p-2 w-28">Amount</th>
                                            <th className="w-12" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemFields.map((field, index) => {
                                            const qty = form.watch(`items.${index}.qty`);
                                            const unitPrice = form.watch(`items.${index}.unitPrice`);
                                            const amount =
                                                (typeof qty === 'number' ? qty : Number(qty) || 0) *
                                                (typeof unitPrice === 'number' ? unitPrice : Number(unitPrice) || 0);
                                            return (
                                                <tr key={field.id} className="border-b">
                                                    <td className="p-2">{index + 1}</td>
                                                    <td className="p-2">
                                                        <SelectField
                                                            control={form.control}
                                                            name={`items.${index}.masterItemId`}
                                                            label={index === 0 ? undefined : ''}
                                                            placeholder="Select item"
                                                            options={itemOptionsFromUseItems}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`items.${index}.requirement`}
                                                            label={index === 0 ? undefined : ''}
                                                        >
                                                            {(f) => <Input {...f} placeholder="Description" className="min-w-[120px]" />}
                                                        </FieldWrapper>
                                                    </td>
                                                    <td className="p-2">
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`items.${index}.qty`}
                                                            label={index === 0 ? undefined : ''}
                                                        >
                                                            {(f) => <NumberInput {...f} placeholder="0" />}
                                                        </FieldWrapper>
                                                    </td>
                                                    <td className="p-2">
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`items.${index}.unit`}
                                                            label={index === 0 ? undefined : ''}
                                                        >
                                                            {(f) => <Input {...f} placeholder="Nos" />}
                                                        </FieldWrapper>
                                                    </td>
                                                    <td className="p-2">
                                                        <FieldWrapper
                                                            control={form.control}
                                                            name={`items.${index}.unitPrice`}
                                                            label={index === 0 ? undefined : ''}
                                                        >
                                                            {(f) => <NumberInput {...f} placeholder="0" />}
                                                        </FieldWrapper>
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            readOnly
                                                            value={amount.toFixed(2)}
                                                            className="bg-muted w-full"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:bg-destructive/10"
                                                            onClick={() => removeItem(index)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FieldWrapper
                                    control={form.control}
                                    name="gstPercentage"
                                    label="GST Percentage*"
                                >
                                    {(f) => <NumberInput {...f} placeholder="0" />}
                                </FieldWrapper>
                                <SelectField
                                    control={form.control}
                                    name="gstType"
                                    label="GST Type*"
                                    placeholder="Select GST Type"
                                    options={GST_TYPE_FREIGHT_OPTIONS}
                                />
                                <FieldWrapper
                                    control={form.control}
                                    name="deliveryTime"
                                    label="Delivery Time (in days)*"
                                >
                                    {(f) => <NumberInput {...f} placeholder="0" />}
                                </FieldWrapper>
                                <SelectField
                                    control={form.control}
                                    name="freightType"
                                    label="Freight*"
                                    placeholder="Select Freight Type"
                                    options={GST_TYPE_FREIGHT_OPTIONS}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Alert>
                                <AlertDescription className="text-sm">
                                    Maximum 3 files per field. Total combined size should not exceed 25MB.
                                </AlertDescription>
                            </Alert>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <TenderFileUploader
                                    context="rfq-response-quotation"
                                    value={quotationPaths}
                                    onChange={(paths) => form.setValue('quotationPaths', paths)}
                                    label="Quotation Document"
                                    disabled={isSubmitting}
                                />
                                <TenderFileUploader
                                    context="rfq-response-technical"
                                    value={technicalPaths}
                                    onChange={(paths) => form.setValue('technicalPaths', paths)}
                                    label="Technical Documents"
                                    disabled={isSubmitting}
                                />
                                <TenderFileUploader
                                    context="rfq-response-maf"
                                    value={mafPaths}
                                    onChange={(paths) => form.setValue('mafPaths', paths)}
                                    label="MAF Document"
                                    disabled={isSubmitting}
                                />
                                <TenderFileUploader
                                    context="rfq-response-mii"
                                    value={miiPaths}
                                    onChange={(paths) => form.setValue('miiPaths', paths)}
                                    label="MII Document"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
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
