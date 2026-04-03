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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { 
    Plus, 
    FileEdit, 
    Eye, 
    Trash, 
    Loader2, 
    X, 
    CheckCircle2, 
    Search, 
    ChevronLeft, 
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ListTodo,
    Users,
    Clock,
    AlertCircle
} from "lucide-react";
import type { ColDef } from "ag-grid-community";
import { format, differenceInSeconds } from "date-fns";
import { useParams } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import {
    useChecklistIndex,
    useDeleteChecklist,
    useStoreResponsibilityRemark,
    useStoreAccountabilityRemark,
} from "@/modules/accounts/task-checklist/task-checklist.hooks";
import type { Checklist, ChecklistReport } from "@/modules/accounts/task-checklist/task-checklist.types";
import { paths } from "@/app/routes/paths";

// ==================== Pagination Component ====================
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (items: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
}) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing</span>
                <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => onItemsPerPageChange(Number(value))}
                >
                    <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {[5, 10, 20, 50, 100].map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span>of {totalItems} items</span>
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1 mx-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (currentPage <= 3) {
                            pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = currentPage - 2 + i;
                        }
                        return (
                            <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onPageChange(pageNum)}
                            >
                                {pageNum}
                            </Button>
                        );
                    })}
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="text-sm text-muted-foreground hidden sm:block">
                Page {currentPage} of {totalPages}
            </div>
        </div>
    );
};

// ==================== Search Input Component ====================
interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = "Search..." }) => {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="pl-10 h-10"
            />
            {value && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => onChange("")}
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
};

