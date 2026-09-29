import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useDeleteVendorGst } from "@/hooks/api/useVendorGsts";
import { useAuth } from "@/contexts/AuthContext";
import type { VendorFormValues, GstFormValues } from "../helpers/vendorForm.schema";
import type { VendorSectionProps } from "../helpers/vendorForm.types";
import { GstFormDialog } from "./GstFormDialog";

const PERMISSION_MODULE = "master.vendors";

export const GstSection = ({ orgId }: VendorSectionProps) => {
    const { control, getValues } = useFormContext<VendorFormValues>();
    const { canCreate, canUpdate, canDelete } = useAuth();

    const { fields, append, remove, update } = useFieldArray({ control, name: "gsts" });

    const deleteGst = useDeleteVendorGst();

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [initial, setInitial] = useState<GstFormValues | null>(null);

    const openAdd = () => {
        setEditingIndex(null);
        setInitial(null);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        setEditingIndex(index);
        setInitial(getValues(`gsts.${index}`));
        setOpen(true);
    };

    const handleSaved = (values: GstFormValues) => {
        if (editingIndex !== null) {
            const existing = getValues(`gsts.${editingIndex}`);
            update(editingIndex, { ...existing, ...values });
        } else {
            append(values);
        }
    };

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

                    {canCreate(PERMISSION_MODULE) && (
                        <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add GST
                        </Button>
                    )}
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
                                {canUpdate(PERMISSION_MODULE) && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(index)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}

                                {canDelete(PERMISSION_MODULE) && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </CardContent>

            <GstFormDialog
                orgId={orgId}
                open={open}
                onOpenChange={setOpen}
                initial={initial}
                siblings={getValues("gsts")}
                onSaved={handleSaved}
            />
        </Card>
    );
};
