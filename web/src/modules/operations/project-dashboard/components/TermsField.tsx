import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Trash2, AlertCircle, FileText } from "lucide-react";
import type { PurchaseOrderFormValues } from "../helpers/purchaseOrder.schema";

export const TERMS_FIELD_OPTIONS = [
  "Payment Terms",
  "Freight",
  "Transit Insurance",
  "Warranty (Dispatch)",
  "Warranty (Installation)",
  "Delivery Period",
  "Delivery Location",
  "Technical Specifications",
  "Accessories / Packaging List",
  "Pre-Dispatch Inspection",
  "Material Unloading",
  "Acceptance of Order",
  "Documentation",
  "PO Validity",
  "Warranty",
] as const;

export const DEFAULT_TERMS_ROWS: { field: string; value: string }[] = [
  { field: "Payment Terms", value: "30% Advance with the PO and remaining 70% before dispatch against PI." },
  { field: "Freight", value: "Extra as per actual." },
  { field: "Transit Insurance", value: "Inclusive" },
  { field: "Warranty (Dispatch)", value: "25 Years" },
  { field: "Delivery Period", value: "2 Weeks" },
  { field: "Delivery Location", value: "" },
  { field: "Technical Specifications", value: "As per approved drawing" },
  { field: "Accessories / Packaging List", value: "" },
  { field: "Pre-Dispatch Inspection", value: "" },
  { field: "Material Unloading", value: "" },
  { field: "Acceptance of Order", value: "The party shall confirm acceptance to this Purchase Order by duly Stamping and signing on each page of the technical specifications as well as attached documents (If Any)." },
  { field: "Documentation", value: "" },
  { field: "PO Validity", value: "" },
  { field: "Warranty", value: "" },
];

interface TermsFieldProps {
  control: Control<PurchaseOrderFormValues>;
}

export function TermsField({ control }: TermsFieldProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "termsAndConditions" as any,
  });

  const rows = useWatch({ control, name: "termsAndConditions" as any }) || [];

  const usedFields = new Set(
    rows.map((r: any) => r?.field).filter(Boolean)
  );

  const availableOptions = TERMS_FIELD_OPTIONS.filter(
    (opt) => !usedFields.has(opt)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h4 className="font-semibold text-base text-primary flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Terms & Conditions
            <Badge variant="secondary" className="ml-2">
              {fields.length} {fields.length === 1 ? "row" : "rows"}
            </Badge>
          </h4>
          <p className="text-sm text-muted-foreground">
            Add terms and conditions for this purchase order
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ field: "", value: "" } as any)}
          disabled={availableOptions.length === 0 && fields.length > 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Row
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[5%]">#</TableHead>
              <TableHead className="w-[30%]">Field *</TableHead>
              <TableHead className="w-[55%]">Value</TableHead>
              <TableHead className="w-[10%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field, index) => (
              <TableRow key={field.id} className="group">
                <TableCell className="text-muted-foreground font-medium align-top pt-4">
                  {index + 1}
                </TableCell>
                <TableCell className="p-1 align-top pt-2">
                  <Controller
                    control={control}
                    name={`termsAndConditions.${index}.field` as any}
                    render={({ field: selectField }) => (
                      <Select
                        value={selectField.value || ""}
                        onValueChange={(v) => selectField.onChange(v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select term..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TERMS_FIELD_OPTIONS.map((opt) => {
                            const isUsed = usedFields.has(opt) && selectField.value !== opt;
                            return (
                              <SelectItem key={opt} value={opt} disabled={isUsed}>
                                {opt}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </TableCell>
                <TableCell className="p-1 align-top pt-2">
                  <Controller
                    control={control}
                    name={`termsAndConditions.${index}.value` as any}
                    render={({ field: valueField }) => (
                      <Textarea
                        {...valueField}
                        placeholder="Enter value"
                        rows={2}
                        className="min-h-[36px]"
                      />
                    )}
                  />
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
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Remove</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  No terms added yet. Click "Add Row" to begin.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
