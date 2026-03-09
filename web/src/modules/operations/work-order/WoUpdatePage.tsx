// src/pages/wo-update/WOUpdatePage.tsx

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { ArrowLeft, Loader2, FileText, X, Upload, ExternalLink } from "lucide-react";

/* ================================
   TYPES
================================ */
interface BasicData {
    id: number;
    tender_name: string;
    wo_number: string;
    existing_lo_gem_file?: string | null;
    existing_foa_sap_file?: string | null;
}

/* ================================
   DUMMY DATA
================================ */
const DUMMY_BASIC_DATA: BasicData = {
    id: 1,
    tender_name: "Smart City Infrastructure Development - Phase 1",
    wo_number: "WO/2024/SC/001",
    existing_lo_gem_file: null,
    existing_foa_sap_file: null,
};

/* ================================
   FILE INPUT COMPONENT
================================ */
interface FileInputProps {
    label: string;
    file: File | null;
    existingFile?: string | null;
    onFileChange: (file: File | null) => void;
    required?: boolean;
    accept?: string;
}

const FileInput: React.FC<FileInputProps> = ({ label, file, existingFile, onFileChange, required = false, accept = ".pdf,.doc,.docx,image/*" }) => {
    const hasFile = file || existingFile;

    return (
        <div className="space-y-2">
            <Label>
                {label} {required && <span className="text-destructive">*</span>}
            </Label>
            {!hasFile ? (
                <div className="relative">
                    <Input type="file" onChange={e => onFileChange(e.target.files?.[0] || null)} accept={accept} required={required} />
                </div>
            ) : (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{file?.name || existingFile}</span>
                    {existingFile && !file && (
                        <a href={`/uploads/wo/${existingFile}`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline flex items-center gap-1">
                            View <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => onFileChange(null)}>
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            )}
        </div>
    );
};

/* ================================
   MAIN COMPONENT
================================ */
const WoUpdatePage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    /* ================================
       STATE
    ================================ */
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [poAmendmentNeeded, setPOAmendmentNeeded] = useState<string>("");
    const [loGemFile, setLoGemFile] = useState<File | null>(null);
    const [foaSapFile, setFoaSapFile] = useState<File | null>(null);

    /* ================================
       HANDLERS
    ================================ */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = {
            id: DUMMY_BASIC_DATA.id,
            po_amendment_needed: poAmendmentNeeded,
            lo_gem_file: loGemFile,
            foa_sap_file: foaSapFile,
        };

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log("Form Data:", formData);

        setIsSubmitting(false);
        // Navigate back or show success
    };

    /* ================================
       RENDER
    ================================ */
    return (
        <div className="min-h-screen bg-background py-6">
            <div className="container ">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">WO Update</h1>
                        <p className="text-sm text-muted-foreground">{DUMMY_BASIC_DATA.wo_number}</p>
                    </div>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base">Update Work Order Documents</CardTitle>
                        <CardDescription>Upload the final work order documents after acceptance</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* PO Amendment Selection */}
                            <div className="space-y-2">
                                <Label>
                                    PO Amendment Needed <span className="text-destructive">*</span>
                                </Label>
                                <Select value={poAmendmentNeeded} onValueChange={setPOAmendmentNeeded}>
                                    <SelectTrigger className="max-w-xs">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">No</SelectItem>
                                        <SelectItem value="1">Yes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Conditional LO/GEM File */}
                            {poAmendmentNeeded === "1" && (
                                <FileInput label="LO/GEM/LOI/Draft WO" file={loGemFile} existingFile={DUMMY_BASIC_DATA.existing_lo_gem_file} onFileChange={setLoGemFile} />
                            )}

                            {/* Required FOA/SAP File */}
                            <FileInput
                                label="FOA/SAP PO/Detailed WO"
                                file={foaSapFile}
                                existingFile={DUMMY_BASIC_DATA.existing_foa_sap_file}
                                onFileChange={setFoaSapFile}
                                required
                            />

                            <Separator />

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting || !poAmendmentNeeded}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {isSubmitting ? "Saving..." : "Submit"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default WoUpdatePage;
