import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Laptop, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { ProfileProvider, useProfileContext } from "./contexts/ProfileContext";
import {
  OnboardingProvider,
  useOnboardingContext,
} from "./components/onboarding/contexts/OnboardingContext";

import { ProfileHeader } from "./components/ProfileHeader";
import { OnboardingView } from "./components/onboarding/OnboardingView";
import { DocumentsSection } from "./components/DocumentsSection";
import { AssetsSection } from "./components/AssetsSection";
import { ComplaintsSection } from "./components/ComplaintsSection";
import type { ProfileData, AddressData, EmergencyContactData } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Small shared pieces
// ─────────────────────────────────────────────────────────────────────────────

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {label}
      </p>
      <p
        className={cn(
          "text-sm",
          value ? "text-foreground/90" : "text-muted-foreground/50 italic"
        )}
      >
        {value || "Not provided"}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal view — users WITHOUT any onboarding request (admin-created accounts)
// ─────────────────────────────────────────────────────────────────────────────

const TAB_VALUES = ["documents", "assets", "support"];

function MinimalStandardView() {
  const { data } = useProfileContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam && TAB_VALUES.includes(tabParam) ? tabParam : "documents"
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value }, { replace: true });
  };

  const profile = (data?.profile ?? {}) as ProfileData;
  const address = (data?.address ?? {}) as AddressData;
  const emergency = (data?.emergencyContact ?? {}) as EmergencyContactData;

  const tabs = [
    { value: "documents", label: "Documents", icon: FileText },
    { value: "assets", label: "Assets", icon: Laptop },
    { value: "support", label: "Support", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <ProfileHeader />

      {/* Read-only personal card */}
      <div className="rounded-2xl border border-border/50 bg-card p-5">
        <h3 className="text-sm font-bold text-foreground mb-4">
          Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <ReadOnlyField label="Date of Birth" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString("en-GB") : null} />
          <ReadOnlyField label="Gender" value={profile.gender} />
          <ReadOnlyField label="Marital Status" value={profile.maritalStatus} />
          <ReadOnlyField label="Nationality" value={profile.nationality} />
          <ReadOnlyField label="Blood Group" value={profile.bloodGroup} />
          <ReadOnlyField label="Personal Email" value={profile.personalEmail} />
          <ReadOnlyField label="Phone" value={profile.phone} />
          <ReadOnlyField label="Aadhar Number" value={profile.aadharNumber} />
          <ReadOnlyField label="PAN Number" value={profile.panNumber} />
          <ReadOnlyField label="Current City" value={address.currentCity} />
          <ReadOnlyField
            label="Current Address"
            value={
              address.currentAddressLine1
                ? [
                    address.currentAddressLine1,
                    address.currentAddressLine2,
                    address.currentCity,
                    address.currentState,
                    address.currentPostalCode,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : null
            }
          />
          <ReadOnlyField label="Emergency Contact" value={emergency.name} />
          <ReadOnlyField label="Emergency Phone" value={emergency.phone} />
        </div>
      </div>

      {/* Tabs */}
      <div>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full justify-start h-auto p-1.5 bg-background/60 rounded-2xl overflow-x-auto flex-nowrap backdrop-blur-xl border border-border/40 shadow-lg">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "relative gap-2 rounded-xl text-xs sm:text-sm px-4 sm:px-6 py-2.5 flex-shrink-0 font-semibold transition-all duration-300",
                  "data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:shadow-black/[0.04]"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 3)}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            {activeTab === "documents" && (
              <TabsContent value="documents" className="outline-none m-0" forceMount>
                <DocumentsSection />
              </TabsContent>
            )}
            {activeTab === "assets" && (
              <TabsContent value="assets" className="outline-none m-0" forceMount>
                <AssetsSection />
              </TabsContent>
            )}
            {activeTab === "support" && (
              <TabsContent value="support" className="outline-none m-0" forceMount>
                <ComplaintsSection />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Branch router — decides which view the employee gets
// ─────────────────────────────────────────────────────────────────────────────

function OnboardingBranch() {
  const { data: obData, isLoading: obLoading } = useOnboardingContext();

  // Draft still loading
  if (obLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading details…</p>
      </div>
    );
  }

  // Onboarding request exists (any status) → previous stage-card view.
  // Pending/rejected stages stay editable; approved stages are locked.
  if (obData) {
    return <OnboardingView />;
  }

  // No onboarding request at all → minimal read-only profile
  return <MinimalStandardView />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Page Content
// ─────────────────────────────────────────────────────────────────────────────

function ProfilePageContent() {
  const { data, isLoading, error } = useProfileContext();

  // ── Loading State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        </div>
      </div>
    );
  }

  // ── Error State ────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive text-center p-6">
        <div className="max-w-md">
          <h2 className="text-xl font-bold mb-2">Error Loading Profile</h2>
          <p className="text-muted-foreground">
            {error?.message || "Failed to load profile data"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 relative">
        {/* ProfileHeader shows on the minimal branch; the stage-card view has
            its own header inside OnboardingView */}
        <OnboardingProvider>
          <OnboardingBranch />
        </OnboardingProvider>
      </div>
    </div>
  );
}

// profile provider to give context
export default function ProfilePage() {
  return (
    <ProfileProvider>
      <ProfilePageContent />
    </ProfileProvider>
  );
}
