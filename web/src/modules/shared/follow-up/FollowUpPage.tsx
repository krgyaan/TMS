import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ActionItem } from "@/components/ui/ActionMenu";
import { Eye, RefreshCw, FileEdit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { paths } from "@/app/routes/paths";

import { useFollowUpList, useUpdateFollowUpStatus } from "@/modules/shared/follow-up/follow-up.hooks";

import type { FollowUpRow, FollowUpQueryDto, Frequency, UpdateFollowUpStatusDto } from "@/modules/shared/follow-up/follow-up.types";
import { toast } from "sonner";

const FollowupPage: React.FC = () => {
    const navigate = useNavigate();

    // ✅ FIXED: Properly typed tab state
    const [activeTab, setActiveTab] = useState<FollowUpQueryDto["tab"]>("ongoing");

    const [date, setDate] = useState<Date>();
    const [comment, setComment] = useState("");

    // ✅ FIXED: Properly typed frequency
    const [frequency, setFrequency] = useState<Frequency>("daily");
    const [stopReason, setStopReason] = useState<UpdateFollowUpStatusDto["stopReason"]>(null);
    const [proofText, setProofText] = useState("");
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [stopRemarks, setStopRemarks] = useState("");

    // ✅ FIXED: Typed query params
    const { data, isLoading } = useFollowUpList({
        tab: activeTab,
        page: 1,
        limit: 10,
    });

    const followups = data?.data ?? [];
    const meta = data?.meta;

    const updateStatusMutation = useUpdateFollowUpStatus();

    // ✅ FIXED: Properly typed Action Items
    const followUpActions: ActionItem<FollowUpRow>[] = [
        {
            label: "Auto Followup",
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: row => {
                navigate(paths.shared.followUpEdit(row.id));
            },
        },
        {
            label: "Update Status",
            icon: <FileEdit className="h-4 w-4" />,
            className: "text-blue-600",
            onClick: row => {
                handleOpenUpdateModal(row.id);
            },
        },
        {
            label: "View",
            icon: <Eye className="h-4 w-4" />,
            onClick: row => {
                navigate(paths.shared.followUpShow(row.id));
            },
        },
    ];

    // -------------------------
    // Column Definition
    // -------------------------
    const columns: ColDef<FollowUpRow>[] = useMemo(
        () => [
            { field: "area", headerName: "Area", width: 120 },
            { field: "party_name", headerName: "Organisation", width: 180 },
            {
                field: "followPerson",
                headerName: "Concerned Person",
                width: 200,
                cellRenderer: params => (
                    <Button variant="outline" size="xs" onClick={() => handleOpenPersonModal(params.data?.followPerson ?? [])}>
                        See Person
                    </Button>
                ),
            },
            { field: "amount", headerName: "Amount", width: 120 },
            { field: "frequency", headerName: "Frequency", width: 150 },
            { field: "status", headerName: "Status", width: 150 },
            { field: "latest_comment", headerName: "Last Comment", width: 220 },
            { field: "updated_at", headerName: "Last Update", width: 140 },
            { field: "start_from", headerName: "Start Date", width: 120 },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                cellRenderer: createActionColumnRenderer(followUpActions),
                width: 25,
            },
        ],
        [followUpActions]
    );

    // -------------------------
    // Update Status Modal State
    // -------------------------
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const handleOpenUpdateModal = (id: number) => {
        setSelectedId(id);
        setUpdateModalOpen(true);
    };

    const handleUpdateStatus = () => {
        if (!selectedId) return;

        const payload: UpdateFollowUpStatusDto = {
            latestComment: comment,
            nextFollowUpDate: date ? date.toISOString().split("T")[0] : null,
            frequency,
            stopReason: frequency === "stopped" ? stopReason : null,
            proofText: stopReason === "objective_achieved" ? proofText : null,
            stopRemarks: stopReason === "other" ? stopRemarks : null,
            proofImagePath: null, // set after upload if needed
        };

        updateStatusMutation.mutate(
            {
                id: selectedId,
                data: payload,
            },
            {
                onSuccess: () => {
                    setUpdateModalOpen(false);
                    setComment("");
                    setFrequency("daily");
                    setDate(undefined);

                    toast.success("Follow Up status updated successfully");
                },
                onError: () => {
                    toast.error("Error encountered while updating follow up status");
                },
            }
        );
    };

    // -------------------------
    // Person Modal State
    // -------------------------
    const [personModalOpen, setPersonModalOpen] = useState(false);
    const [personList, setPersonList] = useState<FollowUpRow["followPerson"]>([]);

    const handleOpenPersonModal = (persons: FollowUpRow["followPerson"]) => {
        setPersonList(persons ?? []);
        setPersonModalOpen(true);
    };

    // -------------------------
    // RETURN JSX
    // -------------------------
    return (
        <Card>
            <CardHeader className="flex items-center justify-between">
                <div>
                    <CardTitle>Follow Ups Dashboard</CardTitle>
                    <CardDescription>All follow ups listed</CardDescription>
                </div>
                <Button onClick={() => navigate(paths.shared.followUpCreate)}>Assign Followup</Button>
            </CardHeader>

            <CardContent>
                {/* ✅ FIXED: Proper typing of tab value */}
                <Tabs defaultValue="ongoing" onValueChange={val => setActiveTab(val as FollowUpQueryDto["tab"])}>
                    <TabsList className="mx-auto flex justify-center mb-4">
                        <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
                        <TabsTrigger value="achieved">Achieved</TabsTrigger>
                        <TabsTrigger value="angry">Angry / External</TabsTrigger>
                        <TabsTrigger value="future">Future Followup</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab}>
                        <DataTable
                            data={followups}
                            loading={isLoading}
                            columnDefs={columns}
                            gridOptions={{
                                defaultColDef: { editable: false, filter: true },
                                pagination: true,
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>

            {/* ---------- UPDATE MODAL ---------- */}
            <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Status</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-2 w-full">
                        <label className="text-sm font-medium">Frequency</label>
                        <Select value={frequency} onValueChange={val => setFrequency(val as Frequency)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="alternate">Alternate Days</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="stopped">Stop</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ✅ STOP REASON */}
                    {frequency === "stopped" && (
                        <div className="grid gap-2 w-full">
                            <label className="text-sm font-medium">Why Stop</label>
                            <Select value={stopReason ?? ""} onValueChange={val => setStopReason(val as any)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="party_angry">The person is getting angry/or has requested to stop</SelectItem>
                                    <SelectItem value="objective_achieved">Followup Objective achieved</SelectItem>
                                    <SelectItem value="not_reachable">External Followup Initiated</SelectItem>
                                    <SelectItem value="other">Remarks</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* ✅ PROOF TEXT + IMAGE */}
                    {stopReason === "objective_achieved" && (
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Please give proof</label>

                            <Textarea value={proofText} onChange={e => setProofText(e.target.value)} />

                            <input
                                type="file"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) setProofImage(file);
                                }}
                            />
                        </div>
                    )}

                    {/* ✅ STOP REMARKS */}
                    {stopReason === "other" && (
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Write Remarks</label>
                            <Textarea value={stopRemarks} onChange={e => setStopRemarks(e.target.value)} />
                        </div>
                    )}

                    <Button className="mt-2" onClick={handleUpdateStatus}>
                        Update
                    </Button>
                </DialogContent>
            </Dialog>

            {/* ---------- PERSON MODAL ---------- */}
            <Dialog open={personModalOpen} onOpenChange={setPersonModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Followup Person</DialogTitle>
                    </DialogHeader>

                    <div>
                        {personList?.map((p, i) => (
                            <div key={i} className="mb-2 border-b pb-2">
                                <p>
                                    <strong>Name:</strong> {p.name}
                                </p>
                                <p>
                                    <strong>Email:</strong> {p.email}
                                </p>
                                <p>
                                    <strong>Phone:</strong> {p.phone}
                                </p>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default FollowupPage;
