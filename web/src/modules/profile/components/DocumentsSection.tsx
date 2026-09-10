import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  FileCheck,
  FileClock,
  FileX,
  Upload,
  Eye,
  Download,
  CheckCircle2,
  AlertCircle,
  Shield,
  Lock,
  GraduationCap,
  Briefcase,
  FolderOpen,
  ImageIcon,
  File,
  FileArchive,
  Trash2,
  RotateCcw,
  Info,
  Search,
  Plus,
  CloudUpload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { FileUploader } from "@/components/file-upload";
import api from "@/lib/axios";
import { useProfileContext } from "../contexts/ProfileContext";
import { useOnboardingContext } from "./onboarding/contexts/OnboardingContext";
import type { ProfileResponse, DocumentData } from "../types";
import { formatDate } from "../utils";

const getStatusConfig = (status: string) => {
  switch (status) {
    case "approved":
      return {
        label: "Approved",
        icon: FileCheck,
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      };
    case "pending":
      return {
        label: "Pending",
        icon: FileClock,
        className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      };
    case "rejected":
      return {
        label: "Rejected",
        icon: FileX,
        className: "bg-destructive/10 text-destructive border-destructive/20",
      };
    default:
      return {
        label: status,
        icon: Info,
        className: "bg-muted text-muted-foreground border-border",
      };
  }
};

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DocumentType {
  id: string;
  docType: string;
  docCategory: string;
  uploaded: boolean;
}

interface UploadedDocument extends DocumentData {
  fileSize?: string;
}

// ─── REQUIRED DOCUMENT DEFINITIONS ───────────────────────────────────────────

