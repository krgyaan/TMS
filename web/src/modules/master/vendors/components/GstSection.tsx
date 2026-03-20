import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { Plus, Edit, Trash2 } from "lucide-react";

import { useCreateVendorGst, useUpdateVendorGst, useDeleteVendorGst } from "@/hooks/api/useVendorGsts";

type GstForm = {
    id?: number;
    gstState: string;
    gstNum: string;
    status: boolean;
};

type Props = {
    orgId: number;
};

export const GstSection = ({ orgId }: Props) => {
    const { control, getValues } = useFormContext();

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "gsts",
    });

    const createGst = useCreateVendorGst();
    const updateGst = useUpdateVendorGst();
    const deleteGst = useDeleteVendorGst();

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const emptyGst: GstForm = {
        gstState: "",
        gstNum: "",
        status: true,
    };

    const [formState, setFormState] = useState<GstForm>(emptyGst);

    const openAdd = () => {
        setEditingIndex(null);
        setFormState(emptyGst);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        const gst = getValues(`gsts.${index}`);
        setEditingIndex(index);
        setFormState(gst);
        setOpen(true);
    };

    const handleSave = () => {
        if (editingIndex !== null) {
            const existing = getValues(`gsts.${editingIndex}`);

            if (existing?.id) {
                updateGst.mutate({
                    id: existing.id,
                    data: formState,
                });

                update(editingIndex, { ...existing, ...formState });
            }
        } else {
            createGst.mutate(
                {
                    ...formState,
                    orgId: orgId,
                },
                {
                    onSuccess: created => {
                        append(created);
                    },
                }
            );
        }

        setOpen(false);
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
                                <div className="font-medium">{gst.gstNum || "GST Number"}</div>

                                <div className="text-sm text-muted-foreground">State: {gst.gstState}</div>
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
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle>{editingIndex !== null ? "Edit GST" : "Add GST"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">GST State</label>
                            <Input value={formState.gstState} onChange={e => setFormState({ ...formState, gstState: e.target.value })} />
                        </div>

                        <div>
                            <label className="text-sm font-medium">GST Number</label>
                            <Input value={formState.gstNum} onChange={e => setFormState({ ...formState, gstNum: e.target.value })} />
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={formState.status}
                                onCheckedChange={checked =>
                                    setFormState({
                                        ...formState,
                                        status: checked as boolean,
                                    })
                                }
                            />
                            <span className="text-sm">Active</span>
                        </div>
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
