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
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Eye, RefreshCw, FileEdit, Plus, Search, Users, Mail, Phone, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { paths } from "@/app/routes/paths";

import { useFollowUpList, useUpdateFollowUpStatus } from "@/modules/shared/follow-up/follow-up.hooks";
import type { FollowUpRow, FollowUpQueryDto, UpdateFollowUpStatusDto } from "@/modules/shared/follow-up/follow-up.types";
import { toast } from "sonner";

/* ================================
   LABEL MAPS (NUMERIC ENUMS)
================================ */
const FREQUENCY_LABELS: Record<number, string> = {
    1: "Daily",
    2: "Alternate Days",
    3: "Weekly",
    4: "Bi-Weekly",
    5: "Monthly",
    6: "Stopped",
};

const STOP_REASON_LABELS: Record<number, string> = {
    1: "Party Angry / Not Interested",
    2: "Objective Achieved",
    3: "Not Reachable",
    4: "Other",
};

const FollowupPage: React.FC = () => {
    const navigate = useNavigate();

    /* ================================
       STATE
    ================================ */
    const [activeTab, setActiveTab] = useState<FollowUpQueryDto["tab"]>("ongoing");
    const [searchQuery, setSearchQuery] = useState("");

    const [date, setDate] = useState<Date>();
    const [comment, setComment] = useState("");

    const [frequency, setFrequency] = useState<number>(1); // Daily
    const [stopReason, setStopReason] = useState<number | null>(null);

    const [proofText, setProofText] = useState("");
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [stopRemarks, setStopRemarks] = useState("");

    /* ================================
       DATA
    ================================ */
    const { data, isLoading } = useFollowUpList({
        tab: activeTab,
        page: 1,
        limit: 10,
        search: searchQuery || undefined,
    });

    const followups = data?.data ?? [];

    const updateStatusMutation = useUpdateFollowUpStatus();

    /* ================================
       ACTIONS
    ================================ */
    const followUpActions: ActionItem<FollowUpRow>[] = [
        {
            label: "Auto Followup",
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: row => navigate(paths.shared.followUpEdit(row.id)),
        },
        {
            label: "Update Status",
            icon: <FileEdit className="h-4 w-4" />,
            className: "text-blue-600",
            onClick: row => handleOpenUpdateModal(row.id),
        },
        {
            label: "View",
            icon: <Eye className="h-4 w-4" />,
            onClick: row => navigate(paths.shared.followUpShow(row.id)),
        },
    ];

    /* ================================
       COLUMNS
    ================================ */
    const columns: ColDef<FollowUpRow>[] = useMemo(
        () => [
            { field: "area", headerName: "Area", width: 120 },
            { field: "party_name", headerName: "Organisation", width: 180 },
            {
                field: "followPerson",
                headerName: "Concerned Person",
                width: 170,
                cellRenderer: (params: any) => (
                    <Button variant="ghost" size="sm" className="gap-2 h-8" onClick={() => handleOpenPersonModal(params.data?.followPerson ?? [])}>
                        <Users className="h-4 w-4" />
                        {params.data?.followPerson?.length ?? 0} Person(s)
                    </Button>
                ),
            },
            {
                field: "amount",
                headerName: "Amount",
                width: 130,
                cellRenderer: (params: any) => <span className="font-medium">₹{params.value?.toLocaleString("en-IN")}</span>,
            },
            {
                field: "frequencyLabel",
                headerName: "Frequency",
                width: 130,
                cellRenderer: (params: any) => <Badge variant="secondary">{params.value}</Badge>,
            },
            {
                field: "status",
                headerName: "Status",
                width: 120,
                cellRenderer: (params: any) => <Badge variant="outline">{params.value}</Badge>,
            },
            {
                field: "latest_comment",
                headerName: "Last Comment",
                width: 220,
                cellRenderer: (params: any) => <span className="text-muted-foreground truncate block">{params.value || "—"}</span>,
            },
            { field: "updated_at", headerName: "Last Update", width: 140 },
            { field: "start_from", headerName: "Start Date", width: 120 },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer(followUpActions),
                width: 80,
                pinned: "right",
            },
        ],
        []
    );

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

    const resetForm = () => {
        setComment("");
        setFrequency(1);
        setDate(undefined);
        setStopReason(null);
        setProofText("");
        setProofImage(null);
        setStopRemarks("");
    };

    const handleUpdateStatus = () => {
        if (!selectedId) return;

        const payload: UpdateFollowUpStatusDto = {
            latestComment: comment,
            nextFollowUpDate: date ? date.toISOString().split("T")[0] : null,
            frequency,
            stopReason: frequency === 6 ? stopReason : null,
            proofText: stopReason === 2 ? proofText : null,
            stopRemarks: stopReason === 4 ? stopRemarks : null,
            proofImagePath: null,
        };

        updateStatusMutation.mutate(
            { id: selectedId, data: payload },
            {
                onSuccess: () => {
                    toast.success("Follow-up status updated successfully");
                    setUpdateModalOpen(false);
                    resetForm();
                },
                onError: () => {
                    toast.error("Error updating follow-up status");
                },
            }
        );
    };

    const handleOpenPersonModal = (persons: FollowUpRow["followPerson"]) => {
        setPersonList(persons ?? []);
        setPersonModalOpen(true);
    };

    /* ================================
       RENDER
    ================================ */
    return (
        <Card className="flex flex-col h-full min-h-0">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className="text-xl">Follow-ups Dashboard</CardTitle>
                    <CardDescription>Track and manage all follow-up activities</CardDescription>
                </div>
                <Button onClick={() => navigate(paths.shared.followUpCreate)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Assign Follow-up
                </Button>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 flex flex-col gap-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <Tabs value={activeTab} onValueChange={val => setActiveTab(val as FollowUpQueryDto["tab"])}>
                        <TabsList>
                            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                            <TabsTrigger value="achieved">Achieved</TabsTrigger>
                            <TabsTrigger value="angry">Angry / External</TabsTrigger>
                            <TabsTrigger value="future">Future</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search follow-ups..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 w-64" />
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 min-h-0">
                    <DataTable
                        className="h-full"
                        data={followups}
                        loading={isLoading}
                        columnDefs={columns}
                        gridOptions={{
                            defaultColDef: { editable: false, filter: true },
                            pagination: true,
                            paginationPageSize: 15,
                            rowHeight: 52,
                        }}
                    />
                </div>
            </CardContent>

            {/* ================================
               UPDATE STATUS MODAL
            ================================ */}
            <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Status</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Frequency */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Frequency</label>
                            <Select value={String(frequency)} onValueChange={val => setFrequency(Number(val))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
                                        <SelectItem key={v} value={v}>
                                            {l}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Next Date */}
                        {frequency !== 6 && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Next Follow-up Date</label>
                                <DatePicker date={date} setDate={setDate} />
                            </div>
                        )}

                        {/* Comment */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Comment</label>
                            <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} />
                        </div>

                        {/* Stop Section */}
                        {frequency === 6 && (
                            <>
                                <Separator />

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reason for Stopping</label>
                                    <Select value={stopReason != null ? String(stopReason) : undefined} onValueChange={val => setStopReason(Number(val))}>
                                        <SelectTrigger>
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

                                {stopReason === 2 && <Textarea placeholder="Provide proof details..." value={proofText} onChange={e => setProofText(e.target.value)} />}

                                {stopReason === 4 && <Textarea placeholder="Enter remarks..." value={stopRemarks} onChange={e => setStopRemarks(e.target.value)} />}
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUpdateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>
                            Update
                        </Button>
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
                    </DialogHeader>

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {personList?.length ? (
                            personList.map((p, i) => (
                                <div key={i} className="p-3 rounded border bg-muted/30">
                                    <p className="font-medium">{p.name}</p>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5" /> {p.email}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-3.5 w-3.5" /> {p.phone}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted-foreground py-6">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                No contacts found
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default FollowupPage;
