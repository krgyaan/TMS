import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    Plus,
    UserPlus,
    CheckCircle2,
    Clock,
    Users,
    Video,
    ThumbsUp,
    Lightbulb,
    HelpCircle,
    Trash2,
    Search,
    BookOpen,
    Play,
    Loader2,
    Upload,
    FileVideo,
    ChevronDown,
    ChevronRight,
    GraduationCap,
    TrendingUp,
    Eye,
    X,
    Sparkles,
    Film,
    CloudUpload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
};

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
};

const MOCK_EMPLOYEES = [
    { id: 101, name: "Aarav Sharma", dept: "Tendering", designation: "Executive", avatar: "AS" },
    { id: 102, name: "Ishita Patel", dept: "Operations", designation: "Engineer", avatar: "IP" },
    { id: 103, name: "Kabir Mehta", dept: "Services", designation: "Field Engineer", avatar: "KM" },
    { id: 104, name: "Meera Nair", dept: "Accounts", designation: "Team Leader", avatar: "MN" },
    { id: 105, name: "Rohan Das", dept: "HR", designation: "Coordinator", avatar: "RD" }
];

const TrainingVideos = () => {
    const navigate = useNavigate();

    const [videos, setVideos] = useState([
        {
            id: 1,
            title: "Introduction to Company Values & Culture",
            category: "Onboarding",
            duration: "12m 45s",
            resolution: "1920x1080",
            size: "45.2 MB",
            views: 32,
            completionRate: 88,
            status: "ready",
            isPublished: true,
            reactions: { helpful: 18, important: 8, confusing: 1 }
        },
        {
            id: 2,
            title: "Information Security & Cyber Awareness",
            category: "Compliance",
            duration: "24m 10s",
            resolution: "1920x1080",
            size: "110.5 MB",
            views: 28,
            completionRate: 92,
            status: "ready",
            isPublished: true,
            reactions: { helpful: 22, important: 14, confusing: 0 }
        },
        {
            id: 3,
            title: "Government Tender Submission Guidelines",
            category: "Tendering",
            duration: "18m 30s",
            resolution: "1280x720",
            size: "65.8 MB",
            views: 15,
            completionRate: 65,
            status: "ready",
            isPublished: true,
            reactions: { helpful: 10, important: 5, confusing: 3 }
        },
        {
            id: 4,
            title: "Site Kick-off & DC Installation Procedures",
            category: "Operations",
            duration: "35m 15s",
            resolution: "1920x1080",
            size: "182.4 MB",
            views: 8,
            completionRate: 40,
            status: "ready",
            isPublished: false,
            reactions: { helpful: 2, important: 1, confusing: 0 }
        }
    ]);

    const [progressList, setProgressList] = useState([
        { id: 201, userName: "Aarav Sharma", dept: "Tendering", videoTitle: "Introduction to Company Values & Culture", progress: 100, status: "Completed", completedAt: "2026-06-15" },
        { id: 202, userName: "Aarav Sharma", dept: "Tendering", videoTitle: "Information Security & Cyber Awareness", progress: 60, status: "In Progress", completedAt: null },
        { id: 203, userName: "Ishita Patel", dept: "Operations", videoTitle: "Introduction to Company Values & Culture", progress: 45, status: "In Progress", completedAt: null },
        { id: 204, userName: "Ishita Patel", dept: "Operations", videoTitle: "Site Kick-off & DC Installation Procedures", progress: 100, status: "Completed", completedAt: "2026-06-18" },
        { id: 205, userName: "Kabir Mehta", dept: "Services", videoTitle: "Information Security & Cyber Awareness", progress: 95, status: "Completed", completedAt: "2026-06-17" },
        { id: 206, userName: "Kabir Mehta", dept: "Services", videoTitle: "Government Tender Submission Guidelines", progress: 30, status: "In Progress", completedAt: null },
        { id: 207, userName: "Meera Nair", dept: "Accounts", videoTitle: "Government Tender Submission Guidelines", progress: 10, status: "In Progress", completedAt: null }
    ]);

    const [activeTab, setActiveTab] = useState("courses");
    const [employeeSearch, setEmployeeSearch] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("All");
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [expandedUsers, setExpandedUsers] = useState<string[]>([]);
    const [uploadStep, setUploadStep] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);

    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newCategory, setNewCategory] = useState("Onboarding");
    const [newThreshold, setNewThreshold] = useState("90");
    const [assignVideoId, setAssignVideoId] = useState("");
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);

    const kpis = useMemo(() => {
        const totalCourses = videos.length;
        const totalViews = videos.reduce((acc, v) => acc + v.views, 0);
        const avgCompletion = progressList.length > 0
            ? Math.round(progressList.reduce((acc, p) => acc + p.progress, 0) / progressList.length)
            : 0;
        const activeLearners = new Set(progressList.map(p => p.userName)).size;
        return { totalCourses, totalViews, avgCompletion, activeLearners };
    }, [videos, progressList]);

    const filteredVideos = useMemo(() => {
        return videos.filter(v =>
            v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [videos, searchQuery]);

    // Group progress by user for accordion view
    const groupedProgress = useMemo(() => {
        const filtered = progressList.filter(p => {
            const matchesSearch = p.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.videoTitle.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = deptFilter === "All" || p.dept === deptFilter;
            return matchesSearch && matchesDept;
        });

        const grouped: Record<string, { dept: string; items: typeof progressList }> = {};
        filtered.forEach(p => {
            if (!grouped[p.userName]) {
                grouped[p.userName] = { dept: p.dept, items: [] };
            }
            grouped[p.userName].items.push(p);
        });
        return grouped;
    }, [progressList, searchQuery, deptFilter]);

    const departments = useMemo(() => {
        const depts = new Set(progressList.map(p => p.dept));
        return ["All", ...Array.from(depts)];
    }, [progressList]);

    const handleTogglePublish = (id: number) => {
        setVideos(prev => prev.map(v => {
            if (v.id === id) {
                const nextState = !v.isPublished;
                toast.success(`"${v.title}" has been ${nextState ? "published" : "hidden"}.`);
                return { ...v, isPublished: nextState };
            }
            return v;
        }));
    };

    const handleDeleteVideo = (id: number, title: string) => {
        if (confirm(`Are you sure you want to delete "${title}"?`)) {
            setVideos(prev => prev.filter(v => v.id !== id));
            setProgressList(prev => prev.filter(p => p.videoTitle !== title));
            toast.success("Video deleted successfully.");
        }
    };

    const handleUploadSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) {
            toast.error("Please enter a title.");
            return;
        }

        const newId = Date.now();
        const createdVideo = {
            id: newId,
            title: newTitle,
            category: newCategory,
            duration: "Calculating...",
            resolution: "Processing...",
            size: uploadedFile ? "48.7 MB" : "12.4 MB",
            views: 0,
            completionRate: 0,
            status: "processing" as const,
            isPublished: true,
            reactions: { helpful: 0, important: 0, confusing: 0 }
        };

        setVideos(prev => [createdVideo, ...prev]);
        setIsUploadOpen(false);
        toast.info(`Uploading "${newTitle}"... Processing will start in background.`);

        setNewTitle("");
        setNewDesc("");
        setNewCategory("Onboarding");
        setNewThreshold("90");
        setUploadStep(0);
        setUploadedFile(null);

        setTimeout(() => {
            setVideos(currentVideos => currentVideos.map(v => {
                if (v.id === newId) {
                    toast.success(`"${v.title}" processing complete!`);
                    return { ...v, duration: "8m 12s", resolution: "1920x1080", status: "ready" as const };
                }
                return v;
            }));
        }, 5000);
    };

    const handleAssignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignVideoId) { toast.error("Please select a video."); return; }
        if (selectedEmployeeIds.length === 0) { toast.error("Please select at least one employee."); return; }

        const targetVideo = videos.find(v => v.id === Number(assignVideoId));
        if (!targetVideo) return;

        const newProgressEntries = selectedEmployeeIds.map(empId => {
            const employee = MOCK_EMPLOYEES.find(e => e.id === empId);
            return {
                id: Date.now() + Math.random(),
                userName: employee?.name || "Unknown",
                dept: employee?.dept || "HR",
                videoTitle: targetVideo.title,
                progress: 0,
                status: "In Progress",
                completedAt: null
            };
        });

        setProgressList(prev => {
            const filtered = prev.filter(p =>
                !(p.videoTitle === targetVideo.title && newProgressEntries.some(n => n.userName === p.userName))
            );
            return [...newProgressEntries, ...filtered];
        });

        const employeeNames = selectedEmployeeIds.map(id => MOCK_EMPLOYEES.find(emp => emp.id === id)?.name).join(", ");
        toast.success(`Assigned "${targetVideo.title}" to: ${employeeNames}`);
        setIsAssignOpen(false);
        setSelectedEmployeeIds([]);
        setAssignVideoId("");
    };

    const handleToggleEmployee = (id: number) => {
        setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(empId => empId !== id) : [...prev, id]);
    };

    const toggleUserAccordion = (userName: string) => {
        setExpandedUsers(prev => prev.includes(userName) ? prev.filter(u => u !== userName) : [...prev, userName]);
    };

    const getUserStats = (items: typeof progressList) => {
        const total = items.length;
        const completed = items.filter(i => i.status === "Completed").length;
        const avgProgress = Math.round(items.reduce((acc, i) => acc + i.progress, 0) / total);
        return { total, completed, avgProgress };
    };

    const getInitials = (name: string) => {
        return name.split(" ").map(n => n[0]).join("").toUpperCase();
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            "Onboarding": "bg-blue-500/10 text-blue-600 border-blue-500/20",
            "Compliance": "bg-purple-500/10 text-purple-600 border-purple-500/20",
            "Tendering": "bg-orange-500/10 text-orange-600 border-orange-500/20",
            "Operations": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        };
        return colors[category] || "bg-gray-500/10 text-gray-600 border-gray-500/20";
    };

    const simulateFileDrop = () => {
        setUploadedFile("training_video_2026.mp4");
        setUploadStep(1);
        toast.success("File selected successfully!");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-background text-foreground relative selection:bg-primary/15">
            {/* Decorative Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute -top-[15%] -right-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-primary/[0.04] to-transparent blur-[120px]" />
                <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tr from-primary/[0.03] to-transparent blur-[100px]" />
                <div className="absolute top-[40%] right-[20%] w-[25%] h-[25%] rounded-full bg-primary/[0.02] blur-[80px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative space-y-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <GraduationCap className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                                    Training Center
                                </h1>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Manage courses, track progress, and empower your team
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => navigate(paths.hrms.uploadVideo)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-5 py-2.5 flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/25"
                        >
                            <Plus className="h-4 w-4" />
                            Upload Video
                        </Button>
                        <Button
                            onClick={() => setIsAssignOpen(true)}
                            variant="outline"
                            className="border-border/60 hover:bg-accent hover:text-accent-foreground font-semibold rounded-xl px-5 py-2.5 flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
                        >
                            <UserPlus className="h-4 w-4" />
                            Assign Course
                        </Button>
                    </div>
                </motion.div>

                {/* KPI Cards */}
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {[
                        { label: "Total Courses", value: kpis.totalCourses, icon: Film, color: "text-blue-500", bgColor: "bg-blue-500/10", desc: "Active video courses" },
                        { label: "Total Views", value: kpis.totalViews, icon: Eye, color: "text-violet-500", bgColor: "bg-violet-500/10", desc: "Cumulative watch sessions" },
                        { label: "Avg. Completion", value: `${kpis.avgCompletion}%`, icon: TrendingUp, color: "text-emerald-500", bgColor: "bg-emerald-500/10", desc: "Average learner progress" },
                        { label: "Active Learners", value: kpis.activeLearners, icon: Users, color: "text-orange-500", bgColor: "bg-orange-500/10", desc: "Employees in training" },
                    ].map((kpi, i) => (
                        <motion.div key={kpi.label} variants={fadeInUp}>
                            <Card className="border border-border/30 bg-card/50 backdrop-blur-xl shadow-sm rounded-2xl hover:shadow-md transition-all duration-300 hover:border-border/50 group">
                                <CardContent className="pt-5 pb-4 px-5">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">{kpi.label}</p>
                                            <p className="text-3xl font-extrabold tracking-tight">{kpi.value}</p>
                                            <p className="text-[10px] text-muted-foreground/80">{kpi.desc}</p>
                                        </div>
                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110", kpi.bgColor)}>
                                            <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Navigation + Content */}
                <motion.div variants={scaleIn} initial="hidden" animate="visible" className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/40 backdrop-blur-xl border border-border/30 p-3 rounded-2xl shadow-sm">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                            <TabsList className="grid grid-cols-2 w-full sm:w-[340px] bg-background/60 p-1 rounded-xl h-11">
                                <TabsTrigger value="courses" className="rounded-lg font-semibold text-sm py-2.5 data-[state=active]:shadow-sm transition-all">
                                    <Video className="h-3.5 w-3.5 mr-1.5" />
                                    Courses
                                </TabsTrigger>
                                <TabsTrigger value="progress" className="rounded-lg font-semibold text-sm py-2.5 data-[state=active]:shadow-sm transition-all">
                                    <Users className="h-3.5 w-3.5 mr-1.5" />
                                    Learners
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <div className="flex flex-1 sm:flex-initial items-center gap-3">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={activeTab === "courses" ? "Search videos..." : "Search by name..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-background/60 border-border/40 rounded-xl h-10 w-full focus-visible:ring-primary/50 transition-all"
                                />
                            </div>
                            {activeTab === "progress" && (
                                <Select value={deptFilter} onValueChange={setDeptFilter}>
                                    <SelectTrigger className="w-[150px] bg-background/60 border-border/40 rounded-xl h-10">
                                        <SelectValue placeholder="Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map((dept) => (
                                            <SelectItem key={dept} value={dept}>
                                                {dept === "All" ? "All Departments" : dept}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <Tabs value={activeTab} className="mt-0">
                        {/* COURSES TAB */}
                        <TabsContent value="courses" className="outline-none mt-0">
                            <Card className="border border-border/30 bg-card/50 backdrop-blur-xl shadow-lg rounded-2xl overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/20">
                                        <TableRow className="border-b border-border/30 hover:bg-transparent">
                                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Video Details</TableHead>
                                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Specs</TableHead>
                                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Status</TableHead>
                                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Reactions</TableHead>
                                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground text-center">Visible</TableHead>
                                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <AnimatePresence mode="popLayout">
                                            {filteredVideos.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-16">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center">
                                                                <Video className="h-7 w-7 text-muted-foreground/50" />
                                                            </div>
                                                            <p className="text-sm text-muted-foreground font-medium">No videos found</p>
                                                            <p className="text-xs text-muted-foreground/70">Click "Upload Video" to add your first course</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredVideos.map((video, index) => (
                                                    <motion.tr
                                                        key={video.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 10 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className="hover:bg-muted/8 transition-colors border-b border-border/20 group"
                                                    >
                                                        <TableCell className="align-middle py-4">
                                                            <div className="flex items-start gap-3">
                                                                <div className="w-[72px] aspect-video rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center flex-shrink-0 group-hover:border-primary/25 transition-colors">
                                                                    <Play className="h-5 w-5 text-primary/70" />
                                                                </div>
                                                                <div className="space-y-1.5 min-w-0">
                                                                    <div className="font-semibold text-sm leading-tight text-foreground truncate max-w-[280px]">{video.title}</div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Badge variant="secondary" className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md border", getCategoryColor(video.category))}>
                                                                            {video.category}
                                                                        </Badge>
                                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                            <Clock className="h-2.5 w-2.5" />
                                                                            {video.duration}
                                                                        </span>
                                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                            <Eye className="h-2.5 w-2.5" />
                                                                            {video.views}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="align-middle">
                                                            <div className="text-xs font-semibold">{video.resolution}</div>
                                                            <div className="text-[10px] text-muted-foreground mt-0.5">{video.size}</div>
                                                        </TableCell>
                                                        <TableCell className="align-middle">
                                                            {video.status === "ready" ? (
                                                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] px-2.5 py-0.5 rounded-lg font-bold">
                                                                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                                                    Ready
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] px-2.5 py-0.5 rounded-lg font-bold">
                                                                    <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
                                                                    Processing
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="align-middle">
                                                            <div className="flex items-center gap-3 text-xs">
                                                                <span className="flex items-center gap-1 text-muted-foreground font-semibold">
                                                                    <ThumbsUp className="h-3 w-3 text-blue-500" />
                                                                    {video.reactions.helpful}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-muted-foreground font-semibold">
                                                                    <Lightbulb className="h-3 w-3 text-amber-500" />
                                                                    {video.reactions.important}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-muted-foreground font-semibold">
                                                                    <HelpCircle className="h-3 w-3 text-rose-500" />
                                                                    {video.reactions.confusing}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="align-middle text-center">
                                                            <Switch
                                                                checked={video.isPublished}
                                                                onCheckedChange={() => handleTogglePublish(video.id)}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="align-middle text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteVideo(video.id, video.title)}
                                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </motion.tr>
                                                ))
                                            )}
                                        </AnimatePresence>
                                    </TableBody>
                                </Table>
                            </Card>
                        </TabsContent>

                        {/* LEARNERS PROGRESS TAB - ACCORDION */}
                        <TabsContent value="progress" className="outline-none mt-0">
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {Object.keys(groupedProgress).length === 0 ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="flex flex-col items-center justify-center py-20"
                                        >
                                            <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
                                                <Users className="h-8 w-8 text-muted-foreground/50" />
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">No learner records found</p>
                                            <p className="text-xs text-muted-foreground/70 mt-1">Assign courses to employees to track their progress</p>
                                        </motion.div>
                                    ) : (
                                        Object.entries(groupedProgress).map(([userName, { dept, items }], index) => {
                                            const isExpanded = expandedUsers.includes(userName);
                                            const stats = getUserStats(items);
                                            const initials = getInitials(userName);

                                            return (
                                                <motion.div
                                                    key={userName}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ delay: index * 0.06 }}
                                                    layout
                                                >
                                                    <Card className={cn(
                                                        "border bg-card/50 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden transition-all duration-300",
                                                        isExpanded ? "border-primary/20 shadow-md shadow-primary/5" : "border-border/30 hover:border-border/50"
                                                    )}>
                                                        {/* Accordion Header */}
                                                        <button
                                                            onClick={() => toggleUserAccordion(userName)}
                                                            className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/5 transition-colors text-left"
                                                        >
                                                            <div className={cn(
                                                                "h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 transition-colors",
                                                                isExpanded
                                                                    ? "bg-primary/15 text-primary border border-primary/20"
                                                                    : "bg-muted/30 text-muted-foreground border border-border/30"
                                                            )}>
                                                                {initials}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="font-bold text-sm">{userName}</h3>
                                                                    <Badge variant="outline" className="text-[9px] font-semibold px-2 py-0 rounded-md border-border/50">
                                                                        {dept}
                                                                    </Badge>
                                                                </div>
                                                                <div className="flex items-center gap-4 mt-1">
                                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                                        {stats.completed}/{stats.total} completed
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground font-medium">
                                                                        Avg: {stats.avgProgress}%
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Mini progress indicator */}
                                                            <div className="hidden sm:flex items-center gap-3">
                                                                <div className="w-24">
                                                                    <Progress
                                                                        value={stats.avgProgress}
                                                                        className={cn("h-1.5 rounded-full", stats.avgProgress === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary")}
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-bold w-10 text-right">{stats.avgProgress}%</span>
                                                            </div>

                                                            <motion.div
                                                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                                                transition={{ duration: 0.2 }}
                                                            >
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            </motion.div>
                                                        </button>

                                                        {/* Accordion Content */}
                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                                                                    className="overflow-hidden"
                                                                >
                                                                    <div className="px-5 pb-4 pt-1 border-t border-border/20">
                                                                        <div className="space-y-2 mt-3">
                                                                            {items.map((item, itemIndex) => (
                                                                                <motion.div
                                                                                    key={item.id}
                                                                                    initial={{ opacity: 0, x: -15 }}
                                                                                    animate={{ opacity: 1, x: 0 }}
                                                                                    transition={{ delay: itemIndex * 0.08 }}
                                                                                    className={cn(
                                                                                        "flex items-center gap-4 p-3.5 rounded-xl border transition-colors",
                                                                                        item.status === "Completed"
                                                                                            ? "bg-emerald-500/[0.03] border-emerald-500/10"
                                                                                            : "bg-background/50 border-border/20 hover:border-border/40"
                                                                                    )}
                                                                                >
                                                                                    <div className={cn(
                                                                                        "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
                                                                                        item.status === "Completed"
                                                                                            ? "bg-emerald-500/10"
                                                                                            : "bg-primary/10"
                                                                                    )}>
                                                                                        {item.status === "Completed" ? (
                                                                                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                                                        ) : (
                                                                                            <Play className="h-4 w-4 text-primary" />
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="text-xs font-semibold truncate">{item.videoTitle}</p>
                                                                                        <div className="flex items-center gap-3 mt-1.5">
                                                                                            <div className="flex-1 max-w-[200px]">
                                                                                                <Progress
                                                                                                    value={item.progress}
                                                                                                    className={cn(
                                                                                                        "h-1.5 rounded-full",
                                                                                                        item.progress === 100 ? "[&>div]:bg-emerald-500" : "[&>div]:bg-primary"
                                                                                                    )}
                                                                                                />
                                                                                            </div>
                                                                                            <span className="text-[10px] font-bold text-muted-foreground w-8">{item.progress}%</span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                                                        {item.status === "Completed" ? (
                                                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] px-2 py-0.5 rounded-md font-bold">
                                                                                                Completed
                                                                                            </Badge>
                                                                                        ) : (
                                                                                            <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[9px] px-2 py-0.5 rounded-md font-bold">
                                                                                                In Progress
                                                                                            </Badge>
                                                                                        )}
                                                                                        {item.completedAt && (
                                                                                            <span className="text-[9px] text-muted-foreground/70">{item.completedAt}</span>
                                                                                        )}
                                                                                    </div>
                                                                                </motion.div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </AnimatePresence>
                            </div>
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </div>


            {/* ═══════════════════════════════════════════════════════
                ASSIGN VIDEO MODAL
            ═══════════════════════════════════════════════════════ */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] rounded-3xl border-border/40 bg-card/95 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden">
                    {/* Gradient Header */}
                    <div className="relative overflow-hidden">
                        {/* Background decorative elements */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-primary/6 to-violet-500/8" />
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
                        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-violet-500/10 blur-3xl" />

                        <div className="relative px-7 pt-7 pb-5">

                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                                    <UserPlus className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-extrabold tracking-tight">Assign Training Course</h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Select a course and assign it to your team members
                                    </p>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex items-center gap-3 mt-5">
                                <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm border border-border/20 px-3 py-1.5 rounded-xl">
                                    <Film className="h-3 w-3 text-primary" />
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                        {videos.filter(v => v.status === "ready").length} courses available
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm border border-border/20 px-3 py-1.5 rounded-xl">
                                    <Users className="h-3 w-3 text-violet-500" />
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                        {MOCK_EMPLOYEES.length} team members
                                    </span>
                                </div>
                                {selectedEmployeeIds.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-1.5 bg-primary/10 border border-primary/15 px-3 py-1.5 rounded-xl"
                                    >
                                        <CheckCircle2 className="h-3 w-3 text-primary" />
                                        <span className="text-[10px] font-bold text-primary">
                                            {selectedEmployeeIds.length} selected
                                        </span>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleAssignSubmit} className="px-7 pb-7 pt-2 space-y-5 overflow-y-auto max-h-[calc(90vh-200px)]">
                        {/* Course Selection */}
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
                                <Video className="h-3 w-3" />
                                Select Training Course
                                <span className="text-destructive">*</span>
                            </Label>
                            <Select value={assignVideoId} onValueChange={setAssignVideoId}>
                                <SelectTrigger className="bg-background/60 border-border/30 rounded-xl h-12 text-sm hover:border-border/50 transition-colors">
                                    <SelectValue placeholder="Choose a course to assign..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {videos.filter(v => v.status === "ready").map(v => (
                                        <SelectItem key={v.id} value={String(v.id)} className="rounded-lg">
                                            <div className="flex items-center gap-3 py-0.5">
                                                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Play className="h-3 w-3 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold">{v.title}</p>
                                                    <p className="text-[9px] text-muted-foreground">{v.category} • {v.duration}</p>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Selected Course Preview */}
                            <AnimatePresence>
                                {assignVideoId && (() => {
                                    const selected = videos.find(v => v.id === Number(assignVideoId));
                                    if (!selected) return null;
                                    const catColor = getCategoryColor(selected.category);
                                    return (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8, height: 0 }}
                                            animate={{ opacity: 1, y: 0, height: "auto" }}
                                            exit={{ opacity: 0, y: -8, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/[0.03] border border-primary/10">
                                                <div className="w-16 aspect-video rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Play className="h-4 w-4 text-primary/70" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate">{selected.title}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge className={cn("text-[8px] font-bold px-1.5 py-0 rounded-md border", catColor)}>
                                                            {selected.category}
                                                        </Badge>
                                                        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                            <Clock className="h-2 w-2" />{selected.duration}
                                                        </span>
                                                        <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                                                            <Eye className="h-2 w-2" />{selected.views} views
                                                        </span>
                                                    </div>
                                                </div>
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[8px] font-bold rounded-md">
                                                    <CheckCircle2 className="h-2 w-2 mr-0.5" />
                                                    Ready
                                                </Badge>
                                            </div>
                                        </motion.div>
                                    );
                                })()}
                            </AnimatePresence>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Team Members</span>
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/40 to-transparent" />
                        </div>

                        {/* Employee Selection */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name or department..."
                                        value={employeeSearch || ""}
                                        onChange={(e) => {
                                            // Using a local handler since employeeSearch may not exist in parent
                                            const target = e.target as HTMLInputElement;
                                            setEmployeeSearch?.(target.value);
                                        }}
                                        className="pl-9 bg-background/50 border-border/30 rounded-xl h-10 text-xs focus-visible:ring-primary/40"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (selectedEmployeeIds.length === MOCK_EMPLOYEES.length) {
                                            setSelectedEmployeeIds([]);
                                        } else {
                                            setSelectedEmployeeIds(MOCK_EMPLOYEES.map(e => e.id));
                                        }
                                    }}
                                    className="rounded-xl h-10 text-[10px] font-bold border-border/30 px-4 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all"
                                >
                                    {selectedEmployeeIds.length === MOCK_EMPLOYEES.length ? (
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

                            {/* Employee Grid */}
                            <div className="border border-border/20 rounded-2xl bg-background/20 p-2 max-h-[280px] overflow-y-auto">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    <AnimatePresence>
                                        {MOCK_EMPLOYEES.map((employee, index) => {
                                            const isSelected = selectedEmployeeIds.includes(employee.id);
                                            return (
                                                <motion.div
                                                    key={employee.id}
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border-2 group",
                                                        isSelected
                                                            ? "bg-primary/[0.06] border-primary/20 shadow-sm shadow-primary/5"
                                                            : "border-transparent hover:bg-muted/8 hover:border-border/20"
                                                    )}
                                                    onClick={() => handleToggleEmployee(employee.id)}
                                                >
                                                    <div className="relative">
                                                        <div className={cn(
                                                            "h-10 w-10 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all duration-300",
                                                            isSelected
                                                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                                                                : "bg-muted/25 text-muted-foreground group-hover:bg-muted/40"
                                                        )}>
                                                            {employee.avatar}
                                                        </div>
                                                        {isSelected && (
                                                            <motion.div
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                exit={{ scale: 0 }}
                                                                className="absolute -top-1 -right-1 h-4.5 w-4.5 rounded-full bg-primary border-2 border-card flex items-center justify-center"
                                                            >
                                                                <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn(
                                                            "text-xs font-bold leading-tight truncate transition-colors",
                                                            isSelected && "text-primary"
                                                        )}>
                                                            {employee.name}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[8px] font-semibold px-1.5 py-0 rounded-md border-border/30 text-muted-foreground"
                                                            >
                                                                {employee.dept}
                                                            </Badge>
                                                            <span className="text-[9px] text-muted-foreground/70">
                                                                {employee.designation}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Selection Summary */}
                            <AnimatePresence>
                                {selectedEmployeeIds.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-primary/[0.03] border border-primary/10 rounded-xl p-3.5">
                                            <div className="flex items-center justify-between mb-2.5">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    Selected Members
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedEmployeeIds([])}
                                                    className="text-[10px] text-muted-foreground hover:text-primary font-semibold underline underline-offset-2 transition-colors"
                                                >
                                                    Clear all
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedEmployeeIds.map(id => {
                                                    const emp = MOCK_EMPLOYEES.find(e => e.id === id);
                                                    if (!emp) return null;
                                                    return (
                                                        <motion.div
                                                            key={id}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            layout
                                                        >
                                                            <Badge
                                                                className="bg-primary/10 text-primary border border-primary/15 text-[10px] font-semibold pl-1 pr-1.5 py-0.5 rounded-lg flex items-center gap-1.5 cursor-default hover:bg-primary/15 transition-colors"
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
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-border/15">
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
                                    onClick={() => setIsAssignOpen(false)}
                                    className="rounded-xl h-10 px-5 text-sm font-semibold hover:bg-muted/10"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!assignVideoId || selectedEmployeeIds.length === 0}
                                    className="bg-primary hover:bg-primary/90 rounded-xl h-10 px-6 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all disabled:opacity-40 disabled:shadow-none flex items-center gap-2 text-sm font-semibold"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Assign Course
                                </Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TrainingVideos;