import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { useCreateVendor, useUpdateVendor } from "@/hooks/api/useVendors";
import { personApiToForm, toCreatePersonDto, toUpdatePersonDto } from "../helpers/vendorForm.mappers";
import { PersonFormSchema, type PersonFormValues } from "../helpers/vendorForm.schema";

const emptyPerson: PersonFormValues = {
    name: "",
    email: "",
    mobile: "",
    address: "",
};

export type PersonFormDialogProps = {
    orgId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initial: PersonFormValues | null;
    siblings: PersonFormValues[];
    onSaved: (values: PersonFormValues) => void;
};

export const PersonFormDialog = ({ orgId, open, onOpenChange, initial, siblings, onSaved }: PersonFormDialogProps) => {
    const form = useForm<PersonFormValues>({
        resolver: zodResolver(PersonFormSchema),
        defaultValues: emptyPerson,
    });

    const createVendor = useCreateVendor();
    const updateVendor = useUpdateVendor();

    useEffect(() => {
        if (open) form.reset(initial ?? emptyPerson);
    }, [open, initial, form]);

    const handleSave = form.handleSubmit(values => {
        const mobile = values.mobile.trim().toLowerCase();
        const email = values.email.trim().toLowerCase();

        if (mobile && siblings.some(person => person.id !== initial?.id && (person.mobile ?? "").trim().toLowerCase() === mobile)) {
            form.setError("mobile", { message: "Mobile number already exists" });
            return;
        }

        if (email && siblings.some(person => person.id !== initial?.id && (person.email ?? "").trim().toLowerCase() === email)) {
            form.setError("email", { message: "Email already exists" });
            return;
        }

        // Close only after the API has confirmed the write, so a failed save
        // leaves the dialog (and the typed values) in place instead of looking
        // like a silent success.
        if (initial?.id) {
            updateVendor.mutate({ id: initial.id, data: toUpdatePersonDto(values) }, {
                onSuccess: updated => {
                    onSaved(personApiToForm(updated));
                    onOpenChange(false);
                },
            });
        } else if (orgId) {
            createVendor.mutate(toCreatePersonDto(values, orgId), {
                onSuccess: created => {
                    onSaved(personApiToForm(created));
                    onOpenChange(false);
                },
            });
        } else {
            onSaved(values);
            onOpenChange(false);
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initial ? "Edit Person" : "Add Person"}</DialogTitle>
                    <DialogDescription className="hidden">Add or edit person details</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <div className="space-y-4 pt-2">
                        <FieldWrapper control={form.control} name="name" label="Name *">
                            {field => <Input placeholder="e.g. John Doe" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={form.control} name="email" label="Email">
                            {field => <Input type="email" placeholder="john@company.com" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={form.control} name="mobile" label="Mobile">
                            {field => <Input placeholder="Phone number" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>

                        <FieldWrapper control={form.control} name="address" label="Address">
                            {field => <Textarea rows={3} placeholder="Enter address" {...field} value={field.value ?? ""} />}
                        </FieldWrapper>
                    </div>
                </Form>

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
