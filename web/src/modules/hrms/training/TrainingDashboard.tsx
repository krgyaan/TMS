import { paths } from "@/app/routes/paths";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssignTrainingVideo, useDeleteTrainingVideo, useLearnersProgress, useTogglePublishTrainingVideo, useTrainingEmployees, useTrainingVideos } from "@/hooks/api/useTraining";
import { GraduationCap, Plus, UserPlus, Users, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { VideoPlayerView } from "../employees/VideoPlayer";
import AssignCourseModal from "./components/AssignCourseModal";
import CourseTable from "./components/CourseTable";
import LearnerProgressAccordion from "./components/LearnerProgressAccordion";
import TrainingKpiCards from "./components/TrainingKpiCards";
import { formatDuration, formatFileSize } from "./helpers/training.utils";

const TrainingDashboard = () => {
    const navigate = useNavigate();

    const { data: rawVideos = [], isLoading: isVideosLoading } = useTrainingVideos();
    const { data: progressList = [] } = useLearnersProgress();
    const { data: dbEmployees = [] } = useTrainingEmployees();

    const deleteVideoMutation = useDeleteTrainingVideo();
    const togglePublishMutation = useTogglePublishTrainingVideo();
    const assignMutation = useAssignTrainingVideo();

    const [activeTab, setActiveTab] = useState("courses");
    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("All");
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [expandedUsers, setExpandedUsers] = useState<string[]>([]);
    const [previewVideo, setPreviewVideo] = useState<any | null>(null);

    const employeesList = useMemo(() => {
        return dbEmployees.map(e => ({
            id: e.id,
            name: e.name,
            dept: e.dept || "General",
            designation: e.designation || "Staff",
            avatar: e.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        }));
    }, [dbEmployees]);

    const videos = useMemo(() => {
        return rawVideos.map(v => ({
            id: v.id,
            title: v.title,
            category: v.category || "General",
            duration: formatDuration(v.durationSeconds),
            resolution: v.resolution || "Processing...",
            size: formatFileSize(v.filesize),
            views: progressList.filter(p => p.videoTitle === v.title).length,
            status: v.status,
            isPublished: v.isPublished,
            reactions: (v as any).reactions || { helpful: 0, important: 0, confusing: 0 },
            thumbnailPath: v.thumbnailPath,
            videoUrl: v.videoUrl
        }));
    }, [rawVideos, progressList]);

    const kpis = useMemo(() => ({
        totalCourses: videos.length,
        totalViews: videos.reduce((acc, v) => acc + v.views, 0),
        avgCompletion: progressList.length > 0
            ? Math.round(progressList.reduce((acc, p) => acc + p.progress, 0) / progressList.length)
            : 0,
        activeLearners: new Set(progressList.map(p => p.userName)).size,
    }), [videos, progressList]);

    const filteredVideos = useMemo(() => {
        return videos.filter(v =>
            v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [videos, searchQuery]);

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
        togglePublishMutation.mutate(id);
    };

    const handleDeleteVideo = (id: number, title: string) => {
        if (confirm(`Are you sure you want to delete "${title}"?`)) {
            deleteVideoMutation.mutate(id);
        }
    };

    const handleAssign = (videoId: number, userIds: number[]) => {
        assignMutation.mutate({ videoId, userIds });
    };

    const toggleUserAccordion = (userName: string) => {
        setExpandedUsers(prev => prev.includes(userName) ? prev.filter(u => u !== userName) : [...prev, userName]);
    };

    if (previewVideo) {
        return (
            <VideoPlayerView
                activeVideo={previewVideo}
                onBack={() => setPreviewVideo(null)}
                isAdmin={true}
            />
        );
    }

    return (
        <Card>
            {/* Header */}
            <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
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
                        className="rounded-lg px-5 py-2.5 flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Upload Video
                    </Button>
                    <Button
                        onClick={() => setIsAssignOpen(true)}
                        variant="outline"
                        className="rounded-lg px-5 py-2.5 flex items-center gap-2"
                    >
                        <UserPlus className="h-4 w-4" />
                        Assign Course
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {/* KPI Cards */}
                <TrainingKpiCards kpis={kpis} />

                {/* Tabs */}
                <div className="my-5">
                    <div className="flex-none m-auto mb-4">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full m-auto">
                            <div className="flex-none m-auto mb-4">
                                <TabsList>
                                    <TabsTrigger value="courses" className="rounded-lg font-semibold text-sm py-2.5">
                                        <Video className="h-3.5 w-3.5 mr-1.5" />
                                        Courses
                                    </TabsTrigger>
                                    <TabsTrigger value="progress" className="rounded-lg font-semibold text-sm py-2.5">
                                        <Users className="h-3.5 w-3.5 mr-1.5" />
                                        Learners
                                    </TabsTrigger>
                                </TabsList>
                            </div>
                            <TabsContent value="courses" className="outline-none mt-0">
                                <Card className="border rounded-2xl overflow-hidden p-4">
                                    <CourseTable
                                        videos={filteredVideos}
                                        isLoading={isVideosLoading}
                                        searchQuery={searchQuery}
                                        onSearchChange={setSearchQuery}
                                        onPreview={setPreviewVideo}
                                        onTogglePublish={handleTogglePublish}
                                        onDelete={handleDeleteVideo}
                                    />
                                </Card>
                            </TabsContent>

                            <TabsContent value="progress" className="outline-none mt-0">
                                <LearnerProgressAccordion
                                    groupedProgress={groupedProgress}
                                    searchQuery={searchQuery}
                                    onSearchChange={setSearchQuery}
                                    deptFilter={deptFilter}
                                    onDeptFilterChange={setDeptFilter}
                                    departments={departments}
                                    expandedUsers={expandedUsers}
                                    onToggleUser={toggleUserAccordion}
                                />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </CardContent>

            <AssignCourseModal
                open={isAssignOpen}
                onOpenChange={setIsAssignOpen}
                videos={videos}
                employees={employeesList}
                onAssign={handleAssign}
                isAssigning={assignMutation.isPending}
            />
        </Card>
    );
};

export default TrainingDashboard;
