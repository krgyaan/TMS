import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { SelectField } from "@/components/form/SelectField";
import { DateTimeInput } from "@/components/form/DateTimeInput";
import { FileUploader } from "@/components/file-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fileUploadService } from "@/services/api/file-upload.service";
import { parseFileMeta } from "@/components/file-upload/helpers/fileMeta";
import { cn } from "@/lib/utils";
import { useCreateTender, useUpdateTender, useGenerateTenderName } from "@/hooks/api/useTenders";
import { type TenderInfoWithNames, type StructuredTenderDocuments, parseTenderDocuments } from "../helpers/tenderInfo.types";
import {
    classifyDocumentFilename,
    classifyDocumentViaApi,
    CATEGORY_INFO,
    type DocumentCategory,
    type ClassifiedDocument,
} from "../helpers/documentClassifier";
import { paths } from "@/app/routes/paths";
import { ArrowLeft, Sparkles, CheckCircle2, ArrowRight, FileSpreadsheet, FileUp, FileText, AlertTriangle, X } from "lucide-react";
import { useTeamOptions, useOrganizationOptions, useUserOptions, useLocationOptions, useWebsiteOptions, useItemOptions } from "@/hooks/useSelectOptions";
import { useAuth } from "@/contexts/AuthContext";
import { TenderNameWarningAlert } from "./TenderNameWarningAlert";

const ManualFormSchema = z.object({
    team: z.coerce.number().int().positive({ message: "Team is required" }),
    tenderNo: z.string().min(1, { message: "Tender No is required" }),
    tenderName: z.string().min(1, { message: "Tender Name is required" }),
    organization: z.coerce.number().int().positive().optional(),
    gstValues: z.coerce.number().nonnegative({ message: "Enter a valid amount" }).default(0),
    tenderFees: z.coerce.number().nonnegative({ message: "Enter a valid amount" }).default(0),
    emd: z.coerce.number().nonnegative({ message: "Enter a valid amount" }).default(0),
    teamMember: z.coerce.number().int().positive().nullable().optional(),
    dueDate: z.string().min(1, { message: "Due date and time is required" }),
    location: z.coerce.number().int().positive().optional(),
    website: z.coerce.number().int().positive().optional(),
    item: z.coerce.number().int().positive({ message: "Item is required" }),
    status: z.coerce.number().int().min(0).default(1),
    documents: z.array(z.string()).default([]),
    remarks: z.string().max(200).optional(),

    deleteStatus: z.enum(["0", "1"]).optional(),
    tlStatus: z.enum(["0", "1", "2", "3"]).optional(),
    tlRemarks: z.string().max(200).optional(),
    rfqTo: z.string().max(15).optional(),
    courierAddress: z.string().optional(),
});

type ManualFormValues = z.infer<typeof ManualFormSchema>;

interface TenderFormProps {
    tender?: TenderInfoWithNames;
    mode: "create" | "edit";
}

