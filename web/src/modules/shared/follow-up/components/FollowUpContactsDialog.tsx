import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mail, Phone, User, Users } from "lucide-react";
import type { ContactPerson } from "../helpers/followUp.types";

interface FollowUpContactsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: ContactPerson[];
}

export function FollowUpContactsDialog({ open, onOpenChange, contacts }: FollowUpContactsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Contact Persons</DialogTitle>
                    <DialogDescription>
                        {contacts.length} {contacts.length === 1 ? "contact" : "contacts"} for this follow-up
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-80 space-y-2 overflow-y-auto">
                    {contacts.length ? (
                        contacts.map((contact, index) => (
                            <div key={contact.id ?? index} className="space-y-2 rounded-lg border bg-muted/30 p-3">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                        <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium">{contact.name || "—"}</span>
                                </div>
                                <div className="space-y-1 pl-10">
                                    {contact.email && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="h-3.5 w-3.5" />
                                            <span>{contact.email}</span>
                                        </div>
                                    )}
                                    {contact.phone && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="h-3.5 w-3.5" />
                                            <span>{contact.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <Users className="mb-2 h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">No contacts found</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
