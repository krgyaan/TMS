import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Users, ListTodo, CheckCircle2 } from "lucide-react";
import DataTable from "@/components/ui/data-table";
import type { ColDef } from "ag-grid-community";
import type { Checklist } from "@/modules/accounts/task-checklist/task-checklist.types";
import { paths } from "@/app/routes/paths";
import StatsCard from "./StatsCard";
import { Pagination, SearchInput } from "../ChecklistDashboard";
import EmptyState from "./EmptyState";

interface AdminChecklistViewProps {
    totalTasks: number;
    totalUsers: number;
    groupedChecklists: Record<string, Checklist[]>;
    filteredAdminData: Record<string, Checklist[]>;
    paginatedAdminEntries: [string, Checklist[]][];
    adminSearch: string;
    setAdminSearch: (value: string) => void;
    adminCurrentPage: number;
    adminTotalPages: number;
    adminItemsPerPage: number;
    setAdminCurrentPage: (page: number) => void;
    setAdminItemsPerPage: (items: number) => void;
    canCreateChecklist: boolean;
    adminColumns: ColDef[];
}

const AdminChecklistView: React.FC<AdminChecklistViewProps> = ({
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
}) => {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
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
                                {canCreateChecklist && (
                                    <Button onClick={() => navigate(paths.accounts.taskChecklistsCreate)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add New Checklist
                                    </Button>
                                )}
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

            </>
        </div>
    );
};

export default AdminChecklistView;