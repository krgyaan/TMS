import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Users,
  Clock,
  CheckCircle2,
  Eye,
  FileText,
  Shield,
  GraduationCap,
  Briefcase,
  FolderOpen,
  XCircle,
  CheckCheck,
  CircleDashed,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  MessageSquare,
  Star,
  FileBadge,
  FileCheck,
  FileX,
  FileQuestion,
  Download,
  Loader2,
  X,
  AlertTriangle,
  ZoomIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDocumentTrackerList,
  useEmployeeDocuments,
  useVerifyDocument,
} from "./useOnboarding";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocStatus = "pending" | "verified" | "rejected" | "not_uploaded";
type EmployeeDocTab = "all" | "pending" | "verified" | "rejected" | "incomplete";
type DocCategory = "identity" | "educational" | "employment" | "other";

interface Document {
  id: string;
  name: string;
  category: DocCategory;
  required: boolean;
  status: DocStatus;
  uploadedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectedReason?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
}

interface EmployeeDocRecord {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  documents: Document[];
}

// ─── Document Category Config ─────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  DocCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  identity: {
    label: "Identity",
    icon: Shield,
    color: "text-blue-600 dark:text-blue-400",
  },
  educational: {
    label: "Educational",
    icon: GraduationCap,
    color: "text-purple-600 dark:text-purple-400",
  },
  employment: {
    label: "Employment",
    icon: Briefcase,
    color: "text-orange-600 dark:text-orange-400",
  },
  other: {
    label: "Other",
    icon: FolderOpen,
    color: "text-teal-600 dark:text-teal-400",
  },
};

const DOC_STATUS_CONFIG: Record<
  DocStatus,
  { label: string; icon: React.ElementType; badgeClass: string; rowClass: string }
