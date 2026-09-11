import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/file-upload";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Loader2, Paperclip } from "lucide-react";
import {
  COMPLAINT_TYPES,
  COMPLAINT_AGAINST_OPTIONS,
  PRIORITY_CONFIG,
  toDateTimeInput,
  type Complaint,
  type ComplaintFormValues,
} from "../helpers/types";

const EMPTY_FORM: ComplaintFormValues = {
  complaintType: "",
  subject: "",
  complaintAgainst: "",
  complaintAgainstId: null,
  onBehalfOfId: null,
  priority: "",
  incidentDate: "",
  incidentLocation: "",
  description: "",
  previousAttempts: "",
  witnesses: "",
  expectedResolution: "",
  attachments: [],
};

const toFormValues = (complaint: Complaint | null | undefined): ComplaintFormValues =>
  complaint
    ? {
        complaintType: complaint.complaintType || "",
        subject: complaint.subject || "",
        complaintAgainst: complaint.complaintAgainst || "",
        complaintAgainstId: null,
        onBehalfOfId: null,
        priority: complaint.priority || "",
        incidentDate: toDateTimeInput(complaint.incidentDate),
        incidentLocation: complaint.incidentLocation || "",
        description: complaint.description || "",
        previousAttempts: complaint.previousAttempts || "",
        witnesses: complaint.witnesses || "",
        expectedResolution: complaint.expectedResolution || "",
        attachments: complaint.attachments || [],
      }
    : { ...EMPTY_FORM };

interface ComplaintFormProps {
  /** Pass an existing complaint to prefill the form (edit mode) */
  initialValues?: Complaint | null;
  /** Admin/HR flow — shows the "On Behalf Of" employee selector */
  onBehalfOf?: boolean;
  onSubmit: (values: ComplaintFormValues) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
}

/**
 * Shared single-page complaint form (create + edit).
 * Success/error UX (toasts, redirects, refetch) belongs to the parent.
 */
const ComplaintForm: React.FC<ComplaintFormProps> = ({
  initialValues,
  onBehalfOf = false,
  onSubmit,
  onCancel,
  submitLabel = "Submit",
}) => {
  const [form, setForm] = useState<ComplaintFormValues>(() =>
    toFormValues(initialValues)
  );
  const [submitting, setSubmitting] = useState(false);

  // Employee / department lists for the "complaint against" select
  const { data: lookups } = useQuery({
    queryKey: ["hrms", "complaints", "lookups"],
    queryFn: async () => {
      const res = await api.get("/hrms/complaints/lookups");
      return res.data as {
        users: { id: number; name: string }[];
        departments: { id: number; name: string }[];
      };
    },
  });

  const updateForm = (
    field: keyof ComplaintFormValues,
    value: ComplaintFormValues[keyof ComplaintFormValues]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canSubmit =
    form.complaintType &&
    form.subject &&
    form.priority &&
    form.description &&
    (!onBehalfOf || !!form.onBehalfOfId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* On Behalf Of (admin/HR flow only) */}
      {onBehalfOf && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            On Behalf Of <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.onBehalfOfId ? String(form.onBehalfOfId) : ""}
            onValueChange={(v) => updateForm("onBehalfOfId", Number(v))}
          >
            <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/20 text-sm">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-60">
              {lookups?.users?.map((opt) => (
                <SelectItem key={opt.id} value={String(opt.id)} className="rounded-lg">
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Subject */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">
          Subject <span className="text-destructive">*</span>
        </Label>
        <Input
          placeholder="Brief summary of the issue"
          value={form.subject}
          onChange={(e) => updateForm("subject", e.target.value)}
          maxLength={500}
          className="h-11 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
        />
      </div>

      {/* Complaint Type + Complaint Against + Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Complaint Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.complaintType}
            onValueChange={(v) => updateForm("complaintType", v)}
          >
            <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/20 text-sm">
              <SelectValue placeholder="Select complaint type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {COMPLAINT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value} className="rounded-lg">
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Complaint Against
          </Label>
          <Select
            value={form.complaintAgainst}
            onValueChange={(v) => {
              updateForm("complaintAgainst", v);
              updateForm("complaintAgainstId", null);
            }}
          >
            <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/20 text-sm">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {COMPLAINT_AGAINST_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Priority <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.priority}
            onValueChange={(v) => updateForm("priority", v)}
          >
            <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/20 text-sm">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                const PIcon = config.icon;
                return (
                  <SelectItem key={key} value={key} className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <PIcon className="h-3.5 w-3.5" />
                      {config.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Incident Date & Time + Incident Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Incident Date & Time
          </Label>
          <Input
            type="datetime-local"
            value={form.incidentDate}
            onChange={(e) => updateForm("incidentDate", e.target.value)}
            className="h-11 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            Incident Location
          </Label>
          <Input
            placeholder="e.g. Office / Warehouse"
            value={form.incidentLocation}
            onChange={(e) => updateForm("incidentLocation", e.target.value)}
            maxLength={255}
            className="h-11 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
          />
        </div>
      </div>

      {/* Complaint Against subject (conditional) */}
      {(form.complaintAgainst === "person" ||
        form.complaintAgainst === "department") && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">
            {form.complaintAgainst === "person"
              ? "Select Person"
              : "Select Department"}
          </Label>
          <Select
            value={form.complaintAgainstId ? String(form.complaintAgainstId) : ""}
            onValueChange={(v) => updateForm("complaintAgainstId", Number(v))}
          >
            <SelectTrigger className="h-11 rounded-xl border-border/50 bg-muted/20 text-sm">
              <SelectValue
                placeholder={
                  form.complaintAgainst === "person"
                    ? "Select employee"
                    : "Select department"
                }
              />
            </SelectTrigger>
            <SelectContent className="rounded-xl max-h-60">
              {(form.complaintAgainst === "person"
                ? lookups?.users
                : lookups?.departments
              )?.map((opt) => (
                <SelectItem key={opt.id} value={String(opt.id)} className="rounded-lg">
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          placeholder="Describe what happened in detail…"
          value={form.description}
          onChange={(e) => updateForm("description", e.target.value)}
          rows={5}
          className="rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm resize-none"
        />
      </div>

      {/* Previous Attempts */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">
          Previous Attempts to Resolve
        </Label>
        <Textarea
          placeholder="Have you tried to resolve this before? If yes, describe the attempts…"
          value={form.previousAttempts}
          onChange={(e) => updateForm("previousAttempts", e.target.value)}
          rows={3}
          className="rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm resize-none"
        />
      </div>

      {/* Witnesses */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">
          Witnesses
        </Label>
        <Input
          placeholder="Names of anyone who witnessed the incident"
          value={form.witnesses}
          onChange={(e) => updateForm("witnesses", e.target.value)}
          className="h-11 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
        />
      </div>

      {/* Expected Resolution */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground">
          Expected Resolution
        </Label>
        <Textarea
          placeholder="What outcome would you consider a fair resolution?"
          value={form.expectedResolution}
          onChange={(e) => updateForm("expectedResolution", e.target.value)}
          rows={3}
          className="rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm resize-none"
        />
      </div>

      {/* Supporting Documents */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-3 w-3" />
          Supporting Documents
        </Label>
        <FileUploader
          context="complaints"
          value={form.attachments}
          onChange={(paths) => updateForm("attachments", paths)}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl font-semibold text-xs"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          className="rounded-xl font-semibold text-xs gap-2 h-10 px-6 shadow-lg shadow-primary/20"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Submitting..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default ComplaintForm;
