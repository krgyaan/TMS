import { paths } from "@/app/routes/paths";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAssignTrainingVideo, useLearnersProgress, useTrainingEmployees, useTrainingVideos } from "@/hooks/api/useTraining";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Clock, Eye, Film, Loader2, Play, Search, Sparkles, UserPlus, Users, Video, X } from "lucide-react";
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
    const [employeeSearch, setEmployeeSearch] = useState("");

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

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp =>
            emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
            emp.dept.toLowerCase().includes(employeeSearch.toLowerCase())
        );
    }, [employees, employeeSearch]);

    const handleToggleVideo = (id: number) => {
        setSelectedVideoIds(prev => prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]);
    };

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
                    setEmployeeSearch("");
                },
            },
        );
    };

    return (
        <Card>
            {/* Header */}
            <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <UserPlus className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                Assign Training Course
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Select a course and assign it to your team members
                            </p>
                        </div>
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
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                                    <Video className="h-3 w-3" />
                                    Select Training Courses
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (selectedVideoIds.length === readyVideos.length) {
                                            setSelectedVideoIds([]);
                                        } else {
                                            setSelectedVideoIds(readyVideos.map(v => v.id));
                                        }
                                    }}
                                    disabled={readyVideos.length === 0}
                                    className="rounded-xl h-8 text-[10px] font-bold px-3"
                                >
                                    {selectedVideoIds.length === readyVideos.length && readyVideos.length > 0 ? "Deselect All" : "Select All"}
                                </Button>
                            </div>

                            <div className="border rounded-2xl bg-background/20 p-2 max-h-[280px] overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                    {readyVideos.map((video) => {
                                        const isSelected = selectedVideoIds.includes(video.id);
                                        return (
                                            <div
                                                key={video.id}
                                                className={cn(
                                                    "relative flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer border-2",
                                                    isSelected
                                                        ? "bg-primary/[0.06] border-primary/20"
                                                        : "border-transparent hover:bg-muted/8 hover:border-border/20"
                                                )}
                                                onClick={() => handleToggleVideo(video.id)}
                                            >
                                                <div className="w-14 aspect-video rounded-lg bg-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Play className="h-3.5 w-3.5 text-primary/70" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-xs font-bold leading-tight truncate", isSelected && "text-primary")}>
                                                        {video.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <Badge className={cn("text-[8px] font-bold px-1.5 py-0 rounded-md border", getCategoryColor(video.category))}>
                                                            {video.category}
                                                        </Badge>
                                                        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-2 w-2" />{video.duration}
                                                        </span>
                                                        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                            <Eye className="h-2 w-2" />{video.views}
                                                        </span>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-primary border-2 border-card flex items-center justify-center">
                                                        <CheckCircle2 className="h-3 w-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {readyVideos.length === 0 && (
                                        <p className="col-span-full text-xs text-muted-foreground py-8 text-center">
                                            No ready courses available to assign.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-border/40" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Team Members</span>
                            <div className="h-px flex-1 bg-border/40" />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name or department..."
                                        value={employeeSearch}
                                        onChange={(e) => setEmployeeSearch(e.target.value)}
                                        className="pl-9 h-10 text-xs rounded-xl"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (selectedEmployeeIds.length === employees.length) {
                                            setSelectedEmployeeIds([]);
                                        } else {
                                            setSelectedEmployeeIds(employees.map(e => e.id));
                                        }
                                    }}
                                    className="rounded-xl h-10 text-[10px] font-bold px-4"
                                >
                                    {selectedEmployeeIds.length === employees.length ? (
                                        <>
                                            <X className="h-3 w-3 mr-1" />
                                            Deselect All
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Select All
                                        </>
                                    )}
                                </Button>
                            </div>

                            <div className="border rounded-2xl bg-background/20 p-2 max-h-[280px] overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {filteredEmployees.map((employee) => {
                                        const isSelected = selectedEmployeeIds.includes(employee.id);
                                        return (
                                            <div
                                                key={employee.id}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border-2",
                                                    isSelected
                                                        ? "bg-primary/[0.06] border-primary/20"
                                                        : "border-transparent hover:bg-muted/8 hover:border-border/20"
                                                )}
                                                onClick={() => handleToggleEmployee(employee.id)}
                                            >
                                                <div className="relative">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-muted/25 text-muted-foreground"
                                                    )}>
                                                        {employee.avatar}
                                                    </div>
                                                    {isSelected && (
                                                        <div className="absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-primary border-2 border-card flex items-center justify-center">
                                                            <CheckCircle2 className="h-3 w-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-xs font-bold leading-tight truncate", isSelected && "text-primary")}>
                                                        {employee.name}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Badge variant="outline" className="text-[8px] font-semibold px-1.5 py-0 rounded-md">
                                                            {employee.dept}
                                                        </Badge>
                                                        <span className="text-[9px] text-muted-foreground/70">
                                                            {employee.designation}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

{selectedVideoIds.length > 0 && (
                        <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/15 px-3 py-1.5 rounded-xl">
                            <CheckCircle2 className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-bold text-primary">
                                {selectedVideoIds.length} courses selected
                            </span>
                        </div>
                    )}
                    {selectedEmployeeIds.length > 0 && (
                                <div className="bg-primary/[0.03] border border-primary/10 rounded-xl p-3.5">
                                    <div className="flex items-center justify-between mb-2.5">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            Selected Members
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedEmployeeIds([])}
                                            className="text-[10px] text-muted-foreground hover:text-primary font-semibold underline underline-offset-2"
                                        >
                                            Clear all
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedEmployeeIds.map(id => {
                                            const emp = employees.find(e => e.id === id);
                                            if (!emp) return null;
                                            return (
                                                <Badge
                                                    key={id}
                                                    className="bg-primary/10 text-primary border border-primary/15 text-[10px] font-semibold pl-1 pr-1.5 py-0.5 rounded-lg flex items-center gap-1.5 cursor-default"
                                                >
                                                    <span className="h-4.5 w-4.5 rounded-md bg-primary/20 flex items-center justify-center text-[8px] font-bold">
                                                        {emp.avatar}
                                                    </span>
                                                    {emp.name}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); handleToggleEmployee(id); }}
                                                        className="hover:text-destructive transition-colors ml-0.5"
                                                    >
                                                        <X className="h-2.5 w-2.5" />
                                                    </button>
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
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