const REQUIRED_DOCUMENTS: DocumentType[] = [
  // Identity Documents
  { id: "aadhar", docType: "Aadhar Card", docCategory: "Identity Documents", uploaded: false },
  { id: "pan", docType: "PAN Card", docCategory: "Identity Documents", uploaded: false },
  { id: "passport", docType: "Passport", docCategory: "Identity Documents", uploaded: false },
  { id: "driving-license", docType: "Driving License", docCategory: "Identity Documents", uploaded: false },
  { id: "voter-id", docType: "Voter ID", docCategory: "Identity Documents", uploaded: false },
  // Educational Documents
  { id: "10th-cert", docType: "10th Certificate", docCategory: "Educational Documents", uploaded: false },
  { id: "12th-cert", docType: "12th Certificate", docCategory: "Educational Documents", uploaded: false },
  { id: "graduation-cert", docType: "Graduation Certificate", docCategory: "Educational Documents", uploaded: false },
  { id: "pg-cert", docType: "Post Graduation Certificate", docCategory: "Educational Documents", uploaded: false },
  { id: "prof-cert", docType: "Professional Certifications", docCategory: "Educational Documents", uploaded: false },
  // Employment Documents
  // { id: "offer-letter", docType: "Offer Letter", docCategory: "Employment Documents", uploaded: false },
  // { id: "appointment-letter", docType: "Appointment Letter", docCategory: "Employment Documents", uploaded: false },
  { id: "relieving-letter", docType: "Previous Employment Relieving Letter", docCategory: "Employment Documents", uploaded: false },
  { id: "experience-cert", docType: "Experience Certificates", docCategory: "Employment Documents", uploaded: false },
  { id: "salary-slips", docType: "Salary Slips (Last 3 months)", docCategory: "Employment Documents", uploaded: false },
  // Other Documents
  { id: "resume", docType: "Resume / CV", docCategory: "Other Documents", uploaded: false },
  { id: "photo", docType: "Passport Size Photo", docCategory: "Other Documents", uploaded: false },
  { id: "bank-proof", docType: "Bank Passbook / Cancelled Cheque", docCategory: "Other Documents", uploaded: false },
  { id: "nda", docType: "NDA (signed)", docCategory: "Other Documents", uploaded: false },
  { id: "code-of-conduct", docType: "Code of Conduct Agreement (signed)", docCategory: "Other Documents", uploaded: false },
];

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; borderColor: string }> = {
  "Identity Documents": { icon: Shield, color: "text-blue-600", bg: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  "Educational Documents": { icon: GraduationCap, color: "text-violet-600", bg: "bg-violet-500/10", borderColor: "border-violet-500/20" },
  "Employment Documents": { icon: Briefcase, color: "text-amber-600", bg: "bg-amber-500/10", borderColor: "border-amber-500/20" },
  "Other Documents": { icon: FolderOpen, color: "text-emerald-600", bg: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
};

// ─── FILE ICON HELPER ────────────────────────────────────────────────────────

function getFileIcon(fileName?: string) {
  if (!fileName) return File;
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return ImageIcon;
  if (["zip", "rar", "7z", "tar"].includes(ext || "")) return FileArchive;
  return FileText;
}

// ─── UPLOAD DIALOG ──────────────────────────────────────────────────────────

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType?: DocumentType | null;
  isReupload?: boolean;
  existingDoc?: UploadedDocument | null;
  onSuccess: () => void;
}

const UploadDialog: React.FC<UploadDialogProps> = ({
  open,
  onOpenChange,
  documentType,
  isReupload = false,
  existingDoc,
  onSuccess,
}) => {
  const [files, setFiles] = useState<string[]>([]);
  const [issueDate, setIssueDate] = useState(existingDoc?.issueDate || "");
  const [expiryDate, setExpiryDate] = useState(existingDoc?.expiryDate || "");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!files[0]) return;
    setUploading(true);
    try {
      const payload: Record<string, unknown> = {
        filename: files[0],
        issueDate: issueDate || undefined,
        expiryDate: expiryDate || undefined,
      };

      // Documents always live on the employee-onboarding endpoints (the
      // /profile/documents* routes do not exist)
      const urlPrefix = "/hrms/employee-onboarding";
      if (isReupload && existingDoc) {
        await api.patch(`${urlPrefix}/documents/${existingDoc.id}`, payload);
      } else if (documentType) {
        payload.docType = documentType.docType;
        payload.docCategory = documentType.docCategory;
        await api.post(`${urlPrefix}/documents`, payload);
      }

      onSuccess();
      setFiles([]);
      setIssueDate("");
      setExpiryDate("");
      onOpenChange(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message || "Upload failed. Please try again.";
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const docName = documentType?.docType || existingDoc?.docType || "Document";
  const catConfig = CATEGORY_CONFIG[documentType?.docCategory || existingDoc?.docCategory || "Other Documents"];
  const CatIcon = catConfig?.icon || FolderOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl p-0 overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", catConfig?.bg)}>
                <CatIcon className={cn("h-5 w-5", catConfig?.color)} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  {isReupload ? "Re-upload" : "Upload"} {docName}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {documentType?.docCategory || existingDoc?.docCategory}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Rejection Reason (for re-uploads) */}
          {isReupload && existingDoc?.remarks && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/15">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-destructive mb-0.5">Rejection Reason</p>
                <p className="text-xs text-destructive/80 leading-relaxed">{existingDoc.remarks}</p>
              </div>
            </div>
          )}

          {/* File Upload */}
          <FileUploader
            context="employee-documents"
            value={files}
            onChange={setFiles}
            disabled={uploading}
          />

          {/* Document Details */}
          <div className="grid grid-cols-1 gap-4">
            {/* <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Document Number</Label>
              <Input
                placeholder="e.g. XXXX-XXXX-XXXX"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="h-10 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
              />
            </div> */}
            {/* <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Issue Date</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-10 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Expiry Date</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-10 rounded-xl border-border/50 bg-muted/20 focus:bg-background text-sm"
                />
              </div>
            </div> */}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 rounded-xl font-semibold gap-2 shadow-lg shadow-primary/20"
              onClick={handleUpload}
              disabled={!files[0] || uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {isReupload ? "Re-upload" : "Upload"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── DOCUMENT PREVIEW DIALOG ────────────────────────────────────────────────

interface PreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: UploadedDocument | null;
  onReupload: (doc: UploadedDocument) => void;
}

const PreviewDialog: React.FC<PreviewDialogProps> = ({ open, onOpenChange, document: doc, onReupload }) => {
  if (!doc) return null;
  const status = getStatusConfig(doc.verificationStatus);
  const StatusIcon = status.icon;
  const catConfig = CATEGORY_CONFIG[doc.docCategory] || CATEGORY_CONFIG["Other Documents"];
  const CatIcon = catConfig.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl p-0 overflow-hidden">
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
          <DialogHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", catConfig.bg)}>
                  <CatIcon className={cn("h-5 w-5", catConfig.color)} />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">{doc.docType}</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">{doc.docCategory}</DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className={cn("text-[10px] h-6 font-bold rounded-lg", status.className)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Document Preview Area */}
          <div className="h-48 rounded-2xl bg-muted/30 border border-border/30 flex items-center justify-center">
            <div className="text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-xs text-muted-foreground">Document Preview</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">{doc.fileName || "document.pdf"}</p>
            </div>
          </div>

          {/* Document Details */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Document Number", value: doc.docNumber || "—" },
              { label: "Uploaded On", value: doc.uploadedAt ? formatDate(doc.uploadedAt) : "—" },
              { label: "Issue Date", value: doc.issueDate ? formatDate(doc.issueDate) : "—" },
              { label: "Expiry Date", value: doc.expiryDate ? formatDate(doc.expiryDate) : "—" },
              { label: "Verified By", value: doc.verifiedBy || "—" },
              { label: "Verification Date", value: doc.verificationDate ? formatDate(doc.verificationDate) : "—" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-xl bg-muted/20 border border-border/20">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                  {item.label}
                </p>
                <p className="text-sm font-semibold">{item.value}</p>
              </div>
            ))}
          </div>

          {/* HR Remarks (rejected or reverted-to-pending) */}
          {doc.remarks && doc.verificationStatus !== "approved" && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/15">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-destructive mb-0.5">
                  {doc.verificationStatus === "rejected" ? "Rejection Reason" : "HR Remark"}
                </p>
                <p className="text-xs text-destructive/80 leading-relaxed">{doc.remarks}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl font-semibold gap-2"
              onClick={() => doc.fileUrl && window.open(doc.fileUrl, "_blank")}
              disabled={!doc.fileUrl}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            {doc.verificationStatus !== "approved" && (
              <Button
                className="flex-1 h-10 rounded-xl font-semibold gap-2 shadow-lg shadow-primary/20"
                onClick={() => {
                  onOpenChange(false);
                  onReupload(doc);
                }}
              >
                <Upload className="h-4 w-4" />
                Re-upload
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── PENDING UPLOAD CARD ────────────────────────────────────────────────────

interface PendingUploadCardProps {
  doc: DocumentType;
  onUpload: (doc: DocumentType) => void;
  canUpload?: boolean;
}

const PendingUploadCard: React.FC<PendingUploadCardProps> = ({ doc, onUpload, canUpload = true }) => {
  const catConfig = CATEGORY_CONFIG[doc.docCategory] || CATEGORY_CONFIG["Other Documents"];
  const CatIcon = catConfig.icon;

  return (
    <div>
      <Card
        className={cn(
          "border-dashed border-2 shadow-none hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-400 group bg-muted/10 backdrop-blur-sm overflow-hidden",
          canUpload ? "hover:bg-muted/20 cursor-pointer" : "cursor-default",
          catConfig.borderColor
        )}
        onClick={() => canUpload && onUpload(doc)}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                catConfig.bg,
                "group-hover:scale-110"
              )}
            >
              <CatIcon className={cn("h-6 w-6", catConfig.color)} />
            </div>
          </div>

          <h4 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">
            {doc.docType}
          </h4>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            {doc.docCategory}
          </p>

          {canUpload && (
            <div className="mt-5 pt-4 border-t border-dashed border-border/30">
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  "w-full rounded-xl h-9 text-xs font-bold gap-2 transition-all duration-300",
                  "group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/20"
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                Upload Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── UPLOADED DOCUMENT CARD ─────────────────────────────────────────────────

interface UploadedDocCardProps {
  doc: UploadedDocument;
  onView: (doc: UploadedDocument) => void;
  onReupload: (doc: UploadedDocument) => void;
  onDelete: (doc: UploadedDocument) => void;
}

const UploadedDocCard: React.FC<UploadedDocCardProps> = ({ doc, onView, onReupload, onDelete }) => {
  const status = getStatusConfig(doc.verificationStatus);
  const StatusIcon = status.icon;
  const FileIcon = getFileIcon(doc.fileName ?? undefined);
  const canModify = doc.verificationStatus !== "approved";

  return (
    <div>
      <Card className="border-border/40 shadow-lg shadow-black/[0.03] hover:shadow-xl hover:shadow-primary/[0.06] hover:border-primary/15 hover:bg-muted/30 transition-all duration-400 group bg-muted/20 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div
              className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                "bg-primary/5 text-primary/60",
                "group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20"
              )}
            >
              <FileIcon className="h-6 w-6" />
            </div>
            <Badge variant="outline" className={cn("text-[10px] h-6 font-bold rounded-lg", status.className)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
          </div>

          <h4 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">
            {doc.docType}
          </h4>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            <span>{doc.docCategory}</span>
            {doc.docNumber && (
              <>
                <span className="text-primary/20">•</span>
                <span className="font-mono normal-case">{doc.docNumber}</span>
              </>
            )}
          </div>

          {/* File info */}
          {doc.fileName && (
            <div className="flex items-center gap-2 mt-2.5 p-2 rounded-lg bg-muted/30">
              <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
              <span className="text-[11px] text-muted-foreground truncate flex-1">{doc.fileName}</span>
              {doc.fileSize && (
                <span className="text-[10px] text-muted-foreground/50 shrink-0">{doc.fileSize}</span>
              )}
            </div>
          )}

          {doc.issueDate && (
            <p className="text-[10px] text-muted-foreground/60 mt-2">
              Issued {formatDate(doc.issueDate)}
              {doc.expiryDate && <> • Expires {formatDate(doc.expiryDate)}</>}
            </p>
          )}

          {doc.uploadedAt && (
            <p className="text-[10px] text-muted-foreground/40 mt-1">
              Uploaded {formatDate(doc.uploadedAt)}
            </p>
          )}

          {doc.remarks && doc.verificationStatus === "rejected" && (
            <div className="mt-3 p-2.5 rounded-xl bg-destructive/5 border border-destructive/10">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                <p className="text-[10px] text-destructive/80 leading-relaxed">{doc.remarks}</p>
              </div>
            </div>
          )}

          {doc.verificationStatus === "approved" && doc.verifiedBy && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-emerald-600/80 leading-relaxed">
                  Approved by {doc.verifiedBy}
                  {doc.verificationDate && <> on {formatDate(doc.verificationDate)}</>}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border/30">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 rounded-xl h-9 text-xs font-bold"
              onClick={() => onView(doc)}
            >
              <Eye className="h-3.5 w-3.5 mr-2" /> View
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 rounded-xl h-9 w-9"
                    onClick={() => doc.fileUrl && window.open(doc.fileUrl, "_blank")}
                    disabled={!doc.fileUrl}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Download</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {canModify && (
              <>
                <Button
                  size="sm"
                  className="rounded-xl h-9 text-xs font-bold gap-1.5 shadow-md shadow-primary/20"
                  onClick={() => onReupload(doc)}
                >
                  <Upload className="h-3 w-3" />
                  Re-upload
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 rounded-xl h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onDelete(doc)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Delete</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            {!canModify && (
              <div className="h-9 w-9 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-100/40 dark:bg-emerald-950/20 shrink-0" title="Approved by HR">
                <Lock className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─── MAIN DOCUMENTS SECTION ─────────────────────────────────────────────────

export const DocumentsSection: React.FC = () => {
  // Try to use Onboarding context first, fallback to Profile context
  let contextData: ProfileResponse | undefined;
  let contextRefetch: (() => void) | undefined;
  let isOnboarding = false;

  try {
    const onboarding = useOnboardingContext();
    if (onboarding && onboarding.data) {
      contextData = onboarding.data;
      contextRefetch = onboarding.refetch;
      isOnboarding = true;
    }
  } catch {
    // Not within OnboardingProvider
  }

  const profileContext = useProfileContext();
  if (!isOnboarding) {
    contextData = profileContext.data;
    contextRefetch = profileContext.refetch;
  }

  const data = contextData;
  const refetch = contextRefetch;
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeView, setActiveView] = useState<"uploaded" | "pending">("uploaded");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [selectedUploadedDoc, setSelectedUploadedDoc] = useState<UploadedDocument | null>(null);
  const [isReupload, setIsReupload] = useState(false);

  // One-time: if nothing has been uploaded yet, land on the "To Upload" tab
  const initialViewApplied = useRef(false);
  useEffect(() => {
    if (!initialViewApplied.current && data) {
      initialViewApplied.current = true;
      if ((data.documents || []).length === 0) {
        setActiveView("pending");
      }
    }
  }, [data]);

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [isOnboarding ? 'my-onboarding-draft' : 'my-profile'] });
    refetch?.();
  };

  if (!data) return null;

  const DOCUMENTS: UploadedDocument[] = data?.documents || [];

  // Determine pending documents
  const uploadedDocTypes = new Set(DOCUMENTS.map((d) => d.docType));
  const pendingDocuments = REQUIRED_DOCUMENTS.filter((d) => !uploadedDocTypes.has(d.docType));

  const categories = [...new Set([...DOCUMENTS.map((d) => d.docCategory), ...REQUIRED_DOCUMENTS.map((d) => d.docCategory)])];

  // Filters
  const filteredUploaded = DOCUMENTS.filter((d) => {
    const matchesCategory = activeCategory === "all" || d.docCategory === activeCategory;
    const matchesSearch =
      !searchQuery ||
      d.docType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.docNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredPending = pendingDocuments.filter((d) => {
    const matchesCategory = activeCategory === "all" || d.docCategory === activeCategory;
    const matchesSearch = !searchQuery || d.docType.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handlers
  const handleUploadClick = (docType: DocumentType) => {
    setSelectedDocType(docType);
    setSelectedUploadedDoc(null);
    setIsReupload(false);
    setUploadDialogOpen(true);
  };

  const handleReupload = (doc: UploadedDocument) => {
    setSelectedDocType(null);
    setSelectedUploadedDoc(doc);
    setIsReupload(true);
    setUploadDialogOpen(true);
  };

  const handleView = (doc: UploadedDocument) => {
    setSelectedUploadedDoc(doc);
    setPreviewDialogOpen(true);
  };

  const handleDelete = async (doc: UploadedDocument) => {
    if (!window.confirm(`Delete "${doc.docType}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/hrms/employee-onboarding/documents/${doc.id}`);
      queryClient.invalidateQueries({ queryKey: [isOnboarding ? 'my-onboarding-draft' : 'my-profile'] });
      refetch?.();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e?.response?.data?.message || "Failed to delete document.");
    }
  };

  return (
    <div>
      <div className="space-y-6">
        {/* ── View Toggle + Search + Filters ─────────────────────────── */}
        <div className="space-y-4">
          {/* View Toggle */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 p-1 bg-muted/20 rounded-xl border border-border/30">
              <Button
                variant={activeView === "uploaded" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("uploaded")}
                className={cn(
                  "h-9 rounded-lg text-xs font-semibold gap-2 transition-all",
                  activeView === "uploaded" && "shadow-md shadow-primary/20"
                )}
              >
                <FileCheck className="h-3.5 w-3.5" />
                Uploaded ({DOCUMENTS.length})
              </Button>
              <Button
                variant={activeView === "pending" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveView("pending")}
                className={cn(
                  "h-9 rounded-lg text-xs font-semibold gap-2 transition-all",
                  activeView === "pending" && "shadow-md shadow-primary/20"
                )}
              >
                <CloudUpload className="h-3.5 w-3.5" />
                To Upload ({pendingDocuments.length})
              </Button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 rounded-xl border-border/40 bg-muted/20 focus:bg-background text-sm"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {[{ label: "All", value: "all" }, ...categories.map((c) => ({ label: c, value: c }))].map((cat) => {
              const catConf = cat.value !== "all" ? CATEGORY_CONFIG[cat.value] : null;
              const CIcon = catConf?.icon;
              const sourceDocs = activeView === "uploaded" ? DOCUMENTS : pendingDocuments;
              const count = cat.value === "all"
                ? sourceDocs.length
                : sourceDocs.filter((d) => d.docCategory === cat.value).length;
              return (
                <Button
                  key={cat.value}
                  variant={activeCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat.value)}
                  className={cn(
                    "h-8 text-[11px] rounded-xl font-semibold transition-all duration-200 gap-1.5",
                    activeCategory === cat.value && "shadow-md shadow-primary/20"
                  )}
                >
                  {CIcon && <CIcon className="h-3 w-3" />}
                  {cat.label}
                  <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-muted-foreground/10 text-[9px] flex items-center justify-center font-bold">
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* ── Document Grid ──────────────────────────────────────────── */}
        <div>
          {activeView === "uploaded" ? (
              <div>
                {filteredUploaded.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUploaded.map((doc) => (
                      <UploadedDocCard
                        key={doc.id}
                        doc={doc}
                        onView={handleView}
                        onReupload={handleReupload}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed border-2 border-border/30 bg-muted/10">
                    <CardContent className="p-12 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                      <h3 className="text-sm font-bold mb-1">No documents found</h3>
                      <p className="text-xs text-muted-foreground mb-4">
                        {searchQuery
                          ? "Try adjusting your search or filter"
                          : "You haven't uploaded any documents yet"}
                      </p>
                      <Button
                        size="sm"
                        className="rounded-xl font-semibold gap-2"
                        onClick={() => setActiveView("pending")}
                      >
                        <CloudUpload className="h-4 w-4" />
                        Upload Documents
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
          ) : (
              <div>
                {filteredPending.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPending.map((doc) => (
                      <PendingUploadCard
                        key={doc.id}
                        doc={doc}
                        onUpload={handleUploadClick}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="bg-emerald-500/5 border-emerald-500/15">
                    <CardContent className="p-12 text-center">
                      <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      </div>
                      <h3 className="text-sm font-bold mb-1 text-emerald-700">All documents uploaded!</h3>
                      <p className="text-xs text-emerald-600/70">
                        {searchQuery || activeCategory !== "all"
                          ? "No pending documents match your filter"
                          : "You've uploaded all documents from the list"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <UploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        documentType={selectedDocType}
        isReupload={isReupload}
        existingDoc={selectedUploadedDoc}
        onSuccess={handleUploadSuccess}
      />

      <PreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        document={selectedUploadedDoc}
        onReupload={handleReupload}
      />
    </div>
  );
};