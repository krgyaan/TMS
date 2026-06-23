import React, { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    Play,
    CheckCircle2,
    Clock,
    ArrowLeft,
    ThumbsUp,
    Lightbulb,
    HelpCircle,
    MessageSquare,
    BookOpen,
    Send,
    Video,
    CornerDownRight,
    GraduationCap,
    TrendingUp,
    Eye,
    Pause,
    Volume2,
    Maximize,
    SkipForward,
    Award,
    Flame,
    Star,
    ChevronRight,
    Sparkles,
    Zap,
    Target,
    Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    useEmployeeAssignments,
    useLogProgress,
    useVideoReactions,
    useAddReaction,
    useRemoveReaction,
    useVideoComments,
    useAddComment
} from "@/hooks/api/useTraining";
import { type VideoCourse as ApiVideoCourse } from "@/services/api/training.service";

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

interface CommentReply {
    id: number;
    userName: string;
    body: string;
    createdAt: string;
}

interface Comment {
    id: number;
    userName: string;
    body: string;
    createdAt: string;
    replies: CommentReply[];
}

const EmployeeTrainingDashboard = () => {
    const { data: apiAssignments = [], isLoading: isAssignmentsLoading } = useEmployeeAssignments();
    const assignments = apiAssignments as any as VideoCourse[];

    const [activeVideo, setActiveVideo] = useState<VideoCourse | null>(null);

    // Fetch comments and reactions for active video
    const { data: activeVideoComments = [] } = useVideoComments(activeVideo?.id ?? 0, !!activeVideo);
    const { data: activeVideoReactions = { helpful: 0, important: 0, confusing: 0, myReaction: null } } = useVideoReactions(activeVideo?.id ?? 0, !!activeVideo);

    const logProgressMutation = useLogProgress();
    const addCommentMutation = useAddComment(activeVideo?.id ?? 0);
    const addReactionMutation = useAddReaction(activeVideo?.id ?? 0);
    const removeReactionMutation = useRemoveReaction(activeVideo?.id ?? 0);

    const [commentText, setCommentText] = useState("");
    const [replyTextMap, setReplyTextMap] = useState<Record<number, string>>({});
    const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const lastPingTimeRef = useRef<number>(0);

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
            "Onboarding": { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20", icon: "🎯" },
            "Compliance": { bg: "bg-purple-500/10", text: "text-purple-600", border: "border-purple-500/20", icon: "🛡️" },
            "Tendering": { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/20", icon: "📋" },
            "Operations": { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20", icon: "⚙️" },
        };
        return styles[category] || { bg: "bg-gray-500/10", text: "text-gray-600", border: "border-gray-500/20", icon: "📄" };
    };

    const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

    const handleTimeUpdate = () => {
        if (!videoRef.current || !activeVideo) return;
        const video = videoRef.current;
        if (video.duration) {
            const currentPct = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
            
            if (currentPct !== activeVideo.progress && currentPct <= 100) {
                setActiveVideo(prev => prev ? { ...prev, progress: currentPct } : null);
            }

            const nowTime = Date.now();
            const elapsedSinceLastPing = nowTime - lastPingTimeRef.current;
            const threshold = activeVideo.completionThreshold || 90;

            if (elapsedSinceLastPing >= 15000 || (currentPct >= threshold && activeVideo.progress < threshold)) {
                lastPingTimeRef.current = nowTime;
                logProgressMutation.mutate({
                    videoId: activeVideo.id,
                    lastPositionSecs: Math.round(video.currentTime),
                    totalWatchSecs: Math.round(Math.max(1, elapsedSinceLastPing / 1000)),
                    completionPct: currentPct
                });

                if (currentPct >= threshold && activeVideo.progress < threshold) {
                    toast.success(`🎉 Congratulations! You completed "${activeVideo.title}"`);
                }
            }
        }
    };

    const handleStartWatch = (video: VideoCourse) => {
        setActiveVideo(video);
        lastPingTimeRef.current = Date.now();
        if (video.progress > 0 && video.progress < 90) {
            toast.info(`Resuming from ${video.progress}% — keep going!`);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current && activeVideo) {
            const duration = videoRef.current.duration;
            if (duration) {
                videoRef.current.currentTime = (activeVideo.progress / 100) * duration;
            }
        }
    };

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !activeVideo) return;
        addCommentMutation.mutate({ body: commentText }, {
            onSuccess: () => {
                setCommentText("");
            }
        });
    };

    const handleAddReply = (commentId: number) => {
        const replyText = replyTextMap[commentId];
        if (!replyText?.trim() || !activeVideo) return;
        addCommentMutation.mutate({ body: replyText, parentCommentId: commentId }, {
            onSuccess: () => {
                setReplyTextMap(prev => ({ ...prev, [commentId]: "" }));
                setActiveReplyId(null);
            }
        });
    };

    const handleReaction = (reactionType: "helpful" | "important" | "confusing") => {
        if (!activeVideo) return;
        if (activeVideoReactions.myReaction === reactionType) {
            removeReactionMutation.mutate(reactionType);
        } else {
            addReactionMutation.mutate(reactionType);
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
                        /* ═══════════════════════════════════════════════════
                           VIDEO PLAYER VIEW
                           ═══════════════════════════════════════════════════ */
                        <motion.div
                            key="player-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="space-y-6"
                        >
                            {/* Top Navigation Bar */}
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="flex items-center justify-between"
                            >
                                <Button
                                    variant="ghost"
                                    onClick={() => setActiveVideo(null)}
                                    className="border border-border/30 bg-card/50 backdrop-blur-xl hover:bg-accent rounded-xl group h-10 px-4"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                                    <span className="text-sm font-semibold">Back to Dashboard</span>
                                </Button>
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <GraduationCap className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                                        Training Platform
                                    </span>
                                </div>
                            </motion.div>

                            {/* Player + Sidebar Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left — Video Player & Details */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.15, duration: 0.5 }}
                                    className="lg:col-span-2 space-y-5"
                                >
                                    {/* Video Player Container */}
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-violet-500/20 rounded-[22px] blur-xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                                        <div className="relative w-full aspect-video rounded-2xl bg-black border border-border/30 overflow-hidden shadow-2xl shadow-black/20">
                                            <video
                                                ref={videoRef}
                                                src={activeVideo.videoUrl?.startsWith('http') ? activeVideo.videoUrl : `${import.meta.env.VITE_API_URL || '/api/v1'}/hrms/training/${activeVideo.id}/stream`}
                                                controls
                                                className="w-full h-full object-contain"
                                                onTimeUpdate={handleTimeUpdate}
                                                onLoadedMetadata={handleLoadedMetadata}
                                            />
                                        </div>
                                    </div>

                                    {/* Video Info Card */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25 }}
                                    >
                                        <Card className="border border-border/25 bg-card/40 backdrop-blur-xl rounded-2xl shadow-lg overflow-hidden">
                                            <CardContent className="p-6 space-y-5">
                                                {/* Title Section */}
                                                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                                    <div className="space-y-2.5 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {(() => {
                                                                const style = getCategoryStyle(activeVideo.category);
                                                                return (
                                                                    <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-lg border", style.bg, style.text, style.border)}>
                                                                        <span className="mr-1">{style.icon}</span>
                                                                        {activeVideo.category}
                                                                    </Badge>
                                                                );
                                                            })()}
                                                            {activeVideo.status === "Completed" && (
                                                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg font-bold text-[10px] px-2.5 py-0.5">
                                                                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                                                    Completed
                                                                </Badge>
                                                            )}
                                                            <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-lg border-border/40">
                                                                <Clock className="h-2.5 w-2.5 mr-1" />
                                                                {activeVideo.duration}
                                                            </Badge>
                                                        </div>
                                                        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
                                                            {activeVideo.title}
                                                        </h2>
                                                        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                                                            {activeVideo.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Reactions */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {(() => {
                                                        const r = activeVideoReactions || { helpful: 0, important: 0, confusing: 0, myReaction: null };
                                                        const reactions = [
                                                            { type: "helpful" as const, label: "Helpful", icon: ThumbsUp, count: r.helpful, activeColor: "bg-blue-500 text-white border-blue-500 shadow-blue-500/25" },
                                                            { type: "important" as const, label: "Key Info", icon: Lightbulb, count: r.important, activeColor: "bg-amber-500 text-white border-amber-500 shadow-amber-500/25" },
                                                            { type: "confusing" as const, label: "Confusing", icon: HelpCircle, count: r.confusing, activeColor: "bg-rose-500 text-white border-rose-500 shadow-rose-500/25" },
                                                        ];
                                                        return reactions.map(rx => (
                                                            <motion.div key={rx.type} whileTap={{ scale: 0.95 }}>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleReaction(rx.type)}
                                                                    className={cn(
                                                                        "rounded-xl flex items-center gap-1.5 h-9 font-semibold text-xs border transition-all duration-300",
                                                                        r.myReaction === rx.type
                                                                            ? cn(rx.activeColor, "shadow-md")
                                                                            : "border-border/40 hover:border-border/60 text-muted-foreground hover:text-foreground"
                                                                    )}
                                                                >
                                                                    <rx.icon className="h-3.5 w-3.5" />
                                                                    {rx.label}
                                                                    <span className={cn(
                                                                        "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                                                        r.myReaction === rx.type ? "bg-white/20" : "bg-muted/50"
                                                                    )}>
                                                                        {rx.count}
                                                                    </span>
                                                                </Button>
                                                            </motion.div>
                                                        ));
                                                    })()}
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="space-y-3 pt-4 border-t border-border/20">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "h-7 w-7 rounded-lg flex items-center justify-center",
                                                                activeVideo.progress >= 90 ? "bg-emerald-500/10" : "bg-primary/10"
                                                            )}>
                                                                {activeVideo.progress >= 90 ? (
                                                                    <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                                                                ) : (
                                                                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                                                )}
                                                            </div>
                                                            <span className="text-xs font-bold">Your Progress</span>
                                                        </div>
                                                        <span className={cn(
                                                            "text-sm font-extrabold",
                                                            activeVideo.progress >= 90 ? "text-emerald-500" : "text-foreground"
                                                        )}>
                                                            {activeVideo.progress}%
                                                        </span>
                                                    </div>
                                                    <div className="relative">
                                                        <Progress
                                                            value={activeVideo.progress}
                                                            className={cn(
                                                                "h-2.5 rounded-full",
                                                                activeVideo.progress >= 90 ? "[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400" : "[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/80"
                                                            )}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                                        <Sparkles className="h-2.5 w-2.5" />
                                                        Watch past 90% to earn completion credit
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                </motion.div>

                                {/* Right — Discussion Panel */}
                                <motion.div
                                    variants={slideInRight}
                                    initial="hidden"
                                    animate="visible"
                                    transition={{ delay: 0.3 }}
                                    className="flex flex-col"
                                >
                                    <Card className="border border-border/25 bg-card/40 backdrop-blur-xl rounded-2xl shadow-lg flex flex-col h-[600px] overflow-hidden">
                                        {/* Panel Header */}
                                        <div className="px-5 py-4 border-b border-border/20 flex items-center gap-3 bg-card/60">
                                            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                                                <MessageSquare className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm">Discussion</h3>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {activeVideoComments.length} comments
                                                </p>
                                            </div>
                                        </div>

                                        {/* Comment Input */}
                                        <div className="px-4 py-3 border-b border-border/15">
                                            <form onSubmit={handleAddComment} className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-[10px] font-bold text-primary">Y</span>
                                                </div>
                                                <Input
                                                    placeholder="Share your thoughts..."
                                                    value={commentText}
                                                    onChange={(e) => setCommentText(e.target.value)}
                                                    className="bg-background/50 border-border/30 rounded-xl h-9 text-xs focus-visible:ring-primary/40 flex-1"
                                                />
                                                <motion.div whileTap={{ scale: 0.9 }}>
                                                    <Button
                                                        type="submit"
                                                        size="icon"
                                                        disabled={!commentText.trim()}
                                                        className="h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shrink-0 shadow-md shadow-primary/20 disabled:opacity-40"
                                                    >
                                                        <Send className="h-3.5 w-3.5" />
                                                    </Button>
                                                </motion.div>
                                            </form>
                                        </div>

                                        {/* Comments Scroll Area */}
                                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                                            {activeVideoComments.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                                    <div className="h-12 w-12 rounded-2xl bg-muted/20 flex items-center justify-center mb-3">
                                                        <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
                                                    </div>
                                                    <p className="text-xs font-semibold text-muted-foreground">No comments yet</p>
                                                    <p className="text-[10px] text-muted-foreground/60 mt-1">Be the first to share your thoughts!</p>
                                                </div>
                                            ) : (
                                                activeVideoComments.map((comment, ci) => (
                                                    <motion.div
                                                        key={comment.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: ci * 0.05 }}
                                                        className="space-y-2"
                                                    >
                                                        {/* Parent Comment */}
                                                        <div className="bg-background/40 border border-border/15 p-3.5 rounded-xl space-y-2 hover:border-border/30 transition-colors">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={cn(
                                                                    "h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                                                                    comment.userName === "You" ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground"
                                                                )}>
                                                                    {getInitials(comment.userName)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="text-xs font-bold">{comment.userName}</span>
                                                                    <span className="text-[9px] text-muted-foreground/70 ml-2">{comment.createdAt}</span>
                                                                </div>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground leading-relaxed pl-[38px]">{comment.body}</p>
                                                            <div className="pl-[38px]">
                                                                <Button
                                                                    variant="ghost"
                                                                    onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                                                                    className="p-0 h-auto text-[10px] text-primary hover:text-primary/80 font-bold hover:bg-transparent"
                                                                >
                                                                    Reply
                                                                </Button>
                                                            </div>

                                                            {/* Reply Input */}
                                                            <AnimatePresence>
                                                                {activeReplyId === comment.id && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: "auto", opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.2 }}
                                                                        className="overflow-hidden pl-[38px]"
                                                                    >
                                                                        <div className="flex items-center gap-2 pt-2 border-t border-border/10">
                                                                            <Input
                                                                                placeholder="Write a reply..."
                                                                                value={replyTextMap[comment.id] || ""}
                                                                                onChange={(e) => setReplyTextMap({ ...replyTextMap, [comment.id]: e.target.value })}
                                                                                className="bg-background/60 border-border/30 h-8 text-[11px] rounded-lg focus-visible:ring-primary/40 flex-1"
                                                                                autoFocus
                                                                            />
                                                                            <Button
                                                                                size="sm"
                                                                                onClick={() => handleAddReply(comment.id)}
                                                                                className="h-8 bg-primary hover:bg-primary/90 rounded-lg text-xs px-3 shadow-sm"
                                                                            >
                                                                                Post
                                                                            </Button>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>

                                                        {/* Replies */}
                                                        {comment.replies.map((reply, ri) => (
                                                            <motion.div
                                                                key={reply.id}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: ri * 0.05 }}
                                                                className="flex gap-2 pl-5"
                                                            >
                                                                <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 mt-3" />
                                                                <div className="flex-1 bg-muted/10 border border-border/10 p-3 rounded-xl space-y-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={cn(
                                                                            "h-6 w-6 rounded-md flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                                                                            reply.userName === "You" ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground"
                                                                        )}>
                                                                            {getInitials(reply.userName)}
                                                                        </div>
                                                                        <span className="text-[11px] font-bold">{reply.userName}</span>
                                                                        <span className="text-[9px] text-muted-foreground/60">{reply.createdAt}</span>
                                                                    </div>
                                                                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-8">{reply.body}</p>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </Card>
                                </motion.div>
                            </div>
                        </motion.div>
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
                                                    Complete your courses and earn certifications
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Welcome Badge */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="flex items-center gap-2 bg-card/50 backdrop-blur-xl border border-border/30 px-4 py-2.5 rounded-2xl shadow-sm"
                                    >
                                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
                                            <Flame className="h-4 w-4 text-amber-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground font-medium">Learning Streak</p>
                                            <p className="text-xs font-bold">3 days active</p>
                                        </div>
                                    </motion.div>
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
                                                                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                                        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                                                                    </div>
                                                                    <div className="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                                                                        {video.duration}
                                                                    </div>
                                                                    <div className={cn(
                                                                        "absolute top-2.5 left-2.5 text-[9px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-sm",
                                                                        catStyle.bg, catStyle.text, catStyle.border
                                                                    )}>
                                                                        {catStyle.icon} {video.category}
                                                                    </div>
                                                                    {/* Full progress bar */}
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
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