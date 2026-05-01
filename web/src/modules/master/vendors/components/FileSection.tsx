import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Plus, Edit, Trash2 } from "lucide-react";

import { useCreateVendorFile, useUpdateVendorFile, useDeleteVendorFile } from "@/hooks/api/useVendorFiles";
import { DialogDescription } from "@radix-ui/react-dialog";

type FileForm = {
    id?: number;
    personIndex: number;
    name: string;
    filePath: string;
    status: boolean;
};

type Props = {
    orgId: number;
};

export const FileSection = ({ orgId }: Props) => {
    const { control, getValues, watch } = useFormContext();

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "files",
    });

    const persons = watch("persons") || [];

    const createFile = useCreateVendorFile();
    const updateFile = useUpdateVendorFile();
    const deleteFile = useDeleteVendorFile();

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const emptyFile: FileForm = {
        personIndex: 0,
        name: "",
        filePath: "",
        status: true,
    };

    const [formState, setFormState] = useState<FileForm>(emptyFile);

    const openAdd = () => {
        setEditingIndex(null);
        setFormState(emptyFile);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        const file = getValues(`files.${index}`);
        setEditingIndex(index);
        setFormState(file);
        setOpen(true);
    };

    const handleSave = () => {
        const persons = getValues("persons");
        const selectedPerson = persons?.[formState.personIndex];

        if (!selectedPerson?.id) return;

        const payload = {
            vendorId: selectedPerson.id,
            name: formState.name,
            filePath: formState.filePath,
        };

        if (editingIndex !== null) {
            const existing = getValues(`files.${editingIndex}`);

            if (existing?.id) {
                updateFile.mutate(
                    {
                        id: existing.id,
                        data: payload,
                    },
                    {
                        onSuccess: updated => {
                            update(editingIndex, {
                                ...updated,
                                personIndex: formState.personIndex,
                                status: true,
                            });
                        },
                    }
                );
            }
        } else {
            createFile.mutate(payload, {
                onSuccess: created => {
                    append({
                        ...created,
                        personIndex: formState.personIndex,
                        status: true,
                    });
                },
            });
        }

        setOpen(false);
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

                    <Button type="button" variant="outline" size="sm" onClick={openAdd} disabled={persons.length === 0}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add File
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {persons.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">Add at least one person before adding files.</div>}

                {fields.map((file, index) => (
                    <Card key={file.id} className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium">{file.name}</div>
                                <div className="text-sm text-muted-foreground">{file.filePath}</div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(index)}>
                                    <Edit className="h-4 w-4" />
                                </Button>

                                <Button variant="ghost" size="icon" onClick={() => handleDelete(index)}>
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
                        <DialogTitle>{editingIndex !== null ? "Edit File" : "Add File"}</DialogTitle>
                        <DialogDescription className="hidden">Add or edit file details</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Person</label>

                            <Select value={formState.personIndex.toString()} onValueChange={v => setFormState({ ...formState, personIndex: Number(v) })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select person" />
                                </SelectTrigger>

                                <SelectContent>
                                    {persons.map((person: any, idx: number) => (
                                        <SelectItem key={idx} value={idx.toString()}>
                                            {person.name || `Person ${idx + 1}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium">File Name</label>
                            <Input value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} />
                        </div>

                        <div>
                            <label className="text-sm font-medium">File Path</label>
                            <Input value={formState.filePath} onChange={e => setFormState({ ...formState, filePath: e.target.value })} />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>

                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
