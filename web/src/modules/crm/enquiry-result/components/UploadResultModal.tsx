import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NumberInput from "@/components/form/NumberInput";
import { Loader2, Upload, Plus, X } from "lucide-react";
import { FileUploader } from "@/components/file-upload";
import type { EnquiryResultWithDetails, UpdateEnquiryResultRequest } from "../helpers/enquiry-result.type";

const normalizePath = (value: string): string =>
    value.includes("/") ? value : `enquiry-results/${value}`;

interface UploadResultModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    result: EnquiryResultWithDetails | null;
    onSubmit: (data: UpdateEnquiryResultRequest) => Promise<void>;
}

let idCounter = 0;

interface PartyRow {
    id: string;
    name: string;
}

const COUNT_OPTIONS = ["Not Known", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

export function UploadResultModal({ open, onOpenChange, result, onSubmit }: UploadResultModalProps) {
    const [technicallyQualified, setTechnicallyQualified] = useState<string>("");
    const [disqualificationReason, setDisqualificationReason] = useState("");
    const [qualifiedCount, setQualifiedCount] = useState<string>("");
    const [partiesNotKnown, setPartiesNotKnown] = useState(false);
    const [parties, setParties] = useState<PartyRow[]>([]);
    const [resultValue, setResultValue] = useState<string>("");
    const [l1Price, setL1Price] = useState<number | null>(null);
    const [l2Price, setL2Price] = useState<number | null>(null);
    const [ourPrice, setOurPrice] = useState<number | null>(null);
    const [screenshots, setScreenshots] = useState<string[]>([]);
    const [documents, setDocuments] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        setTechnicallyQualified(result?.technicallyQualified == null ? "" : result.technicallyQualified ? "yes" : "no");
        setDisqualificationReason(result?.disqualificationReason ?? "");
        setQualifiedCount(result?.qualifiedCount == null ? "" : result.qualifiedCount === 0 ? "Not Known" : String(result.qualifiedCount));
        setPartiesNotKnown(result?.qualifiedParties?.length === 1 && result.qualifiedParties[0] === "Not Known");
        setParties((result?.qualifiedParties ?? []).filter(p => p !== "Not Known").map(name => ({ id: `p_${++idCounter}`, name })));
        setResultValue(result?.result === 'won' || result?.result === 'lost' ? result.result : "");
        setL1Price(result?.l1Price ? Number(result.l1Price) : null);
        setL2Price(result?.l2Price ? Number(result.l2Price) : null);
        setOurPrice(result?.ourPrice ? Number(result.ourPrice) : null);
        setScreenshots((result?.uploadScreenshot ?? "").split(",").map(s => s.trim()).filter(Boolean).map(normalizePath));
        setDocuments((result?.uploadDocuments ?? "").split(",").map(s => s.trim()).filter(Boolean).map(normalizePath));
    }, [open, result]);

    const addParty = () => {
        setParties(prev => [...prev, { id: `p_${++idCounter}`, name: "" }]);
    };

    const removeParty = (id: string) => {
        setParties(prev => prev.filter(p => p.id !== id));
    };

    const updateParty = (id: string, name: string) => {
        setParties(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    };

    const handleSubmit = async () => {
        if (!result || !technicallyQualified) return;
        setIsSubmitting(true);
        try {
            if (technicallyQualified === "no") {
                await onSubmit({
                    technicallyQualified: false,
                    disqualificationReason: disqualificationReason.trim(),
                    qualifiedCount: null,
                    qualifiedParties: null,
                    result: null,
                    l1Price: null,
                    l2Price: null,
                    ourPrice: null,
                    status: "Disqualified",
                });
                handleClose();
                return;
            }

            const qualifiedNames = parties.map(p => p.name.trim()).filter(Boolean);
            await onSubmit({
                technicallyQualified: true,
                disqualificationReason: null,
                qualifiedCount: qualifiedCount === "Not Known" ? 0 : qualifiedCount ? Number(qualifiedCount) : null,
                qualifiedParties: partiesNotKnown ? ["Not Known"] : qualifiedNames.length > 0 ? qualifiedNames : null,
                result: resultValue === "won" || resultValue === "lost" ? resultValue : null,
                l1Price,
                l2Price,
                ourPrice,
                uploadScreenshot: screenshots.join(","),
                uploadDocuments: documents.join(","),
                status: resultValue === "won" ? "Won" : resultValue === "lost" ? "Lost" : null,
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

    const isYes = technicallyQualified === "yes";
    const canSubmit = technicallyQualified !== ""
        && (technicallyQualified === "no"
            ? disqualificationReason.trim().length > 0
            : resultValue !== "");

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Upload Result
                    </DialogTitle>
                    <DialogDescription>
                        Record the result for{" "}
                        <strong>{result?.enquiryNumber || result?.enqName || "this enquiry"}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    <div className="space-y-2">
                        <Label>Technically Qualified <span className="text-destructive">*</span></Label>
                        <RadioGroup
                            value={technicallyQualified}
                            onValueChange={setTechnicallyQualified}
                            className="flex gap-6"
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="yes" id="tq-yes" />
                                <Label htmlFor="tq-yes" className="font-normal">Yes</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="no" id="tq-no" />
                                <Label htmlFor="tq-no" className="font-normal">No</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {technicallyQualified === "no" && (
                        <div className="space-y-2">
                            <Label>
                                Reason for Disqualification <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                placeholder="State the reason for disqualification..."
                                value={disqualificationReason}
                                onChange={(e) => setDisqualificationReason(e.target.value)}
                                rows={4}
                                className="w-full resize-none"
                                disabled={isSubmitting}
                            />
                        </div>
                    )}

                    {isYes && (
                        <>
                            <div className="space-y-2">
                                <Label>No. of Qualified Parties</Label>
                                <Select value={qualifiedCount} onValueChange={setQualifiedCount} disabled={isSubmitting}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select count" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COUNT_OPTIONS.map(opt => (
                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Name of Qualified Parties</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addParty} disabled={isSubmitting || partiesNotKnown}>
                                        <Plus className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="parties-not-known"
                                        checked={partiesNotKnown}
                                        onCheckedChange={(checked) => setPartiesNotKnown(checked === true)}
                                        disabled={isSubmitting}
                                    />
                                    <Label htmlFor="parties-not-known" className="font-normal">Not Known</Label>
                                </div>
                                {!partiesNotKnown && parties.map((party, idx) => (
                                    <div key={party.id} className="flex items-center gap-2">
                                        <Input
                                            placeholder={`Party ${idx + 1} name`}
                                            value={party.name}
                                            onChange={(e) => updateParty(party.id, e.target.value)}
                                            disabled={isSubmitting}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeParty(party.id)}
                                            className="text-muted-foreground hover:text-destructive shrink-0"
                                            disabled={isSubmitting}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label>Result <span className="text-destructive">*</span></Label>
                                <Select value={resultValue} onValueChange={setResultValue} disabled={isSubmitting}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Won or Lost" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="won">Won</SelectItem>
                                        <SelectItem value="lost">Lost</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>L1 Price</Label>
                                    <NumberInput value={l1Price} onChange={setL1Price} placeholder="0.00" disabled={isSubmitting} />
                                </div>
                                <div className="space-y-2">
                                    <Label>L2 Price</Label>
                                    <NumberInput value={l2Price} onChange={setL2Price} placeholder="0.00" disabled={isSubmitting} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Our Price</Label>
                                    <NumberInput value={ourPrice} onChange={setOurPrice} placeholder="0.00" disabled={isSubmitting} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Upload Screenshot</Label>
                                <FileUploader
                                    context="enquiry-results"
                                    value={screenshots}
                                    onChange={setScreenshots}
                                    disabled={isSubmitting}
                                    label="Screenshots"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Final Result</Label>
                                <FileUploader
                                    context="enquiry-results"
                                    value={documents}
                                    onChange={setDocuments}
                                    disabled={isSubmitting}
                                    label="Documents"
                                />
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
                        {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                        ) : (
                            "Save Result"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
