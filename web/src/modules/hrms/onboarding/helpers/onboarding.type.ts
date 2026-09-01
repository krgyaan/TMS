// Types & helper utilities for the HRMS onboarding module.

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileEducationItem = {
  id: number;
  degree: string;
  institution: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  status: string;
  hrStatus?: "pending" | "approved" | "rejected";
};

export type ProfileExperienceItem = {
  id: number;
  companyName: string;
  designation: string;
  fromDate: string;
  toDate?: string;
  currentlyWorking?: boolean;
  responsibilities?: string;
  status: string;
  hrStatus?: "pending" | "approved" | "rejected";
};

export type ProfileDocumentItem = {
  id: number;
  docType: string;
  docCategory: string;
  fileName?: string;
  fileUrl?: string;
  status: string;
  hrStatus?: "pending" | "approved" | "rejected";
  remarks?: string;
  uploadedAt?: string;
};

export type ProfileBankItem = {
  id: number;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName?: string;
  isPrimary: boolean;
  status: string;
  hrStatus?: "pending" | "approved" | "rejected";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatDate = (dateStr?: string | null): string => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

export const getInitials = (name: string) => {
  if (!name) return "??";
  const parts = name.split(" ");
  if (parts.length >= 2)
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name[0].toUpperCase();
};

const avatarColors = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
];

export const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export const renderAddress = (addr: Record<string, string | undefined> | null | undefined) => {
  if (!addr || Object.keys(addr).length === 0) return null;
  const parts = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.country,
    addr.postalCode ? `PIN: ${addr.postalCode}` : "",
  ].filter(Boolean);
  return parts.join(", ");
};