// ==================== Stats Card Component ====================
interface StatsCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    description?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, description }) => {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-2xl font-bold">{value}</p>
                        {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// ==================== Timer Component ====================
const Timer: React.FC<{ dueDate: string; isSaturday?: boolean }> = ({ dueDate, isSaturday = false }) => {
    const [timeLeft, setTimeLeft] = useState<number>(0);

    React.useEffect(() => {
        const calculateTimeLeft = () => {
            let targetDate = new Date(dueDate);
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
            <Clock className="h-3 w-3 mr-1" />
            {formatTime(timeLeft)}
        </Badge>
    );
};

// ==================== Remark Modal Component ====================
interface RemarkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: "responsibility" | "accountability";
    reportId: number;
    taskName: string;
}

const safeFormat = (date?: string | Date) => {
    if (!date) return "-";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "-" : format(d, "dd MMM yyyy");
};

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

// ==================== Task Details Sheet Component ====================
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
                    <div className="p-4 rounded-lg bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Task Name</Label>
                        <p className="text-sm font-medium mt-1">{checklist.taskName}</p>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="text-sm mt-1">{checklist.description || "-"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                            <Label className="text-xs text-muted-foreground">Frequency</Label>
                            <p className="text-sm font-medium mt-1">{checklist.frequency}</p>
                        </div>

                        {checklist.frequencyCondition !== null && (
                            <div className="p-4 rounded-lg bg-muted/50">
                                <Label className="text-xs text-muted-foreground">Condition</Label>
                                <p className="text-sm font-medium mt-1">{checklist.frequencyCondition}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Responsible User</Label>
                        <p className="text-sm font-medium mt-1">{checklist.responsibleUserName || "-"}</p>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                        <Label className="text-xs text-muted-foreground">Accountable User</Label>
                        <p className="text-sm font-medium mt-1">{checklist.accountableUserName || "-"}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                            <Label className="text-xs text-muted-foreground">Created</Label>
                            <p className="text-sm mt-1">{safeFormat(checklist.createdAt)}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50">
                            <Label className="text-xs text-muted-foreground">Updated</Label>
                            <p className="text-sm mt-1">{safeFormat(checklist.updatedAt)}</p>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

// ==================== Empty State Component ====================
interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            {icon && <div className="mb-4">{icon}</div>}
            <h3 className="text-lg font-medium text-center">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground text-center mt-1 max-w-sm">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
};

// ==================== Task Row Component for User View ====================
interface TaskRowProps {
    task: ChecklistReport;
    type: "responsibility" | "accountability";
    onViewDetails: (checklist: Checklist) => void;
    onOpenRemark: (reportId: number, type: "responsibility" | "accountability", checklist: Checklist) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, type, onViewDetails, onOpenRemark }) => {
    const isSaturday = task.dueDate ? new Date(task.dueDate).getDay() === 6 : false;
    const canComplete = type === "accountability" ? !!task.respCompletedAt && !task.accCompletedAt : true;

    if (type === "responsibility") {
        return (
            <tr className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-4">
                    <div className="font-medium">{task?.taskName || "-"}</div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                    {task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy, hh:mm a") : "-"}
                </td>
                <td className="p-4">
                    {task.dueDate ? <Timer dueDate={task.dueDate} /> : "-"}
                </td>
                <td className="p-4">
                    <div className="flex gap-2">
                        {task.id && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onViewDetails(task!)}
                                >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Details
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => onOpenRemark(task.id!, "responsibility", task!)}
                                >
                                    Complete
                                </Button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <tr className="border-b hover:bg-muted/30 transition-colors">
            <td className="p-4">
                <div className="font-medium">{task?.taskName || "-"}</div>
            </td>
            <td className="p-4 text-sm">{task?.responsibleUserName || "-"}</td>
            <td className="p-4 text-sm">
                {task.respCompletedAt ? (
                    <Badge variant="secondary" className="font-normal">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {format(new Date(task.respCompletedAt), "dd MMM yyyy")}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="font-normal">Pending</Badge>
                )}
            </td>
            <td className="p-4 text-sm max-w-[200px]">
                <span className="truncate block" title={task.respRemark || ""}>
                    {task.respRemark || "-"}
                </span>
            </td>
            <td className="p-4 text-sm">
                {task.respResultFile ? (
                    <a
                        href={`/uploads/checklist/${task.respResultFile}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                        <Eye className="h-3 w-3" />
                        View
                    </a>
                ) : (
                    "-"
                )}
            </td>
            <td className="p-4">
                {task.dueDate ? <Timer dueDate={task.dueDate} isSaturday={isSaturday} /> : "-"}
            </td>
            <td className="p-4">
                <div className="flex gap-2">
                    {task.id && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewDetails(task)}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                    )}
                    {task.id && canComplete ? (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onOpenRemark(task.id!, "accountability", task)}
                        >
                            Complete
                        </Button>
                    ) : (
                        !task.accCompletedAt && (
                            <Button size="sm" variant="ghost" disabled title="Waiting for responsible user">
                                <Clock className="h-4 w-4 mr-1" />
                                Waiting
                            </Button>
                        )
                    )}
                </div>
            </td>
        </tr>
    );
};

// ==================== Main Dashboard Component ====================
const ChecklistDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAdmin, isSuperUser } = useAuth();
    const {id } = useParams();

    // State
    const [selectedTask, setSelectedTask] = useState<Checklist | null>(null);
    const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
    const [remarkModalOpen, setRemarkModalOpen] = useState(false);
    const [remarkType, setRemarkType] = useState<"responsibility" | "accountability">("responsibility");
    const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

    // Search and Pagination State - Admin
    const [adminSearch, setAdminSearch] = useState("");
    const [adminCurrentPage, setAdminCurrentPage] = useState(1);
    const [adminItemsPerPage, setAdminItemsPerPage] = useState(10);

    // Search and Pagination State - User Responsibility
    const [respSearch, setRespSearch] = useState("");
    const [respCurrentPage, setRespCurrentPage] = useState(1);
    const [respItemsPerPage, setRespItemsPerPage] = useState(10);

    // Search and Pagination State - User Accountability
    const [accSearch, setAccSearch] = useState("");
    const [accCurrentPage, setAccCurrentPage] = useState(1);
    const [accItemsPerPage, setAccItemsPerPage] = useState(10);

    const { data: indexData, isLoading, isError } = useChecklistIndex();
    const deleteMutation = useDeleteChecklist();

    const isAdminUser = isAdmin || isSuperUser;
    const userId = user?.id?.toString() || "";


    // Callbacks
    const openDetails = useCallback((checklist: Checklist) => {
        setSelectedTask(checklist);
        setDetailsSheetOpen(true);
    }, []);

    const openRemarkModal = useCallback(
        (reportId: number, type: "responsibility" | "accountability", checklist: Checklist) => {
            setSelectedReportId(reportId);
            setRemarkType(type);
            setSelectedTask(checklist);
            setRemarkModalOpen(true);
        },
        []
    );

    const handleDelete = useCallback(
        (checklist: Checklist) => {
            if (window.confirm(`Are you sure you want to delete "${checklist.taskName}"?`)) {
                deleteMutation.mutate(checklist.id);
            }
        },
        [deleteMutation]
    );

    // Filtered and Paginated Data - Admin
    const filteredAdminData = useMemo(() => {
        if (!indexData?.groupedChecklists) return {};
        
        const filtered: Record<string, Checklist[]> = {};
        const searchLower = adminSearch.toLowerCase();

        Object.entries(indexData.groupedChecklists).forEach(([key, checklists]) => {
            const filteredChecklists = checklists.filter((c) =>
                c.taskName.toLowerCase().includes(searchLower) ||
                c.responsibleUserName?.toLowerCase().includes(searchLower) ||
                c.accountableUserName?.toLowerCase().includes(searchLower) ||
                c.frequency?.toLowerCase().includes(searchLower)
            );
            if (filteredChecklists.length > 0) {
                filtered[key] = filteredChecklists;
            }
        });

        return filtered;
    }, [indexData?.groupedChecklists, adminSearch]);

    const paginatedAdminEntries = useMemo(() => {
        const entries = Object.entries(filteredAdminData);
        const startIndex = (adminCurrentPage - 1) * adminItemsPerPage;
        return entries.slice(startIndex, startIndex + adminItemsPerPage);
    }, [filteredAdminData, adminCurrentPage, adminItemsPerPage]);

    const adminTotalPages = Math.ceil(Object.keys(filteredAdminData).length / adminItemsPerPage) || 1;

    // Filtered and Paginated Data - Responsibility
    const filteredRespTasks = useMemo(() => {
        if (!indexData?.userTasksResponsibility) return [];
        const searchLower = respSearch.toLowerCase();
        return indexData.userTasksResponsibility.filter((t) =>
            t.taskName?.toLowerCase().includes(searchLower)
        );
    }, [indexData?.userTasksResponsibility, respSearch]);

    const paginatedRespTasks = useMemo(() => {
        const startIndex = (respCurrentPage - 1) * respItemsPerPage;
        return filteredRespTasks.slice(startIndex, startIndex + respItemsPerPage);
    }, [filteredRespTasks, respCurrentPage, respItemsPerPage]);

    const respTotalPages = Math.ceil(filteredRespTasks.length / respItemsPerPage) || 1;

    // Filtered and Paginated Data - Accountability
    const filteredAccTasks = useMemo(() => {
        if (!indexData?.userTasksAccountability) return [];
        const searchLower = accSearch.toLowerCase();
        return indexData.userTasksAccountability.filter((t) =>
            t.taskName?.toLowerCase().includes(searchLower) ||
            t.responsibleUserName?.toLowerCase().includes(searchLower)
        );
    }, [indexData?.userTasksAccountability, accSearch]);

    const paginatedAccTasks = useMemo(() => {
        const startIndex = (accCurrentPage - 1) * accItemsPerPage;
        return filteredAccTasks.slice(startIndex, startIndex + accItemsPerPage);
    }, [filteredAccTasks, accCurrentPage, accItemsPerPage]);

    const accTotalPages = Math.ceil(filteredAccTasks.length / accItemsPerPage) || 1;

    // Admin columns
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
                    <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                    <p className="text-destructive font-medium">Failed to load checklist data</p>
                    <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    const { groupedChecklists, userTasksResponsibility, userTasksAccountability } = indexData;

    // Calculate stats
    const totalTasks = Object.values(groupedChecklists).flat().length;
    const totalUsers = Object.keys(groupedChecklists).length;

    // ==================== Admin View ====================
    if (isAdminUser) {
        return (
            <>
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatsCard
                            title="Total Tasks"
                            value={totalTasks}
                            icon={<ListTodo className="h-6 w-6 text-muted-foreground" />}
                            description="All checklist tasks"
                        />
                        <StatsCard
                            title="Assigned Users"
                            value={totalUsers}
                            icon={<Users className="h-6 w-6 text-muted-foreground" />}
                            description="Users with tasks"
                        />
                        <StatsCard
                            title="Groups"
                            value={Object.keys(groupedChecklists).length}
                            icon={<CheckCircle2 className="h-6 w-6 text-muted-foreground" />}
                            description="Task groups"
                        />
                    </div>

                    {/* Main Card */}
                    <Card>
                        <CardHeader className="border-b">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <CardTitle>Account Checklists</CardTitle>
                                    <CardDescription className="mt-1">
                                        Manage account checklist tasks and assignments
                                    </CardDescription>
                                </div>
                                <Button onClick={() => navigate(paths.accounts.taskChecklistsCreate)}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add New Checklist
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6">
                            {/* Search */}
                            <div className="mb-6">
                                <SearchInput
                                    value={adminSearch}
                                    onChange={(value) => {
                                        setAdminSearch(value);
                                        setAdminCurrentPage(1);
                                    }}
                                    placeholder="Search by task name, user, or frequency..."
                                />
                            </div>

                            {/* Content */}
                            {Object.keys(filteredAdminData).length === 0 ? (
                                <EmptyState
                                    icon={<ListTodo className="h-12 w-12 text-muted-foreground" />}
                                    title="No checklists found"
                                    description={adminSearch ? "Try adjusting your search terms" : "Create your first checklist to get started"}
                                    action={
                                        !adminSearch && (
                                            <Button onClick={() => navigate(paths.accounts.taskChecklistsCreate)}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add New Checklist
                                            </Button>
                                        )
                                    }
                                />
                            ) : (
                                <>
                                    <Accordion type="single" collapsible className="w-full">
                                        {paginatedAdminEntries.map(([responsibility, checklists]) => {
                                            const firstChecklist = checklists[0];
                                            const responsibleName = firstChecklist?.responsibleUserName || "Unassigned";
                                            const responsibleId = firstChecklist?.responsibility || null;

                                            return (
                                                <AccordionItem key={responsibility} value={responsibility} className="border rounded-lg mb-3 px-4">
                                                    <div className="flex items-center justify-between w-full">
                                                        <AccordionTrigger className="hover:no-underline py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                                </div>
                                                                <span className="font-medium">{responsibleName}</span>
                                                                <Badge variant="secondary">
                                                                    {checklists.length} {checklists.length === 1 ? 'Task' : 'Tasks'}
                                                                </Badge>
                                                            </div>
                                                        </AccordionTrigger>

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(paths.accounts.taskChecklistsReport(Number(responsibleId)));
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Report
                                                        </Button>
                                                    </div>
                                                    <AccordionContent>
                                                        <div className="pt-2 pb-4">
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

                                    {/* Pagination */}
                                    {Object.keys(filteredAdminData).length > adminItemsPerPage && (
                                        <Pagination
                                            currentPage={adminCurrentPage}
                                            totalPages={adminTotalPages}
                                            totalItems={Object.keys(filteredAdminData).length}
                                            itemsPerPage={adminItemsPerPage}
                                            onPageChange={setAdminCurrentPage}
                                            onItemsPerPageChange={(items) => {
                                                setAdminItemsPerPage(items);
                                                setAdminCurrentPage(1);
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Modals */}
                <TaskDetailsSheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen} checklist={selectedTask} />
            </>
        );
    }

    // ==================== User View ====================
    return (
        <>
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatsCard
                        title="My Responsibility Tasks"
                        value={userTasksResponsibility.length}
                        icon={<ListTodo className="h-6 w-6 text-muted-foreground" />}
                        description="Tasks you need to complete"
                    />
                    <StatsCard
                        title="My Accountability Tasks"
                        value={userTasksAccountability.length}
                        icon={<CheckCircle2 className="h-6 w-6 text-muted-foreground" />}
                        description="Tasks you need to verify"
                    />
                    <StatsCard
                        title="Pending Review"
                        value={userTasksAccountability.filter(t => t.respCompletedAt && !t.accCompletedAt).length}
                        icon={<Clock className="h-6 w-6 text-muted-foreground" />}
                        description="Ready for your review"
                    />
                </div>

                {/* Main Card */}
                <Card>
                    <CardHeader className="border-b">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <CardTitle>My Checklists</CardTitle>
                                <CardDescription className="mt-1">
                                    Track your responsibility and accountability tasks
                                </CardDescription>
                            </div>
                            <Button onClick={() => navigate(paths.accounts.taskChecklistsReport(Number(userId)))}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Report
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <Tabs defaultValue="responsibility" className="w-full">
                            <div className="border-b px-6 pt-4">
                                <TabsList className="grid w-full max-w-md grid-cols-2">
                                    <TabsTrigger value="responsibility" className="flex items-center gap-2">
                                        My Responsibility
                                        <Badge variant="secondary" className="ml-1">
                                            {userTasksResponsibility.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="accountability" className="flex items-center gap-2">
                                        My Accountability
                                        <Badge variant="secondary" className="ml-1">
                                            {userTasksAccountability.length}
                                        </Badge>
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                            {/* Responsibility Tab */}
                            <TabsContent value="responsibility" className="m-0">
                                <div className="p-6">
                                    {/* Search */}
                                    <div className="mb-6">
                                        <SearchInput
                                            value={respSearch}
                                            onChange={(value) => {
                                                setRespSearch(value);
                                                setRespCurrentPage(1);
                                            }}
                                            placeholder="Search tasks..."
                                        />
                                    </div>

                                    {filteredRespTasks.length === 0 ? (
                                        <EmptyState
                                            icon={<CheckCircle2 className="h-12 w-12 text-green-500" />}
                                            title={respSearch ? "No matching tasks" : "No pending responsibility tasks"}
                                            description={respSearch ? "Try adjusting your search" : "You're all caught up!"}
                                        />
                                    ) : (
                                        <>
                                            <div className="overflow-x-auto rounded-lg border">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b bg-muted/50">
                                                            <th className="text-left p-4 font-semibold text-sm">Task Name</th>
                                                            <th className="text-left p-4 font-semibold text-sm">Due Date</th>
                                                            <th className="text-left p-4 font-semibold text-sm">Time Remaining</th>
                                                            <th className="text-left p-4 font-semibold text-sm">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paginatedRespTasks.map((task) => (
                                                            <TaskRow
                                                                key={task.id}
                                                                task={task}
                                                                type="responsibility"
                                                                onViewDetails={openDetails}
                                                                onOpenRemark={openRemarkModal}
                                                            />
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Pagination */}
                                            {filteredRespTasks.length > respItemsPerPage && (
                                                <Pagination
                                                    currentPage={respCurrentPage}
                                                    totalPages={respTotalPages}
                                                    totalItems={filteredRespTasks.length}
                                                    itemsPerPage={respItemsPerPage}
                                                    onPageChange={setRespCurrentPage}
                                                    onItemsPerPageChange={(items) => {
                                                        setRespItemsPerPage(items);
                                                        setRespCurrentPage(1);
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Accountability Tab */}
                            <TabsContent value="accountability" className="m-0">
                                <div className="p-6">
                                    {/* Search */}
                                    <div className="mb-6">
                                        <SearchInput
                                            value={accSearch}
                                            onChange={(value) => {
                                                setAccSearch(value);
                                                setAccCurrentPage(1);
                                            }}
                                            placeholder="Search by task or responsible user..."
                                        />
                                    </div>

                                    {filteredAccTasks.length === 0 ? (
                                        <EmptyState
                                            icon={<CheckCircle2 className="h-12 w-12 text-green-500" />}
                                            title={accSearch ? "No matching tasks" : "No pending accountability tasks"}
                                            description={accSearch ? "Try adjusting your search" : "You're all caught up!"}
                                        />
                                    ) : (
                                        <>
                                            <div className="overflow-x-auto rounded-lg border">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b bg-muted/50">
                                                            <th className="text-left p-4 font-semibold text-sm">Task Name</th>
                                                            <th className="text-left p-4 font-semibold text-sm">Responsible User</th>
                                                            <th className="text-left p-4 font-semibold text-sm">Resp. Completed</th>
                                                            <th className="text-left p-4 font-semibold text-sm">Remark</th>
                                                            <th className="text-left p-4 font-semibold text-sm">File</th>
                                                            <th className="text-left p-4 font-semibold text-sm">Time Remaining</th>
                                                            <th className="text-left p-4 font-semibold text-sm">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paginatedAccTasks.map((task) => (
                                                            <TaskRow
                                                                key={task.id}
                                                                task={task}
                                                                type="accountability"
                                                                onViewDetails={openDetails}
                                                                onOpenRemark={openRemarkModal}
                                                            />
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Pagination */}
                                            {filteredAccTasks.length > accItemsPerPage && (
                                                <Pagination
                                                    currentPage={accCurrentPage}
                                                    totalPages={accTotalPages}
                                                    totalItems={filteredAccTasks.length}
                                                    itemsPerPage={accItemsPerPage}
                                                    onPageChange={setAccCurrentPage}
                                                    onItemsPerPageChange={(items) => {
                                                        setAccItemsPerPage(items);
                                                        setAccCurrentPage(1);
                                                    }}
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

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