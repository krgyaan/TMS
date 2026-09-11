import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/axios";
import { cn } from "@/lib/utils";
import ComplaintView from "./components/ComplaintView";
import {
  COMPLAINT_TYPES,
  PRIORITY_CONFIG,
  STATUS_CONFIG,
  type Complaint,
} from "./helpers/types";

/**
 * Read-only complaint page — resolves the complaint from the
 * my-complaints list (no dedicated GET /:id endpoint yet).
 */
export default function ComplaintViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const complaintId = Number(id);

  const { data: complaints, isLoading } = useQuery({
    queryKey: ["hrms", "complaints", "mine"],
    queryFn: async () => {
      const res = await api.get("/hrms/complaints");
      return res.data as Complaint[];
    },
  });

  if (!id || Number.isNaN(complaintId)) {
    return <InvalidIdState onBack={() => navigate(-1)} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const complaint = complaints?.find((c) => c.id === complaintId);

  if (!complaint) {
    return (
      <NotFoundState
        title="Complaint not found"
        description="This complaint doesn't exist or doesn't belong to you."
        onBack={() => navigate(-1)}
      />
    );
  }

  const statusConfig =
    STATUS_CONFIG[complaint.status] || STATUS_CONFIG.open;
  const StatusIcon = statusConfig.icon;
  const priorityConfig =
    PRIORITY_CONFIG[complaint.priority] || PRIORITY_CONFIG.medium;
  const PriorityIcon = priorityConfig.icon;
  const typeConfig = COMPLAINT_TYPES.find(
    (t) => t.value === complaint.complaintType
  );
  const TypeIcon = typeConfig?.icon || HelpCircle;

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="rounded-xl gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <TypeIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-tight">
                  {complaint.subject}
                </h1>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="font-mono font-semibold">
                    {complaint.complaintCode}
                  </span>
                  <span className="text-primary/20">•</span>
                  <span>{typeConfig?.label || complaint.complaintType}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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
          </div>

          <ComplaintView complaint={complaint} />
        </CardContent>
      </Card>
    </div>
  );
}

function InvalidIdState({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Invalid complaint ID</p>
          <Button variant="outline" className="mt-4" onClick={onBack}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function NotFoundState({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">{title}</p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          <Button variant="outline" className="mt-4" onClick={onBack}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
