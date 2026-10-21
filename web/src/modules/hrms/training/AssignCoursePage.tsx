import { paths } from "@/app/routes/paths";
import { MultiSelectDropdown, type MultiSelectOption } from "@/components/form/MultiSelectDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAssignTrainingVideo, useLearnersProgress, useTrainingEmployees, useTrainingVideos } from "@/hooks/api/useTraining";
import { ArrowLeft, CheckCircle2, Clock, Eye, Film, Loader2, Sparkles, UserPlus, Users, Video, X } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDuration, getCategoryColor, getInitials } from "./helpers/training.utils";

interface VideoOption {
    id: number;
    title: string;
    category: string;
    duration: string;
    views: number;
    status: string;
}

interface EmployeeRow {
    id: number;
    name: string;
    dept: string;
    designation: string;
    avatar: string;
}

const AssignCoursePage = () => {
    const navigate = useNavigate();

    const { data: rawVideos = [], isLoading: isVideosLoading } = useTrainingVideos();
    const { data: dbEmployees = [] } = useTrainingEmployees();
    const { data: progressList = [] } = useLearnersProgress();
    const assignMutation = useAssignTrainingVideo();

    const [selectedVideoIds, setSelectedVideoIds] = useState<number[]>([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);

    const videos = useMemo<VideoOption[]>(
        () =>
            rawVideos.map(v => ({
                id: v.id,
                title: v.title,
                category: v.category || "General",
                duration: formatDuration(v.durationSeconds),
                views: progressList.filter(p => p.videoTitle === v.title).length,
                status: v.status,
            })),
        [rawVideos, progressList],
    );

    const employees = useMemo<EmployeeRow[]>(
        () =>
            dbEmployees.map(e => ({
                id: e.id,
                name: e.name,
                dept: e.dept || "General",
                designation: e.designation || "Staff",
                avatar: getInitials(e.name).slice(0, 2),
            })),
        [dbEmployees],
    );

    const readyVideos = useMemo(() => videos.filter(v => v.status === "ready"), [videos]);

    const courseOptions = useMemo<MultiSelectOption[]>(
        () =>
            readyVideos.map(video => ({
                value: video.id,
                label: video.title,
                searchText: video.category,
                sublabel: (
                    <span className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[8px] font-bold px-1.5 py-0 rounded-md border ${getCategoryColor(video.category)}`}>
                            {video.category}
                        </Badge>
                        <span className="flex items-center gap-1">
                            <Clock className="h-2 w-2" />{video.duration}
                        </span>
                        <span className="flex items-center gap-1">
                            <Eye className="h-2 w-2" />{video.views} views
                        </span>
                    </span>
                ),
            })),
        [readyVideos],
    );

    const employeeOptions = useMemo<MultiSelectOption[]>(
        () =>
            employees.map(employee => ({
                value: employee.id,
                label: employee.name,
                searchText: `${employee.dept} ${employee.designation}`,
                sublabel: (
                    <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[8px] font-semibold px-1.5 py-0 rounded-md">
                            {employee.dept}
                        </Badge>
                        <span>{employee.designation}</span>
                    </span>
                ),
            })),
        [employees],
    );

    const handleToggleEmployee = (id: number) => {
        setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(empId => empId !== id) : [...prev, id]);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (selectedVideoIds.length === 0) { toast.error("Please select at least one course."); return; }
        if (selectedEmployeeIds.length === 0) { toast.error("Please select at least one employee."); return; }

        assignMutation.mutate(
            { videoIds: selectedVideoIds, userIds: selectedEmployeeIds },
            {
                onSuccess: () => {
                    // Stay on the page — clear the form so another batch can be assigned.
                    setSelectedVideoIds([]);
                    setSelectedEmployeeIds([]);
                },
            },
        );
    };

    return (
        <Card>
            {/* Header */}
            <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle>Assign Training Course</CardTitle>
                        <CardDescription>Select a course and assign it to your team members</CardDescription>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => navigate(paths.hrms.trainingDashboard)}
                        className="rounded-lg px-5 py-2.5 flex items-center gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Training
                    </Button>
                </div>
            </CardHeader>

            <CardContent>
                {/* Stats row */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center gap-1.5 border px-3 py-1.5 rounded-xl">
                        <Film className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-bold text-muted-foreground">
                            {readyVideos.length} courses available
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 border px-3 py-1.5 rounded-xl">
                        <Users className="h-3 w-3 text-violet-500" />
                        <span className="text-[10px] font-bold text-muted-foreground">
                            {employees.length} team members
                        </span>
                    </div>
                    {selectedEmployeeIds.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/15 px-3 py-1.5 rounded-xl">
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-bold text-primary">
                                {selectedEmployeeIds.length} selected
                            </span>
                        </div>
                    )}
                </div>

                {isVideosLoading ? (
                    <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">Loading courses and team members...</span>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 items-start">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                                    <Video className="h-3 w-3" />
                                    Select Training Courses
                                    <span className="text-destructive">*</span>
                                </Label>
                                {selectedVideoIds.length > 0 && (
                                    <span className="text-[10px] font-bold text-primary">
                                        {selectedVideoIds.length} selected
                                    </span>
                                )}
                            </div>

                            <MultiSelectDropdown
                                options={courseOptions}
                                value={selectedVideoIds}
                                onChange={setSelectedVideoIds}
                                placeholder="Select training courses..."
                                searchPlaceholder="Search courses by title or category..."
                                emptyText="No ready courses available to assign."
                                selectedNoun="course"
                                disabled={readyVideos.length === 0}
                            />

                            {selectedVideoIds.length > 0 && (
                                <div className="bg-primary/[0.03] border border-primary/10 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Selected Courses
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedVideoIds([])}
                                            className="text-[9px] text-muted-foreground hover:text-primary font-semibold underline underline-offset-2"
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedVideoIds.map(id => {
                                            const course = videos.find(v => v.id === id);
                                            if (!course) return null;
                                            return (
                                                <Badge
                                                    key={id}
                                                    className="bg-primary/10 text-primary border border-primary/15 text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 cursor-default"
                                                >
                                                    <span className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center">
                                                        <Film className="h-2 w-2" />
                                                    </span>
                                                    {course.title}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setSelectedVideoIds(prev => prev.filter(vId => vId !== id)); }}
                                                        className="hover:text-destructive transition-colors"
                                                    >
                                                        <X className="h-2 w-2" />
                                                    </button>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                                    <Users className="h-3 w-3" />
                                    Select Team Members
                                    <span className="text-destructive">*</span>
                                </Label>
                                {selectedEmployeeIds.length > 0 && (
                                    <span className="text-[10px] font-bold text-primary">
                                        {selectedEmployeeIds.length} selected
                                    </span>
                                )}
                            </div>

                            <MultiSelectDropdown
                                options={employeeOptions}
                                value={selectedEmployeeIds}
                                onChange={setSelectedEmployeeIds}
                                placeholder="Select team members..."
                                searchPlaceholder="Search by name, department or designation..."
                                emptyText="No team members found."
                                selectedNoun="member"
                                disabled={employees.length === 0}
                            />

{selectedEmployeeIds.length > 0 && (
                                <div className="bg-primary/[0.03] border border-primary/10 rounded-xl p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Selected Members
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedEmployeeIds([])}
                                            className="text-[9px] text-muted-foreground hover:text-primary font-semibold underline underline-offset-2"
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedEmployeeIds.map(id => {
                                            const emp = employees.find(e => e.id === id);
                                            if (!emp) return null;
                                            return (
                                                <Badge
                                                    key={id}
                                                    className="bg-primary/10 text-primary border border-primary/15 text-[9px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 cursor-default"
                                                >
                                                    <span className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center text-[7px] font-bold">
                                                        {emp.avatar}
                                                    </span>
                                                    {emp.name}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleToggleEmployee(id); }}
                                                        className="hover:text-destructive transition-colors"
                                                    >
                                                        <X className="h-2 w-2" />
                                                    </button>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                            <p className="text-[10px] text-muted-foreground">
                                {!selectedVideoIds.length && !selectedEmployeeIds.length
                                    ? "Select courses and team members to assign"
                                    : !selectedVideoIds.length
                                        ? "Select at least one course"
                                        : selectedEmployeeIds.length === 0
                                            ? "Select at least one team member"
                                            : `Ready to assign ${selectedVideoIds.length} course${selectedVideoIds.length > 1 ? "s" : ""} to ${selectedEmployeeIds.length} member${selectedEmployeeIds.length > 1 ? "s" : ""}`
                                }
                            </p>
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => navigate(paths.hrms.trainingDashboard)}
                                    className="rounded-xl h-10 px-5 text-sm font-semibold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={selectedVideoIds.length === 0 || selectedEmployeeIds.length === 0 || assignMutation.isPending}
                                    className="rounded-xl h-10 px-6 flex items-center gap-2 text-sm font-semibold"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    {assignMutation.isPending ? "Assigning..." : "Assign Courses"}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
};

export default AssignCoursePage;