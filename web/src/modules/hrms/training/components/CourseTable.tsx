import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Eye, HelpCircle, Lightbulb, Loader2, Play, Search, ThumbsUp, Trash2, Video } from "lucide-react";
import { getServerOrigin, getCategoryColor } from "../helpers/training.utils";

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

interface CourseTableProps {
    videos: VideoRow[];
    isLoading: boolean;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    onPreview: (video: VideoRow) => void;
    onTogglePublish: (id: number) => void;
    onDelete: (id: number, title: string) => void;
}

const CourseTable = ({ videos, isLoading, searchQuery, onSearchChange, onPreview, onTogglePublish, onDelete }: CourseTableProps) => {
    return (
        <div className="space-y-4">
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-9 h-10 w-full rounded-xl"
                />
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/20">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Video Details</TableHead>
                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Specs</TableHead>
                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Status</TableHead>
                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground">Reactions</TableHead>
                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground text-center">Visible</TableHead>
                            <TableHead className="font-bold text-[10px] tracking-[0.15em] uppercase text-muted-foreground text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-7 w-7 text-primary animate-spin" />
                                        <p className="text-sm text-muted-foreground font-medium">Loading courses...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : videos.length === 0 ? (
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
                            videos.map((video) => (
                                <TableRow key={video.id} className="hover:bg-muted/8 transition-colors">
                                    <TableCell className="align-middle py-4">
                                        <div className="flex items-start gap-3">
                                            <div
                                                onClick={() => onPreview(video)}
                                                className="w-[72px] aspect-video rounded bg-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden"
                                            >
                                                {video.thumbnailPath ? (
                                                    <img
                                                        src={`${getServerOrigin()}/${video.thumbnailPath}`}
                                                        alt={video.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <Play className="h-5 w-5 text-primary/70" />
                                                )}
                                            </div>
                                            <div className="space-y-1.5 min-w-0">
                                                <div
                                                    onClick={() => onPreview(video)}
                                                    className="font-semibold text-sm leading-tight text-foreground truncate max-w-[280px] hover:text-primary hover:underline cursor-pointer"
                                                >
                                                    {video.title}
                                                </div>
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
                                            onCheckedChange={() => onTogglePublish(video.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="align-middle text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onDelete(video.id, video.title)}
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-xl"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default CourseTable;
