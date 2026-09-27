import { useState } from "react";
import { useFormContext, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { CompactFileUploader } from "@/components/file-upload";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useCreateVendorFile, useUpdateVendorFile, useDeleteVendorFile } from "@/hooks/api/useVendorFiles";
import { DialogDescription } from "@radix-ui/react-dialog";
import { fileApiToForm, toCreateFileDto, toUpdateFileDto } from "../helpers/vendorForm.mappers";
import { FileFormSchema, type FileFormValues, type VendorFormValues } from "../helpers/vendorForm.schema";
import type { VendorSectionProps } from "../helpers/vendorForm.types";

const emptyFile: FileFormValues = {
    name: "",
    filePath: "",
};

export const FileSection = ({ orgId }: VendorSectionProps) => {
    const { control, getValues } = useFormContext<VendorFormValues>();

    const { fields, append, remove, update } = useFieldArray({ control, name: "files" });

    const createFile = useCreateVendorFile();
    const updateFile = useUpdateVendorFile();
    const deleteFile = useDeleteVendorFile();

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const dialogForm = useForm<FileFormValues>({
        resolver: zodResolver(FileFormSchema),
        defaultValues: emptyFile,
    });

    const openAdd = () => {
        setEditingIndex(null);
        dialogForm.reset(emptyFile);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        const file = getValues(`files.${index}`);
        setEditingIndex(index);
        dialogForm.reset(file);
        setOpen(true);
    };

    const handleSave = dialogForm.handleSubmit(values => {
        if (editingIndex !== null) {
            const existing = getValues(`files.${editingIndex}`);

            if (existing?.id) {
                updateFile.mutate(
                    {
                        id: existing.id,
                        data: toUpdateFileDto(values),
                    },
                    {
                        onSuccess: updated => {
                            update(editingIndex, fileApiToForm(updated));
                        },
                    }
                );
            } else {
                update(editingIndex, values);
            }
        } else {
            createFile.mutate(toCreateFileDto(values, orgId), {
                onSuccess: created => {
                    append(fileApiToForm(created));
                },
            });
        }

        setOpen(false);
    });

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

                    <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add File
                    </Button>
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

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingIndex !== null ? "Edit File" : "Add File"}</DialogTitle>
                        <DialogDescription className="hidden">Add or edit file details</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        <FieldWrapper control={dialogForm.control} name="name" label="File Name">
                            {field => <Input placeholder="e.g. GST Certificate" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={dialogForm.control} name="filePath" label="File">
                            {() => (
                                <CompactFileUploader
                                    context="vendor-documents"
                                    value={dialogForm.watch("filePath") || undefined}
                                    onChange={path => dialogForm.setValue("filePath", path ?? "")}
                                />
                            )}
                        </FieldWrapper>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
