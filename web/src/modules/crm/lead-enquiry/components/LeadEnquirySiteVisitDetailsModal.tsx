import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUploader } from "@/components/file-upload";
import { leadEnquiryService } from "@/services/api/lead-enquiry.service";

interface ContactEntry {
    name: string;
    designation: string;
    phone: string;
    email: string;
}

interface LeadEnquirySiteVisitDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    siteVisitId: number | null;
    initialData?: {
        information: string | null;
        conductedAt: string | null;
        documents: string | null;
        contacts: { name: string; designation: string | null; phone: string | null; email: string | null }[];
    } | null;
    onSave: (data: {
        information: string;
        documents: string;
        conductedAt: string;
        contacts: ContactEntry[];
    }) => Promise<void>;
}

export function LeadEnquirySiteVisitDetailsModal({
    open,
    onOpenChange,
    siteVisitId,
    initialData,
    onSave,
}: LeadEnquirySiteVisitDetailsModalProps) {
    const [information, setInformation] = useState("");
    const [documents, setDocuments] = useState<string[]>([]);
    const [documentsStr, setDocumentsStr] = useState("");
    const [conductedAt, setConductedAt] = useState("");
    const [contacts, setContacts] = useState<ContactEntry[]>([
        { name: "", designation: "", phone: "", email: "" },
    ]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open && initialData) {
            setInformation(initialData.information || "");
            setConductedAt(initialData.conductedAt ? initialData.conductedAt.slice(0, 16) : "");
            setDocumentsStr(initialData.documents || "");
            setDocuments((initialData.documents || "")
                .split(",").map(s => s.trim()).filter(Boolean)
                .map(v => v.includes("/") ? v : `site-visit/${v}`));
            if (initialData.contacts && initialData.contacts.length > 0) {
                setContacts(initialData.contacts.map(c => ({
                    name: c.name,
                    designation: c.designation || "",
                    phone: c.phone || "",
                    email: c.email || "",
                })));
            }
        }
}, [open, initialData]);

    const addContact = () => {
        setContacts([...contacts, { name: "", designation: "", phone: "", email: "" }]);
    };

    const removeContact = (index: number) => {
        setContacts(contacts.filter((_, i) => i !== index));
    };

    const updateContact = (index: number, field: keyof ContactEntry, value: string) => {
        const updated = [...contacts];
        updated[index] = { ...updated[index], [field]: value };
        setContacts(updated);
    };

const handleSave = async () => {
        if (!siteVisitId) return;
        setIsSaving(true);
        try {
            let finalDocs = documentsStr;
            if (documents.length > 0) {
                await leadEnquiryService.uploadSiteVisitDocs(siteVisitId, documents);
                const existingList = documentsStr ? documentsStr.split(",").map(s => s.trim()).filter(Boolean) : [];
                finalDocs = [...existingList, ...documents].join(",");
            }
            await onSave({
                information,
                documents: finalDocs,
                conductedAt,
                contacts: contacts.filter((c) => c.name.trim()),
            });
            handleClose();
        } catch (error) {
            console.error("Save site visit details failed:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setInformation("");
        setDocuments([]);
        setDocumentsStr("");
        setConductedAt("");
        setContacts([{ name: "", designation: "", phone: "", email: "" }]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Site Visit Details
                    </DialogTitle>
                    <DialogDescription>
                        Fill in the site visit information, upload documents, and add contact details.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <Alert>
                        <MapPin className="h-4 w-4" />
                        <AlertDescription>
                            Provide details gathered during the site visit.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <Label htmlFor="conductedAt">Conducted At</Label>
                        <Input
                            id="conductedAt"
                            type="datetime-local"
                            value={conductedAt}
                            onChange={(e) => setConductedAt(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="information">Site Visit Information Received</Label>
                        <Textarea
                            id="information"
                            placeholder="Enter the information received during the site visit..."
                            value={information}
                            onChange={(e) => setInformation(e.target.value)}
                            className="min-h-[120px]"
                            disabled={isSaving}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Upload Documents/Photos/Videos</Label>
                        <FileUploader
                            context="site-visit"
                            value={documents}
                            onChange={setDocuments}
                            disabled={isSaving}
                        />
                        {documentsStr && documents.length === 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                                {documentsStr.split(",").map((doc, i) => (
                                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                                        {doc.trim()}
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Max file size: 25MB each
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Contact Details</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addContact}
                                disabled={isSaving}
                                className="flex items-center gap-1"
                            >
                                <Plus className="h-3 w-3" /> Add Contact
                            </Button>
                        </div>

                        {contacts.map((contact, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-lg border p-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Name</Label>
                                    <Input
                                        placeholder="Name"
                                        value={contact.name}
                                        onChange={(e) => updateContact(index, "name", e.target.value)}
                                        disabled={isSaving}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Designation</Label>
                                    <Input
                                        placeholder="Designation"
                                        value={contact.designation}
                                        onChange={(e) => updateContact(index, "designation", e.target.value)}
                                        disabled={isSaving}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Phone</Label>
                                    <Input
                                        placeholder="Phone"
                                        value={contact.phone}
                                        onChange={(e) => updateContact(index, "phone", e.target.value)}
                                        disabled={isSaving}
                                        className="h-8"
                                    />
                                </div>
                                <div className="space-y-1 flex items-end gap-1">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-xs">Email</Label>
                                        <Input
                                            placeholder="Email"
                                            value={contact.email}
                                            onChange={(e) => updateContact(index, "email", e.target.value)}
                                            disabled={isSaving}
                                            className="h-8"
                                        />
                                    </div>
                                    {contacts.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500"
                                            onClick={() => removeContact(index)}
                                            disabled={isSaving}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            "Save Site Visit Details"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
