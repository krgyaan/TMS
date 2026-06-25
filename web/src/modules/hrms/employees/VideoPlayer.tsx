import React, { useState, useRef, useMemo, useEffect } from "react";
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
    Send,
    CornerDownRight,
    GraduationCap,
    TrendingUp,
    Trophy,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    useLogProgress,
    useVideoReactions,
    useAddReaction,
    useRemoveReaction,
    useVideoComments,
    useAddComment
} from "@/hooks/api/useTraining";
import AvatarComponent from "../onboarding/components/AvatarComponent";
export interface VideoPlayerCourse {
    id: number;
    title: string;
    description?: string | null;
    category: string;
    duration?: string;
    progress?: number;
    status?: string;
    videoUrl?: string;
    thumbnailPath?: string | null;
    completionThreshold?: number;
}

const slideInRight = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" } }
};


const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
        "Tendering": { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/20", icon: "📋" },
        "Operations": { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20", icon: "⚙️" },
        "Onboarding": { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20", icon: "🎯" },
        "Compliance": { bg: "bg-purple-500/10", text: "text-purple-600", border: "border-purple-500/20", icon: "🛡️" },
    };
    return styles[category] || { bg: "bg-gray-500/10", text: "text-gray-600", border: "border-gray-500/20", icon: "📄" };
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

interface VideoPlayerViewProps {
    activeVideo: VideoPlayerCourse;
    onBack: () => void;
    isAdmin?: boolean;
}

export const VideoPlayerView = ({ activeVideo, onBack, isAdmin = false }: VideoPlayerViewProps) => {
    const [currentVideo, setCurrentVideo] = useState<VideoPlayerCourse>(activeVideo);
    
    // Fetch comments and reactions for active video
    const { data: activeVideoComments = [] } = useVideoComments(currentVideo.id, !!currentVideo.id);
    const { data: activeVideoReactions = { helpful: 0, important: 0, confusing: 0, myReaction: null } } = useVideoReactions(currentVideo.id, !!currentVideo.id);

    const logProgressMutation = useLogProgress();
    const addCommentMutation = useAddComment(currentVideo.id);
    const addReactionMutation = useAddReaction(currentVideo.id);
    const removeReactionMutation = useRemoveReaction(currentVideo.id);

    const [commentText, setCommentText] = useState("");
    const [replyTextMap, setReplyTextMap] = useState<Record<number, string>>({});
    const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
    
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const lastPingTimeRef = useRef<number>(0);

    useEffect(() => {
        setCurrentVideo(activeVideo);
        lastPingTimeRef.current = Date.now();
    }, [activeVideo]);

    const handleTimeUpdate = () => {
        if (!videoRef.current || !currentVideo) return;
        const video = videoRef.current;
        if (video.duration) {
            const currentPct = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
            
            if (currentPct !== currentVideo.progress && currentPct <= 100) {
                setCurrentVideo(prev => ({ ...prev, progress: currentPct }));
            }

            if (isAdmin) return; // Admins don't need progress logged

            const nowTime = Date.now();
            const elapsedSinceLastPing = nowTime - lastPingTimeRef.current;
            const threshold = currentVideo.completionThreshold || 90;

            if (elapsedSinceLastPing >= 15000 || (currentPct >= threshold && currentVideo.progress < threshold)) {
                lastPingTimeRef.current = nowTime;
                logProgressMutation.mutate({
                    videoId: currentVideo.id,
                    lastPositionSecs: Math.round(video.currentTime),
                    totalWatchSecs: Math.round(Math.max(1, elapsedSinceLastPing / 1000)),
                    completionPct: currentPct
                });

                if (currentPct >= threshold && currentVideo.progress < threshold) {
                    toast.success(`🎉 Congratulations! You completed "${currentVideo.title}"`);
                }
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current && currentVideo) {
            const duration = videoRef.current.duration;
            if (duration) {
                videoRef.current.currentTime = ((currentVideo.progress || 0) / 100) * duration;
            }
        }
    };

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        addCommentMutation.mutate({ body: commentText }, {
            onSuccess: () => {
                setCommentText("");
            }
        });
    };

    const handleAddReply = (commentId: number) => {
        const replyText = replyTextMap[commentId];
        if (!replyText?.trim()) return;
        addCommentMutation.mutate({ body: replyText, parentCommentId: commentId }, {
            onSuccess: () => {
                setReplyTextMap(prev => ({ ...prev, [commentId]: "" }));
                setActiveReplyId(null);
            }
        });
    };

    const handleReaction = (reactionType: "helpful" | "important" | "confusing") => {
        if (activeVideoReactions.myReaction === reactionType) {
            removeReactionMutation.mutate(reactionType);
        } else {
            addReactionMutation.mutate(reactionType);
        }
    };

    return (
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
                    onClick={onBack}
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
                                src={currentVideo.videoUrl?.startsWith('http') ? currentVideo.videoUrl : `${import.meta.env.VITE_API_URL || '/api/v1'}/hrms/training/${currentVideo.id}/stream`}
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
                                                const style = getCategoryStyle(currentVideo.category);
                                                return (
                                                    <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-lg border", style.bg, style.text, style.border)}>
                                                        <span className="mr-1">{style.icon}</span>
                                                        {currentVideo.category}
                                                    </Badge>
                                                );
                                            })()}
                                            {currentVideo.status === "Completed" && (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg font-bold text-[10px] px-2.5 py-0.5">
                                                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                                                    Completed
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 rounded-lg border-border/40">
                                                <Clock className="h-2.5 w-2.5 mr-1" />
                                                {currentVideo.duration}
                                            </Badge>
                                        </div>
                                        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
                                            {currentVideo.title}
                                        </h2>
                                        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                                            {currentVideo.description}
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
                                                (currentVideo.progress || 0) >= 90 ? "bg-emerald-500/10" : "bg-primary/10"
                                            )}>
                                                {(currentVideo.progress || 0) >= 90 ? (
                                                    <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                                                ) : (
                                                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                                )}
                                            </div>
                                            <span className="text-xs font-bold">Your Progress</span>
                                        </div>
                                        <span className={cn(
                                            "text-sm font-extrabold",
                                            (currentVideo.progress || 0) >= 90 ? "text-emerald-500" : "text-foreground"
                                        )}>
                                            {currentVideo.progress || 0}%
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <Progress
                                            value={currentVideo.progress || 0}
                                            className={cn(
                                                "h-2.5 rounded-full",
                                                (currentVideo.progress || 0) >= 90 ? "[&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400" : "[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/80"
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
                                                <AvatarComponent
                                                    user={comment}
                                                    className="h-7 w-7 rounded-lg ring-0 flex-shrink-0"
                                                    fallbackClassName={cn(
                                                        "rounded-lg text-[10px] font-bold",
                                                        comment.userName === "You" ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground"
                                                    )}
                                                />
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
                                                        <AvatarComponent
                                                            user={reply}
                                                            className="h-6 w-6 rounded-md ring-0 flex-shrink-0"
                                                            fallbackClassName={cn(
                                                                "rounded-md text-[9px] font-bold",
                                                                reply.userName === "You" ? "bg-primary/15 text-primary" : "bg-muted/40 text-muted-foreground"
                                                            )}
                                                        />
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
    );
};