export function TenderForm({ tender, mode }: TenderFormProps) {
    const navigate = useNavigate();
    const createTender = useCreateTender();
    const updateTender = useUpdateTender();
    const generateTenderName = useGenerateTenderName();
    const { user, roleId, effectiveTeamId } = useAuth();

    const [activeTab, setActiveTab] = useState("manually");

    const teamOptions = useTeamOptions([1, 2]);
    const organizationOptions = useOrganizationOptions();
    const locationOptions = useLocationOptions();
    const websiteOptions = useWebsiteOptions();
    const itemOptions = useItemOptions();

    const manualForm = useForm<ManualFormValues>({
        resolver: zodResolver(ManualFormSchema) as any,
        defaultValues: {
            team: undefined as any,
            tenderNo: "",
            tenderName: "",
            organization: undefined,
            gstValues: 0,
            tenderFees: 0,
            emd: 0,
            teamMember: null,
            dueDate: "",
            location: undefined,
            website: undefined,
            item: undefined as any,
            status: 1,
            documents: [],
            remarks: "",
        },
    });



    // Classification state for uploaded tender documents
    const [fileClassifications, setFileClassifications] = useState<Record<string, ClassifiedDocument>>({});
    const [documentError, setDocumentError] = useState<string | null>(null);

    // Watch fields for auto-generation
    const organization = useWatch({ control: manualForm.control, name: "organization" });
    const item = useWatch({ control: manualForm.control, name: "item" });
    const location = useWatch({ control: manualForm.control, name: "location" });
    const team = useWatch({ control: manualForm.control, name: "team" });
    const watchTenderName = useWatch({ control: manualForm.control, name: "tenderName" });
    const watchTenderNo = useWatch({ control: manualForm.control, name: "tenderNo" });

    // Watch documents list
    const documents = useWatch({ control: manualForm.control, name: "documents" }) || [];

    const userOptions = useUserOptions(team);

    // Role-based locking flags (create mode only)
    const lockTeam = mode === "create" && roleId !== 1 && roleId !== 2;
    const canAssignTeamMember = roleId != null && [1, 2, 3, 4].includes(roleId);
    const lockUser = !canAssignTeamMember;

    const currentTeamId = effectiveTeamId ?? null;
    const currentUserId = user?.id ?? null;

    const isInitialLoad = useRef(true);
    const previousValues = useRef<{ organization?: number; item?: number; location?: number; team?: number }>({});

    // Initialize form values for edit mode
    useEffect(() => {
        if (!tender || mode !== "edit") {
            if (mode === "create") {
                setTimeout(() => {
                    isInitialLoad.current = false;
                }, 0);
            }
            return;
        }
        try {
            const parsedDocs = parseTenderDocuments(tender.documents);
            const initialPaths: string[] = [];
            const initialClassifications: Record<string, ClassifiedDocument> = {};

            if (parsedDocs.mainTender) {
                initialPaths.push(parsedDocs.mainTender);
                initialClassifications[parsedDocs.mainTender] = {
                    path: parsedDocs.mainTender,
                    name: parseFileMeta(parsedDocs.mainTender).displayName,
                    category: "mainTender",
                    confidence: 100,
                    needsConfirmation: false,
                    reason: "persisted",
                };
            }
            for (const p of parsedDocs.atc) {
                initialPaths.push(p);
                initialClassifications[p] = {
                    path: p,
                    name: parseFileMeta(p).displayName,
                    category: "atc",
                    confidence: 100,
                    needsConfirmation: false,
                    reason: "persisted",
                };
            }
            if (parsedDocs.boq) {
                initialPaths.push(parsedDocs.boq);
                initialClassifications[parsedDocs.boq] = {
                    path: parsedDocs.boq,
                    name: parseFileMeta(parsedDocs.boq).displayName,
                    category: "boq",
                    confidence: 100,
                    needsConfirmation: false,
                    reason: "persisted",
                };
            }
            for (const p of parsedDocs.otherDocuments) {
                initialPaths.push(p);
                initialClassifications[p] = {
                    path: p,
                    name: parseFileMeta(p).displayName,
                    category: "otherDocuments",
                    confidence: 100,
                    needsConfirmation: false,
                    reason: "persisted",
                };
            }

            const resetValues = {
                team: Number(tender.team) || (undefined as any),
                tenderNo: tender.tenderNo || "",
                tenderName: tender.tenderName || "",
                organization: tender.organization ? Number(tender.organization) : undefined,
                gstValues: tender.gstValues != null ? Number(tender.gstValues) : 0,
                tenderFees: tender.tenderFees != null ? Number(tender.tenderFees) : 0,
                emd: tender.emd != null ? Number(tender.emd) : 0,
                teamMember: tender.teamMember != null ? Number(tender.teamMember) : null,
                dueDate: tender.dueDate ? new Date(tender.dueDate).toISOString() : "",
                location: tender.location ? Number(tender.location) : undefined,
                website: tender.website ? Number(tender.website) : undefined,
                item: Number(tender.item) || (undefined as any),
                status: Number(tender.status) ?? 1,
                documents: initialPaths,
                remarks: tender.remarks || "",
            };
            manualForm.reset(resetValues);
            setFileClassifications(initialClassifications);
            previousValues.current = {
                organization: resetValues.organization,
                item: resetValues.item,
                location: resetValues.location,
                team: resetValues.team,
            };
            setTimeout(() => {
                isInitialLoad.current = false;
            }, 0);
        } catch (err) {
            console.error("Error resetting form:", err);
        }
    }, [tender, mode, manualForm]);

    // Handle files upload & classification
    const handleFilesChange = (paths: string[]) => {
        setDocumentError(null);
        manualForm.setValue("documents", paths, { shouldValidate: true });

        setFileClassifications((prev) => {
            const updated: Record<string, ClassifiedDocument> = {};

            // Keep existing classifications for paths that remain
            for (const p of paths) {
                if (prev[p]) {
                    updated[p] = prev[p];
                } else {
                    // Instant optimistic classification from filename
                    updated[p] = classifyDocumentFilename(p);
                }
            }

            // Ensure at least one Main Tender exists if none tagged
            const hasMain = Object.values(updated).some((c) => c.category === "mainTender");
            if (!hasMain && paths.length > 0) {
                const candidate = paths.find((p) => updated[p]?.category !== "boq" && updated[p]?.category !== "atc") || paths[0];
                if (candidate && updated[candidate]) {
                    updated[candidate] = {
                        ...updated[candidate],
                        category: "mainTender",
                        needsConfirmation: updated[candidate].confidence < 70,
                    };
                }
            }

            return updated;
        });

        // Asynchronously sniff PDF content (pages 1-5 via VolksAI) for any PDF files
        for (const p of paths) {
            if (p.toLowerCase().endsWith(".pdf")) {
                classifyDocumentViaApi(p)
                    .then((apiResult) => {
                        setFileClassifications((prev) => {
                            const current = prev[p];
                            if (!current) return prev;
                            // Only update if user hasn't manually overridden
                            if (current.reason === "manual_override") return prev;

                            return {
                                ...prev,
                                [p]: {
                                    ...current,
                                    category: apiResult.category,
                                    confidence: apiResult.confidence,
                                    needsConfirmation: apiResult.needsConfirmation,
                                    reason: apiResult.reason,
                                    scores: apiResult.scores,
                                },
                            };
                        });
                    })
                    .catch(() => {});
            }
        }
    };

    // Quick reclassify control handler
    const handleReclassify = (filePath: string, newCategory: DocumentCategory) => {
        setDocumentError(null);
        setFileClassifications((prev) => {
            const updated = { ...prev };
            const target = updated[filePath];
            if (!target) return prev;

            // Enforce single Main Tender
            if (newCategory === "mainTender") {
                for (const [k, v] of Object.entries(updated)) {
                    if (k !== filePath && v.category === "mainTender") {
                        updated[k] = { ...v, category: "otherDocuments" };
                    }
                }
            }
            // Enforce single BOQ
            if (newCategory === "boq") {
                for (const [k, v] of Object.entries(updated)) {
                    if (k !== filePath && v.category === "boq") {
                        updated[k] = { ...v, category: "otherDocuments" };
                    }
                }
            }

            updated[filePath] = {
                ...target,
                category: newCategory,
                needsConfirmation: false,
                reason: "manual_override",
            };

            return updated;
        });
    };

    // Auto-generate tender name
    useEffect(() => {
        if (isInitialLoad.current) return;

        const hasChanged =
            previousValues.current.organization !== organization ||
            previousValues.current.item !== item ||
            previousValues.current.location !== location;

        if (!hasChanged) return;

        if (organization && item) {
            const generateName = async () => {
                try {
                    const result = await generateTenderName.mutateAsync({
                        organization,
                        item,
                        location,
                    });
                    if (result?.tenderName) {
                        manualForm.setValue("tenderName", result.tenderName, { shouldValidate: false });
                    }
                } catch (error) {
                    console.error("Error generating tender name:", error);
                }
            };
            generateName();
        }

        previousValues.current = { organization, item, location, team };
    }, [organization, item, location, team, generateTenderName, manualForm]);

    // Clear team member when team changes (unless locked to current user)
    useEffect(() => {
        if (isInitialLoad.current) return;

        if (previousValues.current.team !== team) {
            // If user field is not locked and a member other than the current user was chosen, reset on team change
            if (!lockUser && manualForm.getValues("teamMember") !== currentUserId) {
                manualForm.setValue("teamMember", null, { shouldValidate: false });
            }
            previousValues.current.team = team;
        }
    }, [team, manualForm, lockUser, currentUserId]);

    // Auto-select team for restricted roles in create mode
    useEffect(() => {
        if (mode !== "create") return;
        if (!lockTeam) return;
        if (!currentTeamId) return;

        manualForm.setValue("team", currentTeamId, { shouldValidate: true });
    }, [mode, lockTeam, currentTeamId, manualForm]);

    // Auto-select team member (current user) in create mode
    useEffect(() => {
        if (mode !== "create") return;
        if (!currentUserId) return;

        manualForm.setValue("teamMember", currentUserId, { shouldValidate: true });
    }, [mode, currentUserId, manualForm]);

    const handleManualSubmit: SubmitHandler<ManualFormValues> = async values => {
        try {
            setDocumentError(null);
            const uploadedPaths = values.documents || [];

            let mainTenderPath: string | null = null;
            const atcPaths: string[] = [];
            let boqPath: string | null = null;
            const otherDocumentsPaths: string[] = [];

            for (const p of uploadedPaths) {
                const category = fileClassifications[p]?.category || classifyDocumentFilename(p).category;
                if (category === "mainTender") {
                    if (!mainTenderPath) {
                        mainTenderPath = p;
                    } else {
                        otherDocumentsPaths.push(p);
                    }
                } else if (category === "atc") {
                    atcPaths.push(p);
                } else if (category === "boq") {
                    if (!boqPath) {
                        boqPath = p;
                    } else {
                        otherDocumentsPaths.push(p);
                    }
                } else {
                    otherDocumentsPaths.push(p);
                }
            }

            // Require at least one mainTender if documents are uploaded
            if (uploadedPaths.length > 0 && !mainTenderPath) {
                setDocumentError("Please designate one of the uploaded documents as the Main Tender Document (NIT).");
                return;
            }

            const structuredDocuments: StructuredTenderDocuments = {
                schemaVersion: 1,
                mainTender: mainTenderPath,
                atc: atcPaths,
                boq: boqPath,
                otherDocuments: otherDocumentsPaths,
            };

            const hasAnyDocs = Boolean(
                structuredDocuments.mainTender ||
                structuredDocuments.atc.length > 0 ||
                structuredDocuments.boq ||
                structuredDocuments.otherDocuments.length > 0
            );

            const payload = {
                team: values.team,
                tenderNo: values.tenderNo,
                tenderName: values.tenderName,
                organization: values.organization,
                gstValues: values.gstValues.toString(),
                tenderFees: values.tenderFees.toString(),
                emd: values.emd.toString(),
                teamMember: values.teamMember ?? null,
                dueDate: new Date(values.dueDate).toISOString(),
                location: values.location || undefined,
                website: values.website || undefined,
                item: values.item,
                status: values.status,
                remarks: values.remarks || undefined,
                documents: hasAnyDocs ? JSON.stringify(structuredDocuments) : null,
            };

            if (mode === "create") {
                await createTender.mutateAsync(payload);
            } else if (tender) {
                await updateTender.mutateAsync({ id: tender.id, data: payload });
            }

            navigate(paths.tendering.tenders);
        } catch (error) {
            console.error("Form submission error:", error);
        }
    };

    const saving = createTender.isPending || updateTender.isPending;

    const mainTenderCount = documents.filter(
        (p) => (fileClassifications[p]?.category || classifyDocumentFilename(p).category) === "mainTender"
    ).length;
    const atcCount = documents.filter(
        (p) => (fileClassifications[p]?.category || classifyDocumentFilename(p).category) === "atc"
    ).length;
    const boqCount = documents.filter(
        (p) => (fileClassifications[p]?.category || classifyDocumentFilename(p).category) === "boq"
    ).length;
    const otherCount = documents.filter(
        (p) => (fileClassifications[p]?.category || classifyDocumentFilename(p).category) === "otherDocuments"
    ).length;

    const renderFileCard = (filePath: string, onRemove: () => void) => {
        const meta = parseFileMeta(filePath);
        const classification = fileClassifications[filePath] || classifyDocumentFilename(filePath);
        const category = classification.category;
        const info = CATEGORY_INFO[category];
        const isPdf = filePath.toLowerCase().endsWith(".pdf");
        const isSpreadsheet = filePath.toLowerCase().endsWith(".xlsx") || filePath.toLowerCase().endsWith(".xls");

        return (
            <div
                key={filePath}
                className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card transition-all",
                    classification.needsConfirmation && "border-amber-500/40 bg-amber-500/5",
                    category === "mainTender" && "border-violet-500/30",
                    category === "atc" && "border-blue-500/30",
                    category === "boq" && "border-emerald-500/30",
                    category === "otherDocuments" && "border-border"
                )}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                        className={cn(
                            "p-2 rounded-md shrink-0",
                            isSpreadsheet
                                ? "bg-emerald-500/10 text-emerald-600"
                                : isPdf
                                  ? "bg-red-500/10 text-red-600"
                                  : "bg-muted text-muted-foreground"
                        )}
                    >
                        {isSpreadsheet ? (
                            <FileSpreadsheet className="h-4 w-4" />
                        ) : (
                            <FileText className="h-4 w-4" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <a
                                href={fileUploadService.getFileUrl(filePath)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium hover:underline truncate max-w-[240px] sm:max-w-md"
                                title={meta.displayName}
                            >
                                {meta.displayName}
                            </a>
                            <Badge
                                variant="outline"
                                className={cn("text-[11px] font-semibold shrink-0", info.badgeClass)}
                            >
                                {info.badgeText}
                            </Badge>
                            {classification.needsConfirmation && (
                                <Badge
                                    variant="outline"
                                    className="text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 shrink-0 flex items-center gap-1"
                                >
                                    <AlertTriangle className="h-3 w-3" />
                                    Needs confirmation
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {info.label} • {info.description}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <Select
                        value={category}
                        onValueChange={(val) => handleReclassify(filePath, val as DocumentCategory)}
                        disabled={saving}
                    >
                        <SelectTrigger className="h-8 w-[165px] text-xs">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mainTender">Main Tender (NIT)</SelectItem>
                            <SelectItem value="atc">Additional Terms (ATC)</SelectItem>
                            <SelectItem value="boq">Bill of Quantities (BOQ)</SelectItem>
                            <SelectItem value="otherDocuments">Other / Supporting</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={onRemove}
                        disabled={saving}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === "create" ? "Create Tender" : "Edit Tender"}</CardTitle>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.tendering.tenders)}>
                        <ArrowLeft /> Return Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className={mode == "edit" ? "hidden" : "m-auto mb-6"}>
                        <TabsTrigger value="manually">Manually Enter Details</TabsTrigger>
                        <TabsTrigger value="useAi" className="flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-violet-500" />
                            How AI Works
                        </TabsTrigger>
                    </TabsList>

                    {/* AI INFORMATIONAL TAB */}
                    <TabsContent value="useAi">
                        <div className="max-w-3xl mx-auto py-4 space-y-6">
                            <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-primary/5 to-transparent p-6 shadow-xs">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400">
                                        <Sparkles className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-semibold tracking-tight">VolksAI Intelligent Info Sheet Engine</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Tender registration stays focused and clean. Full document intelligence and Excel generation are integrated directly into the Tender Info Sheet.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-card border space-y-2">
                                        <div className="flex items-center gap-2 font-medium text-sm">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</div>
                                            <span>Step 1: Register Basic Details</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Fill out team, tender number, due date, and upload the official tender document (PDF) on the <strong>Manually Enter Details</strong> tab.
                                        </p>
                                    </div>

                                    <div className="p-4 rounded-lg bg-card border space-y-2">
                                        <div className="flex items-center gap-2 font-medium text-sm">
                                            <div className="h-6 w-6 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center text-xs font-bold">2</div>
                                            <span>Step 2: Auto-Extract & Export Excel</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            In the <strong>Tender Info Sheet</strong>, click <em>Auto-Extract with AI</em>. Over 50+ fields are populated with confidence indicators and ready for one-click Excel download.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> High Confidence Badges</span>
                                        <span className="flex items-center gap-1.5"><FileSpreadsheet className="h-4 w-4 text-emerald-600" /> OpenPyXL Excel Export</span>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => setActiveTab("manually")}
                                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white gap-2 cursor-pointer shadow-sm"
                                    >
                                        <FileUp className="h-4 w-4" />
                                        Continue to Manual Registration
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* MANUAL FORM TAB */}
                    <TabsContent value="manually">
                        <Form {...manualForm}>
                            <form onSubmit={manualForm.handleSubmit(handleManualSubmit)} className="space-y-8">
                                {mode === "create" && (watchTenderName || watchTenderNo) && (
                                    <TenderNameWarningAlert
                                        tenderName={watchTenderName}
                                        tenderNo={watchTenderNo}
                                        organization={manualForm.watch("organization")}
                                        item={manualForm.watch("item")}
                                        onSuffixDetected={(suggestion) => {
                                            manualForm.setValue("tenderName", suggestion, { shouldValidate: false });
                                        }}
                                    />
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
                                    {/* Team */}
                                    <SelectField<ManualFormValues, "team">
                                        control={manualForm.control}
                                        name="team"
                                        label="Team Name"
                                        options={teamOptions}
                                        placeholder="Select Team"
                                        disabled={lockTeam}
                                    />

                                    {/* Tender No */}
                                    <FieldWrapper<ManualFormValues, "tenderNo">
                                        control={manualForm.control}
                                        name="tenderNo"
                                        label="Tender No"
                                    >
                                        {field => <Input placeholder="Tender No" {...field} />}
                                    </FieldWrapper>

                                    {/* Tender Name */}
                                    <FieldWrapper<ManualFormValues, "tenderName">
                                        control={manualForm.control}
                                        name="tenderName"
                                        label="Tender Name"
                                    >
                                        {field => <Input placeholder="Tender Name" {...field} readOnly={true} />}
                                    </FieldWrapper>

                                    {/* Organization */}
                                    <SelectField<ManualFormValues, "organization">
                                        control={manualForm.control}
                                        name="organization"
                                        label="Organization"
                                        options={organizationOptions}
                                        placeholder="Select Organization"
                                    />

                                    {/* Location */}
                                    <SelectField<ManualFormValues, "location">
                                        control={manualForm.control}
                                        name="location"
                                        label="Location"
                                        options={locationOptions}
                                        placeholder="Select Location"
                                    />

                                    {/* Item */}
                                    <SelectField<ManualFormValues, "item">
                                        control={manualForm.control}
                                        name="item"
                                        label="Item"
                                        options={itemOptions}
                                        placeholder="Select Item"
                                    />

                                    {/* GST Values */}
                                    <FieldWrapper<ManualFormValues, "gstValues">
                                        control={manualForm.control}
                                        name="gstValues"
                                        label="Tender Value (GST Inclusive)"
                                    >
                                        {field => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="Amount"
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>

                                    {/* Tender Fees */}
                                    <FieldWrapper<ManualFormValues, "tenderFees">
                                        control={manualForm.control}
                                        name="tenderFees"
                                        label="Tender Fee"
                                    >
                                        {field => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="Amount"
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>

                                    {/* EMD */}
                                    <FieldWrapper<ManualFormValues, "emd">
                                        control={manualForm.control}
                                        name="emd"
                                        label="EMD"
                                    >
                                        {field => (
                                            <NumberInput
                                                step={0.01}
                                                placeholder="Amount"
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    </FieldWrapper>

                                    {/* Team Member */}
                                    <SelectField<ManualFormValues, "teamMember">
                                        control={manualForm.control}
                                        name="teamMember"
                                        label="Team Member"
                                        options={userOptions}
                                        placeholder="Select User"
                                        disabled={!team || lockUser}
                                    />

                                    {/* Due Date & Time */}
                                    <FieldWrapper<ManualFormValues, "dueDate">
                                        control={manualForm.control}
                                        name="dueDate"
                                        label="Due Date and Time"
                                    >
                                        {field => (
                                            <DateTimeInput
                                                value={field.value}
                                                onChange={field.onChange}
                                                className="bg-background"
                                            />
                                        )}
                                    </FieldWrapper>

                                    {/* Website */}
                                    <SelectField<ManualFormValues, "website">
                                        control={manualForm.control}
                                        name="website"
                                        label="Website"
                                        options={websiteOptions}
                                        placeholder="Select Website"
                                    />
                                    {/* Unified Single Upload Box with Automatic VolksAI Classification */}
                                    <div className="col-span-full space-y-4 rounded-xl border bg-muted/20 p-5 my-2 shadow-2xs">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                                            <div>
                                                <h4 className="text-sm font-semibold tracking-tight flex items-center gap-2">
                                                    <FileUp className="h-4 w-4 text-primary" />
                                                    Tender Documents
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Upload all tender documents together. VolksAI automatically detects and tags each file (NIT, ATC, BOQ, or Supporting).
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto bg-background/80 text-muted-foreground">
                                                Auto-Classified Ingestion
                                            </Badge>
                                        </div>

                                        {documentError && (
                                            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                                <span>{documentError}</span>
                                            </div>
                                        )}

                                        {documents.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-background/80 border text-xs">
                                                <span className="font-semibold text-foreground/80 mr-1">Detected Structure:</span>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-xs",
                                                        mainTenderCount === 1
                                                            ? "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30"
                                                            : "bg-destructive/10 text-destructive border-destructive/30"
                                                    )}
                                                >
                                                    Main Tender: {mainTenderCount === 1 ? "1 file (NIT)" : "0 (Required!)"}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
                                                    ATC: {atcCount} {atcCount === 1 ? "file" : "files"}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                                    BOQ: {boqCount} {boqCount === 1 ? "file" : "files"}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                                    Other: {otherCount} {otherCount === 1 ? "file" : "files"}
                                                </Badge>
                                            </div>
                                        )}

                                        <FileUploader
                                            context="tender-documents"
                                            value={documents}
                                            onChange={handleFilesChange}
                                            maxFiles={20}
                                            allowedExtensions={[".pdf", ".xlsx", ".xls", ".doc", ".docx", ".zip", ".jpg", ".png"]}
                                            hint="Upload tender documents (.pdf, .xlsx, .doc, images, etc.) • Single or multi-file upload"
                                            disabled={saving}
                                            renderItem={(filePath, onRemove) => renderFileCard(filePath, onRemove)}
                                        />

                                        <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground border border-dashed flex items-center gap-2">
                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                            <span>
                                                <strong>Strict Security Boundary:</strong> Files categorized as <em>Other / Supporting</em> are stored for team reference only and are strictly excluded from OCR, parsing, and LLM processing.
                                            </span>
                                        </div>
                                    </div>

                                    {/* Remarks */}
                                    <FieldWrapper<ManualFormValues, "remarks">
                                        control={manualForm.control}
                                        name="remarks"
                                        label="Remarks"
                                    >
                                        {field => (
                                            <textarea
                                                className="border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                                placeholder="Remarks"
                                                maxLength={200}
                                                {...field}
                                            />
                                        )}
                                    </FieldWrapper>
                                </div>
                                <div className="w-full flex items-center justify-center gap-2">
                                    <Button type="submit" disabled={saving}>
                                        {saving ? "Saving..." : mode === "create" ? "Create Tender" : "Update Tender"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => navigate(paths.tendering.tenders)}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => manualForm.reset()}
                                        disabled={saving}
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
