// src/pages/basic-details/AddBasicDetailsPage.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { ArrowLeft, Save, Loader2, FileText, ExternalLink, Upload, X, Info, Calculator } from "lucide-react";

/* ================================
   TYPES
================================ */
interface Tender {
    id: number;
    tender_name: string;
    sheet?: {
        receipt?: number;
        budget?: number;
        gross_margin?: number;
    };
}

interface BasicDetail {
    id: number;
    tender_name_id: number;
    number: string;
    date: string;
    par_gst: number;
    par_amt: number;
    image: string | null;
    costing_receipt: number;
    costing_budget: number;
    costing_gross_margin: number;
}

interface FormData {
    tender_name_id: string;
    number: string;
    date: string;
    pre_gst: string;
    pre_amt: string;
    costing_receipt: string;
    costing_budget: string;
    costing_gross_margin: string;
}

/* ================================
   DUMMY DATA
================================ */
const DUMMY_TENDERS: Tender[] = [
    { id: 1, tender_name: "Smart City Infrastructure Development - Phase 1", sheet: { receipt: 38500000, budget: 32000000, gross_margin: 16.88 } },
    { id: 2, tender_name: "Highway Development NH-44 Extension", sheet: { receipt: 125000000, budget: 105000000, gross_margin: 16.0 } },
    { id: 3, tender_name: "Metro Rail Blue Line Extension", sheet: { receipt: 89000000, budget: 75000000, gross_margin: 15.73 } },
    { id: 4, tender_name: "Solar Power Plant Installation - Rajasthan", sheet: { receipt: 45000000, budget: 38000000, gross_margin: 15.56 } },
    { id: 5, tender_name: "Water Treatment Facility Upgrade", sheet: { receipt: 28000000, budget: 24000000, gross_margin: 14.29 } },
];

const DUMMY_BASIC_DETAIL: BasicDetail | null = null; // Set to null for add mode, or populate for edit mode

/* ================================
   HELPERS
================================ */
const formatCurrency = (value: string): string => {
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    return new Intl.NumberFormat("en-IN").format(num);
};

const calculateGrossMargin = (receipt: string, budget: string): string => {
    const r = parseFloat(receipt) || 0;
    const b = parseFloat(budget) || 0;
    if (r === 0) return "0.00";
    const margin = ((r - b) / r) * 100;
    return margin.toFixed(2);
};

