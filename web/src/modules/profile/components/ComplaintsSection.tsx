import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useNavigate } from "react-router-dom";
import {
  COMPLAINT_TYPES,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  type Complaint,
} from "@/modules/hrms/complaints/helpers/types";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  Hash,
  Lightbulb,
  MessageSquare,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { useProfileContext } from "../contexts/ProfileContext";
import { formatDate } from "../utils";

// ─── TYPES ────────────────────────────────────────────────────────────────────

// (Complaint type + status/priority/type configs live in
//  @/modules/hrms/complaints/helpers/types)

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
      className={cn(
        "group relative rounded-2xl border bg-card transition-all duration-200",
        "hover:shadow-lg hover:shadow-black/[0.03] hover:-translate-y-0.5 hover:border-border",
        "cursor-pointer h-full flex flex-col"
      )}
      onClick={() => onClick(c)}
    >
      <div className="p-5 flex-1">
        {/* Top row: type tile, subject + against, status/priority badges */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/5 ring-1 ring-border/50 flex items-center justify-center flex-shrink-0">
            <TypeIcon className="h-5 w-5 text-primary/60" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-tight truncate">
                  {c.subject}
                </h3>
                {c.complaintAgainst && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Against: {c.complaintAgainstName || c.complaintAgainst}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                    statusConfig.className
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      statusConfig.dotColor,
                      (c.status === "open" || c.status === "in_progress") &&
                        "animate-pulse"
                    )}
                  />
                  {statusConfig.label}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                    priorityConfig.className
                  )}
                >
                  <PriorityIcon className="h-3 w-3" />
                  {priorityConfig.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Details grid: code • date • type */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Hash className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-mono truncate">{c.complaintCode}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{formatDate(c.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
            <Tag className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{typeConfig?.label || c.complaintType}</span>
          </div>
        </div>

        {/* Divider → description → resolution */}
        {(c.description || c.expectedResolution) && (
          <div className="mt-5 pt-4 border-t">
            {c.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {c.description}
              </p>
            )}
            {c.expectedResolution && (
              <p
                className={cn(
                  "text-xs text-muted-foreground/80 leading-relaxed line-clamp-1 flex items-center gap-1",
                  c.description && "mt-1.5"
                )}
              >
                <Lightbulb className="h-3 w-3 shrink-0" />
                <span className="truncate">{c.expectedResolution}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between border-t px-5 py-3 bg-muted/20">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            onClick(c);
          }}
        >
          <Eye className="h-3.5 w-3.5" />
          View Details
        </Button>

        {c.attachments && c.attachments.length > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            {c.attachments.length}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── MAIN COMPLAINTS SECTION ────────────────────────────────────────────────

export const ComplaintsSection: React.FC = () => {
  const { data } = useProfileContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");

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
    const matchesTab = activeTab === "all" || c.status === activeTab;
    const matchesSearch =
      !searchQuery ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.complaintCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
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

  // Summary tabs (onboarding-dashboard style)
  const tabs: {
    value: string;
    label: string;
    icon: React.ElementType;
    count: number;
  }[] = [
    { value: "all", label: "All", icon: MessageSquare, count: totalCount },
    { value: "open", label: "Open", icon: Clock, count: openCount },
    {
      value: "in_progress",
      label: "In Progress",
      icon: RotateCcw,
      count: inProgressCount,
    },
    {
      value: "resolved",
      label: "Resolved",
      icon: CheckCircle2,
      count: resolvedCount,
    },
  ];

  const handleComplaintClick = (c: Complaint) => {
    navigate(`/profile/support/complaints/${c.id}`);
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
        {/* ── Back ─────────────────────────────────────────────────────── */}
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="-ml-2 text-muted-foreground hover:text-foreground gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Button>
        </div>

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Complaints</h1>
              <p className="text-sm text-muted-foreground">
                Raise and track your complaints
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/profile/support/complaints/create")}
            className="gap-2 rounded-xl shadow-sm h-10"
          >
            <Plus className="h-4 w-4" />
            Raise Complaint
          </Button>
        </div>

        {/* ── Filters Bar: tabs left, search right ────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
            <TabsList className="h-10 bg-muted/50 p-1 rounded-xl">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-2 text-xs font-medium px-4 rounded-lg data-[state=active]:shadow-sm"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <Badge
                    variant="secondary"
                    className="ml-0.5 h-5 min-w-[20px] px-1.5 text-[10px] font-semibold rounded-full bg-background/80"
                  >
                    {tab.count}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-10 h-10 text-sm rounded-xl border-border/60 focus-visible:border-primary/40"
              placeholder="Search complaints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Results Count ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between -mt-4">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filtered.length}
            </span>{" "}
            {filtered.length === 1 ? "record" : "records"}
          </p>
        </div>

        {/* ── Complaints List ─────────────────────────────────────────── */}
        
          {filtered.length > 0 ? (
            <div
              key="complaints-list"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
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
                      setActiveTab("all");
                    }}
                  >
                    Clear all filters
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        

      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
    </div>
  );
};