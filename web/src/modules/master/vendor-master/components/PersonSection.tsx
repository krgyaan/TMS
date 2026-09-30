import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useDeleteVendor } from "@/hooks/api/useVendors";
import { useAuth } from "@/contexts/AuthContext";
import { Edit, Plus, Trash2 } from "lucide-react";
import type { VendorFormValues, PersonFormValues } from "../helpers/vendorForm.schema";
import type { VendorSectionProps } from "../helpers/vendorForm.types";
import { PersonFormDialog } from "./PersonFormDialog";

const PERMISSION_MODULE = "master.vendors";

export const PersonSection = ({ orgId }: VendorSectionProps) => {
    const { control, getValues } = useFormContext<VendorFormValues>();
    const { canCreate, canUpdate, canDelete } = useAuth();

    const { fields, append, remove, update } = useFieldArray({ control, name: "persons" });

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [initial, setInitial] = useState<PersonFormValues | null>(null);

    const deleteVendor = useDeleteVendor();

    const openAdd = () => {
        setEditingIndex(null);
        setInitial(null);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        setEditingIndex(index);
        setInitial(getValues(`persons.${index}`));
        setOpen(true);
    };

    const handleSaved = (values: PersonFormValues) => {
        if (editingIndex !== null) {
            const existing = getValues(`persons.${editingIndex}`);
            update(editingIndex, { ...existing, ...values });
        } else {
            append(values);
        }
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
                    <CardTitle>Persons</CardTitle>

                    {canCreate(PERMISSION_MODULE) && (
                        <Button type="button" variant="outline" size="sm" onClick={openAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Person
                        </Button>
                    )}
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

            <PersonFormDialog
                orgId={orgId}
                open={open}
                onOpenChange={setOpen}
                initial={initial}
                siblings={getValues("persons")}
                onSaved={handleSaved}
            />
        </Card>
    );
};