> = {
  not_uploaded: {
    label: "Not Uploaded",
    icon: FileQuestion,
    badgeClass: "bg-muted text-muted-foreground border-border",
    rowClass: "",
  },
  pending: {
    label: "Pending Review",
    icon: Clock,
    badgeClass:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
    rowClass: "border-l-2 border-l-amber-400",
  },
  verified: {
    label: "Verified",
    icon: FileCheck,
    badgeClass:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800",
    rowClass: "border-l-2 border-l-green-500",
  },
  rejected: {
    label: "Rejected",
    icon: FileX,
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
    rowClass: "border-l-2 border-l-destructive",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (first: string, last: string) =>
  `${first?.[0] ?? "?"}${last?.[0] ?? "?"}`.toUpperCase();

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/**
 * Normalize the status from backend to one of our 4 known statuses.
 * Backend might return strings like "uploaded", "under_review", etc.
 */
const normalizeStatus = (status: string | null | undefined): DocStatus => {
  if (!status) return "not_uploaded";
  const s = status.toLowerCase();
  if (s === "verified" || s === "approved") return "verified";
  if (s === "rejected") return "rejected";
  if (
    s === "pending" ||
    s === "uploaded" ||
    s === "under_review" ||
    s === "submitted"
  )
    return "pending";
  return "not_uploaded";
};

/**
 * Normalize category strings from backend.
 */
const normalizeCategory = (cat: string | null | undefined): DocCategory => {
  if (!cat) return "other";
  const c = cat.toLowerCase();
  if (c === "identity") return "identity";
  if (c === "educational" || c === "education") return "educational";
  if (c === "employment") return "employment";
  return "other";
};

/**
 * Map a raw API document row → our frontend Document shape.
 */
const mapApiDoc = (raw: any): Document => ({
  id: String(raw.id),
  name: raw.name ?? raw.docType ?? "Unknown Document",
  category: normalizeCategory(raw.category ?? raw.docCategory),
  required: raw.required ?? false,
  status: normalizeStatus(raw.status),
  uploadedAt: raw.uploadedAt ?? raw.createdAt ?? undefined,
  verifiedBy: raw.verifiedBy ?? undefined,
  verifiedAt: raw.verifiedAt ?? raw.verificationDate ?? undefined,
  rejectedReason: raw.rejectedReason ?? raw.remarks ?? undefined,
  fileName: raw.fileName ?? (raw.fileUrl ? raw.fileUrl.split("/").pop() : undefined),
  fileSize: raw.fileSize ?? undefined,
  fileType: raw.fileType ?? "application/pdf",
  documentNumber: raw.documentNumber ?? undefined,
  issueDate: raw.issueDate ?? undefined,
  expiryDate: raw.expiryDate ?? undefined,
  fileUrl: raw.fileUrl ?? undefined,
});

/**
 * Map a raw API tracker row → our frontend EmployeeDocRecord shape.
 */
const mapApiEmployee = (raw: any): EmployeeDocRecord => ({
  id: raw.id,
  employeeId: raw.employeeId ?? `EMP-${String(raw.id).padStart(4, "0")}`,
  firstName: raw.firstName ?? raw.name?.split(" ")[0] ?? "—",
  lastName:
    raw.lastName ??
    (raw.name?.split(" ").length > 1
      ? raw.name.split(" ").slice(-1)[0]
      : ""),
  middleName: raw.middleName ?? undefined,
  email: raw.email ?? "",
  designation: raw.designation ?? raw.employeeType ?? "—",
  department: raw.department ?? raw.departmentId ?? "—",
  dateOfJoining: raw.dateOfJoining ?? raw.approvedAt ?? new Date().toISOString(),
  documents: Array.isArray(raw.documents)
    ? raw.documents.map(mapApiDoc)
    : [],
});

const computeDocStats = (docs: Document[]) => {
  const total = docs.length;
  const uploaded = docs.filter((d) => d.status !== "not_uploaded").length;
  const verified = docs.filter((d) => d.status === "verified").length;
  const pending = docs.filter((d) => d.status === "pending").length;
  const rejected = docs.filter((d) => d.status === "rejected").length;
  const requiredTotal = docs.filter((d) => d.required).length;
  const requiredVerified = docs.filter(
    (d) => d.required && d.status === "verified"
  ).length;
  const completionPct =
    total === 0 ? 0 : Math.round((verified / total) * 100);
  const allRequiredDone = requiredVerified === requiredTotal;
  return {
    total,
    uploaded,
    verified,
    pending,
    rejected,
    requiredTotal,
    requiredVerified,
    completionPct,
    allRequiredDone,
  };
};

const getEmployeeDocStatus = (emp: EmployeeDocRecord): EmployeeDocTab => {
  const { verified, total, rejected, pending } = computeDocStats(
    emp.documents
  );
  if (rejected > 0) return "rejected";
  if (total > 0 && verified === total) return "verified";
  if (pending > 0) return "pending";
  return "incomplete";
};

// ─── Skeleton Loaders ─────────────────────────────────────────────────────────

const EmployeeRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl border bg-card">
    <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="h-3 w-56" />
    </div>
    <Skeleton className="h-3 w-32 hidden lg:block" />
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-4 w-28" />
    <Skeleton className="h-6 w-20 hidden md:block" />
  </div>
);

const StatCardSkeleton: React.FC = () => (
  <div className="rounded-xl border p-4 flex items-center gap-3 bg-card">
    <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
    <div className="space-y-2">
      <Skeleton className="h-6 w-10" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  highlight?: boolean;
  danger?: boolean;
}> = ({ label, value, sub, icon: Icon, highlight, danger }) => (
  <div
    className={cn(
      "rounded-xl border p-4 flex items-center gap-3 transition-shadow hover:shadow-sm",
      highlight && "bg-primary/5 border-primary/20",
      danger && "bg-destructive/5 border-destructive/20",
      !highlight && !danger && "bg-card"
    )}
  >
    <div
      className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
        highlight && "bg-primary/10",
        danger && "bg-destructive/10",
        !highlight && !danger && "bg-muted"
      )}
    >
      <Icon
        className={cn(
          "h-5 w-5",
          highlight && "text-primary",
          danger && "text-destructive",
          !highlight && !danger && "text-muted-foreground"
        )}
      />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
    </div>
  </div>
);

// ─── Mini Doc Status Pills ────────────────────────────────────────────────────

const DocStatusMini: React.FC<{
  verified: number;
  pending: number;
  rejected: number;
  notUploaded: number;
}> = ({ verified, pending, rejected, notUploaded }) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    {verified > 0 && (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
        <CheckCircle2 className="h-2.5 w-2.5" />
        {verified}
      </span>
    )}
    {pending > 0 && (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
        <Clock className="h-2.5 w-2.5" />
        {pending}
      </span>
    )}
    {rejected > 0 && (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
        <XCircle className="h-2.5 w-2.5" />
        {rejected}
      </span>
    )}
    {notUploaded > 0 && (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
        <CircleDashed className="h-2.5 w-2.5" />
        {notUploaded}
      </span>
    )}
  </div>
);

// ─── Category Progress Bar ────────────────────────────────────────────────────