/* ================================
   MAIN COMPONENT
================================ */
const BasicDetailAddPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // For edit mode
    const [searchParams] = useSearchParams();
    const tenderId = searchParams.get("tender_id");

    /* ================================
       STATE
    ================================ */
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [existingFile, setExistingFile] = useState<string | null>(DUMMY_BASIC_DETAIL?.image || null);

    const [formData, setFormData] = useState<FormData>({
        tender_name_id: DUMMY_BASIC_DETAIL?.tender_name_id?.toString() || tenderId || "",
        number: DUMMY_BASIC_DETAIL?.number || "",
        date: DUMMY_BASIC_DETAIL?.date || "",
        pre_gst: DUMMY_BASIC_DETAIL?.par_gst?.toString() || "",
        pre_amt: DUMMY_BASIC_DETAIL?.par_amt?.toString() || "",
        costing_receipt: DUMMY_BASIC_DETAIL?.costing_receipt?.toString() || "",
        costing_budget: DUMMY_BASIC_DETAIL?.costing_budget?.toString() || "",
        costing_gross_margin: DUMMY_BASIC_DETAIL?.costing_gross_margin?.toString() || "0.00",
    });

    const isEditMode = !!id || !!DUMMY_BASIC_DETAIL;
    const selectedTender = DUMMY_TENDERS.find(t => t.id.toString() === formData.tender_name_id);
    const isFixedTender = !!tenderId;

    /* ================================
       EFFECTS
    ================================ */
    // Auto-calculate gross margin
    useEffect(() => {
        const margin = calculateGrossMargin(formData.costing_receipt, formData.costing_budget);
        setFormData(prev => ({ ...prev, costing_gross_margin: margin }));
    }, [formData.costing_receipt, formData.costing_budget]);

    // Populate costing fields when tender is selected
    useEffect(() => {
        if (!formData.tender_name_id || isEditMode) return;

        const tender = DUMMY_TENDERS.find(t => t.id.toString() === formData.tender_name_id);

        if (!tender?.sheet) return;

        setFormData(prev => {
            // prevent unnecessary state update → breaks loop
            if (prev.costing_receipt === tender.sheet.receipt?.toString() && prev.costing_budget === tender.sheet.budget?.toString()) {
                return prev;
            }

            return {
                ...prev,
                costing_receipt: tender.sheet.receipt?.toString() || prev.costing_receipt,
                costing_budget: tender.sheet.budget?.toString() || prev.costing_budget,
            };
        });
    }, [formData.tender_name_id, isEditMode]);

    /* ================================
       HANDLERS
    ================================ */
    const handleChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log("Form Data:", formData);
        console.log("File:", file);

        setIsSubmitting(false);
        // navigate back or show success
    };

    /* ================================
       RENDER
    ================================ */
    return (
        <div className="min-h-screen bg-background ">
            <div className="container ">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">{isEditMode ? "Edit Basic Details" : "Add Basic Details"}</h1>
                        <p className="text-sm text-muted-foreground">{isEditMode ? "Update work order information" : "Enter work order information"}</p>
                    </div>
                </div>

                {/* Form Card */}
                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Tender Selection */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="tender_name_id">
                                        Tender Name <span className="text-destructive">*</span>
                                    </Label>
                                    {isFixedTender ? (
                                        <>
                                            <Input value={selectedTender?.tender_name || ""} readOnly className="bg-muted" />
                                            <input type="hidden" value={formData.tender_name_id} />
                                        </>
                                    ) : (
                                        <Select value={formData.tender_name_id || undefined} onValueChange={v => handleChange("tender_name_id", v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Tender" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {DUMMY_TENDERS.map(tender => (
                                                    <SelectItem key={tender.id} value={tender.id.toString()}>
                                                        {tender.tender_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="number">
                                        WO Number <span className="text-destructive">*</span>
                                    </Label>
                                    <Input id="number" value={formData.number} onChange={e => handleChange("number", e.target.value)} placeholder="Enter WO Number" required />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="date">
                                        WO Date <span className="text-destructive">*</span>
                                    </Label>
                                    <Input id="date" type="date" value={formData.date} onChange={e => handleChange("date", e.target.value)} required />
                                </div>
                            </div>

                            <Separator />

                            {/* WO Value Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="pre_gst">
                                        WO Value (Pre-GST) <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                        <Input
                                            id="pre_gst"
                                            type="number"
                                            value={formData.pre_gst}
                                            onChange={e => handleChange("pre_gst", e.target.value)}
                                            placeholder="0"
                                            className="pl-7"
                                            min="0"
                                            step="any"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="pre_amt">
                                        WO Value (GST Amt.) <span className="text-destructive">*</span>
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                        <Input
                                            id="pre_amt"
                                            type="number"
                                            value={formData.pre_amt}
                                            onChange={e => handleChange("pre_amt", e.target.value)}
                                            placeholder="0"
                                            className="pl-7"
                                            min="0"
                                            step="any"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="image">LOA/GEM PO/LOI/Draft WO {!isEditMode && <span className="text-destructive">*</span>}</Label>
                                    {!file && !existingFile ? (
                                        <div className="relative">
                                            <Input
                                                id="image"
                                                type="file"
                                                onChange={handleFileChange}
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                className="cursor-pointer"
                                                required={!isEditMode}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            <span className="text-sm truncate flex-1">{file?.name || existingFile}</span>
                                            {existingFile && !file && (
                                                <a
                                                    href={`/uploads/basicdetails/${existingFile}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline text-sm flex items-center gap-1"
                                                >
                                                    View <ExternalLink className="h-3 w-3" />
                                                </a>
                                            )}
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleRemoveFile}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Costing Section */}
                            <div>
                                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                                    <Calculator className="h-4 w-4 text-muted-foreground" />
                                    Costing Details
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="costing_receipt">
                                            Receipt (Pre GST) <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                            <Input
                                                id="costing_receipt"
                                                type="number"
                                                value={formData.costing_receipt}
                                                onChange={e => handleChange("costing_receipt", e.target.value)}
                                                placeholder="0"
                                                className="pl-7"
                                                min="0"
                                                step="any"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="costing_budget">
                                            Budget (Pre GST) <span className="text-destructive">*</span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                                            <Input
                                                id="costing_budget"
                                                type="number"
                                                value={formData.costing_budget}
                                                onChange={e => handleChange("costing_budget", e.target.value)}
                                                placeholder="0"
                                                className="pl-7"
                                                min="0"
                                                step="any"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Label htmlFor="costing_gross_margin" className="flex items-center gap-1 cursor-help">
                                                        Gross Margin %
                                                        <Info className="h-3 w-3 text-muted-foreground" />
                                                    </Label>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="text-xs">Formula: (Receipt - Budget) / Receipt × 100</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <div className="relative">
                                            <Input id="costing_gross_margin" type="text" value={formData.costing_gross_margin} readOnly className="bg-muted pr-8" />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {isSubmitting ? "Saving..." : isEditMode ? "Update" : "Submit"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default BasicDetailAddPage;
