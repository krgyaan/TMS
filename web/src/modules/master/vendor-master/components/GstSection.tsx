import { useState } from "react";
import { useFormContext, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useCreateVendorGst, useUpdateVendorGst, useDeleteVendorGst } from "@/hooks/api/useVendorGsts";
import { DialogDescription } from "@radix-ui/react-dialog";
import { gstApiToForm, toCreateGstDto, toUpdateGstDto } from "../helpers/vendorForm.mappers";
import { GstFormSchema, type GstFormValues, type VendorFormValues } from "../helpers/vendorForm.schema";
import type { VendorSectionProps } from "../helpers/vendorForm.types";

const emptyGst: GstFormValues = {
    gstState: "",
    gstNo: "",
    address: "",
    status: true,
};

export const GstSection = ({ orgId }: VendorSectionProps) => {
    const { control, getValues } = useFormContext<VendorFormValues>();

    const { fields, append, remove, update } = useFieldArray({ control, name: "gsts" });

    const createGst = useCreateVendorGst();
    const updateGst = useUpdateVendorGst();
    const deleteGst = useDeleteVendorGst();

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const dialogForm = useForm<GstFormValues>({
        resolver: zodResolver(GstFormSchema),
        defaultValues: emptyGst,
    });

    const openAdd = () => {
        setEditingIndex(null);
        dialogForm.reset(emptyGst);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        const gst = getValues(`gsts.${index}`);
        setEditingIndex(index);
        dialogForm.reset(gst);
        setOpen(true);
    };

    const handleSave = dialogForm.handleSubmit(values => {
        if (editingIndex !== null) {
            const existing = getValues(`gsts.${editingIndex}`);

            if (orgId && existing?.id) {
                updateGst.mutate({
                    id: existing.id,
                    data: toUpdateGstDto(values),
                });
            }
            update(editingIndex, { ...existing, ...values });
        } else {
            if (orgId) {
                createGst.mutate(toCreateGstDto(values, orgId), {
                    onSuccess: created => {
                        append(gstApiToForm(created));
                    },
                });
            } else {
                append(values);
            }
        }

        setOpen(false);
    });

    const handleDelete = (index: number) => {
        const gst = getValues(`gsts.${index}`);

        if (gst?.id) {
            deleteGst.mutate(gst.id);
        }

        remove(index);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>GST Numbers</CardTitle>

                    <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add GST
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {fields.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No GST numbers added</div>}

                {fields.map((gst, index) => (
                    <Card key={gst.id} className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium">{gst.gstNo || "GST Number"}</div>

                                <div className="text-sm text-muted-foreground">State: {gst.gstState}</div>

                                {gst.address && <div className="text-sm text-muted-foreground">{gst.address}</div>}
                            </div>

                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(index)}>
                                    <Edit className="h-4 w-4" />
                                </Button>

                                <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(index)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </CardContent>

            {/* Dialog */}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingIndex !== null ? "Edit GST Number" : "Add GST Number"}</DialogTitle>
                        <DialogDescription className="hidden">Add or edit GST details</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        <FieldWrapper control={dialogForm.control} name="gstState" label="GST State">
                            {field => <Input placeholder="e.g. Maharashtra" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={dialogForm.control} name="gstNo" label="GST Number">
                            {field => <Input placeholder="22AAAAA0000A1Z5" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={dialogForm.control} name="address" label="Address">
                            {field => (
                                <Textarea rows={3} placeholder="Enter GST registered address" {...field} value={field.value ?? ""} />
                            )}
                        </FieldWrapper>

                        <FormField
                            control={dialogForm.control}
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

                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>

                        <Button type="button" onClick={handleSave}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
