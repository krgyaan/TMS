import { paths } from "@/app/routes/paths";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAssignTrainingVideo, useTrainingEmployees, useUploadTrainingVideo } from "@/hooks/api/useTraining";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { 
    AlertCircle, ArrowLeft, BarChart3, CheckCircle2, Clock, CloudUpload, Eye, FileText, FileVideo, Film, 
    HardDrive, Info, Layers, Loader2, Monitor, Play, Settings2, Shield, Sparkles, Tag, Upload, Users, X, Zap
} from "lucide-react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const CATEGORIES = [
    { value: "Tendering", label: "Tendering", icon: "📋", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
    { value: "Operations", label: "Operations", icon: "⚙️", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    { value: "Onboarding", label: "Onboarding", icon: "🎯", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { value: "Compliance", label: "Compliance", icon: "🛡️", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    { value: "Technical", label: "Technical", icon: "💻", color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20" }
];

type UploadPhase = "idle" | "uploading" | "processing" | "complete" | "error";

const UploadVideo = () => {

    const navigate = useNavigate();
    // File State
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; type: string } | null>(null);
    const [fileObject, setFileObject] = useState<File | null>(null);
    const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processingStep, setProcessingStep] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Course Details
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [completionThreshold, setCompletionThreshold] = useState("90");
    const [publishImmediately, setPublishImmediately] = useState(true);
    const [allowRewatch, setAllowRewatch] = useState(true);
    const [requireFullWatch, setRequireFullWatch] = useState(false);
    const [assignOnUpload, setAssignOnUpload] = useState(false);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
    const [employeeSearch, setEmployeeSearch] = useState("");

    const { data: dbEmployees = [] } = useTrainingEmployees();
    const employeesList = useMemo(() => {
        if (dbEmployees.length === 0) return [];
        return dbEmployees.map(e => ({
            id: e.id,
            name: e.name,
            dept: e.dept || "General",
            designation: e.designation || "Staff",
            avatar: e.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        }));
    }, [dbEmployees]);

    // Extracted metadata (simulated)
    const [metadata, setMetadata] = useState<{
        duration: string;
        resolution: string;
        codec: string;
        fps: string;
        bitrate: string;
    } | null>(null);

    const filteredEmployees = useMemo(() => {
        return employeesList.filter(emp =>
            emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
            emp.dept.toLowerCase().includes(employeeSearch.toLowerCase())
        );
    }, [employeesList, employeeSearch]);


    const handleFileDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
            setFileObject(file);
            setSelectedFile({ name: file.name, size: sizeStr, type: file.type });
            toast.success("Video file selected successfully!");
            setMetadata({
                duration: "Calculating...",
                resolution: "Processing...",
                codec: "MP4 / H.264",
                fps: "30 fps",
                bitrate: "Auto"
            });
        } else {
            toast.error("Please drop a valid video file.");
        }
    }, []);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + " MB";
            setFileObject(file);
            setSelectedFile({ name: file.name, size: sizeStr, type: file.type });
            toast.success("Video file selected successfully!");
            setMetadata({
                duration: "Calculating...",
                resolution: "Processing...",
                codec: "MP4 / H.264",
                fps: "30 fps",
                bitrate: "Auto"
            });
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setMetadata(null);
        setUploadPhase("idle");
        setUploadProgress(0);
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags(prev => [...prev, tagInput.trim()]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tag: string) => {
        setTags(prev => prev.filter(t => t !== tag));
    };

    const handleToggleEmployee = (id: number) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(id) ? prev.filter(empId => empId !== id) : [...prev, id]
        );
    };

    const uploadMutation = useUploadTrainingVideo();
    const assignMutation = useAssignTrainingVideo();

    const selectAllEmployees = () => {
        if (selectedEmployeeIds.length === employeesList.length) {
            setSelectedEmployeeIds([]);
        } else {
            setSelectedEmployeeIds(employeesList.map(e => e.id));
        }
    };

    const handleSubmit = async () => {
        if (!fileObject) {
            toast.error("Please select a video file first.");
            return;
        }
        if (!title.trim()) {
            toast.error("Please enter a course title.");
            return;
        }
        if (!category) {
            toast.error("Please select a category.");
            return;
        }

        try {
            setUploadPhase("uploading");
            setUploadProgress(0);

            const formData = new FormData();
            formData.append("file", fileObject);
            formData.append("title", title);
            formData.append("description", description);
            formData.append("category", category);
            formData.append("completionThreshold", completionThreshold);

            const newVideo = await uploadMutation.mutateAsync({
                formData,
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const pct = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                        setUploadProgress(pct);
                    }
                }
            });

            setUploadPhase("processing");
            setProcessingStep("Finalizing course metadata...");

            if (assignOnUpload && selectedEmployeeIds.length > 0) {
                setProcessingStep("Assigning course to team members...");
                await assignMutation.mutateAsync({
                    videoId: newVideo.id,
                    userIds: selectedEmployeeIds
                });
            }

            setUploadProgress(100);
            setUploadPhase("complete");
            toast.success(`"${title}" uploaded and queued for processing!`);

            setTimeout(() => {
                navigate(paths.hrms.trainingDashboard);
            }, 1200);

        } catch (error: any) {
            setUploadPhase("idle");
            console.error("Upload failed:", error);
            const msg = error?.response?.data?.message || "Failed to upload video course";
            toast.error(msg);
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setFileObject(null);
        setMetadata(null);
        setUploadPhase("idle");
        setUploadProgress(0);
        setProcessingStep("");
        setTitle("");
        setDescription("");
        setCategory("");
        setTags([]);
        setCompletionThreshold("90");
        setPublishImmediately(true);
        setAllowRewatch(true);
        setRequireFullWatch(false);
        setAssignOnUpload(false);
        setSelectedEmployeeIds([]);
    };

    const isUploading = uploadPhase === "uploading" || uploadPhase === "processing";

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-background text-foreground relative selection:bg-primary/15">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute -top-[20%] -right-[10%] w-[55%] h-[55%] rounded-full bg-gradient-to-br from-primary/[0.04] to-transparent blur-[140px]" />
                <div className="absolute bottom-[5%] -left-[15%] w-[45%] h-[45%] rounded-full bg-gradient-to-tr from-primary/[0.03] to-transparent blur-[120px]" />
                <div className="absolute top-[50%] right-[30%] w-[20%] h-[20%] rounded-full bg-violet-500/[0.02] blur-[80px]" />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center justify-between mb-8"
                >
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            className="border border-border/30 bg-card/50 backdrop-blur-xl hover:bg-accent rounded-xl group h-10 px-4"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="text-sm font-semibold">Back</span>
                        </Button>
                        <div className="hidden sm:block h-6 w-px bg-border/30" />
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center shadow-lg shadow-primary/10">
                                <CloudUpload className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Upload Training Video</h1>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Add a new course to your training library</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {uploadPhase === "complete" ? (
                            <Button onClick={resetForm} variant="outline" className="rounded-xl border-border/40 text-sm font-semibold">
                                Upload Another
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={isUploading || !selectedFile || !title.trim() || !category}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl px-6 shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/25 disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {uploadPhase === "uploading" ? "Uploading..." : "Processing..."}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Upload & Publish
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </motion.div>

                {/* Upload Progress Overlay */}
                <AnimatePresence>
                    {(uploadPhase === "uploading" || uploadPhase === "processing" || uploadPhase === "complete") && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            transition={{ duration: 0.4 }}
                            className="mb-6 overflow-hidden"
                        >
                            <Card className={cn(
                                "border rounded-2xl backdrop-blur-xl shadow-lg overflow-hidden",
                                uploadPhase === "complete"
                                    ? "border-emerald-500/20 bg-emerald-500/[0.03]"
                                    : "border-primary/20 bg-primary/[0.02]"
                            )}>
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                                            uploadPhase === "complete" ? "bg-emerald-500/10" : "bg-primary/10"
                                        )}>
                                            {uploadPhase === "complete" ? (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                                                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                                </motion.div>
                                            ) : uploadPhase === "processing" ? (
                                                <Settings2 className="h-6 w-6 text-primary animate-spin" style={{ animationDuration: "3s" }} />
                                            ) : (
                                                <CloudUpload className="h-6 w-6 text-primary" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="text-sm font-bold">
                                                    {uploadPhase === "complete"
                                                        ? "Upload Complete!"
                                                        : uploadPhase === "processing"
                                                            ? "Processing Video..."
                                                            : "Uploading Video..."
                                                    }
                                                </h3>
                                                <span className={cn(
                                                    "text-xs font-bold",
                                                    uploadPhase === "complete" ? "text-emerald-500" : "text-primary"
                                                )}>
                                                    {uploadPhase === "complete" ? "Done" : uploadPhase === "processing" ? "Processing" : `${Math.min(100, Math.round(uploadProgress))}%`}
                                                </span>
                                            </div>

                                            {uploadPhase === "uploading" && (
                                                <Progress
                                                    value={Math.min(100, uploadProgress)}
                                                    className="h-2 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-primary/80 [&>div]:transition-all"
                                                />
                                            )}

                                            {uploadPhase === "processing" && (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 rounded-full bg-primary/10 overflow-hidden">
                                                        <motion.div
                                                            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                                                            animate={{ x: ["-100%", "100%"] }}
                                                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                                            style={{ width: "40%" }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {uploadPhase === "complete" && (
                                                <Progress value={100} className="h-2 rounded-full [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400" />
                                            )}

                                            <p className="text-[10px] text-muted-foreground mt-1.5">
                                                {uploadPhase === "complete"
                                                    ? `"${title}" is ready and ${publishImmediately ? "published" : "saved as draft"}.`
                                                    : uploadPhase === "processing"
                                                        ? processingStep
                                                        : `Uploading ${selectedFile?.name} (${selectedFile?.size})`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content Grid */}
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 lg:grid-cols-5 gap-6"
                >
                    {/* Left Column — File Upload + Metadata */}
                    <motion.div variants={fadeInUp} className="lg:col-span-2 space-y-5">
                        {/* File Upload Zone */}
                        <Card className="border border-border/25 bg-card/40 backdrop-blur-xl rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-border/15 flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Film className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <h2 className="text-sm font-bold">Video File</h2>
                            </div>
                            <CardContent className="p-5">
                                {!selectedFile ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={() => setIsDragging(false)}
                                        onDrop={handleFileDrop}
                                        className={cn(
                                            "relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group",
                                            isDragging
                                                ? "border-primary bg-primary/5 scale-[1.01]"
                                                : "border-border/50 bg-background/30 hover:border-primary/30 hover:bg-primary/[0.02]"
                                        )}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={handleFileInputChange}
                                        />
                                        <motion.div
                                            animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                                            className="h-16 w-16 rounded-2xl bg-muted/15 border border-border/25 flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:border-primary/15 transition-colors"
                                        >
                                            <Upload className="h-7 w-7 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                                        </motion.div>
                                        <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                                            {isDragging ? "Drop your file here" : "Drag & drop video file"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1.5">
                                            or <span className="text-primary font-semibold underline underline-offset-2 cursor-pointer">browse files</span>
                                        </p>
                                        <div className="flex items-center gap-2 mt-4">
                                            {["MP4", "MOV", "WEBM", "AVI"].map(fmt => (
                                                <Badge key={fmt} variant="outline" className="text-[8px] font-bold px-1.5 py-0 rounded-md border-border/30 text-muted-foreground">
                                                    {fmt}
                                                </Badge>
                                            ))}
                                        </div>
                                        <p className="text-[9px] text-muted-foreground/60 mt-2">Maximum file size: 500 MB</p>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="space-y-4"
                                    >
                                        {/* File Preview Card */}
                                        <div className="relative bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 rounded-xl p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0">
                                                    <FileVideo className="h-6 w-6 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate">{selectedFile.name}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                            <HardDrive className="h-2.5 w-2.5" />
                                                            {selectedFile.size}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground font-medium">{selectedFile.type}</span>
                                                    </div>
                                                </div>
                                                {!isUploading && uploadPhase !== "complete" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={removeFile}
                                                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Video Preview Placeholder */}
                                        <div className="aspect-video rounded-xl bg-gradient-to-br from-muted/20 to-muted/5 border border-border/20 flex items-center justify-center overflow-hidden relative group">
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                                            <div className="relative h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Play className="h-5 w-5 text-white/80 ml-0.5" fill="currentColor" />
                                            </div>
                                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                                                {metadata?.duration || "..."}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Extracted Metadata */}
                        <AnimatePresence>
                            {metadata && (
                                <motion.div
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <Card className="border border-border/25 bg-card/40 backdrop-blur-xl rounded-2xl shadow-sm overflow-hidden">
                                        <div className="px-5 py-3.5 border-b border-border/15 flex items-center gap-2.5">
                                            <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                                <Monitor className="h-3.5 w-3.5 text-violet-500" />
                                            </div>
                                            <h2 className="text-sm font-bold">Detected Metadata</h2>
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[8px] font-bold rounded-md ml-auto">
                                                Auto-extracted
                                            </Badge>
                                        </div>
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { label: "Duration", value: metadata.duration, icon: Clock },
                                                    { label: "Resolution", value: metadata.resolution, icon: Monitor },
                                                    { label: "Codec", value: metadata.codec, icon: Layers },
                                                    { label: "Frame Rate", value: metadata.fps, icon: Zap },
                                                    { label: "Bitrate", value: metadata.bitrate, icon: BarChart3 },
                                                    { label: "Format", value: "MP4 (MPEG-4)", icon: FileVideo },
                                                ].map((item) => (
                                                    <div key={item.label} className="bg-background/40 border border-border/15 rounded-xl p-3 hover:border-border/30 transition-colors">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <item.icon className="h-2.5 w-2.5 text-muted-foreground/60" />
                                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em]">{item.label}</span>
                                                        </div>
                                                        <p className="text-xs font-bold">{item.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    {/* Right Column — Course Details + Settings */}
                    <motion.div variants={fadeInUp} className="lg:col-span-3 space-y-5">
                        {/* Course Information */}
                        <Card className="border border-border/25 bg-card/40 backdrop-blur-xl rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-border/15 flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <FileText className="h-3.5 w-3.5 text-blue-500" />
                                </div>
                                <h2 className="text-sm font-bold">Course Information</h2>
                            </div>
                            <CardContent className="p-5 space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1">
                                        Course Title
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        placeholder="e.g. The correct method to fill a tender"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        disabled={isUploading || uploadPhase === "complete"}
                                        className="bg-background/50 border-border/30 rounded-xl h-11 focus-visible:ring-primary/40 text-sm font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                                        Description
                                    </Label>
                                    <Textarea
                                        placeholder="Describe what employees will learn from this course. Include key topics, learning objectives, and any prerequisites..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        disabled={isUploading || uploadPhase === "complete"}
                                        className="bg-background/50 border-border/30 rounded-xl min-h-[100px] text-sm resize-none"
                                    />
                                    <p className="text-[9px] text-muted-foreground/60">{description.length}/500 characters</p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1">
                                            Category
                                            <span className="text-destructive">*</span>
                                        </Label>
                                        <Select value={category} onValueChange={setCategory} disabled={isUploading || uploadPhase === "complete"}>
                                            <SelectTrigger className="bg-background/50 border-border/30 rounded-xl h-11 text-sm">
                                                <SelectValue placeholder="Select category..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORIES.map(cat => (
                                                    <SelectItem key={cat.value} value={cat.value}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{cat.icon}</span>
                                                            <span>{cat.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1">
                                            Completion Threshold
                                            <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                min="10"
                                                max="100"
                                                value={completionThreshold}
                                                onChange={(e) => setCompletionThreshold(e.target.value)}
                                                disabled={isUploading || uploadPhase === "complete"}
                                                className="bg-background/50 border-border/30 rounded-xl h-11 text-sm pr-8"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">%</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tags Input */}
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1">
                                        <Tag className="h-2.5 w-2.5" />
                                        Tags
                                    </Label>
                                    <div className="bg-background/50 border border-border/30 rounded-xl p-2 min-h-[44px] flex flex-wrap items-center gap-1.5">
                                        <AnimatePresence>
                                            {tags.map(tag => (
                                                <motion.div
                                                    key={tag}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    layout
                                                >
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 bg-primary/10 text-primary border border-primary/15 cursor-default"
                                                    >
                                                        {tag}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTag(tag)}
                                                            className="hover:text-destructive transition-colors"
                                                            disabled={isUploading || uploadPhase === "complete"}
                                                        >
                                                            <X className="h-2.5 w-2.5" />
                                                        </button>
                                                    </Badge>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                        <Input
                                            placeholder={tags.length === 0 ? "Type a tag and press Enter..." : "Add more..."}
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={handleAddTag}
                                            disabled={isUploading || uploadPhase === "complete"}
                                            className="border-0 bg-transparent h-7 text-xs shadow-none focus-visible:ring-0 flex-1 min-w-[120px] p-0 px-1"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Publishing Settings */}
                        <Card className="border border-border/25 bg-card/40 backdrop-blur-xl rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-border/15 flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <Settings2 className="h-3.5 w-3.5 text-amber-500" />
                                </div>
                                <h2 className="text-sm font-bold">Publishing & Settings</h2>
                            </div>
                            <CardContent className="p-5 space-y-4">
                                {[
                                    {
                                        id: "publish",
                                        label: "Publish Immediately",
                                        description: "Make the course visible to assigned employees right after upload",
                                        icon: Eye,
                                        iconColor: "text-emerald-500",
                                        iconBg: "bg-emerald-500/10",
                                        checked: publishImmediately,
                                        onChange: setPublishImmediately
                                    },
                                    {
                                        id: "rewatch",
                                        label: "Allow Re-watching",
                                        description: "Employees can watch the video again after completing it",
                                        icon: Play,
                                        iconColor: "text-blue-500",
                                        iconBg: "bg-blue-500/10",
                                        checked: allowRewatch,
                                        onChange: setAllowRewatch
                                    },
                                    {
                                        id: "fullwatch",
                                        label: "Require Sequential Watching",
                                        description: "Prevent employees from skipping ahead in the video timeline",
                                        icon: Shield,
                                        iconColor: "text-orange-500",
                                        iconBg: "bg-orange-500/10",
                                        checked: requireFullWatch,
                                        onChange: setRequireFullWatch
                                    }
                                ].map((setting) => (
                                    <div
                                        key={setting.id}
                                        className="flex items-center justify-between p-3.5 rounded-xl border border-border/15 bg-background/30 hover:border-border/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0", setting.iconBg)}>
                                                <setting.icon className={cn("h-4 w-4", setting.iconColor)} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold">{setting.label}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{setting.description}</p>
                                            </div>
                                        </div>
                                        <Switch
                                            checked={setting.checked}
                                            onCheckedChange={setting.onChange}
                                            disabled={isUploading || uploadPhase === "complete"}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Assign on Upload */}
                        <Card className="border border-border/25 bg-card/40 backdrop-blur-xl rounded-2xl shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-border/15 flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                        <Users className="h-3.5 w-3.5 text-violet-500" />
                                    </div>
                                    <h2 className="text-sm font-bold">Assign on Upload</h2>
                                    <Badge variant="outline" className="text-[8px] font-bold px-1.5 py-0 rounded-md border-border/30 text-muted-foreground">
                                        Optional
                                    </Badge>
                                </div>
                                <Switch
                                    checked={assignOnUpload}
                                    onCheckedChange={setAssignOnUpload}
                                    disabled={isUploading || uploadPhase === "complete"}
                                />
                            </div>

                            <AnimatePresence>
                                {assignOnUpload && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                                        className="overflow-hidden"
                                    >
                                        <CardContent className="p-5 pt-3 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search employees..."
                                                        value={employeeSearch}
                                                        onChange={(e) => setEmployeeSearch(e.target.value)}
                                                        className="pl-8 bg-background/50 border-border/30 rounded-xl h-9 text-xs"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={selectAllEmployees}
                                                    className="rounded-xl h-9 text-[10px] font-bold border-border/30 px-3"
                                                >
                                                    {selectedEmployeeIds.length === employeesList.length ? "Deselect All" : "Select All"}
                                                </Button>
                                            </div>

                                            {selectedEmployeeIds.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Badge className="bg-primary/10 text-primary border border-primary/15 text-[9px] font-bold rounded-md px-2">
                                                        {selectedEmployeeIds.length} employee{selectedEmployeeIds.length > 1 ? "s" : ""} selected
                                                    </Badge>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedEmployeeIds([])}
                                                        className="text-[9px] text-muted-foreground hover:text-foreground font-medium underline underline-offset-2"
                                                    >
                                                        Clear
                                                    </button>
                                                </div>
                                            )}

                                            <div className="border border-border/20 rounded-xl max-h-[240px] overflow-y-auto p-1.5 space-y-0.5 bg-background/20">
                                                {filteredEmployees.map((employee) => {
                                                    const isSelected = selectedEmployeeIds.includes(employee.id);
                                                    return (
                                                        <motion.div
                                                            key={employee.id}
                                                            whileTap={{ scale: 0.98 }}
                                                            className={cn(
                                                                "flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer border",
                                                                isSelected ? "bg-primary/5 border-primary/12" : "border-transparent hover:bg-muted/8"
                                                            )}
                                                            onClick={() => handleToggleEmployee(employee.id)}
                                                        >
                                                            <Checkbox
                                                                checked={isSelected}
                                                                className="pointer-events-none"
                                                            />
                                                            <div className={cn(
                                                                "h-7 w-7 rounded-lg flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                                                                isSelected ? "bg-primary/15 text-primary" : "bg-muted/25 text-muted-foreground"
                                                            )}>
                                                                {employee.avatar}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-bold leading-tight truncate">{employee.name}</p>
                                                                <p className="text-[9px] text-muted-foreground mt-0.5">{employee.dept} • {employee.designation}</p>
                                                            </div>
                                                            {isSelected && (
                                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                                                </motion.div>
                                                            )}
                                                        </motion.div>
                                                    );
                                                })}
                                                {filteredEmployees.length === 0 && (
                                                    <p className="text-center text-[10px] text-muted-foreground py-6">No employees match your search</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Card>

                        {/* Validation Hints */}
                        <AnimatePresence>
                            {selectedFile && (!title.trim() || !category) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                >
                                    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.03]">
                                        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-amber-600">Required fields missing</p>
                                            <ul className="text-[10px] text-muted-foreground space-y-0.5">
                                                {!title.trim() && <li>• Course title is required</li>}
                                                {!category && <li>• Please select a category</li>}
                                            </ul>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

// Need Search icon import
const Search = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
    </svg>
);

export default UploadVideo;