import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package, MapPin, Truck } from "lucide-react";
import { Page4FormSchema } from "../../helpers/woDetail.schema";
import { WizardNavigation } from "../WizardNavigation";
import type { Page4FormValues, PageFormProps } from "../../helpers/woDetail.types";

interface Page4BillingProps extends PageFormProps {
    initialData?: Partial<Page4FormValues>;
}

export function Page4Billing({
    initialData,
    onSubmit,
    onSkip,
    onBack,
    isLoading,
}: Page4BillingProps) {
    const form = useForm<Page4FormValues>({
        resolver: zodResolver(Page4FormSchema) as Resolver<Page4FormValues>,
        defaultValues: {
            billingBoq: [{ srNo: 1, itemDescription: "", quantity: "", rate: "" }],
            buybackBoq: [],
            billingAddresses: [{ srNos: "all", customerName: "", address: "", gst: "" }],
            shippingAddresses: [{ srNos: "all", customerName: "", address: "", gst: "" }],
            ...initialData,
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

    // Calculate totals
    const calculateAmount = (quantity: string, rate: string): string => {
        const q = parseFloat(quantity) || 0;
        const r = parseFloat(rate) || 0;
        return (q * r).toFixed(2);
    };

    const billingTotal = form.watch("billingBoq").reduce((sum, item) => {
        return sum + (parseFloat(calculateAmount(item.quantity, item.rate)) || 0);
    }, 0);

    const buybackTotal = form.watch("buybackBoq")?.reduce((sum, item) => {
        return sum + (parseFloat(calculateAmount(item.quantity, item.rate)) || 0);
    }, 0) || 0;

    const handleFormSubmit = async (values: Page4FormValues) => {
        console.log("Page 4 data:", values);
        onSubmit();
    };

    const handleSaveDraft = async () => {
        const values = form.getValues();
        console.log("Save draft:", values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
                {/* Billing BOQ */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-orange-500" />
                            Billing BOQ
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
                                        <th className="p-3 text-left w-16">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {billingBoqFields.map((field, index) => {
                                        const quantity = form.watch(`billingBoq.${index}.quantity`);
                                        const rate = form.watch(`billingBoq.${index}.rate`);
                                        return (
                                            <tr key={field.id}>
                                                <td className="p-2">
                                                    <Input
                                                        {...form.register(`billingBoq.${index}.srNo`, { valueAsNumber: true })}
                                                        type="number"
                                                        className="h-8 text-xs w-16"
                                                        min={1}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        {...form.register(`billingBoq.${index}.itemDescription`)}
                                                        placeholder="Item description"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        {...form.register(`billingBoq.${index}.quantity`)}
                                                        placeholder="0.00"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        {...form.register(`billingBoq.${index}.rate`)}
                                                        placeholder="0.00"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <span className="text-sm font-medium">
                                                        ₹{calculateAmount(quantity, rate)}
                                                    </span>
                                                </td>
                                                <td className="p-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        type="button"
                                                        onClick={() => removeBillingBoq(index)}
                                                        disabled={billingBoqFields.length === 1}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-muted/50">
                                    <tr>
                                        <td colSpan={4} className="p-3 text-right font-semibold">
                                            Total:
                                        </td>
                                        <td className="p-3 font-bold text-green-600">
                                            ₹{billingTotal.toLocaleString()}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-4"
                            onClick={() =>
                                appendBillingBoq({
                                    srNo: billingBoqFields.length + 1,
                                    itemDescription: "",
                                    quantity: "",
                                    rate: "",
                                })
                            }
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Row
                        </Button>
                    </CardContent>
                </Card>

                {/* Buyback BOQ */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-500" />
                            Buyback BOQ (Optional)
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
                                        <th className="p-3 text-left w-16">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {buybackBoqFields.map((field, index) => {
                                        const quantity = form.watch(`buybackBoq.${index}.quantity`);
                                        const rate = form.watch(`buybackBoq.${index}.rate`);
                                        return (
                                            <tr key={field.id}>
                                                <td className="p-2">
                                                    <Input
                                                        {...form.register(`buybackBoq.${index}.srNo`, { valueAsNumber: true })}
                                                        type="number"
                                                        className="h-8 text-xs w-16"
                                                        min={1}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        {...form.register(`buybackBoq.${index}.itemDescription`)}
                                                        placeholder="Item description"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        {...form.register(`buybackBoq.${index}.quantity`)}
                                                        placeholder="0.00"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        {...form.register(`buybackBoq.${index}.rate`)}
                                                        placeholder="0.00"
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <span className="text-sm font-medium">
                                                        ₹{calculateAmount(quantity, rate)}
                                                    </span>
                                                </td>
                                                <td className="p-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        type="button"
                                                        onClick={() => removeBuybackBoq(index)}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {buybackBoqFields.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                                No buyback items. Add one using the button below.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {buybackBoqFields.length > 0 && (
                                    <tfoot className="bg-muted/50">
                                        <tr>
                                            <td colSpan={4} className="p-3 text-right font-semibold">
                                                Total:
                                            </td>
                                            <td className="p-3 font-bold text-blue-600">
                                                ₹{buybackTotal.toLocaleString()}
                                            </td>
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
                            onClick={() =>
                                appendBuybackBoq({
                                    srNo: buybackBoqFields.length + 1,
                                    itemDescription: "",
                                    quantity: "",
                                    rate: "",
                                })
                            }
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Row
                        </Button>
                    </CardContent>
                </Card>

                {/* Billing Addresses */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-orange-500" />
                            Billing Addresses
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {billingAddressFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-medium">Billing Address {index + 1}</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        type="button"
                                        onClick={() => removeBillingAddress(index)}
                                        disabled={billingAddressFields.length === 1}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Sr. Nos.</Label>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id={`billing-all-${index}`}
                                                checked={form.watch(`billingAddresses.${index}.srNos`) === "all"}
                                                onCheckedChange={(checked) => {
                                                    form.setValue(
                                                        `billingAddresses.${index}.srNos`,
                                                        checked ? "all" : []
                                                    );
                                                }}
                                            />
                                            <Label htmlFor={`billing-all-${index}`}>Select All</Label>
                                        </div>
                                        {form.watch(`billingAddresses.${index}.srNos`) !== "all" && (
                                            <Input
                                                placeholder="e.g., 1, 2, 3"
                                                onChange={(e) => {
                                                    const nums = e.target.value
                                                        .split(",")
                                                        .map((s) => parseInt(s.trim()))
                                                        .filter((n) => !isNaN(n));
                                                    form.setValue(`billingAddresses.${index}.srNos`, nums);
                                                }}
                                            />
                                        )}
                                    </div>

                                    <FieldWrapper
                                        control={form.control}
                                        name={`billingAddresses.${index}.customerName`}
                                        label="Customer Name"
                                    >
                                        {(field) => <Input {...field} placeholder="Customer name" />}
                                    </FieldWrapper>

                                    <div className="md:col-span-2">
                                        <FieldWrapper
                                            control={form.control}
                                            name={`billingAddresses.${index}.address`}
                                            label="Address"
                                        >
                                            {(field) => (
                                                <Textarea {...field} placeholder="Full address" rows={2} />
                                            )}
                                        </FieldWrapper>
                                    </div>

                                    <FieldWrapper
                                        control={form.control}
                                        name={`billingAddresses.${index}.gst`}
                                        label="GST Number"
                                    >
                                        {(field) => <Input {...field} placeholder="27AABCU9603R1ZX" />}
                                    </FieldWrapper>
                                </div>
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                appendBillingAddress({
                                    srNos: "all",
                                    customerName: "",
                                    address: "",
                                    gst: "",
                                })
                            }
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Billing Address
                        </Button>
                    </CardContent>
                </Card>

                {/* Shipping Addresses */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-orange-500" />
                            Shipping Addresses
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {shippingAddressFields.map((field, index) => (
                            <div key={field.id} className="p-4 border rounded-lg space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-medium">Shipping Address {index + 1}</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        type="button"
                                        onClick={() => removeShippingAddress(index)}
                                        disabled={shippingAddressFields.length === 1}
                                        className="text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Sr. Nos.</Label>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id={`shipping-all-${index}`}
                                                checked={form.watch(`shippingAddresses.${index}.srNos`) === "all"}
                                                onCheckedChange={(checked) => {
                                                    form.setValue(
                                                        `shippingAddresses.${index}.srNos`,
                                                        checked ? "all" : []
                                                    );
                                                }}
                                            />
                                            <Label htmlFor={`shipping-all-${index}`}>Select All</Label>
                                        </div>
                                        {form.watch(`shippingAddresses.${index}.srNos`) !== "all" && (
                                            <Input
                                                placeholder="e.g., 1, 2, 3"
                                                onChange={(e) => {
                                                    const nums = e.target.value
                                                        .split(",")
                                                        .map((s) => parseInt(s.trim()))
                                                        .filter((n) => !isNaN(n));
                                                    form.setValue(`shippingAddresses.${index}.srNos`, nums);
                                                }}
                                            />
                                        )}
                                    </div>

                                    <FieldWrapper
                                        control={form.control}
                                        name={`shippingAddresses.${index}.customerName`}
                                        label="Customer Name"
                                    >
                                        {(field) => <Input {...field} placeholder="Customer name" />}
                                    </FieldWrapper>

                                    <div className="md:col-span-2">
                                        <FieldWrapper
                                            control={form.control}
                                            name={`shippingAddresses.${index}.address`}
                                            label="Address"
                                        >
                                            {(field) => (
                                                <Textarea {...field} placeholder="Full address" rows={2} />
                                            )}
                                        </FieldWrapper>
                                    </div>

                                    <FieldWrapper
                                        control={form.control}
                                        name={`shippingAddresses.${index}.gst`}
                                        label="GST Number"
                                    >
                                        {(field) => <Input {...field} placeholder="27AABCU9603R1ZX" />}
                                    </FieldWrapper>
                                </div>
                            </div>
                        ))}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                appendShippingAddress({
                                    srNos: "all",
                                    customerName: "",
                                    address: "",
                                    gst: "",
                                })
                            }
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Shipping Address
                        </Button>
                    </CardContent>
                </Card>

                {/* Navigation */}
                <WizardNavigation
                    currentPage={4}
                    totalPages={7}
                    canSkip={true}
                    isSubmitting={isLoading}
                    onBack={onBack}
                    onSubmit={() => form.handleSubmit(handleFormSubmit)()}
                    onSkip={onSkip}
                    onSaveDraft={handleSaveDraft}
                />
            </form>
        </Form>
    );
}
