import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useNavigate } from "react-router-dom";
import ComplaintView from "@/modules/hrms/complaints/components/ComplaintView";
import {
  COMPLAINT_TYPES,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  type Complaint,
} from "@/modules/hrms/complaints/helpers/types";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  HelpCircle,
  MessageSquare,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";
import React, { useState } from "react";
import { useProfileContext } from "../contexts/ProfileContext";
import { formatDate } from "../utils";

// ─── TYPES ────────────────────────────────────────────────────────────────────

// (Complaint type + status/priority/type configs live in
//  @/modules/hrms/complaints/helpers/types)

// ─── COMPLAINT DETAIL DIALOG ────────────────────────────────────────────────

interface ComplaintDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complaint: Complaint | null;
}

const ComplaintDetailDialog: React.FC<ComplaintDetailDialogProps> = ({
  open,
  onOpenChange,
  complaint: c,
}) => {

  if (!c) return null;

  const statusConfig = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
  const StatusIcon = statusConfig.icon;
  const priorityConfig =
    PRIORITY_CONFIG[c.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priorityConfig.icon;
  const typeConfig = COMPLAINT_TYPES.find((t) => t.value === c.complaintType);
  const TypeIcon = typeConfig?.icon || HelpCircle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
          <DialogHeader className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10">
                  <TypeIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold leading-tight">
                    {c.subject}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-1 flex items-center gap-2">
                    <span className="font-mono font-semibold">
                      {c.complaintCode}
                    </span>
                    <span className="text-primary/20">•</span>
                    <span>{typeConfig?.label || c.complaintType}</span>
                  </DialogDescription>
                </div>
              </div>
            </div>
            {/* Status + Priority */}
            <div className="flex items-center gap-2 mt-3">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-6 font-bold rounded-lg",
                  statusConfig.className
                )}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-6 font-bold rounded-lg capitalize",
                  priorityConfig.className
                )}
              >
                <PriorityIcon className="h-3 w-3 mr-1" />
                {priorityConfig.label} Priority
              </Badge>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
          <ComplaintView complaint={c} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── COMPLAINT CARD ─────────────────────────────────────────────────────────

interface ComplaintCardProps {
  complaint: Complaint;
  onClick: (c: Complaint) => void;
}

