import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Plus, X, FileText } from "lucide-react";
import { DateTimeInput } from "@/components/form/DateTimeInput";
import { leadsQuotationService } from "@/services/api/leads-quotation.service";
import type { ContactEntry } from "../helpers/leads-quotation.type";

interface QuoteSubmissionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    quote: { id: number; enquiryNumber?: string | null; enqName?: string | null } | null;
    onConfirm: (data: {
        quoteSubmissionDatetime: string;
        submittedDocuments: string;
        contacts: ContactEntry[];
    }) => Promise<void>;
}

interface ContactRow {
    id: string;
    name: string;
    designation: string;
    phone: string;
    email: string;
}

interface UploadedDoc {
    id: string;
    file: File;
    filename?: string;
    status: 'pending' | 'uploading' | 'done' | 'error';
}

let idCounter = 0;

export function QuoteSubmissionModal({
    open,
    onOpenChange,
    quote,
    onConfirm,
}: QuoteSubmissionModalProps) {
    const [quoteSubmissionDatetime, setQuoteSubmissionDatetime] = useState("");
    const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
    const [contacts, setContacts] = useState<ContactRow[]>([
        { id: `c_${++idCounter}`, name: "", designation: "", phone: "", email: "" },
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setQuoteSubmissionDatetime("");
            setUploadedDocs([]);
            setContacts([
                { id: `c_${++idCounter}`, name: "", designation: "", phone: "", email: "" },
            ]);
        }
    }, [open]);

    const addContact = () => {
        setContacts(prev => [...prev, { id: `c_${++idCounter}`, name: "", designation: "", phone: "", email: "" }]);
    };

    const removeContact = (id: string) => {
        setContacts(prev => prev.filter(c => c.id !== id));
    };

    const updateContact = (id: string, field: keyof ContactRow, value: string) => {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const uploadFile = async (file: File) => {
        if (!quote) return;
        const docId = `d_${++idCounter}`;
        setUploadedDocs(prev => [...prev, { id: docId, file, status: 'uploading' }]);
        try {
            const filenames = await leadsQuotationService.uploadDocs(quote.id, [file]);
            setUploadedDocs(prev => prev.map(d => d.id === docId ? { ...d, filename: filenames[0], status: 'done' } : d));
        } catch {
            setUploadedDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'error' } : d));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && quote) {
            Array.from(e.target.files).forEach(f => uploadFile(f));
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeDoc = (id: string) => {
        setUploadedDocs(prev => prev.filter(d => d.id !== id));
    };

    const triggerFilePicker = () => {
        fileInputRef.current?.click();
    };

    const handleConfirm = async () => {
        if (!quote) return;
        setIsSubmitting(true);
        try {
            const finalDocs = uploadedDocs
                .filter(d => d.status === 'done' && d.filename)
                .map(d => d.filename!)
                .join(',');

            const validContacts: ContactEntry[] = contacts
                .filter(c => c.name.trim())
                .map(c => ({
                    name: c.name.trim(),
                    designation: c.designation.trim() || null,
                    phone: c.phone.trim() || null,
                    email: c.email.trim() || null,
                }));

            await onConfirm({
                quoteSubmissionDatetime,
                submittedDocuments: finalDocs,
                contacts: validContacts,
            });
            handleClose();
        } catch {
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        onOpenChange(false);
    };

    const allDocsDone = uploadedDocs.every(d => d.status === 'done' || d.status === 'error');
    const hasPendingUploads = uploadedDocs.some(d => d.status === 'uploading');
    const canSubmit = quoteSubmissionDatetime && contacts.some(c => c.name.trim()) && allDocsDone;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Quote Submission
                    </DialogTitle>
                    <DialogDescription>
                        Record the quotation submission for{" "}
                        <strong>{quote?.enquiryNumber || quote?.enqName || "this enquiry"}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="quoteSubmissionDatetime">
                            Submission Date & Time <span className="text-destructive">*</span>
                        </Label>
                        <DateTimeInput
                            id="quoteSubmissionDatetime"
                            value={quoteSubmissionDatetime}
                            onChange={setQuoteSubmissionDatetime}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Submitted Documents</Label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={triggerFilePicker} disabled={isSubmitting}>
                            <Plus className="h-4 w-4 mr-1" /> Add Document
                        </Button>
                        {uploadedDocs.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {uploadedDocs.map(doc => (
                                    <div
                                        key={doc.id}
                                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border ${
                                            doc.status === 'done' ? 'bg-muted' :
                                            doc.status === 'uploading' ? 'bg-blue-50 border-blue-200' :
                                            doc.status === 'error' ? 'bg-red-50 border-red-200' : 'bg-muted'
                                        }`}
                                    >
                                        <FileText className="h-3 w-3 shrink-0" />
                                        <span className="max-w-[140px] truncate">{doc.file.name}</span>
                                        {doc.status === 'uploading' && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                                        {doc.status === 'done' && (
                                            <button type="button" onClick={() => removeDoc(doc.id)} className="ml-1 text-muted-foreground hover:text-destructive">
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                        {doc.status === 'error' && <span className="text-destructive ml-1">Failed</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">Upload quotation documents (PDF, DOC, XLS, images)</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Contact Person(s) <span className="text-destructive">*</span></Label>
                            <Button type="button" variant="outline" size="sm" onClick={addContact} disabled={isSubmitting}>
                                <Plus className="h-3 w-3 mr-1" /> Add
                            </Button>
                        </div>
                        {contacts.map((contact, idx) => (
                            <div key={contact.id} className="border rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-muted-foreground">Contact #{idx + 1}</span>
                                    {contacts.length > 1 && (
                                        <button type="button" onClick={() => removeContact(contact.id)} className="text-muted-foreground hover:text-destructive">
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
                                        <Input placeholder="Name" value={contact.name} onChange={e => updateContact(contact.id, "name", e.target.value)} disabled={isSubmitting} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Designation</Label>
                                        <Input placeholder="Designation" value={contact.designation} onChange={e => updateContact(contact.id, "designation", e.target.value)} disabled={isSubmitting} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Phone</Label>
                                        <Input placeholder="Phone" value={contact.phone} onChange={e => updateContact(contact.id, "phone", e.target.value)} disabled={isSubmitting} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Email</Label>
                                        <Input placeholder="Email" type="email" value={contact.email} onChange={e => updateContact(contact.id, "email", e.target.value)} disabled={isSubmitting} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting || hasPendingUploads}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleConfirm} disabled={isSubmitting || !canSubmit}>
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                        ) : hasPendingUploads ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
                        ) : (
                            "Confirm Submission"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
