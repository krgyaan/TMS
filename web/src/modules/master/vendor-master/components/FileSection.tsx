import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useDeleteVendorFile } from "@/hooks/api/useVendorFiles";
import { useAuth } from "@/contexts/AuthContext";
import type { VendorFormValues, FileFormValues } from "../helpers/vendorForm.schema";
import type { VendorSectionProps } from "../helpers/vendorForm.types";
import { FileFormDialog } from "./FileFormDialog";

const PERMISSION_MODULE = "master.vendors";

export const FileSection = ({ orgId }: VendorSectionProps) => {
    const { control, getValues } = useFormContext<VendorFormValues>();
    const { canCreate, canUpdate, canDelete } = useAuth();

    const { fields, append, remove, update } = useFieldArray({ control, name: "files" });

    const deleteFile = useDeleteVendorFile();

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [initial, setInitial] = useState<FileFormValues | null>(null);

    const openAdd = () => {
        setEditingIndex(null);
        setInitial(null);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        setEditingIndex(index);
        setInitial(getValues(`files.${index}`));
        setOpen(true);
    };

    const handleSaved = (values: FileFormValues) => {
        if (editingIndex !== null) {
            const existing = getValues(`files.${editingIndex}`);
            update(editingIndex, { ...existing, ...values });
        } else {
            append(values);
        }
    };

    const handleDelete = (index: number) => {
        const file = getValues(`files.${index}`);

        if (file?.id) {
            deleteFile.mutate(file.id);
        }

        remove(index);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Files</CardTitle>

                    {canCreate(PERMISSION_MODULE) && (
                        <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add File
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {fields.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">No files added yet.</div>}

                {fields.map((file, index) => (
                    <Card key={file.id} className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium">{file.name}</div>
                                <div className="text-sm text-muted-foreground">{file.filePath}</div>
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

            <FileFormDialog orgId={orgId} open={open} onOpenChange={setOpen} initial={initial} onSaved={handleSaved} />
        </Card>
    );
};
