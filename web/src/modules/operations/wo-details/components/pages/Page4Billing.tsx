import { useEffect, useMemo } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package, MapPin, Truck } from "lucide-react";

import { Page4FormSchema } from "@/modules/operations/wo-details/helpers/woDetail.schema";
import { WizardNavigation } from "@/modules/operations/wo-details/components/WizardNavigation";
import { WIZARD_CONFIG } from "@/modules/operations/wo-details/helpers/constants";
import { useAutoSave } from "@/hooks/api/useWoDetails";

import type { Page4FormValues, PageFormProps, BOQItem, Address } from "@/modules/operations/wo-details/helpers/woDetail.types";

interface Page4BillingProps extends PageFormProps {
    initialData?: Partial<Page4FormValues>;
}

const defaultBoqItem: BOQItem = {
    srNo: 1,
    itemDescription: "",
    quantity: "",
    rate: "",
};

const defaultAddress: Address = {
    srNos: "all",
    customerName: "",
    address: "",
    gst: "",
};

const calculateAmount = (quantity: string, rate: string): number => {
    const q = parseFloat(quantity) || 0;
    const r = parseFloat(rate) || 0;
    return Number((q * r).toFixed(2));
};

export function Page4Billing({
    woDetailId,
    initialData,
    onSubmit,
    onSkip,
    onBack,
    onSaveDraft,
    isLoading,
    isSaving,
}: Page4BillingProps) {
    const form = useForm<Page4FormValues>({
        resolver: zodResolver(Page4FormSchema) as Resolver<Page4FormValues>,
        defaultValues: {
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

    const { autoSave, isSaving: isAutoSaving } = useAutoSave(woDetailId, 4);

    const watchBillingBoq = form.watch("billingBoq");
    const watchBuybackBoq = form.watch("buybackBoq");

    const billingTotal = useMemo(() => {
        return watchBillingBoq.reduce((sum, item) => sum + calculateAmount(item.quantity, item.rate), 0);
    }, [watchBillingBoq]);

    const buybackTotal = useMemo(() => {
        return (watchBuybackBoq || []).reduce((sum, item) => sum + calculateAmount(item.quantity, item.rate), 0);
    }, [watchBuybackBoq]);

    useEffect(() => {
        const subscription = form.watch((values) => {
            if (values) autoSave(values);
        });
        return () => subscription.unsubscribe();
    }, [form, autoSave]);

    useEffect(() => {
        if (initialData) {
            form.reset({
                billingBoq: initialData.billingBoq?.length ? initialData.billingBoq : [defaultBoqItem],
                buybackBoq: initialData.buybackBoq || [],
                billingAddresses: initialData.billingAddresses?.length ? initialData.billingAddresses : [defaultAddress],
                shippingAddresses: initialData.shippingAddresses?.length ? initialData.shippingAddresses : [defaultAddress],
            });
        }
    }, [initialData, form]);

    const handleFormSubmit = async (values: Page4FormValues) => {
        await onSubmit(values);
    };

    const handleSaveDraft = async () => {
        await onSaveDraft(form.getValues());
    };

    const renderBoqTable = (
        fields: typeof billingBoqFields,
        namePrefix: "billingBoq" | "buybackBoq",
        onRemove: (index: number) => void,
        onAdd: () => void,
        total: number,
        title: string,
        icon: React.ReactNode,
        colorClass: string,
        minRows: number = 0
    ) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left w-20">Sr. No.</th>
                                <th className="p-3 text-left">Item Description</th>
                                <th className="p-3 text-left w-32">Quantity</th>
                                <th className="p-3 text-left w-32">Rate</th>
                                <th className="p-3 text-left w-32">Amount</th>
                                <th className="p-3 text-left w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {fields.map((field, index) => {
                                const quantity = form.watch(`${namePrefix}.${index}.quantity`);
                                const rate = form.watch(`${namePrefix}.${index}.rate`);
                                const amount = calculateAmount(quantity, rate);

                                return (
                                    <tr key={field.id}>
                                        <td className="p-2">
                                            <FormField
                                                control={form.control}
                                                name={`${namePrefix}.${index}.srNo`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                type="number"
                                                                className="h-8 text-xs w-16"
                                                                min={1}
                                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <FormField
                                                control={form.control}
                                                name={`${namePrefix}.${index}.itemDescription`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Item description" className="h-8 text-xs" />
                                                        </FormControl>
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <FormField
                                                control={form.control}
                                                name={`${namePrefix}.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input {...field} placeholder="0.00" className="h-8 text-xs" />
                                                        </FormControl>
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <FormField
                                                control={form.control}
                                                name={`${namePrefix}.${index}.rate`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input {...field} placeholder="0.00" className="h-8 text-xs" />
                                                        </FormControl>
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <span className="text-sm font-medium">₹{amount.toLocaleString()}</span>
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
                                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                        No items. Add one using the button below.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        {fields.length > 0 && (
                            <tfoot className="bg-muted/50">
                                <tr>
                                    <td colSpan={4} className="p-3 text-right font-semibold">Total:</td>
                                    <td className={`p-3 font-bold ${colorClass}`}>₹{total.toLocaleString()}</td>
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
                    className="mt-4"
                    onClick={onAdd}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                </Button>
            </CardContent>
        </Card>
    );

    const renderAddressSection = (
        fields: typeof billingAddressFields,
        namePrefix: "billingAddresses" | "shippingAddresses",
        onRemove: (index: number) => void,
        onAdd: () => void,
        title: string,
        icon: React.ReactNode
    ) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {icon}
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium">{title.replace("es", "")} {index + 1}</h4>
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

                            <FormField
                                control={form.control}
                                name={`${namePrefix}.${index}.customerName`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Customer Name</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Customer name" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name={`${namePrefix}.${index}.gst`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>GST Number</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="27AABCU9603R1ZX" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name={`${namePrefix}.${index}.address`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="Full address" rows={2} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
            </CardContent>
        </Card>
    );

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                {renderBoqTable(
                    billingBoqFields,
                    "billingBoq",
                    removeBillingBoq,
                    () => appendBillingBoq({ ...defaultBoqItem, srNo: billingBoqFields.length + 1 }),
                    billingTotal,
                    "Billing BOQ",
                    <Package className="h-5 w-5 text-orange-500" />,
                    "text-green-600",
                    1
                )}

                {renderBoqTable(
                    buybackBoqFields,
                    "buybackBoq",
                    removeBuybackBoq,
                    () => appendBuybackBoq({ ...defaultBoqItem, srNo: buybackBoqFields.length + 1 }),
                    buybackTotal,
                    "Buyback BOQ (Optional)",
                    <Package className="h-5 w-5 text-blue-500" />,
                    "text-blue-600",
                    0
                )}

                {renderAddressSection(
                    billingAddressFields,
                    "billingAddresses",
                    removeBillingAddress,
                    () => appendBillingAddress(defaultAddress),
                    "Billing Addresses",
                    <MapPin className="h-5 w-5 text-orange-500" />
                )}

                {renderAddressSection(
                    shippingAddressFields,
                    "shippingAddresses",
                    removeShippingAddress,
                    () => appendShippingAddress(defaultAddress),
                    "Shipping Addresses",
                    <Truck className="h-5 w-5 text-orange-500" />
                )}

                <WizardNavigation
                    currentPage={4}
                    totalPages={WIZARD_CONFIG.TOTAL_PAGES}
                    canSkip={false}
                    isSubmitting={isLoading}
                    isSaving={isSaving || isAutoSaving}
                    onBack={onBack}
                    onSubmit={() => form.handleSubmit(handleFormSubmit)()}
                    onSkip={onSkip}
                    onSaveDraft={handleSaveDraft}
                />
            </form>
        </Form>
    );
}
