import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Eye, Film, Play, Search, Sparkles, UserPlus, Users, Video, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getCategoryColor } from "../helpers/training.utils";

interface VideoRow {
    id: number;
    title: string;
    category: string;
    duration: string;
    resolution: string;
    size: string;
    views: number;
    status: string;
    isPublished: boolean;
    reactions: { helpful: number; important: number; confusing: number };
    thumbnailPath: string | null;
    videoUrl: string;
}

interface EmployeeRow {
    id: number;
    name: string;
    dept: string;
    designation: string;
    avatar: string;
}

interface AssignCourseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    videos: VideoRow[];
    employees: EmployeeRow[];
    onAssign: (videoId: number, userIds: number[]) => void;
    isAssigning: boolean;
}

const AssignCourseModal = ({ open, onOpenChange, videos, employees, onAssign, isAssigning }: AssignCourseModalProps) => {
    const [assignVideoId, setAssignVideoId] = useState("");
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState("");

    const readyVideos = useMemo(() => videos.filter(v => v.status === "ready"), [videos]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp =>
            emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
            emp.dept.toLowerCase().includes(employeeSearch.toLowerCase())
        );
    }, [employees, employeeSearch]);

    const handleToggleEmployee = (id: number) => {
        setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(empId => empId !== id) : [...prev, id]);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignVideoId) { toast.error("Please select a video."); return; }
        if (selectedEmployeeIds.length === 0) { toast.error("Please select at least one employee."); return; }
        onAssign(Number(assignVideoId), selectedEmployeeIds);
        setSelectedEmployeeIds([]);
        setAssignVideoId("");
        onOpenChange(false);
    };

    const selectedVideo = videos.find(v => v.id === Number(assignVideoId));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] rounded-3xl p-0 overflow-hidden">
                <div className="px-7 pt-7 pb-5 border-b">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                            <UserPlus className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight">Assign Training Course</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Select a course and assign it to your team members
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-5">
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
                </div>

                <form onSubmit={handleSubmit} className="px-7 pb-7 pt-2 space-y-5 overflow-y-auto max-h-[calc(90vh-200px)]">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                            <Video className="h-3 w-3" />
                            Select Training Course
                            <span className="text-destructive">*</span>
                        </Label>
                        <Select value={assignVideoId} onValueChange={setAssignVideoId}>
                            <SelectTrigger className="h-12 text-sm rounded-xl">
                                <SelectValue placeholder="Choose a course to assign..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {readyVideos.map(v => (
                                    <SelectItem key={v.id} value={String(v.id)} className="rounded-lg">
                                        <div className="flex items-center gap-3 py-0.5">
                                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Play className="h-3 w-3 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold">{v.title}</p>
                                                <p className="text-[9px] text-muted-foreground">{v.category} &bull; {v.duration}</p>
                                            </div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedVideo && (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/[0.03] border border-primary/10">
                                <div className="w-16 aspect-video rounded-lg bg-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Play className="h-4 w-4 text-primary/70" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate">{selectedVideo.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge className={cn("text-[8px] font-bold px-1.5 py-0 rounded-md border", getCategoryColor(selectedVideo.category))}>
                                            {selectedVideo.category}
                                        </Badge>
                                        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-2 w-2" />{selectedVideo.duration}
                                        </span>
                                        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                            <Eye className="h-2 w-2" />{selectedVideo.views} views
                                        </span>
                                    </div>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[8px] font-bold rounded-md">
                                    <CheckCircle2 className="h-2 w-2 mr-0.5" />
                                    Ready
                                </Badge>
                            </div>
                        )}
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
                            {!assignVideoId && !selectedEmployeeIds.length
                                ? "Select a course and team members to assign"
                                : !assignVideoId
                                    ? "Select a course to continue"
                                    : selectedEmployeeIds.length === 0
                                        ? "Select at least one team member"
                                        : `Ready to assign to ${selectedEmployeeIds.length} member${selectedEmployeeIds.length > 1 ? "s" : ""}`
                            }
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="rounded-xl h-10 px-5 text-sm font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!assignVideoId || selectedEmployeeIds.length === 0 || isAssigning}
                                className="rounded-xl h-10 px-6 flex items-center gap-2 text-sm font-semibold"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                {isAssigning ? "Assigning..." : "Assign Course"}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AssignCourseModal;
