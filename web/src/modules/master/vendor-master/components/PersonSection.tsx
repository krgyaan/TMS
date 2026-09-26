import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useFieldArray, useFormContext, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { useCreateVendor, useDeleteVendor, useUpdateVendor } from "@/hooks/api/useVendors";
import { DialogDescription } from "@radix-ui/react-dialog";
import { Edit, Plus, Trash2 } from "lucide-react";
import { personApiToForm, toCreatePersonDto, toUpdatePersonDto } from "../helpers/vendorForm.mappers";
import { PersonFormSchema, type PersonFormValues, type VendorFormValues } from "../helpers/vendorForm.schema";
import type { VendorSectionProps } from "../helpers/vendorForm.types";

const emptyPerson: PersonFormValues = {
    name: "",
    email: "",
    mobile: "",
    address: "",
    status: true,
};

export const PersonSection = ({ orgId }: VendorSectionProps) => {
    const { control, getValues } = useFormContext<VendorFormValues>();

    const { fields, append, remove, update } = useFieldArray({ control, name: "persons" });

    const [open, setOpen] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const updateVendor = useUpdateVendor();
    const createVendor = useCreateVendor();
    const deleteVendor = useDeleteVendor();

    const dialogForm = useForm<PersonFormValues>({
        resolver: zodResolver(PersonFormSchema),
        defaultValues: emptyPerson,
    });

    const openAdd = () => {
        setEditingIndex(null);
        dialogForm.reset(emptyPerson);
        setOpen(true);
    };

    const openEdit = (index: number) => {
        const person = getValues(`persons.${index}`);
        setEditingIndex(index);
        dialogForm.reset(person);
        setOpen(true);
    };

    const handleSave = dialogForm.handleSubmit(values => {
        if (editingIndex !== null) {
            const existing = getValues(`persons.${editingIndex}`);

            if (orgId && existing?.id) {
                updateVendor.mutate({
                    id: existing.id,
                    data: toUpdatePersonDto(values),
                });
            }
            update(editingIndex, { ...existing, ...values });
        } else {
            if (orgId) {
                createVendor.mutate(toCreatePersonDto(values, orgId), {
                    onSuccess: created => {
                        append(personApiToForm(created));
                    },
                });
            } else {
                append(values);
            }
        }

        setOpen(false);
    });

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
                        <FieldWrapper control={dialogForm.control} name="name" label="Name *">
                            {field => <Input placeholder="e.g. John Doe" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={dialogForm.control} name="email" label="Email">
                            {field => (
                                <Input type="email" placeholder="john@company.com" {...field} value={field.value ?? ""} />
                            )}
                        </FieldWrapper>

                        <FieldWrapper control={dialogForm.control} name="mobile" label="Mobile">
                            {field => <Input placeholder="Phone number" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={dialogForm.control} name="address" label="Address">
                            {field => <Textarea rows={3} placeholder="Enter address" {...field} value={field.value ?? ""} />}
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
