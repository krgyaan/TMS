import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { useCreateVendorGst, useUpdateVendorGst } from "@/hooks/api/useVendorGsts";
import { gstApiToForm, toCreateGstDto, toUpdateGstDto } from "../helpers/vendorForm.mappers";
import { GstFormSchema, type GstFormValues } from "../helpers/vendorForm.schema";

const emptyGst: GstFormValues = {
    gstState: "",
    gstNo: "",
    address: "",
    status: true,
};

export type GstFormDialogProps = {
    orgId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initial: GstFormValues | null;
    siblings: GstFormValues[];
    onSaved: (values: GstFormValues) => void;
};

export const GstFormDialog = ({ orgId, open, onOpenChange, initial, siblings, onSaved }: GstFormDialogProps) => {
    const form = useForm<GstFormValues>({
        resolver: zodResolver(GstFormSchema),
        defaultValues: emptyGst,
    });

    const createGst = useCreateVendorGst();
    const updateGst = useUpdateVendorGst();

    useEffect(() => {
        if (open) form.reset(initial ?? emptyGst);
    }, [open, initial, form]);

    const handleSave = form.handleSubmit(values => {
        const gstNo = values.gstNo.trim().toLowerCase();

        if (siblings.some(gst => gst.id !== initial?.id && (gst.gstNo ?? "").trim().toLowerCase() === gstNo)) {
            form.setError("gstNo", { message: "GST number already exists" });
            return;
        }

        if (initial?.id) {
            updateGst.mutate({ id: initial.id, data: toUpdateGstDto(values) }, {
                onSuccess: () => onSaved({ ...initial, ...values }),
            });
        } else if (orgId) {
            createGst.mutate(toCreateGstDto(values, orgId), {
                onSuccess: created => onSaved(gstApiToForm(created)),
            });
        } else {
            onSaved(values);
        }

        onOpenChange(false);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initial ? "Edit GST Number" : "Add GST Number"}</DialogTitle>
                    <DialogDescription className="hidden">Add or edit GST details</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <div className="space-y-4 pt-2">
                        <FieldWrapper control={form.control} name="gstState" label="GST State">
                            {field => <Input placeholder="e.g. Maharashtra" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={form.control} name="gstNo" label="GST Number">
                            {field => <Input placeholder="22AAAAA0000A1Z5" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={form.control} name="address" label="Address">
                            {field => <Textarea rows={3} placeholder="Enter GST registered address" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={checked => field.onChange(checked === true)} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Active</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                    </div>
                </Form>

                <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>

                    <Button type="button" onClick={handleSave}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
