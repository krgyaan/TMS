// src/pages/accounts/checklist/ChecklistDashboard.tsx

import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DataTable from "@/components/ui/data-table";
import { createActionColumnRenderer } from "@/components/data-grid/renderers/ActionColumnRenderer";
import { Plus, FileEdit, Eye, Trash, Loader2, Upload, X, Clock, CheckCircle2 } from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { toast } from "sonner";
import { format, differenceInSeconds } from "date-fns";

import { useAuth } from "@/contexts/AuthContext";
import {
    useChecklistIndex,
    useDeleteChecklist,
    useStoreResponsibilityRemark,
    useStoreAccountabilityRemark,
} from "@/modules/accounts/task-checklist/task-checklist.hooks";
import type { Checklist, ChecklistReport } from "@/modules/accounts/task-checklist/task-checklist.types";
import { paths } from "@/app/routes/paths";
import { Row } from "react-day-picker";

// Timer Component
const Timer: React.FC<{ dueDate: string; isSaturday?: boolean }> = ({ dueDate, isSaturday = false }) => {
    const [timeLeft, setTimeLeft] = useState<number>(0);

    React.useEffect(() => {
        const calculateTimeLeft = () => {
            let targetDate = new Date(dueDate);
            
            // Adjust due date for accountability tasks
            if (isSaturday) {
                targetDate.setDate(targetDate.getDate() + 2);
            }

            const now = new Date();
            const secondsLeft = differenceInSeconds(targetDate, now);
            setTimeLeft(secondsLeft);
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [dueDate, isSaturday]);

    const formatTime = (seconds: number) => {
        const isNegative = seconds < 0;
        const absSeconds = Math.abs(seconds);

        const days = Math.floor(absSeconds / 86400);
        const hours = Math.floor((absSeconds % 86400) / 3600);
        const mins = Math.floor((absSeconds % 3600) / 60);
        const secs = absSeconds % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (mins > 0) parts.push(`${mins}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

        return `${isNegative ? "-" : ""}${parts.join(" ")}`;
    };

    const isOverdue = timeLeft < 0;

    return (
        <Badge variant={isOverdue ? "destructive" : "secondary"} className="font-mono text-xs">
            {formatTime(timeLeft)}
        </Badge>
    );
};

// Remark Modal Component
interface RemarkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: "responsibility" | "accountability";
    reportId: number;
    taskName: string;
}

const RemarkModal: React.FC<RemarkModalProps> = ({ open, onOpenChange, type, reportId, taskName }) => {
    const [remark, setRemark] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const respMutation = useStoreResponsibilityRemark();
    const accMutation = useStoreAccountabilityRemark();

    const isSubmitting = respMutation.isPending || accMutation.isPending;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (type === "responsibility") {
                await respMutation.mutateAsync({
                    id: reportId,
                    data: { respRemark: remark },
                    file: file || undefined,
                });
            } else {
                await accMutation.mutateAsync({
                    id: reportId,
                    data: { accRemark: remark },
                    file: file || undefined,
                });
            }

            setRemark("");
            setFile(null);
            onOpenChange(false);
        } catch (error) {
            // Error handled by mutation
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {type === "responsibility" ? "Responsibility" : "Accountability"} Remark
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Task</Label>
                        <p className="text-sm text-muted-foreground">{taskName}</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="remark">
                            Remark <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="remark"
                            placeholder="Enter your remark..."
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            required
                            rows={4}
                            maxLength={1000}
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">{remark.length}/1000 characters</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file">Result File (Optional)</Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                            onChange={handleFileChange}
                            disabled={isSubmitting}
                        />
                        {file && (
                            <div className="flex items-center justify-between p-2 border rounded bg-muted/50">
                                <span className="text-sm truncate">{file.name}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setFile(null)}
                                    disabled={isSubmitting}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !remark.trim()}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Remark"
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

// Task Details Sheet Component
interface TaskDetailsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    checklist: Checklist | null;
}

const TaskDetailsSheet: React.FC<TaskDetailsSheetProps> = ({ open, onOpenChange, checklist }) => {
    if (!checklist) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Task Details</SheetTitle>
                    <SheetDescription>View complete task information</SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-4">
                    <div>
                        <Label className="text-xs text-muted-foreground">Task Name</Label>
                        <p className="text-sm font-medium">{checklist.taskName}</p>
                    </div>

                    <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="text-sm">{checklist.description || "-"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs text-muted-foreground">Frequency</Label>
                            <p className="text-sm font-medium">{checklist.frequency}</p>
                        </div>

                        {checklist.frequencyCondition !== null && (
                            <div>
                                <Label className="text-xs text-muted-foreground">Condition</Label>
                                <p className="text-sm font-medium">{checklist.frequencyCondition}</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label className="text-xs text-muted-foreground">Responsible User</Label>
                        <p className="text-sm font-medium">{checklist.responsibleUserName || "-"}</p>
                    </div>

                    <div>
                        <Label className="text-xs text-muted-foreground">Accountable User</Label>
                        <p className="text-sm font-medium">{checklist.accountableUserName || "-"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 text-xs text-muted-foreground">
                        <div>
                            <Label className="text-xs text-muted-foreground">Created</Label>
                            <p className="text-sm">{format(new Date(checklist.createdAt), "dd MMM yyyy")}</p>
                        </div>
                        <div>
                            <Label className="text-xs text-muted-foreground">Updated</Label>
                            <p className="text-sm">{format(new Date(checklist.updatedAt), "dd MMM yyyy")}</p>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// Main Dashboard Component
const ChecklistDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, hasPermission, canUpdate, canDelete, isAdmin, isSuperUser} = useAuth();


    const [selectedTask, setSelectedTask] = useState<Checklist | null>(null);
    const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
    const [remarkModalOpen, setRemarkModalOpen] = useState(false);
    const [remarkType, setRemarkType] = useState<"responsibility" | "accountability">("responsibility");
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

    const { data: indexData, isLoading, isError } = useChecklistIndex();
    console.log(indexData);
    
    const deleteMutation = useDeleteChecklist();

    const isAdminUser = isAdmin || isSuperUser; 
    const userId = user?.id?.toString() || "";

    // Open details sheet
    const openDetails = useCallback((checklist: Checklist) => {
        setSelectedTask(checklist);
        setDetailsSheetOpen(true);
    }, []);

    // Open remark modal
    const openRemarkModal = useCallback(
        (reportId: number, type: "responsibility" | "accountability", checklist: Checklist) => {
            setSelectedReportId(reportId);
            setRemarkType(type);
            setSelectedTask(checklist);
            setRemarkModalOpen(true);
        },
        []
    );

    // Handle delete
    const handleDelete = useCallback(
        (checklist: Checklist) => {
            if (window.confirm(`Are you sure you want to delete "${checklist.taskName}"?`)) {
                deleteMutation.mutate(checklist.id);
            }
        },
        [deleteMutation]
    );

    // Admin/Coordinator view - columns for nested tables
    const adminColumns: ColDef[] = useMemo(
        () => [
            { field: "taskName", headerName: "Task Name", flex: 1, minWidth: 200 },
            { field: "frequency", headerName: "Frequency", width: 120 },
            {
                field: "responsibleUserName",
                headerName: "Responsible",
                width: 150,
                valueGetter: (p: any) => p.data?.responsibleUserName || "N/A",
            },
            {
                field: "accountableUserName",
                headerName: "Accountable",
                width: 150,
                valueGetter: (p: any) => p.data?.accountableUserName || "N/A",
            },
            {
                headerName: "Actions",
                filter: false,
                sortable: false,
                width: 280,
                cellRenderer: (params: any) => {
                    const checklist: Checklist = params.data;
                    if (!checklist) return null;

                    return (
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openDetails(checklist)}>
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                            </Button>

                            <Button size="sm" variant="outline" onClick={() => navigate(paths.accounts.taskChecklistsEdit(checklist.id))}>
                                <FileEdit className="h-4 w-4 mr-1" />
                                Edit
                            </Button>

                            <Button size="sm" variant="destructive" onClick={() => handleDelete(checklist)}>
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                },
            },
        ],
        [openDetails, handleDelete, navigate]
    );

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading checklists...</span>
            </div>
        );
    }

    // Error state
    if (isError || !indexData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-red-600">Failed to load checklist data</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    const { groupedChecklists, userTasksResponsibility, userTasksAccountability } = indexData;

    // Render admin/coordinator view
    if (isAdminUser) {
        const groupedEntries = Object.entries(groupedChecklists);

        return (
            <>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Account Checklists</CardTitle>
                            <CardDescription>Manage account checklist tasks and assignments</CardDescription>
                        </div>
                        <Button onClick={() => navigate(paths.accounts.taskChecklistsCreate)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Checklist
                        </Button>
                    </CardHeader>

                    <CardContent>
                        {groupedEntries.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No checklists found</div>
                        ) : (
                            <Accordion type="single" collapsible className="w-full">
                                {groupedEntries.map(([responsibility, checklists]) => {
                                    const firstChecklist = checklists[0];
                                    const responsibleName = firstChecklist?.responsibleUserName || "Unassigned";
                                    const responsibleId = firstChecklist?.responsibility || null;

                                    return (
                                        <AccordionItem key={responsibility} value={responsibility}>
                                                <div className="flex items-center justify-between w-full pr-4">
                                                    <AccordionTrigger className="hover:no-underline flex items-center gap-3">
                                                        <div className="flex items-center gap-3">
                                                        <span className="font-medium">{responsibleName}</span>
                                                        <Badge variant="secondary">
                                                            Total Tasks: {checklists.length}
                                                        </Badge>
                                                        </div>
                                                    </AccordionTrigger>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                        navigate(paths.accounts.taskChecklistsReport(Number(responsibleId)));
                                                        }}
                                                    >
                                                        Report
                                                    </Button>
                                                </div>
                                            <AccordionContent>
                                                <div className="pt-4">
                                                    <DataTable
                                                        data={checklists}
                                                        loading={false}
                                                        columnDefs={adminColumns}
                                                        gridOptions={{
                                                            defaultColDef: { filter: true, sortable: true },
                                                            domLayout: "autoHeight",
                                                        }}
                                                    />
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        )}
                    </CardContent>
                </Card>

                {/* Modals */}
                <TaskDetailsSheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen} checklist={selectedTask} />
            </>
        );
    }

    // User view - Two tabs: Responsibility and Accountability
    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>My Checklists</CardTitle>
                        <CardDescription>Track your responsibility and accountability tasks</CardDescription>
                    </div>
                    <Button onClick={() => navigate(`/accounts/checklists/report/${userId}`)}>
                        See Report
                    </Button>
                </CardHeader>

                <CardContent>
                    <Tabs defaultValue="responsibility">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="responsibility">
                                My Responsibility
                                <Badge variant="secondary" className="ml-2">
                                    {userTasksResponsibility.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="accountability">
                                My Accountability
                                <Badge variant="secondary" className="ml-2">
                                    {userTasksAccountability.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>

                        {/* Responsibility Tab */}
                        <TabsContent value="responsibility">
                            {userTasksResponsibility.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                    <p>No pending responsibility tasks</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="text-left p-3 font-semibold text-sm">Task Name</th>
                                                <th className="text-left p-3 font-semibold text-sm">Due Date</th>
                                                <th className="text-left p-3 font-semibold text-sm">Timer</th>
                                                <th className="text-left p-3 font-semibold text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userTasksResponsibility.map((task) => (
                                                <tr key={task.id} className="border-b hover:bg-muted/50">
                                                    <td className="p-3 text-sm">{task.checklist?.taskName || "-"}</td>
                                                    <td className="p-3 text-sm">
                                                        {task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy, hh:mm a") : "-"}
                                                    </td>
                                                    <td className="p-3">
                                                        {task.dueDate ? <Timer dueDate={task.dueDate} /> : "-"}
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex gap-2">
                                                            {task.checklist && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => openDetails(task.checklist!)}
                                                                >
                                                                    <Eye className="h-4 w-4 mr-1" />
                                                                    Details
                                                                </Button>
                                                            )}
                                                            {task.checklist && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => openRemarkModal(task.id, "responsibility", task.checklist!)}
                                                                >
                                                                    Responsibility
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>

                        {/* Accountability Tab */}
                        <TabsContent value="accountability">
                            {userTasksAccountability.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                    <p>No pending accountability tasks</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="text-left p-3 font-semibold text-sm">Task Name</th>
                                                <th className="text-left p-3 font-semibold text-sm">Responsible User</th>
                                                <th className="text-left p-3 font-semibold text-sm">Resp. Completed</th>
                                                <th className="text-left p-3 font-semibold text-sm">Remark</th>
                                                <th className="text-left p-3 font-semibold text-sm">File</th>
                                                <th className="text-left p-3 font-semibold text-sm">Timer</th>
                                                <th className="text-left p-3 font-semibold text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {userTasksAccountability.map((task) => {
                                                const isSaturday = task.dueDate ? new Date(task.dueDate).getDay() === 6 : false;
                                                const canComplete = !!task.respCompletedAt && !task.accCompletedAt;

                                                return (
                                                    <tr key={task.id} className="border-b hover:bg-muted/50">
                                                        <td className="p-3 text-sm">{task.checklist?.taskName || "-"}</td>
                                                        <td className="p-3 text-sm">{task.checklist?.responsibleUserName || "-"}</td>
                                                        <td className="p-3 text-sm">
                                                            {task.respCompletedAt
                                                                ? format(new Date(task.respCompletedAt), "dd MMM yyyy, hh:mm a")
                                                                : "-"}
                                                        </td>
                                                        <td className="p-3 text-sm max-w-xs truncate" title={task.respRemark || ""}>
                                                            {task.respRemark || "-"}
                                                        </td>
                                                        <td className="p-3 text-sm">
                                                            {task.respResultFile ? (
                                                                <a
                                                                    href={`/uploads/checklist/${task.respResultFile}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline"
                                                                >
                                                                    View
                                                                </a>
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {task.dueDate ? <Timer dueDate={task.dueDate} isSaturday={isSaturday} /> : "-"}
                                                        </td>
                                                        <td className="p-3">
                                                            <div className="flex gap-2">
                                                                {task.checklist && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => openDetails(task.checklist!)}
                                                                    >
                                                                        <Eye className="h-4 w-4 mr-1" />
                                                                        Details
                                                                    </Button>
                                                                )}
                                                                {task.checklist && canComplete ? (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        onClick={() => openRemarkModal(task.id, "accountability", task.checklist!)}
                                                                    >
                                                                        Accountability
                                                                    </Button>
                                                                ) : (
                                                                    !task.accCompletedAt && (
                                                                        <Button size="sm" variant="ghost" disabled title="Waiting for responsible user">
                                                                            Accountability
                                                                        </Button>
                                                                    )
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Modals */}
            <TaskDetailsSheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen} checklist={selectedTask} />
            {selectedReportId && selectedTask && (
                <RemarkModal
                    open={remarkModalOpen}
                    onOpenChange={setRemarkModalOpen}
                    type={remarkType}
                    reportId={selectedReportId}
                    taskName={selectedTask.taskName}
                />
            )}
        </>
    );
};

export default ChecklistDashboard;