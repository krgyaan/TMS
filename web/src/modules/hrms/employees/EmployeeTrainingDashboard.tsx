import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    Play,
    CheckCircle2,
    Clock,
    Video,
    GraduationCap,
    TrendingUp,
    Award,
    Sparkles,
    Zap,
    Target,
    Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEmployeeAssignments } from "@/hooks/api/useTraining";
import { type VideoCourse as ApiVideoCourse } from "@/services/api/training.service";
import { VideoPlayerView } from "./VideoPlayer";

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const fadeInUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const slideInRight = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const getServerOrigin = () => {
    const base = import.meta.env.VITE_API_URL as string | undefined;
    if (base) {
        try { return new URL(base).origin; } catch { /* fallback */ }
    }
    return "http://localhost:3000";
};

interface VideoCourse {
    id: number;
    title: string;
    description: string;
    category: string;
    duration: string;
    progress: number;
    status: "Assigned" | "In Progress" | "Completed";
    videoUrl: string;
    thumbnailPath?: string | null;
}

const EmployeeTrainingDashboard = () => {
    const { data: apiAssignments = [], isLoading: isAssignmentsLoading } = useEmployeeAssignments();
    const assignments = apiAssignments as any as VideoCourse[];

    const [activeVideo, setActiveVideo] = useState<VideoCourse | null>(null);

    const assignedVideos = useMemo(() => assignments.filter(v => v.status !== "Completed"), [assignments]);
    const completedVideos = useMemo(() => assignments.filter(v => v.status === "Completed"), [assignments]);

    const counts = useMemo(() => ({
        assigned: assignedVideos.length,
        completed: completedVideos.length,
        pending: assignedVideos.filter(v => v.progress === 0).length,
        inProgress: assignedVideos.filter(v => v.progress > 0 && v.progress < 100).length,
        totalProgress: assignedVideos.length > 0
            ? Math.round(assignedVideos.reduce((acc, v) => acc + v.progress, 0) / assignedVideos.length)
            : 0
    }), [assignedVideos, completedVideos]);

    if (isAssignmentsLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <span className="text-sm font-semibold text-muted-foreground">Loading trainings...</span>
                </div>
            </div>
        );
    }

    const getCategoryStyle = (category: string) => {
        const styles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
            "Tendering": { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/20", icon: "📋" },
            "Operations": { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20", icon: "⚙️" },
            "Onboarding": { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20", icon: "🎯" },
            "Compliance": { bg: "bg-purple-500/10", text: "text-purple-600", border: "border-purple-500/20", icon: "🛡️" },
        };
        return styles[category] || { bg: "bg-gray-500/10", text: "text-gray-600", border: "border-gray-500/20", icon: "📄" };
    };

    const handleStartWatch = (video: VideoCourse) => {
        setActiveVideo(video);
        if (video.progress > 0 && video.progress < 90) {
            toast.info(`Resuming from ${video.progress}% — keep going!`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-background text-foreground relative selection:bg-primary/15">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute -top-[20%] -right-[10%] w-[55%] h-[55%] rounded-full bg-gradient-to-br from-primary/[0.04] to-transparent blur-[140px]" />
                <div className="absolute bottom-[5%] -left-[15%] w-[45%] h-[45%] rounded-full bg-gradient-to-tr from-primary/[0.03] to-transparent blur-[120px]" />
                <div className="absolute top-[50%] right-[30%] w-[20%] h-[20%] rounded-full bg-violet-500/[0.02] blur-[80px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
                <AnimatePresence mode="wait">
                    {activeVideo ? (
                        <VideoPlayerView
                            activeVideo={activeVideo}
                            onBack={() => setActiveVideo(null)}
                        />
                    ) : (
                        /* ═══════════════════════════════════════════════════
                           CATALOG / DASHBOARD VIEW
                           ═══════════════════════════════════════════════════ */
                        <motion.div
                            key="catalog-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-8"
                        >
                            {/* Hero Header */}
                            <motion.div
                                initial={{ opacity: 0, y: -15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="relative"
                            >
                                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center shadow-lg shadow-primary/10">
                                                <GraduationCap className="h-5.5 w-5.5 text-primary" />
                                            </div>
                                            <div>
                                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                                    My Training
                                                </h1>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Complete your courses
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Stats Cards Row */}
                            <motion.div
                                variants={staggerContainer}
                                initial="hidden"
                                animate="visible"
                                className="grid grid-cols-2 lg:grid-cols-4 gap-4"
                            >
                                {[
                                    { label: "Assigned", value: counts.assigned, icon: Target, color: "text-blue-500", bgColor: "bg-blue-500/10", desc: "Courses to complete" },
                                    { label: "In Progress", value: counts.inProgress, icon: Zap, color: "text-amber-500", bgColor: "bg-amber-500/10", desc: "Currently watching" },
                                    { label: "Completed", value: counts.completed, icon: Trophy, color: "text-emerald-500", bgColor: "bg-emerald-500/10", desc: "Courses finished" },
                                    { label: "Avg. Progress", value: `${counts.totalProgress}%`, icon: TrendingUp, color: "text-violet-500", bgColor: "bg-violet-500/10", desc: "Overall completion" },
                                ].map((stat) => (
                                    <motion.div key={stat.label} variants={fadeInUp}>
                                        <Card className="border border-border/25 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl hover:shadow-md hover:border-border/40 transition-all duration-300 group">
                                            <CardContent className="pt-4 pb-3.5 px-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.18em]">{stat.label}</p>
                                                        <p className="text-2xl font-extrabold tracking-tight">{stat.value}</p>
                                                        <p className="text-[9px] text-muted-foreground/70">{stat.desc}</p>
                                                    </div>
                                                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110", stat.bgColor)}>
                                                        <stat.icon className={cn("h-4.5 w-4.5", stat.color)} />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* Course Catalog Tabs */}
                            <motion.div
                                variants={scaleIn}
                                initial="hidden"
                                animate="visible"
                                className="space-y-5"
                            >
                                <Tabs defaultValue="assigned" className="w-full">
                                    <div className="flex items-center justify-between mb-5">
                                        <TabsList className="bg-card/50 backdrop-blur-xl border border-border/30 p-1 rounded-xl w-full sm:w-[320px] grid grid-cols-2 shadow-sm h-11">
                                            <TabsTrigger value="assigned" className="rounded-lg font-semibold text-sm py-2.5 data-[state=active]:shadow-sm transition-all">
                                                <Play className="h-3.5 w-3.5 mr-1.5" />
                                                Active ({counts.assigned})
                                            </TabsTrigger>
                                            <TabsTrigger value="completed" className="rounded-lg font-semibold text-sm py-2.5 data-[state=active]:shadow-sm transition-all">
                                                <Award className="h-3.5 w-3.5 mr-1.5" />
                                                Completed ({counts.completed})
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    {/* Assigned Videos */}
                                    <TabsContent value="assigned" className="outline-none mt-0">
                                        {assignedVideos.length === 0 ? (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                                <Card className="border border-border/20 bg-card/30 text-center py-16 rounded-2xl">
                                                    <div className="flex flex-col items-center">
                                                        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                                                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                                        </div>
                                                        <CardTitle className="text-lg font-bold">All Caught Up! 🎉</CardTitle>
                                                        <CardDescription className="text-xs mt-1.5 max-w-sm">
                                                            You've completed all your assigned training courses. Great job!
                                                        </CardDescription>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                variants={staggerContainer}
                                                initial="hidden"
                                                animate="visible"
                                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                                            >
                                                {assignedVideos.map((video) => {
                                                    const catStyle = getCategoryStyle(video.category);
                                                    return (
                                                        <motion.div variants={fadeInUp} key={video.id}>
                                                            <Card className="group overflow-hidden border border-border/25 bg-card/40 backdrop-blur-xl hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 rounded-2xl flex flex-col cursor-pointer"
                                                                onClick={() => handleStartWatch(video)}
                                                            >
                                                                {/* Thumbnail */}
                                                                <div className="relative aspect-video bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center flex-shrink-0 border-b border-border/15 overflow-hidden">
                                                                    {/* Thumbnail image or gradient placeholder */}
                                                                    {video.thumbnailPath ? (
                                                                        <img
                                                                            src={`${getServerOrigin()}/${video.thumbnailPath}`}
                                                                            alt={video.title}
                                                                            className="absolute inset-0 w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-muted/20 to-muted/10" />
                                                                    )}
                                                                    {/* Animated gradient overlay */}
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                                    {/* Play button */}
                                                                    <div className="relative z-10 h-14 w-14 rounded-2xl bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-primary/40 transition-all duration-500">
                                                                        <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
                                                                    </div>

                                                                    {/* Duration Pill */}
                                                                    <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                                                                        {video.duration}
                                                                    </div>

                                                                    {/* Category */}
                                                                    <div className={cn(
                                                                        "absolute top-2.5 left-2.5 text-[9px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-sm",
                                                                        catStyle.bg, catStyle.text, catStyle.border
                                                                    )}>
                                                                        {catStyle.icon} {video.category}
                                                                    </div>

                                                                    {/* Progress on thumbnail */}
                                                                    {video.progress > 0 && (
                                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                                                                            <div
                                                                                className="h-full bg-primary rounded-r-full transition-all duration-300"
                                                                                style={{ width: `${video.progress}%` }}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Content */}
                                                                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                                                                    <div className="space-y-1.5">
                                                                        <h3 className="font-bold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                                                            {video.title}
                                                                        </h3>
                                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                                            {video.description}
                                                                        </p>
                                                                    </div>

                                                                    {/* Progress + CTA */}
                                                                    <div className="space-y-3 pt-3 border-t border-border/10">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-1.5">
                                                                                {video.progress > 0 ? (
                                                                                    <Clock className="h-3 w-3 text-amber-500" />
                                                                                ) : (
                                                                                    <Sparkles className="h-3 w-3 text-primary" />
                                                                                )}
                                                                                <span className="text-[10px] font-bold text-muted-foreground">
                                                                                    {video.progress > 0 ? `${video.progress}% watched` : "Not started"}
                                                                                </span>
                                                                            </div>
                                                                            <Badge variant="outline" className={cn(
                                                                                "text-[9px] font-bold px-2 py-0 rounded-md border",
                                                                                video.progress > 0 ? "border-amber-500/20 text-amber-600" : "border-border/40 text-muted-foreground"
                                                                            )}>
                                                                                {video.status}
                                                                            </Badge>
                                                                        </div>
                                                                        <Progress
                                                                            value={video.progress}
                                                                            className="h-1.5 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/80"
                                                                        />
                                                                        <Button
                                                                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs py-2.5 rounded-xl shadow-md shadow-primary/15 group-hover:shadow-lg group-hover:shadow-primary/25 transition-all flex items-center gap-2"
                                                                            onClick={(e) => { e.stopPropagation(); handleStartWatch(video); }}
                                                                        >
                                                                            {video.progress > 0 ? (
                                                                                <>
                                                                                    <Play className="h-3.5 w-3.5" />
                                                                                    Resume Training
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Sparkles className="h-3.5 w-3.5" />
                                                                                    Start Course
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        </motion.div>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </TabsContent>

                                    {/* Completed Videos */}
                                    <TabsContent value="completed" className="outline-none mt-0">
                                        {completedVideos.length === 0 ? (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                                <Card className="border border-border/20 bg-card/30 text-center py-16 rounded-2xl">
                                                    <div className="flex flex-col items-center">
                                                        <div className="h-16 w-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4">
                                                            <Video className="h-8 w-8 text-muted-foreground/40" />
                                                        </div>
                                                        <CardTitle className="text-lg font-bold">No Completions Yet</CardTitle>
                                                        <CardDescription className="text-xs mt-1.5">
                                                            Start watching your assigned courses to see them here
                                                        </CardDescription>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                variants={staggerContainer}
                                                initial="hidden"
                                                animate="visible"
                                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                                            >
                                                {completedVideos.map((video) => {
                                                    const catStyle = getCategoryStyle(video.category);
                                                    return (
                                                        <motion.div variants={fadeInUp} key={video.id}>
                                                            <Card className="group overflow-hidden border border-emerald-500/15 bg-card/40 backdrop-blur-xl rounded-2xl flex flex-col hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                                                                {/* Completed Thumbnail */}
                                                                <div className="relative aspect-video bg-gradient-to-br from-emerald-500/5 to-muted/10 flex items-center justify-center flex-shrink-0 border-b border-emerald-500/10 overflow-hidden">
                                                                    {video.thumbnailPath ? (
                                                                        <img
                                                                            src={`${getServerOrigin()}/${video.thumbnailPath}`}
                                                                            alt={video.title}
                                                                            className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity duration-500"
                                                                        />
                                                                    ) : (
                                                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-muted/20 to-muted/10" />
                                                                    )}
                                                                    <div className="absolute inset-0 bg-black/20" />

                                                                    <div className="relative z-10 h-14 w-14 rounded-2xl bg-emerald-500/90 backdrop-blur-sm flex items-center justify-center shadow-xl shadow-emerald-500/20 group-hover:scale-110 group-hover:shadow-emerald-500/30 transition-all duration-500">
                                                                        <CheckCircle2 className="h-7 w-7 text-white" />
                                                                    </div>
                                                                    <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10">
                                                                        {video.duration}
                                                                    </div>
                                                                    <div className={cn(
                                                                        "absolute top-2.5 left-2.5 text-[9px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-sm z-10",
                                                                        catStyle.bg, catStyle.text, catStyle.border
                                                                    )}>
                                                                        {catStyle.icon} {video.category}
                                                                    </div>
                                                                    {/* Full progress bar */}
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 z-10" />
                                                                </div>

                                                                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                                                                    <div className="space-y-1.5">
                                                                        <h3 className="font-bold text-sm leading-snug line-clamp-2">
                                                                            {video.title}
                                                                        </h3>
                                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                                            {video.description}
                                                                        </p>
                                                                    </div>

                                                                    <div className="space-y-3 pt-3 border-t border-border/10">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <Trophy className="h-3 w-3 text-emerald-500" />
                                                                                <span className="text-[10px] font-bold text-emerald-600">100% Complete</span>
                                                                            </div>
                                                                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-bold px-2 py-0 rounded-md">
                                                                                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                                                                Done
                                                                            </Badge>
                                                                        </div>
                                                                        <Progress value={100} className="h-1.5 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400" />
                                                                        <Button
                                                                            onClick={() => handleStartWatch(video)}
                                                                            variant="outline"
                                                                            className="w-full border-border/30 hover:bg-emerald-500/5 hover:border-emerald-500/20 hover:text-emerald-600 font-semibold text-xs py-2.5 rounded-xl transition-all flex items-center gap-2"
                                                                        >
                                                                            <Play className="h-3.5 w-3.5" />
                                                                            Watch Again
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </Card>
                                                        </motion.div>
                                                    );
                                                })}
                                            </motion.div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default EmployeeTrainingDashboard;