import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ActionItem } from "@/components/ui/ActionMenu";
import {
    Eye,
    RefreshCw,
    FileEdit,
    Plus,
    Search,
    Users,
    Mail,
    Phone,
    Loader2,
    AlertCircle,
    Calendar,
    MessageSquare,
    TrendingUp,
    Clock,
    User,
    File,
    CheckCircle,
    FileCheck,
    Upload,
    ImagePlus,
    X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { paths } from "@/app/routes/paths";
import { cn } from "@/lib/utils";

import { useFollowUpList, useUpdateFollowUpStatus } from "@/modules/shared/follow-up/follow-up.hooks";
import type { FollowUpRow, FollowUpQueryDto, UpdateFollowUpStatusDto } from "@/modules/shared/follow-up/follow-up.types";
import { toast } from "sonner";

/* ================================
   LABEL MAPS
================================ */
const FREQUENCY_LABELS: Record<number, string> = {
    1: "Daily",
    2: "Alternate Days",
    3: "Twice a day",
    4: "Weekly",
    5: "Biweekly",
    6: "Stop",
};

const STOP_REASON_LABELS: Record<number, string> = {
    1: "Party Angry / Not Interested",
    2: "Objective Achieved",
    3: "Not Reachable",
    4: "Other",
};

const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatCurrency = (amount: number | null): string => {
    if (amount == null) return "—";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
};

/* ================================
   ICON ACTION COMPONENT
================================ */
const IconAction: React.FC<{
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
}> = ({ icon: Icon, label, onClick, disabled }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        onClick();
                    }}
                    disabled={disabled}
                    className={cn(
                        "inline-flex items-center justify-center h-7 w-7 rounded transition-colors",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                        "text-muted-foreground hover:bg-muted hover:text-foreground",
                        disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <Icon className="h-4 w-4" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs font-medium">
                {label}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

/* ================================
   FREQUENCY BADGE COMPONENT
================================ */
const FrequencyBadge: React.FC<{ frequency: string }> = ({ frequency }) => {
    const variant = frequency === "Stopped" ? "destructive" : "secondary";
    return (
        <Badge variant={variant} className="font-normal">
            {frequency}
        </Badge>
    );
};

/* ================================
   MAIN COMPONENT
================================ */
const FollowupPage: React.FC = () => {
    const navigate = useNavigate();

    /* ================================
       STATE
    ================================ */
    const [activeTab, setActiveTab] = useState<FollowUpQueryDto["tab"]>("ongoing");
    const [searchQuery, setSearchQuery] = useState("");

    const [date, setDate] = useState<Date>();
    const [comment, setComment] = useState("");

    const [frequency, setFrequency] = useState<number>(1);
    const [stopReason, setStopReason] = useState<number | null>(null);

    const [proofText, setProofText] = useState("");
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [stopRemarks, setStopRemarks] = useState("");

    /* ================================
       DATA
    ================================ */
    const { data, isLoading, error } = useFollowUpList({
        tab: activeTab,
        page: 1,
        limit: 10,
        search: searchQuery || undefined,
    });

    const followups = data?.data ?? [];

    const updateStatusMutation = useUpdateFollowUpStatus();

    /* ================================
       MODALS
    ================================ */
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const [personModalOpen, setPersonModalOpen] = useState(false);
    const [personList, setPersonList] = useState<FollowUpRow["followPerson"]>([]);

    const handleOpenUpdateModal = (id: number) => {
        setSelectedId(id);
        setUpdateModalOpen(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedId) return;

        // ========================
        // VALIDATION
        // ========================
        if (frequency === 6 && !stopReason) {
            toast.error("Please select a reason for stopping");
            return;
        }

        if (frequency === 6 && stopReason === 4 && !stopRemarks.trim()) {
            toast.error("Please provide remarks for stopping");
            return;
        }

        if (frequency !== 6 && !date) {
            toast.error("Please select the next follow-up date");
            return;
        }

        // ========================
        // BUILD PAYLOAD
        // ========================
        const formData = new FormData();

        formData.append("latestComment", comment || "");
        formData.append("frequency", String(frequency));

        if (frequency !== 6 && date) {
            formData.append("nextFollowUpDate", date.toISOString().split("T")[0]);
        }

        if (frequency === 6) {
            formData.append("stopReason", String(stopReason));

            if (stopReason === 2 && proofText) {
                formData.append("proofText", proofText);
            }

            if ([1, 3, 4].includes(stopReason ?? 0)) {
                formData.append("stopRemarks", stopRemarks);
            }
        }

        if (proofImage && stopReason === 2) {
            formData.append("proofImage", proofImage);
        }

        try {
            // ========================
            // API CALL
            // ========================
            await updateStatusMutation.mutateAsync({
                id: selectedId,
                data: formData,
            });

            // ========================
            // SUCCESS MESSAGE
            // ========================
            let message = "Follow-up status updated successfully";

            if (frequency === 6) {
                const messages: Record<number, string> = {
                    1: "Follow-up stopped - Party not interested",
                    2: "Follow-up marked as achieved!",
                    3: "Follow-up stopped - Not reachable",
                    4: "Follow-up stopped successfully",
                };

                message = messages[stopReason!] ?? message;
            }

            toast.success(message);
            setUpdateModalOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error?.message || "Failed to update follow-up status");
        }
    };

    const resetForm = () => {
        setComment("");
        setFrequency(1);
        setDate(undefined);
        setStopReason(null);
        setProofText("");
        setProofImage(null);
        setStopRemarks("");
    };
    const handleOpenPersonModal = (persons: FollowUpRow["followPerson"]) => {
        setPersonList(persons ?? []);
        setPersonModalOpen(true);
    };

    /* ================================
       COLUMNS
    ================================ */
    const columns: ColDef<FollowUpRow>[] = useMemo(
        () => [
            {
                field: "area",
                headerName: "Area",
                width: 110,
            },
            {
                field: "party_name",
                headerName: "Organisation",
                flex: 1,
                minWidth: 160,
                cellClass: "font-medium",
            },
            {
                field: "followPerson",
                headerName: "Contacts",
                width: 100,
                sortable: false,
                cellRenderer: (params: any) => {
                    const count = params.data?.followPerson?.length ?? 0;
                    if (count === 0) {
                        return <span className="text-muted-foreground">—</span>;
                    }
                    return (
                        <TooltipProvider delayDuration={100}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                                        onClick={() => handleOpenPersonModal(params.data?.followPerson ?? [])}
                                    >
                                        <Users className="h-3.5 w-3.5" />
                                        {count}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs font-medium">
                                    View contacts
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                },
            },
            {
                field: "amount",
                headerName: "Amount",
                width: 120,
                cellClass: "font-medium tabular-nums",
                valueFormatter: params => formatCurrency(params.value),
            },
            {
                field: "frequencyLabel",
                headerName: "Frequency",
                width: 120,
                cellRenderer: (params: any) => <FrequencyBadge frequency={params.value} />,
            },
            {
                field: "status",
                headerName: "Status",
                width: 110,
                cellRenderer: (params: any) => (
                    <Badge variant="outline" className="font-normal">
                        {params.value}
                    </Badge>
                ),
            },
            {
                field: "latest_comment",
                headerName: "Last Comment",
                flex: 1,
                minWidth: 150,
                cellRenderer: (params: any) => <span className="text-muted-foreground text-sm truncate block">{params.value || "—"}</span>,
            },
            {
                field: "creator",
                headerName: "Assigned By",
                width: 120,
                cellRenderer: (params: any) => <span className="text-sm truncate block">{params?.value?.name || "—"}</span>,
            },
            {
                field: "assignee",
                headerName: "Assigned To",
                width: 120,
                cellRenderer: (params: any) => <span className="text-sm truncate block">{params?.value?.name || "—"}</span>,
            },
            {
                field: "updated_at",
                headerName: "Last Update",
                width: 110,
                valueGetter: params => formatDate(params?.data?.updated_at ?? null),
            },
            {
                field: "start_from",
                headerName: "Start Date",
                width: 110,
                valueGetter: params => formatDate(params?.data?.start_from ?? null),
            },
            {
                headerName: "",
                width: 120,
                sortable: false,
                filter: false,
                pinned: "right",
                cellRenderer: (params: any) => {
                    const row = params.data as FollowUpRow;
                    return (
                        <div className="flex items-center justify-end gap-1">
                            <IconAction icon={RefreshCw} label="Auto Followup" onClick={() => navigate(paths.shared.followUpEdit(row.id))} />
                            <IconAction icon={FileEdit} label="Update Status" onClick={() => handleOpenUpdateModal(row.id)} />
                            <IconAction icon={Eye} label="View Details" onClick={() => navigate(paths.shared.followUpShow(row.id))} />
                        </div>
                    );
                },
            },
        ],
        [navigate]
    );

    /* ================================
       TAB COUNTS (optional enhancement)
    ================================ */
    const tabItems = [
        { value: "ongoing", label: "Ongoing", icon: Clock },
        { value: "achieved", label: "Achieved", icon: TrendingUp },
        { value: "angry", label: "Angry / External", icon: AlertCircle },
        { value: "future", label: "Future", icon: Calendar },
    ];

    /* ================================
       RENDER - LOADING
    ================================ */
    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-64">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading follow-ups…</span>
                </CardContent>
            </Card>
        );
    }

    /* ================================
       RENDER - ERROR
    ================================ */
    if (error) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 gap-2">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="text-sm font-medium">Failed to load follow-ups</p>
                    <p className="text-xs text-muted-foreground">Please try again later</p>
                </CardContent>
            </Card>
        );
    }

    /* ================================
       RENDER - MAIN
    ================================ */
    return (
        <Card className="flex flex-col h-full min-h-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="space-y-1">
                    <CardTitle>Follow-ups</CardTitle>
                    <CardDescription>
                        {followups.length} {followups.length === 1 ? "record" : "records"}
                    </CardDescription>
                </div>

                <Button size="sm" onClick={() => navigate(paths.shared.followUpCreate)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Follow-up
                </Button>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 flex flex-col gap-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <Tabs value={activeTab} onValueChange={val => setActiveTab(val as FollowUpQueryDto["tab"])}>
                        <TabsList>
                            {tabItems.map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                                    <tab.icon className="h-3.5 w-3.5" />
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input placeholder="Search follow-ups…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-64" />
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 min-h-0">
                    <DataTable
                        className="h-full"
                        data={followups}
                        columnDefs={columns}
                        gridOptions={{
                            defaultColDef: { editable: false, filter: true },
                            pagination: true,
                            paginationPageSize: 20,
                            rowHeight: 48,
                            headerHeight: 44,
                            suppressCellFocus: true,
                        }}
                    />
                </div>

                {/* Empty State */}
                {followups.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium">No follow-ups found</p>
                        <p className="text-xs text-muted-foreground mt-1">{searchQuery ? "Try adjusting your search query" : "Create a new follow-up to get started"}</p>
                    </div>
                )}
            </CardContent>

            {/* ================================
               UPDATE STATUS MODAL
            ================================ */}
            <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
                <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="px-6 py-4 border-b bg-muted/30">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <FileEdit className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle>Update Status</DialogTitle>
                                <DialogDescription className="mt-0.5">Update the follow-up frequency and add a comment.</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Body */}
                    <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
                        {/* Frequency & Date Row */}
                        <div className={cn("grid gap-4", frequency !== 6 ? "grid-cols-2" : "grid-cols-1")}>
                            {/* Frequency */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-1.5">
                                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                                    Frequency
                                </label>
                                <Select value={String(frequency)} onValueChange={val => setFrequency(Number(val))}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
                                            <SelectItem key={v} value={v}>
                                                <div className="flex items-center gap-2">
                                                    {v === "6" && <span className="h-2 w-2 rounded-full bg-destructive" />}
                                                    {l}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Next Date - Using standard input */}
                            {frequency !== 6 && (
                                <div className="space-y-2">
                                    <label htmlFor="next-date" className="text-sm font-medium flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                        Next Follow-up
                                    </label>
                                    <Input
                                        id="next-date"
                                        type="date"
                                        value={date ? date.toISOString().split("T")[0] : ""}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setDate(val ? new Date(val) : undefined);
                                        }}
                                        min={new Date().toISOString().split("T")[0]}
                                        className="h-10"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Comment */}
                        <div className="space-y-2">
                            <label htmlFor="comment" className="text-sm font-medium flex items-center gap-1.5">
                                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                Comment
                            </label>
                            <Textarea
                                id="comment"
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Add a comment about this follow-up…"
                                rows={3}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">This will be visible in the follow-up history.</p>
                        </div>

                        {/* Stop Section */}
                        {frequency === 6 && (
                            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-destructive">Stopping Follow-up</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Please provide a reason for stopping this follow-up.</p>
                                    </div>
                                </div>

                                {/* Stop Reason */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reason</label>
                                    <Select value={stopReason != null ? String(stopReason) : undefined} onValueChange={val => setStopReason(Number(val))}>
                                        <SelectTrigger className="h-10 bg-background">
                                            <SelectValue placeholder="Select a reason" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(STOP_REASON_LABELS).map(([v, l]) => (
                                                <SelectItem key={v} value={v}>
                                                    {l}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Objective Achieved - Proof Section */}
                                {stopReason === 2 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {/* Success Banner */}
                                        <div className="flex items-start gap-3 p-3 rounded-md bg-green-50 border border-green-200">
                                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium text-green-800">Objective Achieved</p>
                                                <p className="text-xs text-green-600 mt-0.5">Please provide proof and details for verification.</p>
                                            </div>
                                        </div>

                                        {/* Proof Details */}
                                        <div className="space-y-2">
                                            <label htmlFor="proof-text" className="text-sm font-medium flex items-center gap-1.5">
                                                <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                                Proof Details
                                            </label>
                                            <Textarea
                                                id="proof-text"
                                                placeholder="Describe how the objective was achieved…"
                                                value={proofText}
                                                onChange={e => setProofText(e.target.value)}
                                                rows={3}
                                                className="resize-none bg-background"
                                            />
                                        </div>

                                        {/* Proof Image Upload */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-1.5">
                                                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                                                Upload Proof
                                                <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                                            </label>

                                            {!proofImage ? (
                                                <label
                                                    htmlFor="proof-upload"
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed",
                                                        "bg-background cursor-pointer transition-colors",
                                                        "hover:border-primary/50 hover:bg-primary/5"
                                                    )}
                                                >
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-sm font-medium">Click to upload</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, PDF up to 10MB</p>
                                                    </div>
                                                    <Input
                                                        id="proof-upload"
                                                        type="file"
                                                        accept="image/*,.pdf"
                                                        onChange={e => setProofImage(e.target.files?.[0] || null)}
                                                        className="hidden"
                                                    />
                                                </label>
                                            ) : (
                                                <div className="flex items-center gap-3 p-3 rounded-lg border bg-background">
                                                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        {proofImage.type.startsWith("image/") ? (
                                                            <ImagePlus className="h-5 w-5 text-primary" />
                                                        ) : (
                                                            <FileCheck className="h-5 w-5 text-primary" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{proofImage.name}</p>
                                                        <p className="text-xs text-muted-foreground">{(proofImage.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    </div>
                                                    <TooltipProvider delayDuration={100}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                                    onClick={() => setProofImage(null)}
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="text-xs">
                                                                Remove file
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Party Angry / Not Interested */}
                                {stopReason === 1 && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label htmlFor="angry-remarks" className="text-sm font-medium flex items-center gap-1.5">
                                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                            Additional Notes
                                        </label>
                                        <Textarea
                                            id="angry-remarks"
                                            placeholder="Any additional context about the situation…"
                                            value={stopRemarks}
                                            onChange={e => setStopRemarks(e.target.value)}
                                            rows={3}
                                            className="resize-none bg-background"
                                        />
                                    </div>
                                )}

                                {/* Not Reachable */}
                                {stopReason === 3 && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label htmlFor="unreachable-remarks" className="text-sm font-medium flex items-center gap-1.5">
                                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                            Attempts Made
                                        </label>
                                        <Textarea
                                            id="unreachable-remarks"
                                            placeholder="Describe contact attempts made…"
                                            value={stopRemarks}
                                            onChange={e => setStopRemarks(e.target.value)}
                                            rows={3}
                                            className="resize-none bg-background"
                                        />
                                    </div>
                                )}

                                {/* Other Reason */}
                                {stopReason === 4 && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <label htmlFor="other-remarks" className="text-sm font-medium flex items-center gap-1.5">
                                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                            Remarks
                                            <span className="text-xs text-destructive">*</span>
                                        </label>
                                        <Textarea
                                            id="other-remarks"
                                            placeholder="Please specify the reason…"
                                            value={stopRemarks}
                                            onChange={e => setStopRemarks(e.target.value)}
                                            rows={3}
                                            className="resize-none bg-background"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                        <div className="flex items-center justify-between w-full gap-4">
                            <p className="text-xs text-muted-foreground flex-1">
                                {frequency === 6
                                    ? stopReason === 2
                                        ? "This will mark the follow-up as successfully achieved."
                                        : "This action will stop all future follow-ups."
                                    : date
                                      ? `Next follow-up: ${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                                      : "Select a date for the next follow-up."}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setUpdateModalOpen(false);
                                        resetForm();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUpdateStatus}
                                    disabled={updateStatusMutation.isPending || (frequency === 6 && !stopReason) || (frequency === 6 && stopReason === 4 && !stopRemarks.trim())}
                                    variant={frequency === 6 && stopReason !== 2 ? "destructive" : "default"}
                                >
                                    {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    {frequency === 6 ? (stopReason === 2 ? "Mark Achieved" : "Stop Follow-up") : "Update Status"}
                                </Button>
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ================================
               PERSON MODAL
            ================================ */}
            <Dialog open={personModalOpen} onOpenChange={setPersonModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Contact Persons</DialogTitle>
                        <DialogDescription>
                            {personList.length} {personList.length === 1 ? "contact" : "contacts"} for this follow-up
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {personList?.length ? (
                            personList.map((p, i) => (
                                <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="font-medium text-sm">{p.name}</span>
                                    </div>
                                    <div className="space-y-1 pl-10">
                                        {p.email && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail className="h-3.5 w-3.5" />
                                                <span>{p.email}</span>
                                            </div>
                                        )}
                                        {p.phone && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-3.5 w-3.5" />
                                                <span>{p.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground">No contacts found</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default FollowupPage;
