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
import { Eye, RefreshCw, FileEdit, Plus, Search, Users, Mail, Phone, Upload, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import { paths } from "@/app/routes/paths";

import { useFollowUpList, useUpdateFollowUpStatus } from "@/modules/shared/follow-up/follow-up.hooks";
import type { FollowUpRow, FollowUpQueryDto, Frequency, UpdateFollowUpStatusDto } from "@/modules/shared/follow-up/follow-up.types";
import { toast } from "sonner";

const FollowupPage: React.FC = () => {
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<FollowUpQueryDto["tab"]>("ongoing");
    const [searchQuery, setSearchQuery] = useState("");

    const [date, setDate] = useState<Date>();
    const [comment, setComment] = useState("");
    const [frequency, setFrequency] = useState<Frequency>("daily");
    const [stopReason, setStopReason] = useState<UpdateFollowUpStatusDto["stopReason"]>(null);
    const [proofText, setProofText] = useState("");
    const [proofImage, setProofImage] = useState<File | null>(null);
    const [stopRemarks, setStopRemarks] = useState("");

    const { data, isLoading } = useFollowUpList({
        tab: activeTab,
        page: 1,
        limit: 10,
    });

    const followups = data?.data ?? [];
    const meta = data?.meta;

    const updateStatusMutation = useUpdateFollowUpStatus();

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

    const columns: ColDef<FollowUpRow>[] = useMemo(
        () => [
            { field: "area", headerName: "Area", width: 120 },
            { field: "party_name", headerName: "Organisation", width: 180 },
            {
                field: "followPerson",
                headerName: "Concerned Person",
                width: 160,
                cellRenderer: (params: any) => (
                    <Button variant="ghost" size="sm" className="gap-2 h-8" onClick={() => handleOpenPersonModal(params.data?.followPerson ?? [])}>
                        <Users className="h-4 w-4" />
                        <span>{params.data?.followPerson?.length ?? 0} Person(s)</span>
                    </Button>
                ),
            },
            {
                field: "amount",
                headerName: "Amount",
                width: 120,
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
                width: 130,
                cellRenderer: (params: any) => <Badge variant="outline">{params.value}</Badge>,
            },
            {
                field: "latest_comment",
                headerName: "Last Comment",
                width: 220,
                cellRenderer: (params: any) => <span className="text-muted-foreground truncate block">{params.value || "—"}</span>,
            },
            {
                field: "updated_at",
                headerName: "Last Update",
                width: 140,
            },
            {
                field: "start_from",
                headerName: "Start Date",
                width: 120,
            },
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

    // Modal states
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [personModalOpen, setPersonModalOpen] = useState(false);
    const [personList, setPersonList] = useState<FollowUpRow["followPerson"]>([]);

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
            proofImagePath: null,
        };

        updateStatusMutation.mutate(
            { id: selectedId, data: payload },
            {
                onSuccess: () => {
                    setUpdateModalOpen(false);
                    resetForm();
                    toast.success("Follow-up status updated successfully");
                },
                onError: () => {
                    toast.error("Error updating follow-up status");
                },
            }
        );
    };

    const resetForm = () => {
        setComment("");
        setFrequency("daily");
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

    return (
        <Card className="flex flex-col h-full min-h-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
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

                {/* Data Table */}
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

            {/* Update Status Modal */}
            <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Status</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Frequency */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Frequency</label>
                            <Select value={frequency} onValueChange={val => setFrequency(val as Frequency)}>
                                <SelectTrigger>
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

                        {/* Next Follow-up Date */}
                        {frequency !== "stopped" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Next Follow-up Date</label>
                                <DatePicker date={date} setDate={setDate} />
                            </div>
                        )}

                        {/* Comment */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Comment</label>
                            <Textarea placeholder="Add a comment..." value={comment} onChange={e => setComment(e.target.value)} rows={3} />
                        </div>

                        {/* Stop Reason */}
                        {frequency === "stopped" && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reason for Stopping</label>
                                    <Select value={stopReason ?? ""} onValueChange={val => setStopReason(val as any)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a reason" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="party_angry">Party requested to stop</SelectItem>
                                            <SelectItem value="objective_achieved">Objective achieved</SelectItem>
                                            <SelectItem value="not_reachable">External follow-up initiated</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {stopReason === "objective_achieved" && (
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Proof Details</label>
                                            <Textarea
                                                placeholder="Describe how the objective was achieved..."
                                                value={proofText}
                                                onChange={e => setProofText(e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                        <div>
                                            <Button variant="outline" size="sm" className="gap-2" asChild>
                                                <label className="cursor-pointer">
                                                    <Upload className="h-4 w-4" />
                                                    {proofImage ? proofImage.name : "Upload Proof"}
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        onChange={e => {
                                                            const file = e.target.files?.[0];
                                                            if (file) setProofImage(file);
                                                        }}
                                                    />
                                                </label>
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {stopReason === "other" && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Remarks</label>
                                        <Textarea placeholder="Enter remarks..." value={stopRemarks} onChange={e => setStopRemarks(e.target.value)} rows={2} />
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setUpdateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>
                            {updateStatusMutation.isPending ? "Updating..." : "Update"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Person Details Modal */}
            <Dialog open={personModalOpen} onOpenChange={setPersonModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Contact Persons</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {personList && personList.length > 0 ? (
                            personList.map((person, index) => (
                                <div key={index} className="p-3 rounded-lg border bg-muted/30">
                                    <p className="font-medium">{person.name}</p>
                                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5" />
                                            <span>{person.email}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-3.5 w-3.5" />
                                            <span>{person.phone}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-muted-foreground">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No contacts found</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
};

export default FollowupPage;
