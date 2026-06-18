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
                            onClick={() => { setIsUploadOpen(true); setUploadStep(0); setUploadedFile(null); }}
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
                UPLOAD VIDEO MODAL — Modern Multi-step
               ═══════════════════════════════════════════════════════ */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-lg rounded-2xl border-border/50 bg-card shadow-2xl p-0 overflow-hidden">
                    {/* Header with gradient */}
                    <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
                        <div className="absolute top-3 right-3">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsUploadOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                                <CloudUpload className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Upload Training Video</h2>
                                <p className="text-[10px] text-muted-foreground">Add a new course to your training library</p>
                            </div>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center gap-2 mt-4">
                            {[0, 1].map((step) => (
                                <div key={step} className="flex items-center gap-2 flex-1">
                                    <div className={cn(
                                        "h-1.5 rounded-full flex-1 transition-all duration-500",
                                        uploadStep >= step ? "bg-primary" : "bg-primary/15"
                                    )} />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-1.5">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Select File</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Course Details</span>
                        </div>
                    </div>

                    <form onSubmit={handleUploadSubmit} className="px-6 pb-6 pt-2">
                        <AnimatePresence mode="wait">
                            {uploadStep === 0 && (
                                <motion.div
                                    key="step0"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-4"
                                >
                                    {/* Drag & Drop Zone */}
                                    <div
                                        onClick={simulateFileDrop}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); simulateFileDrop(); }}
                                        className={cn(
                                            "relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group",
                                            isDragging
                                                ? "border-primary bg-primary/5 scale-[1.02]"
                                                : uploadedFile
                                                    ? "border-emerald-500/30 bg-emerald-500/5"
                                                    : "border-border/60 bg-background/40 hover:border-primary/30 hover:bg-primary/[0.02]"
                                        )}
                                    >
                                        {uploadedFile ? (
                                            <motion.div
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="flex flex-col items-center"
                                            >
                                                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                                                    <FileVideo className="h-7 w-7 text-emerald-500" />
                                                </div>
                                                <span className="text-sm font-bold text-emerald-600">{uploadedFile}</span>
                                                <span className="text-[10px] text-muted-foreground mt-1">48.7 MB • MP4</span>
                                                <Badge className="mt-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] rounded-md">
                                                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                                    File Ready
                                                </Badge>
                                            </motion.div>
                                        ) : (
                                            <>
                                                <div className="h-14 w-14 rounded-2xl bg-muted/20 border border-border/30 flex items-center justify-center mb-3 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                                                    <Upload className="h-7 w-7 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                                                </div>
                                                <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                                                    Drop your video file here
                                                </span>
                                                <span className="text-[10px] text-muted-foreground mt-1">
                                                    or <span className="text-primary font-semibold underline underline-offset-2">click to browse</span>
                                                </span>
                                                <div className="flex items-center gap-3 mt-3">
                                                    <Badge variant="outline" className="text-[9px] font-medium px-2 py-0.5 rounded-md border-border/40">MP4</Badge>
                                                    <Badge variant="outline" className="text-[9px] font-medium px-2 py-0.5 rounded-md border-border/40">MOV</Badge>
                                                    <Badge variant="outline" className="text-[9px] font-medium px-2 py-0.5 rounded-md border-border/40">WEBM</Badge>
                                                    <span className="text-[9px] text-muted-foreground">Max 500 MB</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {uploadedFile && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex justify-end"
                                        >
                                            <Button
                                                type="button"
                                                onClick={() => setUploadStep(1)}
                                                className="bg-primary hover:bg-primary/90 rounded-xl px-6 shadow-md shadow-primary/20"
                                            >
                                                Continue
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {uploadStep === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-4"
                                >
                                    {/* File preview pill */}
                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                                        <FileVideo className="h-4 w-4 text-emerald-500" />
                                        <span className="text-xs font-semibold flex-1">{uploadedFile}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                                            onClick={() => { setUploadStep(0); setUploadedFile(null); }}
                                        >
                                            Change
                                        </Button>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Course Title *</Label>
                                        <Input
                                            id="title"
                                            placeholder="e.g. Health and Safety Guidelines 2026"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            className="bg-background/60 border-border/40 rounded-xl h-10 focus-visible:ring-primary/50 text-sm"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="desc" className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Description</Label>
                                        <Textarea
                                            id="desc"
                                            placeholder="What will employees learn from this course?"
                                            value={newDesc}
                                            onChange={(e) => setNewDesc(e.target.value)}
                                            className="bg-background/60 border-border/40 rounded-xl min-h-[72px] text-sm resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Category</Label>
                                            <Select value={newCategory} onValueChange={setNewCategory}>
                                                <SelectTrigger className="bg-background/60 border-border/40 rounded-xl h-10 text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Onboarding">Onboarding</SelectItem>
                                                    <SelectItem value="Compliance">Compliance</SelectItem>
                                                    <SelectItem value="Tendering">Tendering</SelectItem>
                                                    <SelectItem value="Operations">Operations</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Threshold (%)</Label>
                                            <Input
                                                type="number"
                                                min="10"
                                                max="100"
                                                value={newThreshold}
                                                onChange={(e) => setNewThreshold(e.target.value)}
                                                className="bg-background/60 border-border/40 rounded-xl h-10 text-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 gap-3">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => setUploadStep(0)}
                                            className="rounded-xl text-sm"
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-primary hover:bg-primary/90 rounded-xl px-6 shadow-md shadow-primary/20 flex items-center gap-2"
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Upload & Process
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ═══════════════════════════════════════════════════════
                ASSIGN VIDEO MODAL
               ═══════════════════════════════════════════════════════ */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border-border/50 bg-card shadow-2xl p-0 overflow-hidden">
                    <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
                        <div className="absolute top-3 right-3">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setIsAssignOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                                <UserPlus className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold">Assign Training Course</h2>
                                <p className="text-[10px] text-muted-foreground">Select a course and assign to team members</p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleAssignSubmit} className="px-6 pb-6 pt-2 space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Select Course</Label>
                            <Select value={assignVideoId} onValueChange={setAssignVideoId}>
                                <SelectTrigger className="bg-background/60 border-border/40 rounded-xl h-10 text-sm">
                                    <SelectValue placeholder="Choose a video course..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {videos.filter(v => v.status === "ready").map(v => (
                                        <SelectItem key={v.id} value={String(v.id)}>
                                            <div className="flex items-center gap-2">
                                                <Play className="h-3 w-3 text-primary" />
                                                {v.title}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Select Employees</Label>
                                {selectedEmployeeIds.length > 0 && (
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-bold rounded-md">
                                        {selectedEmployeeIds.length} selected
                                    </Badge>
                                )}
                            </div>
                            <div className="border border-border/30 rounded-xl max-h-[220px] overflow-y-auto bg-background/30 p-1.5 space-y-1">
                                {MOCK_EMPLOYEES.map((employee) => {
                                    const isSelected = selectedEmployeeIds.includes(employee.id);
                                    return (
                                        <motion.div
                                            key={employee.id}
                                            whileTap={{ scale: 0.98 }}
                                            className={cn(
                                                "flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer border",
                                                isSelected
                                                    ? "bg-primary/5 border-primary/15"
                                                    : "border-transparent hover:bg-muted/10"
                                            )}
                                            onClick={() => handleToggleEmployee(employee.id)}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => handleToggleEmployee(employee.id)}
                                                className="pointer-events-none"
                                            />
                                            <div className={cn(
                                                "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                                                isSelected ? "bg-primary/15 text-primary" : "bg-muted/30 text-muted-foreground"
                                            )}>
                                                {employee.avatar}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <div className="text-xs font-bold leading-tight">{employee.name}</div>
                                                <div className="text-[9px] text-muted-foreground mt-0.5">
                                                    {employee.dept} • {employee.designation}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsAssignOpen(false)}
                                className="rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-primary hover:bg-primary/90 rounded-xl px-6 shadow-md shadow-primary/20">
                                Assign Course
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TrainingVideos;