import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useComplaint } from "@/hooks/api/useComplaints";
import { complaintsService } from "@/services/api/complaints.service";
import ComplaintForm from "./components/ComplaintForm";
import type { ComplaintFormValues } from "./helpers/types";

function StateCard({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="container mx-auto py-6 max-w-4xl">
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

/**
 * Edit complaint page — only allowed while the complaint is still "open".
 * Fetches by id (GET /hrms/complaints/:id/detail).
 */
export default function ComplaintEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const complaintId = id ? Number(id) : null;

  const { data: complaint, isLoading } = useComplaint(complaintId);

  if (!id || Number.isNaN(complaintId)) {
    return (
      <StateCard
        title="Invalid complaint ID"
        description="The complaint ID in the URL is not valid."
        onBack={() => navigate(-1)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!complaint) {
    return (
      <StateCard
        title="Complaint not found"
        description="This complaint doesn't exist or doesn't belong to you."
        onBack={() => navigate(-1)}
      />
    );
  }

  if (complaint.status !== "open") {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <div className="h-14 w-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">Handled by HR — view only</p>
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-sm">
              This complaint has moved past the "Open" stage, so it can no
              longer be edited or deleted.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = async (values: ComplaintFormValues) => {
    if (!complaintId) return;
    try {
      await complaintsService.update(complaintId, {
        complaintType: values.complaintType,
        subject: values.subject,
        description: values.description,
        priority: values.priority || undefined,
        complaintAgainst: values.complaintAgainst || undefined,
        complaintAgainstId: values.complaintAgainstId ?? undefined,
        incidentDate: values.incidentDate || undefined,
        incidentLocation: values.incidentLocation || undefined,
        previousAttempts: values.previousAttempts || undefined,
        witnesses: values.witnesses || undefined,
        expectedResolution: values.expectedResolution || undefined,
        attachments: values.attachments,
      });
      toast.success("Complaint updated successfully");
      queryClient.invalidateQueries({ queryKey: ["hrms", "complaints"] });
      navigate(-1);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to update complaint";
      toast.error(message);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl space-y-4">
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
          <div className="mb-6">
            <h1 className="text-lg font-bold">Edit Complaint</h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              <span className="font-mono font-semibold">
                {complaint.complaintCode}
              </span>
              <span className="text-primary/20">•</span>
              <span>Editable while the complaint is still Open</span>
            </p>
          </div>

          <ComplaintForm
            initialValues={complaint}
            submitLabel="Save Changes"
            onSubmit={handleSave}
            onCancel={() => navigate(-1)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
