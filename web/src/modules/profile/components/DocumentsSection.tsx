import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  GraduationCap,
  Briefcase,
  FolderOpen,
  ChevronRight,
  ImageIcon,
  File,
  FileArchive,
  Trash2,
  RotateCcw,
  Info,
  Search,
  Filter,
  Plus,
  CloudUpload,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { useProfileContext } from "../contexts/ProfileContext";
import { formatDate } from "../utils";
import { getStatusConfig } from "./ui-helpers";
import { staggerContainer, fadeInUp, tabContentVariants } from "../animations";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DocumentType {
  id: string;
  docType: string;
  docCategory: string;
  required: boolean;
  uploaded: boolean;
}

interface UploadedDocument {
  id: string;
  docType: string;
  docCategory: string;
  docNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileName?: string;
  fileSize?: string;
  fileUrl?: string;
  verificationStatus: "pending" | "verified" | "rejected";
  remarks?: string;
  uploadedAt?: string;
  verifiedBy?: string;
  verificationDate?: string;
}

// ─── REQUIRED DOCUMENT DEFINITIONS ───────────────────────────────────────────

const REQUIRED_DOCUMENTS: DocumentType[] = [
  // Identity Documents
  { id: "aadhar", docType: "Aadhar Card", docCategory: "Identity Documents", required: true, uploaded: false },
  { id: "pan", docType: "PAN Card", docCategory: "Identity Documents", required: false, uploaded: false },
  { id: "passport", docType: "Passport", docCategory: "Identity Documents", required: false, uploaded: false },
  { id: "driving-license", docType: "Driving License", docCategory: "Identity Documents", required: false, uploaded: false },
  { id: "voter-id", docType: "Voter ID", docCategory: "Identity Documents", required: false, uploaded: false },
  // Educational Documents
  { id: "10th-cert", docType: "10th Certificate", docCategory: "Educational Documents", required: false, uploaded: false },
  { id: "12th-cert", docType: "12th Certificate", docCategory: "Educational Documents", required: false, uploaded: false },
  { id: "graduation-cert", docType: "Graduation Certificate", docCategory: "Educational Documents", required: true, uploaded: false },
  { id: "pg-cert", docType: "Post Graduation Certificate", docCategory: "Educational Documents", required: false, uploaded: false },
  { id: "prof-cert", docType: "Professional Certifications", docCategory: "Educational Documents", required: false, uploaded: false },
  // Employment Documents
  // { id: "offer-letter", docType: "Offer Letter", docCategory: "Employment Documents", required: true, uploaded: false },
  // { id: "appointment-letter", docType: "Appointment Letter", docCategory: "Employment Documents", required: false, uploaded: false },
  { id: "relieving-letter", docType: "Previous Employment Relieving Letter", docCategory: "Employment Documents", required: false, uploaded: false },
  { id: "experience-cert", docType: "Experience Certificates", docCategory: "Employment Documents", required: false, uploaded: false },
  { id: "salary-slips", docType: "Salary Slips (Last 3 months)", docCategory: "Employment Documents", required: false, uploaded: false },
  // Other Documents
  { id: "resume", docType: "Resume / CV", docCategory: "Other Documents", required: true, uploaded: false },
  { id: "photo", docType: "Passport Size Photo", docCategory: "Other Documents", required: true, uploaded: false },
  { id: "bank-proof", docType: "Bank Passbook / Cancelled Cheque", docCategory: "Other Documents", required: true, uploaded: false },
  { id: "nda", docType: "NDA (signed)", docCategory: "Other Documents", required: false, uploaded: false },
  { id: "code-of-conduct", docType: "Code of Conduct Agreement (signed)", docCategory: "Other Documents", required: false, uploaded: false },
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

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
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
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docNumber, setDocNumber] = useState(existingDoc?.docNumber || "");
  const [issueDate, setIssueDate] = useState(existingDoc?.issueDate || "");
  const [expiryDate, setExpiryDate] = useState(existingDoc?.expiryDate || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (issueDate) formData.append("issueDate", issueDate);
      if (expiryDate) formData.append("expiryDate", expiryDate);

      if (isReupload && existingDoc) {
        // PATCH /profile/documents/:id
        formData.append("docType", existingDoc.docType);
        formData.append("docCategory", existingDoc.docCategory);
        await api.patch(`/profile/documents/${existingDoc.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (documentType) {
        // POST /profile/documents
        formData.append("docType", documentType.docType);
        formData.append("docCategory", documentType.docCategory);
        await api.post("/profile/documents", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      onSuccess();
      setSelectedFile(null);
      setDocNumber("");
      setIssueDate("");
      setExpiryDate("");
      onOpenChange(false);
    } catch (err: any) {
      const message = err?.response?.data?.message || "Upload failed. Please try again.";
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setDocNumber("");
    setIssueDate("");
    setExpiryDate("");
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

          {/* Drop Zone */}
          <div
            className={cn(
              "relative border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer",
              dragActive
                ? "border-primary bg-primary/5 scale-[1.01]"
                : selectedFile
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileSelect}
            />

            <AnimatePresence mode="wait">
              {selectedFile ? (
                <motion.div
                  key="file-selected"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      {React.createElement(getFileIcon(selectedFile.name), {
                        className: "h-7 w-7 text-emerald-600",
                      })}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatFileSize(selectedFile.size)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">
                          Ready to upload
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="drop-zone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 text-center"
                >
                  <motion.div
                    animate={dragActive ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mx-auto mb-4"
                  >
                    <CloudUpload className={cn("h-8 w-8 transition-colors", dragActive ? "text-primary" : "text-primary/40")} />
                  </motion.div>
                  <p className="text-sm font-semibold mb-1">
                    {dragActive ? "Drop your file here" : "Drag & drop your file here"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">or click to browse</p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">
                    PDF, JPG, PNG, DOC • Max 10MB
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </motion.div>
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
}

const PreviewDialog: React.FC<PreviewDialogProps> = ({ open, onOpenChange, document: doc }) => {
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

          {/* Rejection Remarks */}
          {doc.verificationStatus === "rejected" && doc.remarks && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-destructive/5 border border-destructive/15">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-destructive mb-0.5">Rejection Reason</p>
                <p className="text-xs text-destructive/80 leading-relaxed">{doc.remarks}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button variant="outline" className="flex-1 h-10 rounded-xl font-semibold gap-2" onClick={() => {}}>
              <Download className="h-4 w-4" />
              Download
            </Button>
            {doc.verificationStatus === "rejected" && (
              <Button className="flex-1 h-10 rounded-xl font-semibold gap-2 shadow-lg shadow-primary/20">
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
  index: number;
  onUpload: (doc: DocumentType) => void;
  isOnboarding?: boolean;
}

const PendingUploadCard: React.FC<PendingUploadCardProps> = ({ doc, index, onUpload, isOnboarding = true }) => {
  const catConfig = CATEGORY_CONFIG[doc.docCategory] || CATEGORY_CONFIG["Other Documents"];
  const CatIcon = catConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 16 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      }}
      exit={{ opacity: 0, scale: 0.95, y: -16 }}
    >
      <Card
        className={cn(
          "border-dashed border-2 shadow-none hover:shadow-lg hover:shadow-primary/[0.04] transition-all duration-400 group bg-muted/10 backdrop-blur-sm overflow-hidden",
          (isOnboarding || doc.docType === "Passport Size Photo") ? "hover:bg-muted/20 cursor-pointer" : "cursor-default",
          catConfig.borderColor
        )}
        onClick={() => (isOnboarding || doc.docType === "Passport Size Photo") && onUpload(doc)}
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
            <div className="flex items-center gap-2">
              {doc.required && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-5 font-bold rounded-md bg-destructive/5 text-destructive border-destructive/20"
                >
                  Required
                </Badge>
              )}
            </div>
          </div>

          <h4 className="font-bold text-sm mb-1 group-hover:text-primary transition-colors">
            {doc.docType}
          </h4>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            {doc.docCategory}
          </p>

          {(isOnboarding || doc.docType === "Passport Size Photo") && (
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
    </motion.div>
  );
};

// ─── UPLOADED DOCUMENT CARD ─────────────────────────────────────────────────

interface UploadedDocCardProps {
  doc: UploadedDocument;
  index: number;
  onView: (doc: UploadedDocument) => void;
  onReupload: (doc: UploadedDocument) => void;
  onDelete: (doc: UploadedDocument) => void;
  isOnboarding?: boolean;
}

const UploadedDocCard: React.FC<UploadedDocCardProps> = ({ doc, index, onView, onReupload, onDelete, isOnboarding = true }) => {
  const status = getStatusConfig(doc.verificationStatus);
  const StatusIcon = status.icon;
  const catConfig = CATEGORY_CONFIG[doc.docCategory] || CATEGORY_CONFIG["Other Documents"];
  const CatIcon = catConfig.icon;
  const FileIcon = getFileIcon(doc.fileName);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 16 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      }}
      exit={{ opacity: 0, scale: 0.95, y: -16 }}
    >
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

          {doc.verificationStatus === "verified" && doc.verifiedBy && (
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-emerald-600/80 leading-relaxed">
                  Verified by {doc.verifiedBy}
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
            {(isOnboarding || doc.docType === "Passport Size Photo") && doc.verificationStatus === "rejected" && (
              <Button
                size="sm"
                className="rounded-xl h-9 text-xs font-bold gap-1.5 shadow-md shadow-primary/20"
                onClick={() => onReupload(doc)}
              >
                <Upload className="h-3 w-3" />
                Re-upload
              </Button>
            )}
            {(isOnboarding || doc.docType === "Passport Size Photo") && doc.verificationStatus !== "verified" && (
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
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─── MAIN DOCUMENTS SECTION ─────────────────────────────────────────────────

export const DocumentsSection: React.FC = () => {
  const { data, refetch } = useProfileContext();
  const queryClient = useQueryClient();

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeView, setActiveView] = useState<"uploaded" | "pending">("uploaded");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [selectedUploadedDoc, setSelectedUploadedDoc] = useState<UploadedDocument | null>(null);
  const [isReupload, setIsReupload] = useState(false);

  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['my-profile'] });
  };

  if (!data) return null;

  const DOCUMENTS: UploadedDocument[] = data?.documents || [];

  // Determine pending documents
  const uploadedDocTypes = new Set(DOCUMENTS.map((d) => d.docType));
  const pendingDocuments = REQUIRED_DOCUMENTS.filter((d) => !uploadedDocTypes.has(d.docType));
  const requiredPendingCount = pendingDocuments.filter((d) => d.required).length;

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

  // Stats
  const verifiedCount = DOCUMENTS.filter((d) => d.verificationStatus === "verified").length;
  const pendingVerificationCount = DOCUMENTS.filter((d) => d.verificationStatus === "pending").length;
  const rejectedCount = DOCUMENTS.filter((d) => d.verificationStatus === "rejected").length;

  // Completion
  const totalRequired = REQUIRED_DOCUMENTS.filter((d) => d.required).length;
  const uploadedRequired = REQUIRED_DOCUMENTS.filter(
    (d) => d.required && uploadedDocTypes.has(d.docType)
  ).length;
  const completionPct = totalRequired > 0 ? Math.round((uploadedRequired / totalRequired) * 100) : 0;

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
      await api.delete(`/profile/documents/${doc.id}`);
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete document.");
    }
  };

  return (
    <motion.div key="documents" variants={tabContentVariants} initial="hidden" animate="visible" exit="exit">
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
        {/* ── Progress Banner ──────────────────────────────────────────── */}
        <motion.div variants={fadeInUp}>
          <Card className="border-border/40 shadow-lg shadow-black/[0.02] bg-gradient-to-r from-primary/[0.03] via-background to-primary/[0.02] backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-7 w-7 text-primary" />
                    </div>
                    {completionPct === 100 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                      </motion.div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-0.5">Document Submission</h3>
                    <p className="text-xs text-muted-foreground">
                      {completionPct === 100
                        ? "All required documents uploaded! 🎉"
                        : `${requiredPendingCount} required document${requiredPendingCount !== 1 ? "s" : ""} remaining`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex-1 sm:w-48">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        Progress
                      </span>
                      <span className="text-sm font-black text-primary">{completionPct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                      <motion.div
                        className={cn(
                          "h-full rounded-full",
                          completionPct === 100
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                            : "bg-gradient-to-r from-primary to-primary/80"
                        )}
                        initial={{ width: 0 }}
                        animate={{ width: `${completionPct}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-2xl font-black tracking-tight">
                      {uploadedRequired}/{totalRequired}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      Required
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Stats Grid ──────────────────────────────────────────────── */}
        <motion.div variants={fadeInUp} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            {
              label: "Total Uploaded",
              value: DOCUMENTS.length,
              icon: FileText,
              color: "text-primary",
              bg: "bg-primary/10",
              borderColor: "border-primary/10",
            },
            {
              label: "Verified",
              value: verifiedCount,
              icon: FileCheck,
              color: "text-emerald-600",
              bg: "bg-emerald-500/10",
              borderColor: "border-emerald-500/10",
            },
            {
              label: "Pending Review",
              value: pendingVerificationCount,
              icon: FileClock,
              color: "text-amber-600",
              bg: "bg-amber-500/10",
              borderColor: "border-amber-500/10",
            },
            {
              label: "Rejected",
              value: rejectedCount,
              icon: FileX,
              color: "text-destructive",
              bg: "bg-destructive/10",
              borderColor: "border-destructive/10",
            },
            {
              label: "Not Uploaded",
              value: pendingDocuments.length,
              icon: CloudUpload,
              color: "text-muted-foreground",
              bg: "bg-muted/30",
              borderColor: "border-border/30",
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
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
                  <stat.icon className={cn("h-4.5 w-4.5", stat.color)} />
                </div>
                <div>
                  <motion.p
                    className="text-xl font-black tracking-tight"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {stat.value}
                  </motion.p>
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-semibold leading-tight">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* ── View Toggle + Search + Filters ─────────────────────────── */}
        <motion.div variants={fadeInUp} className="space-y-4">
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
                {requiredPendingCount > 0 && (
                  <span className="ml-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center font-bold px-1">
                    {requiredPendingCount}
                  </span>
                )}
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
                </Button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Document Grid ──────────────────────────────────────────── */}
        <motion.div variants={fadeInUp}>
          <AnimatePresence mode="wait">
            {activeView === "uploaded" ? (
              <motion.div
                key="uploaded-grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                {filteredUploaded.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {filteredUploaded.map((doc, index) => (
                        <UploadedDocCard
                          key={doc.id}
                          doc={doc}
                          index={index}
                          onView={handleView}
                          onReupload={handleReupload}
                          onDelete={handleDelete}
                          isOnboarding={data.isOnboarding}
                        />
                      ))}
                    </AnimatePresence>
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
              </motion.div>
            ) : (
              <motion.div
                key="pending-grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                {/* Required Docs Alert */}
                {requiredPendingCount > 0 && activeCategory === "all" && !searchQuery && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15"
                  >
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-700 mb-0.5">
                        {requiredPendingCount} Required Document{requiredPendingCount !== 1 ? "s" : ""} Missing
                      </p>
                      <p className="text-xs text-amber-600/80">
                        Please upload all required documents marked with a red badge to complete your onboarding.
                      </p>
                    </div>
                  </motion.div>
                )}

                {filteredPending.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {/* Sort: required first */}
                      {[...filteredPending]
                        .sort((a, b) => (a.required === b.required ? 0 : a.required ? -1 : 1))
                        .map((doc, index) => (
                          <PendingUploadCard
                            key={doc.id}
                            doc={doc}
                            index={index}
                            onUpload={handleUploadClick}
                            isOnboarding={data.isOnboarding}
                          />
                        ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Card className="border-border/30 bg-emerald-500/5 border-emerald-500/15">
                    <CardContent className="p-12 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"
                      >
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      </motion.div>
                      <h3 className="text-sm font-bold mb-1 text-emerald-700">All documents uploaded!</h3>
                      <p className="text-xs text-emerald-600/70">
                        {searchQuery || activeCategory !== "all"
                          ? "No pending documents match your filter"
                          : "You've uploaded all required and optional documents"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Category-wise Summary (Collapsed) ──────────────────────── */}
        {activeView === "uploaded" && DOCUMENTS.length > 0 && (
          <motion.div variants={fadeInUp}>
            <Card className="border-border/30 bg-muted/10 backdrop-blur-sm">
              <CardContent className="p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                  <Info className="h-3.5 w-3.5" />
                  Category Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                    const CIcon = config.icon;
                    const catDocs = DOCUMENTS.filter((d) => d.docCategory === category);
                    const catTotal = REQUIRED_DOCUMENTS.filter((d) => d.docCategory === category).length;
                    const catVerified = catDocs.filter((d) => d.verificationStatus === "verified").length;

                    return (
                      <div
                        key={category}
                        className={cn(
                          "p-3 rounded-xl border transition-all duration-200 hover:bg-muted/20 cursor-pointer",
                          config.borderColor
                        )}
                        onClick={() => {
                          setActiveCategory(category);
                          setActiveView("uploaded");
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", config.bg)}>
                            <CIcon className={cn("h-3.5 w-3.5", config.color)} />
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground/30 ml-auto" />
                        </div>
                        <p className="text-[10px] font-semibold text-muted-foreground truncate mb-1">
                          {category}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black">
                            {catDocs.length}/{catTotal}
                          </span>
                          <span className="text-[9px] text-muted-foreground">uploaded</span>
                        </div>
                        {catDocs.length > 0 && (
                          <div className="h-1.5 rounded-full bg-muted/50 mt-2 overflow-hidden">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", config.bg.replace("/10", ""))}
                              style={{ width: `${(catVerified / catDocs.length) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

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
      />
    </motion.div>
  );
};