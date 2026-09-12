import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mail,
  Phone,
  MapPin,
  Hash,
  Briefcase,
  Building2,
  CheckCircle2,
  KeyRound,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfileContext } from "../contexts/ProfileContext";
import { getInitials } from "../utils";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { ProfilePhotoDialog } from "./ProfilePhotoDialog";
import type { ProfileData, EmployeeProfileData, AddressData } from "../types";

interface ProfileHeaderProps {
  onEditProfile?: () => void;
  onUploadPhoto?: () => void;
  onNavigateToSection?: (section: string) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const ProfileHeader: React.FC<ProfileHeaderProps> = () => {
  const { data } = useProfileContext();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  if (!data) return null;

  const CURRENT_USER = data.currentUser;
  const PROFILE = (data.profile ?? {}) as ProfileData;
  const EMPLOYEE_PROFILE = (data.employeeProfile ?? {}) as EmployeeProfileData;
  const ADDRESS = (data.address ?? {}) as AddressData;

  const fullName =
    [PROFILE.firstName, PROFILE.middleName, PROFILE.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || CURRENT_USER.name || "Employee";

  const initials = getInitials(fullName);

  const status = (
    EMPLOYEE_PROFILE?.employeeStatus || "pending"
  ).toLowerCase();

  // ─── Info chips ──────────────────────────────────────────────────────────

  const infoChips = [
    {
      icon: Mail,
      label: "Email",
      value: CURRENT_USER.email || PROFILE.personalEmail || "—",
    },
    {
      icon: Phone,
      label: "Phone",
      value: PROFILE.phone || CURRENT_USER.mobile || "—",
    },
    {
      icon: MapPin,
      label: "Location",
      value:
        EMPLOYEE_PROFILE?.workLocation || ADDRESS?.currentCity || "—",
    },
    {
      icon: Hash,
      label: "ID",
      value: PROFILE?.employeeCode || CURRENT_USER?.username || "—",
      mono: true,
    },
  ];

  return (
    <div>
      <Card className="relative overflow-hidden rounded-3xl border border-border/50 shadow-xl shadow-black/[0.03] dark:shadow-black/[0.15] p-0 gap-0">
        {/* ─── Top Section: Profile Info ──────────────────────────────── */}
        <div className="relative bg-background">
          <div className="relative px-6 sm:px-8 lg:px-10 pt-8 sm:pt-10 pb-8">
            <div className="flex flex-col xl:flex-row xl:items-start gap-8">
              {/* Left: Avatar + Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  {/* Avatar */}
                  <div className="relative shrink-0 self-center sm:self-start">
                    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 blur-xl" />
                    <Avatar className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-3xl border-4 border-background shadow-xl">
                      <AvatarImage
                        src={PROFILE.profilePhoto || undefined}
                        alt={fullName}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-[calc(1.5rem-4px)] bg-gradient-to-br from-primary/10 to-primary/25 text-2xl sm:text-3xl font-black text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Edit photo */}
                    <button
                      type="button"
                      onClick={() => setPhotoDialogOpen(true)}
                      aria-label="Update profile photo"
                      className={cn(
                        "absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full",
                        "border-2 border-background bg-primary text-primary-foreground shadow-md",
                        "transition-transform duration-150 hover:scale-105 focus-visible:outline-none",
                        "focus-visible:ring-2 focus-visible:ring-primary/40"
                      )}
                    >
                      <Camera className="h-4 w-4" />
                    </button>

                    {status === "active" && (
                      <div className="absolute -top-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-emerald-500 shadow-md">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Name & Role */}
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate">
                      {fullName}
                    </h1>

                    <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground/85">
                        <Briefcase className="h-4 w-4 text-primary/60" />
                        {CURRENT_USER.role || EMPLOYEE_PROFILE?.designation || "Role"}
                      </span>
                      <span className="hidden sm:inline text-border">
                        •
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Building2 className="h-4 w-4 text-muted-foreground/50" />
                        {EMPLOYEE_PROFILE?.department || "Department"}
                      </span>
                    </div>

                    {/* Info Chips */}
                    <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {infoChips.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5 text-left transition-all duration-200 hover:border-border hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/8">
                              <item.icon className="h-3.5 w-3.5 text-primary/60" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">
                                {item.label}
                              </p>
                              <p
                                className={cn(
                                  "truncate text-xs font-medium text-foreground/80",
                                  item.mono &&
                                    "font-mono text-[11px] tracking-wider"
                                )}
                              >
                                {item.value}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="w-full xl:w-[180px] space-y-3 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setChangePasswordOpen(true)}
                  className="h-10 w-full rounded-xl border-border/50 font-medium"
                >
                  <KeyRound className="mr-2 h-3.5 w-3.5" />
                  Change Password
                </Button>
              </div>
            </div>
          </div>
        </div>

        <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
        <ProfilePhotoDialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen} />
      </Card>
    </div>
  );
};
