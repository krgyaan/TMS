export type StageStatus = "pending" | "in_progress" | "submitted" | "resubmitted";
export type ApprovalStatus = "pending" | "approved" | "rejected" | null;

export type RejectionInfo = {
  reason: string;
  rejectedAt?: string;
  rejectedBy?: string;
};

export type StageDetail = {
  label: string;
  value: string | null;
  status?: ApprovalStatus;
};

export type DocumentDetail = {
  id: number;
  name: string;
  fileName: string | null;
  status: "pending" | "in_progress" | "submitted" | "resubmitted";
  hrStatus : "approved" | "rejected" | "pending";
  remarks: string | null;
  uploadedAt: string | null;
};

export type InductionTask = {
  id: number;
  name: string;
  type: "BEFORE" | "AFTER";
  status: "pending" | "completed";
  hrStatus : "approved" | "rejected" | "pending";
};

export type EducationInfo = {
  id: number;
  degree: string;
  institution: string;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
  grade?: string | null;
  status: "pending" | "in_progress" | "submitted" | "resubmitted";
  hrStatus : "approved" | "rejected" | "pending";
  remarks?: string | null;
  hrRemark?: string | null;
};

export type ExperienceInfo = {
  id: number;
  companyName: string;
  designation: string;
  fromDate: string;
  toDate?: string | null;
  currentlyWorking: boolean;
  responsibilities?: string | null;
  status: "pending" | "in_progress" | "submitted" | "resubmitted";
  hrStatus : "approved" | "rejected" | "pending";  
  remarks?: string | null;
  hrRemark?: string | null;
};

export type BankAccountInfo = {
  id: number;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  isPrimary: boolean;
  status: "pending" | "in_progress" | "submitted" | "resubmitted";
  hrStatus : "approved" | "rejected" | "pending";  
  remarks?: string | null;
  hrRemark?: string | null;
};

export type StageCardProps = {
  /** Unique key for the stage */
  stageKey: string;
  /** Display label */
  label: string;
  /** Short description */
  description: string;
  /** Icon component */
  icon: React.ElementType;
  /** Current fill status of the stage */
  status: StageStatus;
  /** HR approval status (null if not yet submitted) */
  approvalStatus?: ApprovalStatus;
  /** Rejection details if rejected */
  rejection?: RejectionInfo | null;
  /** Whether this stage is read-only for the employee */
  readOnly?: boolean;
  /** Whether the employee has submitted for review */
  isSubmitted?: boolean;
  /** Animation delay index */
  index?: number;
  /** Whether this card is currently expanded */
  isExpanded?: boolean;
  /** Toggle expand callback */
  onToggleExpand?: () => void;
  /** Action: begin filling this stage */
  onBeginFill?: () => void;
  /** Action: edit/re-fill this stage */
  onEdit?: () => void;
  /** Action: view details read-only */
  onView?: () => void;

  // ── Expanded Content Data ──────────────────────────────────────────────
  /** Summary details for profile stage */
  details?: StageDetail[];
  /** Document list for documents stage */
  documents?: DocumentDetail[];
  /** Induction tasks for induction stage */
  inductionTasks?: InductionTask[];
  /** Education info for education stage */
  education?: EducationInfo[];
  /** Experience info for experience stage */
  experience?: ExperienceInfo[];
  /** Bank accounts for bank stage */
  bankAccounts?: BankAccountInfo[];
  /** Custom expanded content (overrides default) */
  children?: React.ReactNode;
};
