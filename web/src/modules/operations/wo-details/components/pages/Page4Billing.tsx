import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Package, Plus, Receipt, Trash2, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useFieldArray, useForm, type Resolver } from "react-hook-form";

import { FieldWrapper } from "@/components/form/FieldWrapper";
import { SelectField } from "@/components/form/SelectField";
import { useAutoSave } from "@/hooks/api/useWoDetails";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { WIZARD_CONFIG, GST_OPTIONS, YES_NO_OPTIONS } from "@/modules/operations/wo-details/helpers/constants";
import { Page4FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { formToApi } from "../../helpers/woDetail.mapper";

import NumberInput from "@/components/form/NumberInput";
import type { Address, BOQItem, Page4FormValues, PageFormProps } from "@/modules/operations/wo-details/helpers/woDetail.types";

interface Page4BillingProps extends PageFormProps {
    initialData?: Partial<Page4FormValues>;
}

const defaultBoqItem: BOQItem = {
    srNo: 1,
    itemDescription: "",
    quantity: 0,
    rate: 0,
    gstRate: 0,
};

const defaultAddress: Address = {
    srNos: "all",
    customerName: "",
    address: "",
    gst: "",
};

interface BoqTotals {
    basic: number;
    gst: number;
    total: number;
}

const roundCurrency = (value: number): number => Number(value.toFixed(2));

const calculateBasicAmount = (quantity: number | undefined, rate = 0): number =>
    roundCurrency((quantity ?? 0) * (rate ?? 0));

const calculateGstAmount = (basicAmount: number, gstRate = 0): number =>
    roundCurrency((basicAmount * (gstRate ?? 0)) / 100);

const calculateRowTotals = (quantity: number | undefined, rate = 0, gstRate = 0): BoqTotals => {
    const basic = calculateBasicAmount(quantity, rate);
    const gst = calculateGstAmount(basic, gstRate);
    return { basic, gst, total: roundCurrency(basic + gst) };
};

const calculateBoqTotals = (items: BOQItem[] | undefined): BoqTotals =>
    (items ?? []).reduce<BoqTotals>(
        (acc, item) => {
            const row = calculateRowTotals(item.quantity, item.rate, item.gstRate);
            return {
                basic: roundCurrency(acc.basic + row.basic),
                gst: roundCurrency(acc.gst + row.gst),
                total: roundCurrency(acc.total + row.total),
            };
        },
        { basic: 0, gst: 0, total: 0 }
    );

const formatAmount = (value: number): string =>
    `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Page4Billing({ woDetailId, initialData, onSaveDraft, onSaveDraftOnly, onSkip, onBack, isSaving }: Page4BillingProps) {
    const form = useForm<Page4FormValues>({
        resolver: zodResolver(Page4FormSchema) as Resolver<Page4FormValues>,
        defaultValues: {
            buybackBoqApplicable: initialData?.buybackBoqApplicable ?? "false",
            billingBoq: initialData?.billingBoq?.length ? initialData.billingBoq : [defaultBoqItem],
            buybackBoq: initialData?.buybackBoq || [],
            billingAddresses: initialData?.billingAddresses?.length ? initialData.billingAddresses : [defaultAddress],
            shippingAddresses: initialData?.shippingAddresses?.length ? initialData.shippingAddresses : [defaultAddress],
        },
    });

    const {
        fields: billingBoqFields,
        append: appendBillingBoq,
        remove: removeBillingBoq,
    } = useFieldArray({ control: form.control, name: "billingBoq" });

    const {
        fields: buybackBoqFields,
        append: appendBuybackBoq,
        remove: removeBuybackBoq,
    } = useFieldArray({ control: form.control, name: "buybackBoq" });

    const {
        fields: billingAddressFields,
        append: appendBillingAddress,
        remove: removeBillingAddress,
    } = useFieldArray({ control: form.control, name: "billingAddresses" });

    const {
        fields: shippingAddressFields,
        append: appendShippingAddress,
        remove: removeShippingAddress,
    } = useFieldArray({ control: form.control, name: "shippingAddresses" });

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 4, true, 4000, formToApi.page4);

    const watchBillingBoq = form.watch("billingBoq");
    const watchBuybackBoq = form.watch("buybackBoq");
    const watchBuybackBoqApplicable = form.watch("buybackBoqApplicable");

    const billingTotals = useMemo(() => calculateBoqTotals(watchBillingBoq), [watchBillingBoq]);

    const buybackTotals = useMemo(() => calculateBoqTotals(watchBuybackBoq), [watchBuybackBoq]);

    useEffect(() => {
        const subscription = form.watch((values) => {
            if (values) autoSave(values);
        });
        return () => subscription.unsubscribe();
    }, [form, autoSave]);

    useEffect(() => {
        if (initialData) {
            form.reset({
                buybackBoqApplicable: initialData.buybackBoqApplicable ?? "false",
                billingBoq: initialData.billingBoq?.length ? initialData.billingBoq : [defaultBoqItem],
                buybackBoq: initialData.buybackBoq || [],
                billingAddresses: initialData.billingAddresses?.length ? initialData.billingAddresses : [defaultAddress],
                shippingAddresses: initialData.shippingAddresses?.length ? initialData.shippingAddresses : [defaultAddress],
            });
        }
    }, [initialData, form]);

    const handleSaveAndContinue = useCallback(async () => {
        const errors = await onSaveDraft(form.getValues());
        if (errors?.length) {
            for (const err of errors) {
                form.setError(err.field as any, { message: err.message });
            }
        }
    }, [onSaveDraft, form]);

    const handleSaveDraftOnly = useCallback(async () => {
        const errors = await onSaveDraftOnly(form.getValues());
        if (errors?.length) {
            for (const err of errors) {
                form.setError(err.field as any, { message: err.message });
            }
        }
    }, [onSaveDraftOnly, form]);

    const renderBoqTable = (
        fields: typeof billingBoqFields,
        namePrefix: "billingBoq" | "buybackBoq",
        onRemove: (index: number) => void,
        onAdd: () => void,
        totals: BoqTotals,
        title: string,
        minRows: number = 0
    ) => (
        <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                {title}
            </h3>
            <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm min-w-[1040px]">
                    <thead className="bg-muted">
                        <tr>
                            <th className="p-3 text-left w-16">Sr. No.</th>
                            <th className="p-3 text-left min-w-[200px]">Item Description</th>
                            <th className="p-3 text-left w-24">Qty</th>
                            <th className="p-3 text-left w-28">Rate</th>
                            <th className="p-3 text-left w-40">Basic Amount</th>
                            <th className="p-3 text-left w-28">GST %age</th>
                            <th className="p-3 text-left w-36">GST Amount</th>
                            <th className="p-3 text-left w-36">Total Amount</th>
                            <th className="p-3 text-left w-12"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {fields.map((field, index) => {
                            const quantity = form.watch(`${namePrefix}.${index}.quantity`);
                            const rate = form.watch(`${namePrefix}.${index}.rate`);
                            const gstRate = form.watch(`${namePrefix}.${index}.gstRate`);
                            const rowTotals = calculateRowTotals(quantity, rate, gstRate);

                            return (
                                <tr key={field.id}>
                                    <td className="p-2">
                                        <FieldWrapper control={form.control} name={`${namePrefix}.${index}.srNo`} label="">
                                            {(field) => <NumberInput min={1} {...field} className="h-8 text-xs w-16" />}
                                        </FieldWrapper>
                                    </td>
                                    <td className="p-2">
                                        <FieldWrapper control={form.control} name={`${namePrefix}.${index}.itemDescription`} label="">
                                            {(field) => <Input {...field} placeholder="Item description" className="h-8 text-xs" />}
                                        </FieldWrapper>
                                    </td>
                                    <td className="p-2">
                                        <FieldWrapper control={form.control} name={`${namePrefix}.${index}.quantity`} label="">
                                            {(field) => <NumberInput min={0} step={0.01} className="h-8 text-xs text-right" {...field} />}
                                        </FieldWrapper>
                                    </td>
                                    <td className="p-2">
                                        <FieldWrapper control={form.control} name={`${namePrefix}.${index}.rate`} label="">
                                            {(field) => <NumberInput min={0} step={0.01} className="h-8 text-xs text-right" {...field} />}
                                        </FieldWrapper>
                                    </td>
                                    <td className="p-2">
                                        <span className="text-sm font-medium tabular-nums">{formatAmount(rowTotals.basic)}</span>
                                    </td>
                                    <td className="p-2">
                                        <SelectField
                                            control={form.control}
                                            name={`${namePrefix}.${index}.gstRate`}
                                            label=""
                                            options={GST_OPTIONS}
                                            placeholder="GST"
                                            valueType="number"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <span className="text-sm font-medium tabular-nums text-blue-600">{formatAmount(rowTotals.gst)}</span>
                                    </td>
                                    <td className="p-2">
                                        <span className="text-sm font-semibold tabular-nums">{formatAmount(rowTotals.total)}</span>
                                    </td>
                                    <td className="p-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            type="button"
                                            onClick={() => onRemove(index)}
                                            disabled={fields.length <= minRows}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                        {fields.length === 0 && (
                            <tr>
                                <td colSpan={9} className="p-4 text-center text-muted-foreground">
                                    No items. Add one using the button below.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {fields.length > 0 && (
                        <tfoot className="bg-muted/50">
                            <tr>
                                <td colSpan={4} className="p-3 text-right font-semibold">Total:</td>
                                <td className="p-3 font-semibold tabular-nums">{formatAmount(totals.basic)}</td>
                                <td></td>
                                <td className="p-3 font-semibold tabular-nums text-blue-600">{formatAmount(totals.gst)}</td>
                                <td className="p-3 font-bold tabular-nums">{formatAmount(totals.total)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onAdd}
            >
                <Plus className="h-4 w-4 mr-2" />
                Add Row
            </Button>
        </div>
    );

    const renderAddressSection = (
        fields: typeof billingAddressFields,
        namePrefix: "billingAddresses" | "shippingAddresses",
        onRemove: (index: number) => void,
        onAdd: () => void,
        title: string,
        icon: React.ReactNode
    ) => (
        <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                {icon}
                {title}
            </h3>
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm">{title.replace("es", "")} {index + 1}</h4>
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={() => onRemove(index)}
                                disabled={fields.length === 1}
                                className="text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4 items-start">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id={`${namePrefix}-all-${index}`}
                                        checked={form.watch(`${namePrefix}.${index}.srNos`) === "all"}
                                        onCheckedChange={(checked) => {
                                            form.setValue(`${namePrefix}.${index}.srNos`, checked ? "all" : []);
                                        }}
                                    />
                                    <Label htmlFor={`${namePrefix}-all-${index}`}>For All Items</Label>
                                </div>
                                {form.watch(`${namePrefix}.${index}.srNos`) !== "all" && (
                                    <Input
                                        placeholder="e.g., 1, 2, 3"
                                        onChange={(e) => {
                                            const nums = e.target.value
                                                .split(",")
                                                .map((s) => parseInt(s.trim()))
                                                .filter((n) => !isNaN(n));
                                            form.setValue(`${namePrefix}.${index}.srNos`, nums);
                                        }}
                                    />
                                )}
                            </div>

                            <FieldWrapper control={form.control} name={`${namePrefix}.${index}.customerName`} label="Customer Name">
                                {(field) => <Input {...field} placeholder="Customer name" />}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name={`${namePrefix}.${index}.gst`} label="GST Number">
                                {(field) => <Input {...field} placeholder="27AABCU9603R1ZX" />}
                            </FieldWrapper>

                            <FieldWrapper control={form.control} name={`${namePrefix}.${index}.address`} label="Address">
                                {(field) => <Textarea {...field} placeholder="Full address" rows={2} />}
                            </FieldWrapper>
                        </div>
                    </div>
                ))}

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAdd}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add {title.replace("es", "")}
                </Button>
            </div>
        </div>
    );

    return (
        <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Receipt className="h-5 w-5 text-muted-foreground" />
                            Billing
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {renderBoqTable(
                            billingBoqFields,
                            "billingBoq",
                            removeBillingBoq,
                            () => appendBillingBoq({ ...defaultBoqItem, srNo: billingBoqFields.length + 1 }),
                            billingTotals,
                            "Billing BOQ",
                            1
                        )}

                        <Separator />

                        <div>
                            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                Buyback BOQ
                            </h3>
                            <div className="max-w-xs mb-4">
                                <SelectField
                                    control={form.control}
                                    name="buybackBoqApplicable"
                                    label="Buyback BOQ Applicable?"
                                    options={YES_NO_OPTIONS}
                                    placeholder="Select"
                                />
                            </div>

                            {watchBuybackBoqApplicable === "true" ? (
                                renderBoqTable(
                                    buybackBoqFields,
                                    "buybackBoq",
                                    removeBuybackBoq,
                                    () => appendBuybackBoq({ ...defaultBoqItem, srNo: buybackBoqFields.length + 1 }),
                                    buybackTotals,
                                    "Buyback BOQ Items",
                                    0
                                )
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    Buyback BOQ is not applicable for this work order.
                                </p>
                            )}
                        </div>

                        <Separator />

                        {renderAddressSection(
                            billingAddressFields,
                            "billingAddresses",
                            removeBillingAddress,
                            () => appendBillingAddress(defaultAddress),
                            "Billing Addresses",
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                        )}

                        <Separator />

                        {renderAddressSection(
                            shippingAddressFields,
                            "shippingAddresses",
                            removeShippingAddress,
                            () => appendShippingAddress(defaultAddress),
                            "Shipping Addresses",
                            <Truck className="h-4 w-4 text-muted-foreground" />
                        )}
                    </CardContent>
                </Card>

                <WizardNavigation
                    currentPage={4}
                    totalPages={WIZARD_CONFIG.TOTAL_PAGES}
                    canSkip={true}
                    isSubmitting={isSaving}
                    isSaving={isSaving || isAutoSaving}
                    onBack={onBack}
                    onSubmit={handleSaveAndContinue}
                    onSkip={onSkip}
                    onSaveDraft={handleSaveDraftOnly}
                />
            </form>
        </Form>
    );
}