const ComplaintCard: React.FC<ComplaintCardProps> = ({
  complaint: c,
  onClick,
}) => {
  const statusConfig = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
  const priorityConfig =
    PRIORITY_CONFIG[c.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priorityConfig.icon;
  const typeConfig = COMPLAINT_TYPES.find((t) => t.value === c.complaintType);
  const TypeIcon = typeConfig?.icon || MessageSquare;

  return (
    <div
      
      
      
      
    >
      <Card
        className="border-border/40 shadow-lg shadow-black/[0.03] hover:shadow-xl hover:shadow-primary/[0.06] hover:border-primary/15 hover:bg-muted/30 transition-all duration-400 group bg-muted/20 backdrop-blur-sm cursor-pointer"
        onClick={() => onClick(c)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
                <TypeIcon className="h-5 w-5 text-primary/60 group-hover:text-primary-foreground transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold group-hover:text-primary transition-colors truncate">
                  {c.subject}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span className="font-mono font-semibold text-[11px]">
                    {c.complaintCode}
                  </span>
                  <span className="text-primary/20">•</span>
                  <span className="text-[11px]">
                    {typeConfig?.label || c.complaintType}
                  </span>
                  <span className="text-primary/20">•</span>
                  <span className="text-[11px]">
                    {formatDate(c.createdAt)}
                  </span>
                </div>

                {/* Description Preview */}
                {c.description && (
                  <p className="text-xs text-muted-foreground/70 mt-2 line-clamp-2 leading-relaxed">
                    {c.description}
                  </p>
                )}

                {/* Tags Row */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {c.complaintAgainst && (
                    <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-md font-medium">
                      Against: {c.complaintAgainstName || c.complaintAgainst}
                    </span>
                  )}
                  {c.attachments && c.attachments.length > 0 && (
                    <span className="text-[10px] text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
                      <Paperclip className="h-2.5 w-2.5" />
                      {c.attachments.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-6 font-bold rounded-lg",
                  statusConfig.className
                )}
              >
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full mr-1.5",
                    statusConfig.dotColor,
                    (c.status === "open" || c.status === "in_progress") &&
                      "animate-pulse"
                  )}
                />
                {statusConfig.label}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] h-5 font-bold rounded-md capitalize border-0",
                  priorityConfig.badgeBg
                )}
              >
                <PriorityIcon className="h-2.5 w-2.5 mr-1" />
                {priorityConfig.label}
              </Badge>
              <div className="h-6 w-6 rounded-md bg-muted/20 flex items-center justify-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── MAIN COMPLAINTS SECTION ────────────────────────────────────────────────

export const ComplaintsSection: React.FC = () => {
  const { data } = useProfileContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );

  // Complaints live in the HRMS complaints module — fetched directly
  const { data: myComplaints, isLoading: complaintsLoading } = useQuery({
    queryKey: ["hrms", "complaints", "mine"],
    queryFn: async () => {
      const res = await api.get("/hrms/complaints");
      return res.data as Complaint[];
    },
  });

  if (!data || complaintsLoading) return null;

  const COMPLAINTS: Complaint[] = myComplaints || [];

  // Filters
  const filtered = COMPLAINTS.filter((c) => {
    const matchesStatus =
      statusFilter === "all" || c.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || c.priority === priorityFilter;
    const matchesSearch =
      !searchQuery ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.complaintCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Stats
  const openCount = COMPLAINTS.filter((c) => c.status === "open").length;
  const inProgressCount = COMPLAINTS.filter(
    (c) => c.status === "in_progress"
  ).length;
  const resolvedCount = COMPLAINTS.filter(
    (c) => c.status === "resolved"
  ).length;
  const totalCount = COMPLAINTS.length;

  const handleComplaintClick = (c: Complaint) => {
    setSelectedComplaint(c);
    setDetailDialogOpen(true);
  };

  // ─── EMPTY STATE ────────────────────────────────────────────────────────
  if (COMPLAINTS.length === 0) {
    return (
      <div
        key="complaints"
        
        
        
        
      >
        <div
          
          
          
          className="space-y-6"
        >
          <div >
            <Card className="border-dashed border-2 border-border/30 bg-muted/10 backdrop-blur-sm">
              <CardContent className="py-20 px-6">
                <div className="text-center max-w-sm mx-auto">
                  <div
                    
                    
                    
                    className="relative w-20 h-20 mx-auto mb-6"
                  >
                    <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
                    </div>
                    <div
                      
                      
                      
                      className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>

                  <div
                    
                    
                    
                  >
                    <h3 className="text-lg font-bold mb-2">
                      No Complaints Filed
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-1">
                      You haven't raised any complaints yet.
                    </p>
                    <p className="text-xs text-muted-foreground/60 mb-6">
                      If you're facing any issues at work, feel free to raise a
                      complaint. All submissions are handled confidentially.
                    </p>
                  </div>

                  <div
                    
                    
                    
                  >
                    <Button
                      className="gap-2 rounded-xl font-semibold shadow-lg shadow-primary/20 h-11 px-6"
                      onClick={() =>
                        navigate("/profile/support/complaints/create")
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Raise a Complaint
                    </Button>
                  </div>

                  <div
                    
                    
                    
                    className="mt-6 p-4 rounded-2xl bg-muted/20 border border-border/20"
                  >
                    <div className="flex items-center gap-3 justify-center">
                      <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-blue-500/60" />
                      </div>
                      <p className="text-xs text-muted-foreground text-left">
                        All complaints are treated with strict confidentiality
                        and handled by authorized HR personnel only.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    );
  }

  // ─── MAIN RENDER ────────────────────────────────────────────────────────
  return (
    <div
      key="complaints"
      
      
      
      
    >
      <div
        
        
        
        className="space-y-6"
      >
        {/* ── Stats Grid ──────────────────────────────────────────────── */}
        <div
          
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            {
              label: "Total",
              value: totalCount,
              icon: MessageSquare,
              color: "text-primary",
              bg: "bg-primary/10",
              borderColor: "border-primary/10",
            },
            {
              label: "Open",
              value: openCount,
              icon: Clock,
              color: "text-blue-600",
              bg: "bg-blue-500/10",
              borderColor: "border-blue-500/10",
            },
            {
              label: "In Progress",
              value: inProgressCount,
              icon: RotateCcw,
              color: "text-amber-600",
              bg: "bg-amber-500/10",
              borderColor: "border-amber-500/10",
            },
            {
              label: "Resolved",
              value: resolvedCount,
              icon: CheckCircle2,
              color: "text-emerald-600",
              bg: "bg-emerald-500/10",
              borderColor: "border-emerald-500/10",
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className={cn(
                "border shadow-lg shadow-black/[0.02] bg-muted/20 backdrop-blur-sm hover:bg-muted/30 transition-all duration-300",
                stat.borderColor
              )}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    stat.bg
                  )}
                >
                  <stat.icon className={cn("h-4.5 w-4.5", stat.color)} />
                </div>
                <div>
                  <p
                    className="text-xl font-black tracking-tight"
                    
                    
                    
                  >
                    {stat.value}
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold leading-tight">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Search + Filters + Raise Button ─────────────────────────── */}
        <div  className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 rounded-xl border-border/40 bg-muted/20 focus:bg-background text-sm"
              />
            </div>
            <Button
              className="gap-2 rounded-xl font-semibold shadow-lg shadow-primary/20 h-9 text-xs shrink-0"
              onClick={() => navigate("/profile/support/complaints/create")}
            >
              <Plus className="h-3.5 w-3.5" />
              Raise Complaint
            </Button>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" />
              Status:
            </span>
            {[
              { label: "All", value: "all" },
              ...Object.entries(STATUS_CONFIG).map(([key, config]) => ({
                label: config.label,
                value: key,
              })),
            ].map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "h-7 text-[10px] rounded-lg font-semibold transition-all",
                  statusFilter === f.value && "shadow-sm shadow-primary/20"
                )}
              >
                {f.label}
              </Button>
            ))}

            <div className="w-px h-5 bg-border/30 mx-1" />

            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-1">
              Priority:
            </span>
            {[
              { label: "All", value: "all" },
              ...Object.entries(PRIORITY_CONFIG).map(([key, config]) => ({
                label: config.label,
                value: key,
              })),
            ].map((f) => (
              <Button
                key={`priority-${f.value}`}
                variant={priorityFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPriorityFilter(f.value)}
                className={cn(
                  "h-7 text-[10px] rounded-lg font-semibold transition-all",
                  priorityFilter === f.value && "shadow-sm shadow-primary/20"
                )}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Complaints List ─────────────────────────────────────────── */}
        
          {filtered.length > 0 ? (
            <div
              key="complaints-list"
              
              
              
              className="space-y-3"
            >
                            {filtered.map((c) => (
                <ComplaintCard
                  key={c.id}
                  complaint={c}
                  onClick={handleComplaintClick}
                />
              ))}
            </div>
          ) : (
            <div
              key="no-results"
              
              
              
            >
              <Card className="border-dashed border-2 border-border/30 bg-muted/10">
                <CardContent className="p-12 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-7 w-7 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-sm font-bold mb-1">
                    No complaints match your filters
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Try adjusting your search or filter criteria
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs font-semibold"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                    }}
                  >
                    Clear all filters
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        

        {/* ── Raise Complaint CTA ─────────────────────────────────────── */}
        <div >
          <Card
            className="border-dashed border-2 border-border/30 bg-muted/5 hover:border-primary/20 hover:bg-primary/[0.02] transition-all duration-300 cursor-pointer group"
            onClick={() => navigate("/profile/support/complaints/create")}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
                    <Plus className="h-5 w-5 text-primary/40 group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-bold group-hover:text-primary transition-colors">
                      Have an issue to report?
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Raise a new complaint — it will be handled confidentially
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <ComplaintDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        complaint={selectedComplaint}
      />
    </div>
  );
};