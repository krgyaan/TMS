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
import AdminChecklistView from "./components/AdminChecklistView";
import UserChecklistView from "./components/UserChecklistView";

// ==================== Pagination Component ====================
export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (items: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
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

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = "Search..." }) => {
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


// ==================== Remark Modal Component ====================
export interface RemarkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: "responsibility" | "accountability";
    reportId: number;
    taskName: string;
}

export const safeFormat = (date?: string | Date) => {
    if (!date) return "-";
    const d = new Date(date);
    return isNaN(d.getTime()) ? "-" : format(d, "dd MMM yyyy");
};

export const RemarkModal: React.FC<RemarkModalProps> = ({ open, onOpenChange, type, reportId, taskName }) => {
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
export interface TaskDetailsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    checklist: Checklist | null;
}

export const TaskDetailsSheet: React.FC<TaskDetailsSheetProps> = ({ open, onOpenChange, checklist }) => {
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



// ==================== Main Dashboard Component ====================
const ChecklistDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAdmin, isSuperUser, canRead, canDelete} = useAuth();
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
    const isAccountCoordinator = canRead('accounts.checklist-admin');

    console.log({isAccountCoordinator : isAccountCoordinator});
    const canDeleteChecklist = canDelete('accounts.checklist-admin') 
    const canCreateChecklist = isAdmin || isSuperUser || isAccountCoordinator;
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
                            {canDeleteChecklist && (
                                <Button size="sm" variant="destructive" onClick={() => handleDelete(checklist)}>
                                    <Trash className="h-4 w-4" />
                                </Button>
                            )}
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

        const adminProps = {
            totalTasks,
            totalUsers,
            groupedChecklists,
            filteredAdminData,
            paginatedAdminEntries,
            adminSearch,
            setAdminSearch,
            adminCurrentPage,
            adminTotalPages,
            adminItemsPerPage,
            setAdminCurrentPage,
            setAdminItemsPerPage,
            canCreateChecklist,
            adminColumns,
        };

        // User Props
        const userProps = {
            userId,
            userTasksResponsibility,
            userTasksAccountability,

            respSearch,
            setRespSearch,
            respCurrentPage,
            respTotalPages,
            respItemsPerPage,
            setRespCurrentPage,
            setRespItemsPerPage,
            filteredRespTasks,
            paginatedRespTasks,

            accSearch,
            setAccSearch,
            accCurrentPage,
            accTotalPages,
            accItemsPerPage,
            setAccCurrentPage,
            setAccItemsPerPage,
            filteredAccTasks,
            paginatedAccTasks,

            onViewDetails: openDetails,
            onOpenRemark: openRemarkModal,
        };

        if (isAdminUser) {
            return (
                <>
                    <AdminChecklistView {...adminProps} />

                    {/* Shared Components */}
                    <TaskDetailsSheet
                        open={detailsSheetOpen}
                        onOpenChange={setDetailsSheetOpen}
                        checklist={selectedTask}
                    />

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
        }

        if (isAccountCoordinator) {
            return (
                <>
                    <Tabs defaultValue="user" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="user">User View</TabsTrigger>
                            <TabsTrigger value="admin">Admin View</TabsTrigger>
                        </TabsList>

                        <TabsContent value="user">
                            <UserChecklistView {...userProps} />
                        </TabsContent>

                        <TabsContent value="admin">
                            <AdminChecklistView {...adminProps} />
                        </TabsContent>
                    </Tabs>

                    {/* Shared Components */}
                    <TaskDetailsSheet
                        open={detailsSheetOpen}
                        onOpenChange={setDetailsSheetOpen}
                        checklist={selectedTask}
                    />

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
        }

        // ==================== Normal User ====================
        return (
            <>
                <UserChecklistView {...userProps} />

                <TaskDetailsSheet
                    open={detailsSheetOpen}
                    onOpenChange={setDetailsSheetOpen}
                    checklist={selectedTask}
                />

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