import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/axios";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { ArrowLeft, Save, Loader2, FileText, ExternalLink, X, Info, Calculator } from "lucide-react";
import { toast } from "sonner";
import { ZodError } from "zod";

/* ================================
   TYPES
================================ */

interface WorkOrderResponse {
    id: number;
    tenderName: string | null;
    tenderNameId: string;
    number: string;
    date: string;
    parGst: string;
    parAmt: string;
    image: string | null;
    costingReceipt: string;
    costingBudget: string;
    costingGrossMargin: string;
}

/* ================================
   HELPERS
================================ */

const calculateGrossMargin = (receipt: string, budget: string): string => {
    const r = Number(receipt) || 0;
    const b = Number(budget) || 0;
    if (!r) return "0.00";
    return (((r - b) / r) * 100).toFixed(2);
};

/* ================================
   COMPONENT
================================ */

const WoBasicPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [existingFile, setExistingFile] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        tenderNameId: "",
        number: "",
        date: "",
        parGst: "",
        parAmt: "",
        costingReceipt: "",
        costingBudget: "",
        costingGrossMargin: "0.00",
    });

    /* ================================
       FETCH EXISTING DATA
    ================================ */

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                const res = await api.get<WorkOrderResponse>(`/work-order/${id}`);
                const data = res.data;

                console.log("Fetched WO Basic Details:", data);

                setFormData({
                    tenderNameId: data.tenderNameId,
                    tenderName: data.tenderInfo.tenderName || "",
                    number: data.number,
                    date: data.date,
                    parGst: data.parGst,
                    parAmt: data.parAmt,
                    costingReceipt: data.costingReceipt,
                    costingBudget: data.costingBudget,
                    costingGrossMargin: data.costingGrossMargin,
                });

                setExistingFile(data.image);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    /* ================================
       AUTO GROSS MARGIN
    ================================ */

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            costingGrossMargin: calculateGrossMargin(prev.costingReceipt, prev.costingBudget),
        }));
    }, [formData.costingReceipt, formData.costingBudget]);

    /* ================================
       HANDLERS
    ================================ */

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setExistingFile(null);
    };

    /* ================================
       SUBMIT
    ================================ */

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        try {
            setSubmitting(true);

            const payload = new FormData();
            payload.append("tenderNameId", formData.tenderNameId.toString());
            payload.append("number", formData.number);
            payload.append("date", formData.date);
            payload.append("parGst", formData.parGst);
            payload.append("parAmt", formData.parAmt);
            payload.append("costingReceipt", formData.costingReceipt);
            payload.append("costingBudget", formData.costingBudget);
            payload.append("costingGrossMargin", formData.costingGrossMargin);

            if (file) {
                payload.append("image", file);
            }

            await api.put(`/work-order/${id}`, payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Basic details updated successfully");

            navigate(-1);
        } catch (err) {
            if (err instanceof ZodError) {
                toast.error(err.issues[0]?.message || "Invalid form data");
            } else if (err instanceof Error) {
                toast.error(err.message);
            } else {
                toast.error("Something went wrong");
            }

            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    /* ================================
       LOADING
    ================================ */

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    /* ================================
       RENDER
    ================================ */

    return (
        <div className="min-h-screen bg-background">
            <div className="container">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">Edit Basic Details</h1>
                        <p className="text-sm text-muted-foreground">Update work order information</p>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* WO Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label>Tenders Name</Label>
                                    <Input value={formData.tenderName} readOnly className="bg-muted cursor-not-allowed" />
                                </div>

                                <div>
                                    <Label>WO Number</Label>
                                    <Input value={formData.number} onChange={e => handleChange("number", e.target.value)} required />
                                </div>

                                <div>
                                    <Label>WO Date</Label>
                                    <Input type="date" value={formData.date} onChange={e => handleChange("date", e.target.value)} required />
                                </div>
                            </div>

                            <Separator />

                            {/* WO Value */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label>WO Value (Pre-GST)</Label>
                                    <Input
                                        type="number"
                                        value={formData.parGst}
                                        step="0.01"
                                        onChange={e => {
                                            const value = e.target.value;
                                            if (!value.includes(".") || value.split(".")[1].length <= 2) {
                                                handleChange("parGst", value);
                                            }
                                        }}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label>GST Amount</Label>
                                    <Input
                                        type="number"
                                        value={formData.parAmt}
                                        step="0.01"
                                        onChange={e => {
                                            const value = e.target.value;
                                            if (!value.includes(".") || value.split(".")[1].length <= 2) {
                                                handleChange("parAmt", value);
                                            }
                                        }}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label>Document</Label>
                                    {!file && existingFile ? (
                                        <div className="flex items-center gap-2 p-2 border rounded-md">
                                            <FileText className="h-4 w-4" />
                                            <span className="text-sm flex-1 truncate">{existingFile}</span>
                                            <a href={`/uploads/basicdetails/${existingFile}`} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                            <Button type="button" variant="ghost" size="icon" onClick={handleRemoveFile}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Input type="file" onChange={handleFileChange} />
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Costing */}
                            <div>
                                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                                    <Calculator className="h-4 w-4" />
                                    Costing Details
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label>Receipt (Pre-GST)</Label>
                                        <Input type="number" value={formData.costingReceipt} onChange={e => handleChange("costingReceipt", e.target.value)} required />
                                    </div>

                                    <div>
                                        <Label>Budget (Pre-GST)</Label>
                                        <Input type="number" value={formData.costingBudget} onChange={e => handleChange("costingBudget", e.target.value)} required />
                                    </div>

                                    <div>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Label className="flex items-center gap-1">
                                                        Gross Margin %
                                                        <Info className="h-3 w-3" />
                                                    </Label>
                                                </TooltipTrigger>
                                                <TooltipContent>(Receipt - Budget) / Receipt × 100</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <Input value={formData.costingGrossMargin} readOnly />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default WoBasicPage;
