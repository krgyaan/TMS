import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FieldWrapper } from "@/components/form/FieldWrapper";
import { NumberInput } from "@/components/form/NumberInput";
import { SelectField } from "@/components/form/SelectField";
import { DateTimeInput } from "@/components/form/DateTimeInput";
import { DateInput } from "@/components/form/DateInput";
import { FileUploader } from "@/components/file-upload";
import { useCreateTender, useUpdateTender, useGenerateTenderName } from "@/hooks/api/useTenders";
import type { TenderInfoWithNames } from "../helpers/tenderInfo.types";
import { paths } from "@/app/routes/paths";
import { ArrowLeft, Sparkles, CheckCircle2, ArrowRight, FileSpreadsheet, FileUp } from "lucide-react";
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

const AiFormSchema = z.object({
    team: z.coerce.number().int().positive({ message: "Team is required" }),
    tenderNo: z.string().min(1, { message: "Tender No is required" }),
    startDate: z.string().min(1, { message: "Start date is required" }),
    closingDate: z.string().min(1, { message: "Closing date is required" }),
    files: z.array(z.string()).default([]),
});

type ManualFormValues = z.infer<typeof ManualFormSchema>;
type AiFormValues = z.infer<typeof AiFormSchema>;

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

    const aiForm = useForm<AiFormValues>({
        resolver: zodResolver(AiFormSchema) as any,
        defaultValues: {
            team: undefined as any,
            tenderNo: "",
            startDate: "",
            closingDate: "",
            files: [],
        },
    });

    // Watch fields for auto-generation
    const organization = useWatch({ control: manualForm.control, name: "organization" });
    const item = useWatch({ control: manualForm.control, name: "item" });
    const location = useWatch({ control: manualForm.control, name: "location" });
    const team = useWatch({ control: manualForm.control, name: "team" });
    const watchTenderName = useWatch({ control: manualForm.control, name: "tenderName" });
    const watchTenderNo = useWatch({ control: manualForm.control, name: "tenderNo" });
    console.log({watchTenderName});

    // Watch documents for display
    const documents = useWatch({ control: manualForm.control, name: "documents" });
    const aiFiles = useWatch({ control: aiForm.control, name: "files" });

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
            let parsedDocuments: string[] = [];
            if (tender.documents) {
                try {
                    parsedDocuments = JSON.parse(tender.documents);
                } catch {
                    parsedDocuments = [];
                }
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
                documents: parsedDocuments,
                remarks: tender.remarks || "",
            };
            manualForm.reset(resetValues);
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
                documents: values.documents.length > 0 ? JSON.stringify(values.documents) : null,
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

    const handleAiSubmit: SubmitHandler<AiFormValues> = async _values => {
        alert("AI-based tender creation is not yet available. Please use the manual form instead.");
    };

    const saving = createTender.isPending || updateTender.isPending;

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
                                    <div className="space-y-2">
                                        <FileUploader
                                            context="tender-documents"
                                            value={documents}
                                            onChange={(paths) => manualForm.setValue("documents", paths)}
                                            label="Upload Documents"
                                            disabled={saving}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Upload relevant tender documents (optional)
                                        </p>
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
