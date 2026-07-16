import { useFieldArray, useWatch, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Trash2, AlertCircle, Calculator } from "lucide-react";
import { calculateTotals, formatCurrency } from "@/modules/operations/project-dashboard/helpers/projectDashboard.mapper";
import type { VendorWorkOrderFormValues } from "../helpers/vwoForm.schema";
import { useMemo } from "react";

interface VWOProductsFieldProps {
    control: Control<VendorWorkOrderFormValues>;
}

export function VWOProductsField({ control }: VWOProductsFieldProps) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: "products" as any,
    });

    const products = useWatch({ control, name: "products" as any }) || [];

    const calculations = useMemo(() => calculateTotals(products), [products]);

    const addProduct = () => {
        append({ description: "", qty: null, rate: null, gstRate: 18 } as any);
    };

    const duplicateProduct = (index: number) => {
        const source = products[index];
        if (!source) return;
        append({ ...source } as any);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h4 className="font-semibold text-base text-primary flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Products / Services
                        <Badge variant="secondary" className="ml-2">
                            {fields.length} {fields.length === 1 ? "item" : "items"}
                        </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        Add products or services to this work order
                    </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addProduct}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                </Button>
            </div>

            <div className="rounded-md border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[5%]">#</TableHead>
                            <TableHead className="w-[50%]">Description *</TableHead>
                            <TableHead className="w-[9%]">Qty *</TableHead>
                            <TableHead className="w-[11%]">Rate (₹) *</TableHead>
                            <TableHead className="w-[9%]">GST % *</TableHead>
                            <TableHead className="w-[12%] text-right">Taxable</TableHead>
                            <TableHead className="w-[10%] text-right">GST</TableHead>
                            <TableHead className="w-[12%] text-right">Total</TableHead>
                            <TableHead className="w-[5%]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => {
                            const product = products[index];
                            const qty = product?.qty ?? 0;
                            const rate = product?.rate ?? 0;
                            const gstRate = product?.gstRate ?? 0;
                            const lineTotal = qty * rate;
                            const gstAmount = (lineTotal * gstRate) / 100;
                            const total = lineTotal + gstAmount;

                            return (
                                <TableRow key={field.id} className="group">
                                    <TableCell className="text-muted-foreground font-medium align-top pt-4">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="p-1 align-top pt-2">
                                        <FieldWrapper control={control} name={`products.${index}.description` as any} label="">
                                            {(fieldProps) => (
                                                <Textarea {...fieldProps} placeholder="Enter description" rows={2} className="min-h-[36px]" />
                                            )}
                                        </FieldWrapper>
                                    </TableCell>
                                    <TableCell className="p-1 align-top pt-2">
                                        <FieldWrapper control={control} name={`products.${index}.qty` as any} label="">
                                            {(fieldProps) => (
                                                <NumberInput
                                                    value={fieldProps.value}
                                                    onChange={fieldProps.onChange}
                                                    min={0}
                                                    step={0.01}
                                                    placeholder="0"
                                                    className="h-9 text-right"
                                                />
                                            )}
                                        </FieldWrapper>
                                    </TableCell>
                                    <TableCell className="p-1 align-top pt-2">
                                        <FieldWrapper control={control} name={`products.${index}.rate` as any} label="">
                                            {(fieldProps) => (
                                                <NumberInput
                                                    value={fieldProps.value}
                                                    onChange={fieldProps.onChange}
                                                    min={0}
                                                    step={0.01}
                                                    placeholder="0"
                                                    className="h-9 text-right"
                                                />
                                            )}
                                        </FieldWrapper>
                                    </TableCell>
                                    <TableCell className="p-1 align-top pt-2">
                                        <FieldWrapper control={control} name={`products.${index}.gstRate` as any} label="">
                                            {(fieldProps) => (
                                                <Select
                                                    value={String(fieldProps.value ?? 18)}
                                                    onValueChange={(v) => fieldProps.onChange(Number(v))}
                                                >
                                                    <SelectTrigger className="h-9">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">0%</SelectItem>
                                                        <SelectItem value="5">5%</SelectItem>
                                                        <SelectItem value="12">12%</SelectItem>
                                                        <SelectItem value="18">18%</SelectItem>
                                                        <SelectItem value="28">28%</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </FieldWrapper>
                                    </TableCell>
                                    <TableCell className="p-1 text-right align-top pt-4 font-medium tabular-nums">
                                        {qty > 0 && rate > 0 ? formatCurrency(lineTotal) : "-"}
                                    </TableCell>
                                    <TableCell className="p-1 text-right align-top pt-4 font-medium tabular-nums text-blue-600">
                                        {qty > 0 && rate > 0 ? formatCurrency(gstAmount) : "-"}
                                    </TableCell>
                                    <TableCell className="p-1 text-right align-top pt-4">
                                        {qty > 0 && rate > 0 ? formatCurrency(total) : "-"}
                                    </TableCell>
                                    <TableCell className="p-1 align-top pt-2">
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => duplicateProduct(index)}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Duplicate</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            {fields.length > 1 && (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                onClick={() => remove(index)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Remove</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {fields.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    No products added yet. Click "Add Product" to begin.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={6} className="text-right font-medium">
                                Subtotal
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                                {formatCurrency(calculations.subtotal)}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums text-blue-600">
                                {formatCurrency(calculations.totalGst)}
                            </TableCell>
                            <TableCell className="text-right font-bold tabular-nums">
                                {formatCurrency(calculations.grandTotal)}
                            </TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </div>
    );
}
