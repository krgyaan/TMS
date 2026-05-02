import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

import { Plus, Edit, Trash2 } from "lucide-react";
import { useCreateVendor, useDeleteVendor, useUpdateVendor } from "@/hooks/api/useVendors";
import { DialogDescription } from "@radix-ui/react-dialog";

type PersonForm = {
    id?: number;
    name: string;
    email: string;
    mobile: string;
    address?: string;
    status: boolean;
};

type Props = {
    orgId?: number;
};

export const PersonSection = ({ orgId }: Props) => {
    const { control, getValues, setValue } = useFormContext();

    const { fields, append, remove, update } = useFieldArray({
        control,
        name: "persons",
    });

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const updateVendor = useUpdateVendor();
    const createVendor = useCreateVendor();
    const deleteVendor = useDeleteVendor();

    const emptyPerson: PersonForm = {
        name: "",
        email: "",
        mobile: "",
        address: "",
        status: true,
    };

    const [formState, setFormState] = useState<PersonForm>(emptyPerson);

    const openAdd = () => {
        setEditingIndex(null);
        setFormState(emptyPerson);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        const person = getValues(`persons.${index}`);
        setEditingIndex(index);
        setFormState(person);
        setOpen(true);
    };

    const handleSave = () => {
        if (editingIndex !== null) {
            const existing = getValues(`persons.${editingIndex}`);

            update(editingIndex, formState);

            if (orgId && person?.id) {
                updateVendor.mutate({
                    id: existing.id,
                    data: formState,
                });
            }
            update(editingIndex, { ...existing, ...formState });
        } else {
            if (orgId) {
                createVendor.mutate(
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
            } else {
                append(formState);
            }
        }

        setOpen(false);
    };

    const handleDelete = (index: number) => {
        const person = getValues(`persons.${index}`);

        if (person?.id) {
            deleteVendor.mutate(person.id);
        }

        remove(index);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Persons (Vendors)</CardTitle>

                    <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Person
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {fields.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No persons added yet</div>}

                {fields.map((person, index) => (
                    <Card key={person.id} className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium">{person.name || "Unnamed"}</div>

                                {person.email && <div className="text-sm text-muted-foreground">{person.email}</div>}

                                {person.mobile && <div className="text-sm text-muted-foreground">{person.mobile}</div>}
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
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingIndex !== null ? "Edit Person" : "Add Person"}</DialogTitle>
                        <DialogDescription className="hidden">Add or edit person details</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                                <Input value={formState.name} onChange={e => setFormState({ ...formState, name: e.target.value })} />
                            </FormControl>
                        </FormItem>

                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input value={formState.email} onChange={e => setFormState({ ...formState, email: e.target.value })} />
                            </FormControl>
                        </FormItem>

                        <FormItem>
                            <FormLabel>Mobile</FormLabel>
                            <FormControl>
                                <Input value={formState.mobile} onChange={e => setFormState({ ...formState, mobile: e.target.value })} />
                            </FormControl>
                        </FormItem>

                        <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                                <Textarea rows={3} value={formState.address} onChange={e => setFormState({ ...formState, address: e.target.value })} />
                            </FormControl>
                        </FormItem>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={formState.status}
                                onCheckedChange={checked =>
                                    setFormState({
                                        ...formState,
                                        status: checked as boolean,
                                    })
                                }
                            />
                            <FormLabel>Active</FormLabel>
                        </div>
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
