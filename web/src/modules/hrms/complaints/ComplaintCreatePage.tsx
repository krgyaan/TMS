import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/axios";
import ComplaintForm from "./components/ComplaintForm";
import type { ComplaintFormValues } from "./helpers/types";

export default function ComplaintCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSubmit = async (values: ComplaintFormValues) => {
    try {
      await api.post("/hrms/complaints", {
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
      toast.success("Complaint submitted successfully");
      queryClient.invalidateQueries({
        queryKey: ["hrms", "complaints", "mine"],
      });
      navigate("/profile/support");
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to submit complaint";
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/profile/support")}
        className="rounded-xl gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Support
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h1 className="text-lg font-bold">Raise a Complaint</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Submit your concern and we'll look into it
            </p>
            
          </div>

          <ComplaintForm
            submitLabel="Submit Complaint"
            onSubmit={handleSubmit}
            onCancel={() => navigate("/profile/support")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
