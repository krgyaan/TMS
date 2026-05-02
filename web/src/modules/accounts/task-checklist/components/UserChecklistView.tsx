import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, ListTodo, CheckCircle2, Clock } from "lucide-react";
import type { Checklist, ChecklistReport } from "@/modules/accounts/task-checklist/task-checklist.types";
import StatsCard from "./StatsCard";
import EmptyState from "./EmptyState";
import { Pagination, SearchInput } from "../ChecklistDashboard";
import TaskRow from "./TaskRow";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";

interface UserChecklistViewProps {
    userId: string;
    userTasksResponsibility: ChecklistReport[];
    userTasksAccountability: ChecklistReport[];

    respSearch: string;
    setRespSearch: (value: string) => void;
    respCurrentPage: number;
    respTotalPages: number;
    respItemsPerPage: number;
    setRespCurrentPage: (page: number) => void;
    setRespItemsPerPage: (items: number) => void;
    filteredRespTasks: ChecklistReport[];
    paginatedRespTasks: ChecklistReport[];

    accSearch: string;
    setAccSearch: (value: string) => void;
    accCurrentPage: number;
    accTotalPages: number;
    accItemsPerPage: number;
    setAccCurrentPage: (page: number) => void;
    setAccItemsPerPage: (items: number) => void;
    filteredAccTasks: ChecklistReport[];
    paginatedAccTasks: ChecklistReport[];

    onViewDetails: (checklist: Checklist) => void;
    onOpenRemark: (reportId: number, type: "responsibility" | "accountability", checklist: Checklist) => void;
}

const UserChecklistView: React.FC<UserChecklistViewProps> = ({
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
    onViewDetails,
    onOpenRemark,
}) => {
    const navigate = useNavigate();
    
    return (
        <div className="space-y-6">
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
                                                                            onViewDetails={onViewDetails}
                                                                            onOpenRemark={onOpenRemark}
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
                                                                            onViewDetails={onViewDetails}
                                                                            onOpenRemark={onOpenRemark}
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
            
                    </>
        </div>
    );
};

export default UserChecklistView;