const CategoryBar: React.FC<{
  docs: Document[];
  category: DocCategory;
}> = ({ docs, category }) => {
  const cfg = CATEGORY_CONFIG[category];
  const Icon = cfg.icon;
  const catDocs = docs.filter((d) => d.category === category);
  const verified = catDocs.filter((d) => d.status === "verified").length;
  const pct =
    catDocs.length === 0 ? 0 : Math.round((verified / catDocs.length) * 100);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <Icon className={cn("h-3 w-3 flex-shrink-0", cfg.color)} />
            <div className="w-14 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  pct === 100
                    ? "bg-green-500"
                    : pct > 0
                    ? "bg-amber-500"
                    : "bg-muted-foreground/20"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground w-6 text-right">
              {pct}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{cfg.label}</p>
          <p className="text-muted-foreground">
            {verified}/{catDocs.length} verified
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ─── Employee Row ─────────────────────────────────────────────────────────────

interface EmployeeRowProps {
  employee: EmployeeDocRecord;
  onView: (e: EmployeeDocRecord) => void;
}

const EmployeeRow: React.FC<EmployeeRowProps> = ({ employee, onView }) => {
  const stats = computeDocStats(employee.documents);
  const notUploaded = stats.total - stats.uploaded;

  return (
    <div
      className="group flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-all cursor-pointer"
      onClick={() => onView(employee)}
    >
      {/* Avatar + Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
              {getInitials(employee.firstName, employee.lastName)}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
              stats.allRequiredDone && stats.verified === stats.total
                ? "bg-green-500"
                : stats.rejected > 0
                ? "bg-destructive"
                : stats.pending > 0
                ? "bg-amber-500"
                : "bg-muted-foreground/40"
            )}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold leading-none">
              {employee.firstName}{" "}
              {employee.middleName ? `${employee.middleName} ` : ""}
              {employee.lastName}
            </p>
            <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded hidden sm:inline">
              {employee.employeeId}
            </span>
            {stats.rejected > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                {stats.rejected} rejected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {employee.designation} · {employee.department}
          </p>
        </div>
      </div>

      {/* Category Bars */}
      <div className="hidden lg:flex flex-col gap-1.5 w-48">
        {(
          ["identity", "educational", "employment", "other"] as DocCategory[]
        ).map((cat) => (
          <CategoryBar key={cat} docs={employee.documents} category={cat} />
        ))}
      </div>

      {/* Mini Status Pills */}
      <div className="flex-shrink-0 w-36">
        <DocStatusMini
          verified={stats.verified}
          pending={stats.pending}
          rejected={stats.rejected}
          notUploaded={notUploaded}
        />
      </div>

      {/* Overall Progress */}
      <div className="flex items-center gap-3 flex-shrink-0 w-32">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-muted-foreground">Overall</span>
            <span className="text-[10px] font-semibold">
              {stats.completionPct}%
            </span>
          </div>
          <Progress value={stats.completionPct} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {stats.verified}/{stats.total} verified
          </p>
        </div>
      </div>

      {/* Mandatory Badge */}
      <div className="flex-shrink-0 w-24 hidden md:block">
        <div
          className={cn(
            "text-center text-[10px] font-medium px-2 py-1 rounded-lg border",
            stats.allRequiredDone
              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
              : "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
          )}
        >
          {stats.requiredVerified}/{stats.requiredTotal} mandatory
        </div>
      </div>

      {/* View Action */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onView(employee);
                }}
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Eye className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs">View documents</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

// ─── Document Row (inside modal) ──────────────────────────────────────────────

interface DocRowProps {
  doc: Document;
  onVerify: (doc: Document) => void;
  onReject: (doc: Document) => void;
  onView: (doc: Document) => void;
}

const DocRow: React.FC<DocRowProps> = ({ doc, onVerify, onReject, onView }) => {
  const cfg = DOC_STATUS_CONFIG[doc.status];
  const StatusIcon = cfg.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card transition-colors hover:bg-muted/30",
        cfg.rowClass
      )}
    >
      {/* File Icon */}
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          doc.status === "verified" && "bg-green-100 dark:bg-green-900/40",
          doc.status === "pending" && "bg-amber-100 dark:bg-amber-900/40",
          doc.status === "rejected" && "bg-destructive/10",
          doc.status === "not_uploaded" && "bg-muted"
        )}
      >
        <StatusIcon
          className={cn(
            "h-4 w-4",
            doc.status === "verified" && "text-green-600 dark:text-green-400",
            doc.status === "pending" && "text-amber-600 dark:text-amber-400",
            doc.status === "rejected" && "text-destructive",
            doc.status === "not_uploaded" && "text-muted-foreground"
          )}
        />
      </div>

      {/* Name + Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs font-medium truncate">{doc.name}</p>
          {doc.required && (
            <Star className="h-2.5 w-2.5 text-destructive flex-shrink-0 fill-current" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {doc.fileName && (
            <span className="text-[10px] text-muted-foreground truncate max-w-32">
              {doc.fileName}
            </span>
          )}
          {doc.fileSize && (
            <span className="text-[10px] text-muted-foreground">
              · {doc.fileSize}
            </span>
          )}
          {doc.uploadedAt && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              · {formatDate(doc.uploadedAt)}
            </span>
          )}
        </div>
        {doc.status === "rejected" && doc.rejectedReason && (
          <p className="text-[10px] text-destructive mt-0.5 truncate">
            ⚠ {doc.rejectedReason}
          </p>
        )}
        {doc.verifiedBy && doc.status === "verified" && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Verified by {doc.verifiedBy}
          </p>
        )}
      </div>

      {/* Status Badge */}
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 hidden sm:inline-flex",
          cfg.badgeClass
        )}
      >
        <StatusIcon className="h-2.5 w-2.5" />
        {cfg.label}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {doc.status !== "not_uploaded" && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onView(doc)}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Preview</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {doc.status === "pending" && (
          <>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onVerify(doc)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/40 dark:hover:text-green-400 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Verify document
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onReject(doc)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  Reject document
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
        {doc.status === "rejected" && (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onVerify(doc)}
                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900/40 dark:hover:text-green-400 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                Mark as verified
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
};

// ─── Category Section (inside modal) ─────────────────────────────────────────

const CategorySection: React.FC<{
  category: DocCategory;
  docs: Document[];
  onVerify: (doc: Document) => void;
  onReject: (doc: Document) => void;
  onViewDoc: (doc: Document) => void;
  defaultOpen?: boolean;
}> = ({ category, docs, onVerify, onReject, onViewDoc, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = CATEGORY_CONFIG[category];
  const Icon = cfg.icon;
  const verified = docs.filter((d) => d.status === "verified").length;
  const pending = docs.filter((d) => d.status === "pending").length;
  const rejected = docs.filter((d) => d.status === "rejected").length;

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-background border">
          <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
        </div>
        <span className="text-sm font-semibold flex-1 text-left">
          {cfg.label} Documents
        </span>
        <div className="flex items-center gap-2 mr-2">
          {verified > 0 && (
            <span className="text-[10px] font-medium text-green-700 dark:text-green-400">
              {verified} verified
            </span>
          )}
          {pending > 0 && (
            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
              {pending} pending
            </span>
          )}
          {rejected > 0 && (
            <span className="text-[10px] font-medium text-destructive">
              {rejected} rejected
            </span>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="p-3 space-y-2 bg-card">
          {docs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              onVerify={onVerify}
              onReject={onReject}
              onView={onViewDoc}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Employee Document Modal ──────────────────────────────────────────────────

interface EmployeeDocModalProps {
  employee: EmployeeDocRecord | null;
  open: boolean;
  onClose: () => void;
  onVerifyDoc: (emp: EmployeeDocRecord, doc: Document) => void;
  onRejectDoc: (emp: EmployeeDocRecord, doc: Document) => void;
  onViewDoc: (doc: Document) => void;
  /** Live documents fetched from API (replaces stale tracker data) */
  liveDocuments?: Document[];
  isLoadingDocs?: boolean;
}

const EmployeeDocModal: React.FC<EmployeeDocModalProps> = ({
  employee,
  open,
  onClose,
  onVerifyDoc,
  onRejectDoc,
  onViewDoc,
  liveDocuments,
  isLoadingDocs,
}) => {
  const [filterCat, setFilterCat] = useState<DocCategory | "all">("all");
  const [filterStatus, setFilterStatus] = useState<DocStatus | "all">("all");

  if (!employee) return null;

  // Prefer live documents from the dedicated endpoint if available
  const docs = liveDocuments ?? employee.documents;
  const stats = computeDocStats(docs);

  const filteredDocs = docs.filter((d) => {
    const catOk = filterCat === "all" || d.category === filterCat;
    const statusOk = filterStatus === "all" || d.status === filterStatus;
    return catOk && statusOk;
  });

  const categories: DocCategory[] = [
    "identity",
    "educational",
    "employment",
    "other",
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <Avatar className="h-11 w-11 flex-shrink-0">
              <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                {getInitials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-base">
                  {employee.firstName}{" "}
                  {employee.middleName ? `${employee.middleName} ` : ""}
                  {employee.lastName}
                </DialogTitle>
                <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {employee.employeeId}
                </span>
              </div>
              <DialogDescription className="text-xs mt-0.5">
                {employee.designation} · {employee.department} · DOJ{" "}
                {employee.dateOfJoining
                  ? formatDate(employee.dateOfJoining)
                  : "—"}
              </DialogDescription>
            </div>
          </div>

          {/* Mini stat strip */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t flex-wrap">
            {[
              {
                label: "Total",
                value: stats.total,
                cls: "text-foreground",
              },
              {
                label: "Verified",
                value: stats.verified,
                cls: "text-green-700 dark:text-green-400",
              },
              {
                label: "Pending",
                value: stats.pending,
                cls: "text-amber-700 dark:text-amber-400",
              },
              {
                label: "Rejected",
                value: stats.rejected,
                cls: "text-destructive",
              },
              {
                label: "Not Uploaded",
                value: stats.total - stats.uploaded,
                cls: "text-muted-foreground",
              },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={cn("text-lg font-bold leading-none", cls)}>
                  {value}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Progress value={stats.completionPct} className="w-20 h-1.5" />
              <span className="text-xs font-semibold">
                {stats.completionPct}%
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Filters */}
        <div className="px-5 py-3 border-b bg-muted/10 flex items-center gap-2 flex-wrap flex-shrink-0">
          <Select
            value={filterCat}
            onValueChange={(v) => setFilterCat(v as any)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_CONFIG[cat].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as any)}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="not_uploaded">Not Uploaded</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
            <Star className="h-2.5 w-2.5 text-destructive fill-current" />
            <span>= Mandatory document</span>
          </div>
        </div>

        {/* Document List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          {isLoadingDocs ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card"
                >
                  <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-2.5 w-56" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full hidden sm:block" />
                </div>
              ))}
            </div>
          ) : filterCat === "all" && filterStatus === "all" ? (
            categories.map((cat, i) => {
              const catDocs = filteredDocs.filter((d) => d.category === cat);
              if (catDocs.length === 0) return null;
              return (
                <CategorySection
                  key={cat}
                  category={cat}
                  docs={catDocs}
                  onVerify={(doc) => onVerifyDoc(employee, doc)}
                  onReject={(doc) => onRejectDoc(employee, doc)}
                  onViewDoc={onViewDoc}
                  defaultOpen={i === 0}
                />
              );
            })
          ) : (
            <div className="space-y-2">
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileQuestion className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium">
                    No documents match filters
                  </p>
                </div>
              ) : (
                filteredDocs.map((doc) => (
                  <DocRow
                    key={doc.id}
                    doc={doc}
                    onVerify={(d) => onVerifyDoc(employee, d)}
                    onReject={(d) => onRejectDoc(employee, d)}
                    onView={onViewDoc}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3.5 border-t bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between w-full gap-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              {stats.allRequiredDone ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-green-700 dark:text-green-400 font-medium">
                    All mandatory documents verified
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>
                    {stats.requiredVerified}/{stats.requiredTotal} mandatory
                    verified
                  </span>
                </>
              )}
            </p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Verify Confirm Modal ─────────────────────────────────────────────────────

const VerifyModal: React.FC<{
  doc: Document | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}> = ({ doc, open, onClose, onConfirm, isLoading }) => (
  <Dialog open={open} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
      <DialogHeader className="px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <FileCheck className="h-5 w-5 text-green-700 dark:text-green-400" />
          </div>
          <div>
            <DialogTitle className="text-base">Verify Document</DialogTitle>
            <DialogDescription className="text-xs mt-0.5 truncate max-w-48">
              {doc?.name}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div className="px-6 py-5">
        <p className="text-sm text-muted-foreground">
          This will mark the document as{" "}
          <span className="font-semibold text-green-700 dark:text-green-400">
            Verified
          </span>
          . The employee will be notified.
        </p>
      </div>
      <DialogFooter className="px-6 py-4 border-t bg-muted/30">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-600"
        >
          {isLoading && (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          )}
          <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
          Confirm Verify
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// ─── Reject Modal ─────────────────────────────────────────────────────────────

const RejectModal: React.FC<{
  doc: Document | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}> = ({ doc, open, onClose, onConfirm, isLoading }) => {
  const [reason, setReason] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        onClose();
        setReason("");
      }}
    >
      <DialogContent className="sm:max-w-sm p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <FileX className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-base">Reject Document</DialogTitle>
              <DialogDescription className="text-xs mt-0.5 truncate max-w-48">
                {doc?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Provide a reason so the employee can re-upload the correct document.
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Rejection Reason
              <span className="text-destructive ml-0.5">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Document is blurry, expired, or incorrect file uploaded."
              rows={3}
              className="resize-none text-sm"
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              setReason("");
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!reason.trim() || isLoading}
            onClick={() => {
              onConfirm(reason);
              setReason("");
            }}
          >
            {isLoading && (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            )}
            <FileX className="h-3.5 w-3.5 mr-1.5" />
            Reject Document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Doc Preview Modal ────────────────────────────────────────────────────────

const DocPreviewModal: React.FC<{
  doc: Document | null;
  open: boolean;
  onClose: () => void;
}> = ({ doc, open, onClose }) => {
  if (!doc) return null;
  const cfg = DOC_STATUS_CONFIG[doc.status];
  const StatusIcon = cfg.icon;
  const catCfg = CATEGORY_CONFIG[doc.category];
  const CatIcon = catCfg.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted border flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base truncate">
                {doc.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <CatIcon className={cn("h-3 w-3", catCfg.color)} />
                <DialogDescription className="text-xs">
                  {catCfg.label}
                </DialogDescription>
                {doc.required && (
                  <span className="flex items-center gap-0.5 text-[10px] text-destructive">
                    <Star className="h-2.5 w-2.5 fill-current" /> Mandatory
                  </span>
                )}
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0",
                cfg.badgeClass
              )}
            >
              <StatusIcon className="h-2.5 w-2.5" />
              {cfg.label}
            </span>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* File Preview / Download */}
          <div className="h-48 rounded-xl border-2 border-dashed bg-muted/40 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted border flex items-center justify-center">
              <FileText className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {doc.fileName ?? "No file uploaded"}
              </p>
              {doc.fileSize && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {doc.fileSize} · PDF
                </p>
              )}
            </div>
            {doc.status !== "not_uploaded" && doc.fileUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Download
                </a>
              </Button>
            )}
            {doc.status !== "not_uploaded" && !doc.fileUrl && (
              <Button variant="outline" size="sm" disabled>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download
              </Button>
            )}
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Document Number", value: doc.documentNumber },
              {
                label: "Issue Date",
                value: doc.issueDate ? formatDate(doc.issueDate) : undefined,
              },
              {
                label: "Expiry Date",
                value: doc.expiryDate ? formatDate(doc.expiryDate) : undefined,
              },
              {
                label: "Uploaded On",
                value: doc.uploadedAt ? formatDate(doc.uploadedAt) : undefined,
              },
              { label: "Verified By", value: doc.verifiedBy },
              {
                label: "Verified On",
                value: doc.verifiedAt ? formatDate(doc.verifiedAt) : undefined,
              },
            ].map(({ label, value }) =>
              value ? (
                <div key={label} className="p-2.5 rounded-lg bg-muted/50 border">
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {label}
                  </p>
                  <p className="text-xs font-semibold mt-0.5">{value}</p>
                </div>
              ) : null
            )}
          </div>

          {/* Rejection Reason */}
          {doc.status === "rejected" && doc.rejectedReason && (
            <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-destructive">
                    Rejection Reason
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {doc.rejectedReason}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ search: string }> = ({ search }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
      <FolderOpen className="h-7 w-7 text-muted-foreground/50" />
    </div>
    <p className="text-sm font-medium">
      {search ? "No matching employees" : "No employees found"}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      {search
        ? `Try adjusting your search — "${search}"`
        : "Approved employees will appear here."}
    </p>
  </div>
);

// ─── Error State ──────────────────────────────────────────────────────────────

const ErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
      <AlertTriangle className="h-7 w-7 text-destructive/60" />
    </div>
    <p className="text-sm font-medium">Failed to load document data</p>
    <p className="text-xs text-muted-foreground mt-1 mb-4">
      There was an error fetching employee documents from the server.
    </p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend: React.FC = () => (
  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
    {(
      ["verified", "pending", "rejected", "not_uploaded"] as DocStatus[]
    ).map((s) => {
      const cfg = DOC_STATUS_CONFIG[s];
      const Icon = cfg.icon;
      return (
        <div key={s} className="flex items-center gap-1.5">
          <Icon
            className={cn(
              "h-3.5 w-3.5",
              s === "verified" && "text-green-600 dark:text-green-400",
              s === "pending" && "text-amber-600 dark:text-amber-400",
              s === "rejected" && "text-destructive",
              s === "not_uploaded" && "text-muted-foreground"
            )}
          />
          <span>{cfg.label}</span>
        </div>
      );
    })}
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

type TabFilter = "all" | "pending" | "verified" | "rejected" | "incomplete";

const DocumentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "pending" | "progress" | "joined"
  >("pending");

  // ── Modals state ──────────────────────────────────────────────────────────
  const [viewEmployee, setViewEmployee] = useState<EmployeeDocRecord | null>(
    null
  );
  const [viewOpen, setViewOpen] = useState(false);

  const [verifyDoc, setVerifyDoc] = useState<{
    emp: EmployeeDocRecord;
    doc: Document;
  } | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const [rejectDoc, setRejectDoc] = useState<{
    emp: EmployeeDocRecord;
    doc: Document;
  } | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ── API: tracker list ─────────────────────────────────────────────────────
  const {
    data: rawTracker,
    isLoading: isLoadingTracker,
    isError: isTrackerError,
    refetch: refetchTracker,
  } = useDocumentTrackerList();

  // ── API: per-employee documents (fetched when modal is open) ──────────────
  const {
    data: rawEmployeeDocs,
    isLoading: isLoadingEmployeeDocs,
  } = useEmployeeDocuments(viewOpen ? viewEmployee?.id ?? null : null);

  // ── API: verify / reject mutation ─────────────────────────────────────────
  // We use the onboardingId from the currently active employee.
  const activeOnboardingId =
    verifyDoc?.emp.id ?? rejectDoc?.emp.id ?? viewEmployee?.id ?? 0;

  const { mutate: verifyMutate, isPending: verifyLoading } = useVerifyDocument(
    activeOnboardingId
  );
  const { mutate: rejectMutate, isPending: rejectLoading } = useVerifyDocument(
    activeOnboardingId
  );

  // ── Derived: map raw API data → typed EmployeeDocRecord[] ─────────────────
  const employees: EmployeeDocRecord[] = useMemo(() => {
    if (!rawTracker) return [];
    return (rawTracker as any[]).map(mapApiEmployee);
  }, [rawTracker]);

  // ── Derived: live documents for the open employee modal ───────────────────
  const liveDocuments: Document[] | undefined = useMemo(() => {
    if (!rawEmployeeDocs) return undefined;
    return (rawEmployeeDocs as any[]).map(mapApiDoc);
  }, [rawEmployeeDocs]);

  // ── Global stats (computed from tracker data) ─────────────────────────────
  const globalStats = useMemo(() => {
    const totalDocs = employees.reduce(
      (a, e) => a + e.documents.length,
      0
    );
    const verified = employees.reduce(
      (a, e) =>
        a + e.documents.filter((d) => d.status === "verified").length,
      0
    );
    const pending = employees.reduce(
      (a, e) =>
        a + e.documents.filter((d) => d.status === "pending").length,
      0
    );
    const rejected = employees.reduce(
      (a, e) =>
        a + e.documents.filter((d) => d.status === "rejected").length,
      0
    );
    return { totalDocs, verified, pending, rejected };
  }, [employees]);

  // ── Tab counts ─────────────────────────────────────────────────────────────
  const tabCounts = useMemo(
    () => ({
      all: employees.length,
      pending: employees.filter(
        (e) => getEmployeeDocStatus(e) === "pending"
      ).length,
      verified: employees.filter(
        (e) => getEmployeeDocStatus(e) === "verified"
      ).length,
      rejected: employees.filter(
        (e) => getEmployeeDocStatus(e) === "rejected"
      ).length,
      incomplete: employees.filter(
        (e) => getEmployeeDocStatus(e) === "incomplete"
      ).length,
    }),
    [employees]
  );

  // ── Filtered & sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = employees.filter((e) => {
      const matchTab =
        activeTab === "all" || getEmployeeDocStatus(e) === activeTab;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.employeeId.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name")
        return `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`
        );
      if (sortBy === "pending")
        return (
          b.documents.filter((d) => d.status === "pending").length -
          a.documents.filter((d) => d.status === "pending").length
        );
      if (sortBy === "progress")
        return (
          computeDocStats(b.documents).completionPct -
          computeDocStats(a.documents).completionPct
        );
      if (sortBy === "joined")
        return (
          new Date(a.dateOfJoining).getTime() -
          new Date(b.dateOfJoining).getTime()
        );
      return 0;
    });

    return list;
  }, [employees, activeTab, searchQuery, sortBy]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleVerifyDoc = (emp: EmployeeDocRecord, doc: Document) => {
    setVerifyDoc({ emp, doc });
    setVerifyOpen(true);
  };

  const handleRejectDoc = (emp: EmployeeDocRecord, doc: Document) => {
    setRejectDoc({ emp, doc });
    setRejectOpen(true);
  };

  const handleViewDoc = (doc: Document) => {
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const confirmVerify = () => {
    if (!verifyDoc) return;
    verifyMutate(
      { docId: Number(verifyDoc.doc.id), status: "verified" },
      {
        onSuccess: () => {
          setVerifyOpen(false);
          setVerifyDoc(null);
        },
      }
    );
  };

  const confirmReject = (reason: string) => {
    if (!rejectDoc) return;
    rejectMutate(
      {
        docId: Number(rejectDoc.doc.id),
        status: "rejected",
        reason,
      },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectDoc(null);
        },
      }
    );
  };

  const tabs: {
    value: TabFilter;
    label: string;
    icon: React.ElementType;
  }[] = [
    { value: "all", label: "All", icon: Users },
    { value: "pending", label: "Pending Review", icon: Clock },
    { value: "verified", label: "Verified", icon: CheckCircle2 },
    { value: "rejected", label: "Rejected", icon: XCircle },
    { value: "incomplete", label: "Incomplete", icon: CircleDashed },
  ];

  return (
    <TooltipProvider>
      <Card className="flex flex-col h-full min-h-0">
        {/* ── Header ── */}
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileBadge className="h-5 w-5 text-primary" />
              Document Verification
            </CardTitle>
            <CardDescription>
              Review, verify and manage employee onboarding documents
            </CardDescription>
          </div>
          {globalStats.pending > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-amber-800 dark:text-amber-300 font-medium">
                {globalStats.pending} document
                {globalStats.pending > 1 ? "s" : ""} awaiting review
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 min-h-0 flex flex-col gap-5">
          {/* ── Stats ── */}
          {isLoadingTracker ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Total Documents"
                value={globalStats.totalDocs}
                icon={FileText}
                sub={`across ${employees.length} employees`}
              />
              <StatCard
                label="Pending Review"
                value={globalStats.pending}
                icon={Clock}
                highlight={globalStats.pending > 0}
              />
              <StatCard
                label="Verified"
                value={globalStats.verified}
                icon={FileCheck}
              />
              <StatCard
                label="Rejected"
                value={globalStats.rejected}
                icon={FileX}
                danger={globalStats.rejected > 0}
              />
            </div>
          )}

          {/* ── Toolbar ── */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Tabs */}
              <div className="overflow-x-auto w-full sm:w-auto">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as TabFilter)}
                >
                  <TabsList className="h-9 w-max">
                    {tabs.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="gap-1.5 text-xs px-3 whitespace-nowrap"
                      >
                        <tab.icon className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{tab.label}</span>
                        <span
                          className={cn(
                            "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                            activeTab === tab.value
                              ? "bg-background text-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {isLoadingTracker ? "—" : tabCounts[tab.value]}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {/* Sort */}
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as typeof sortBy)}
                >
                  <SelectTrigger className="h-9 w-40 text-xs">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Sort: Pending first</SelectItem>
                    <SelectItem value="progress">Sort: Progress</SelectItem>
                    <SelectItem value="name">Sort: Name</SelectItem>
                    <SelectItem value="joined">Sort: Joining date</SelectItem>
                  </SelectContent>
                </Select>

                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Search name, ID, role…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Legend + count */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Legend />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {isLoadingTracker ? "—" : filtered.length}
                </span>{" "}
                of {isLoadingTracker ? "—" : employees.length} employees
              </p>
            </div>
          </div>

          {/* ── Column Headers ── */}
          <div className="hidden lg:flex items-center gap-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="flex-1">Employee</div>
            <div className="w-48">Category Breakdown</div>
            <div className="w-36">Document Status</div>
            <div className="w-32">Verification</div>
            <div className="w-24">Mandatory</div>
            <div className="w-8" />
          </div>

          {/* ── List ── */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
            {isLoadingTracker ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <EmployeeRowSkeleton key={i} />
                ))}
              </div>
            ) : isTrackerError ? (
              <ErrorState onRetry={refetchTracker} />
            ) : filtered.length === 0 ? (
              <EmptyState search={searchQuery} />
            ) : (
              <div className="space-y-2">
                {filtered.map((emp) => (
                  <EmployeeRow
                    key={emp.id}
                    employee={emp}
                    onView={(e) => {
                      setViewEmployee(e);
                      setViewOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>

        {/* ── Modals ── */}
        <EmployeeDocModal
          employee={viewEmployee}
          open={viewOpen}
          onClose={() => {
            setViewOpen(false);
            setViewEmployee(null);
          }}
          onVerifyDoc={handleVerifyDoc}
          onRejectDoc={handleRejectDoc}
          onViewDoc={handleViewDoc}
          liveDocuments={liveDocuments}
          isLoadingDocs={isLoadingEmployeeDocs}
        />

        <VerifyModal
          doc={verifyDoc?.doc ?? null}
          open={verifyOpen}
          onClose={() => {
            setVerifyOpen(false);
            setVerifyDoc(null);
          }}
          onConfirm={confirmVerify}
          isLoading={verifyLoading}
        />

        <RejectModal
          doc={rejectDoc?.doc ?? null}
          open={rejectOpen}
          onClose={() => {
            setRejectOpen(false);
            setRejectDoc(null);
          }}
          onConfirm={confirmReject}
          isLoading={rejectLoading}
        />

        <DocPreviewModal
          doc={previewDoc}
          open={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setPreviewDoc(null);
          }}
        />
      </Card>
    </TooltipProvider>
  );
};

export default DocumentDashboard;