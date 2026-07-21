import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, User } from "lucide-react";
import type { ContactPerson } from "../helpers/followup.types";

interface ContactPersonFieldsProps {
    contacts: ContactPerson[];
    onChange: (contacts: ContactPerson[]) => void;
    disabled?: boolean;
    lockedCount?: number;
}

const emptyContact = (): ContactPerson => ({
    name: "",
    designation: "",
    phone: "",
    email: "",
});

export function ContactPersonFields({
    contacts,
    onChange,
    disabled = false,
    lockedCount = 0,
}: ContactPersonFieldsProps) {

    const addContact = () => {
        onChange([...contacts, emptyContact()]);
    };


    const removeContact = (index: number) => {
        onChange(contacts.filter((_, i) => i !== index));
    };


    const updateContact = (
        index: number,
        field: keyof ContactPerson,
        value: string,
    ) => {
        onChange(
            contacts.map((c, i) =>
                i === index
                    ? { ...c, [field]: value }
                    : c
            )
        );
    };


    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">
                    Contact Details
                </Label>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addContact}
                    disabled={disabled}
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Person
                </Button>
            </div>


            {contacts.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                    No contacts added. Click "Add Person" to add contact details.
                </p>
            )}


            {contacts.map((contact, index) => {

                const isLocked = index < lockedCount;

                return (
                    <div
                        key={index}
                        className="border rounded-lg p-4 space-y-3 bg-muted/20"
                    >

                        {/* Contact Header */}
                        <div className="flex items-center justify-between">

                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />

                                <span className="text-sm font-medium">
                                    Contact {index + 1}
                                </span>
                            </div>


                            {!isLocked && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                    onClick={() => removeContact(index)}
                                    disabled={disabled}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}

                        </div>



                        {/* Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">

                            {/* Name */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                    Name <span className="text-red-500">*</span>
                                </Label>

                                <Input
                                    placeholder="Enter name"
                                    value={contact.name}
                                    onChange={(e) =>
                                        updateContact(
                                            index,
                                            "name",
                                            e.target.value
                                        )
                                    }
                                    disabled={disabled || isLocked}
                                    className="h-8 text-sm disabled:opacity-100"
                                />
                            </div>



                            {/* Designation */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                    Designation
                                </Label>

                                <Input
                                    placeholder="Enter designation"
                                    value={contact.designation ?? ""}
                                    onChange={(e) =>
                                        updateContact(
                                            index,
                                            "designation",
                                            e.target.value
                                        )
                                    }
                                    disabled={disabled || isLocked}
                                    className="h-8 text-sm disabled:opacity-100"
                                />
                            </div>



                            {/* Phone */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                    Phone
                                </Label>

                                <Input
                                    type="tel"
                                    placeholder="Enter phone"
                                    value={contact.phone ?? ""}
                                    onChange={(e) =>
                                        updateContact(
                                            index,
                                            "phone",
                                            e.target.value
                                        )
                                    }
                                    disabled={disabled || isLocked}
                                    className="h-8 text-sm disabled:opacity-100"
                                />
                            </div>



                            {/* Email */}
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                    Email
                                </Label>

                                <Input
                                    type="email"
                                    placeholder="Enter email"
                                    value={contact.email ?? ""}
                                    onChange={(e) =>
                                        updateContact(
                                            index,
                                            "email",
                                            e.target.value
                                        )
                                    }
                                    disabled={disabled || isLocked}
                                    className="h-8 text-sm disabled:opacity-100"
                                />
                            </div>

                        </div>

                    </div>
                );
            })}

        </div>
    );
}