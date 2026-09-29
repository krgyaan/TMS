import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { CompactFileUploader } from "@/components/file-upload";
import { useCreateVendorFile, useUpdateVendorFile } from "@/hooks/api/useVendorFiles";
import { fileApiToForm, toCreateFileDto, toUpdateFileDto } from "../helpers/vendorForm.mappers";
import { FileFormSchema, type FileFormValues } from "../helpers/vendorForm.schema";

const emptyFile: FileFormValues = {
    name: "",
    filePath: "",
};

export type FileFormDialogProps = {
    orgId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initial: FileFormValues | null;
    onSaved: (values: FileFormValues) => void;
};

export const FileFormDialog = ({ orgId, open, onOpenChange, initial, onSaved }: FileFormDialogProps) => {
    const form = useForm<FileFormValues>({
        resolver: zodResolver(FileFormSchema),
        defaultValues: emptyFile,
    });

    const createFile = useCreateVendorFile();
    const updateFile = useUpdateVendorFile();

    useEffect(() => {
        if (open) form.reset(initial ?? emptyFile);
    }, [open, initial, form]);

    const handleSave = form.handleSubmit(values => {
        if (initial?.id) {
            updateFile.mutate({ id: initial.id, data: toUpdateFileDto(values) }, {
                onSuccess: updated => onSaved(fileApiToForm(updated)),
            });
        } else if (orgId) {
            createFile.mutate(toCreateFileDto(values, orgId), {
                onSuccess: created => onSaved(fileApiToForm(created)),
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
                    <DialogTitle>{initial ? "Edit File" : "Add File"}</DialogTitle>
                    <DialogDescription className="hidden">Add or edit file details</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <FieldWrapper control={form.control} name="name" label="File Name">
                        {field => <Input placeholder="e.g. GST Certificate" {...field} value={field.value ?? ""} />}
                    </FieldWrapper>

                    <FieldWrapper control={form.control} name="filePath" label="File">
                        {() => (
                            <CompactFileUploader
                                context="vendor-documents"
                                value={form.watch("filePath") || undefined}
                                onChange={path => form.setValue("filePath", path ?? "")}
                            />
                        )}
                    </FieldWrapper>
                </div>

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
