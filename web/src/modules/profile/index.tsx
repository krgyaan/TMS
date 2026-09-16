import { Navigate, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { ProfileProvider, useProfileContext } from "./contexts/ProfileContext";
import {
  OnboardingProvider,
  useOnboardingContext,
} from "./components/onboarding/contexts/OnboardingContext";

import { OnboardingView } from "./components/onboarding/OnboardingView";
import { DocumentsSection } from "./components/DocumentsSection";
import { AssetsSection } from "./components/AssetsSection";
import { ComplaintsSection } from "./components/ComplaintsSection";
import { OnboardingProfileForm } from "./components/onboarding/OnboardingProfileForm";
import { OnboardingBankForm } from "./components/onboarding/OnboardingBankForm";
import { OnboardingEducationForm } from "./components/onboarding/OnboardingEducationForm";
import { OnboardingExperienceForm } from "./components/onboarding/OnboardingExperienceForm";

// ─────────────────────────────────────────────────────────────────────────────
// Small shared pieces
// ─────────────────────────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 flex items-center gap-3">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading details…</p>
    </div>
  );
}

function BackToDashboardButton() {
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      onClick={() => navigate("/profile")}
      className="rounded-xl"
    >
      Back to Dashboard
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding stage editors — /profile/personal | bank | education | experience
// ─────────────────────────────────────────────────────────────────────────────

const STAGE_EDITOR_META = {
  profile: {
    title: "Profile Details",
    description: "Please provide your personal and professional information",
  },
  bank: {
    title: "Bank Details",
    description: "Please provide your bank account information for salary processing",
  },
  education: {
    title: "Education Details",
    description: "Please provide your academic details",
  },
  experience: {
    title: "Work Experience",
    description: "Please provide your previous employment history",
  },
} as const;

type StageEditorKey = keyof typeof STAGE_EDITOR_META;

function ProfileEditorPage({ stage }: { stage: StageEditorKey }) {
  const navigate = useNavigate();
  const { data: obData, isLoading: obLoading, refetch } = useOnboardingContext();
  const [searchParams] = useSearchParams();
  const viewOnly = searchParams.get("mode") === "view";
  const meta = STAGE_EDITOR_META[stage];

  if (obLoading) return <PageLoader />;
  if (!obData) return <Navigate to="/profile" replace />;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/40 bg-background/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{meta.title}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{meta.description}</p>
          </div>
          <BackToDashboardButton />
        </div>

        {stage === "profile" && (
          <OnboardingProfileForm
            onCancel={() => navigate("/profile")}
            onSuccess={() => {
              refetch?.();
              navigate("/profile");
            }}
          />
        )}
        {stage === "bank" && (
          <OnboardingBankForm
            readOnly={viewOnly}
            onCancel={() => navigate("/profile")}
            onSuccess={() => {
              refetch?.();
              navigate("/profile");
            }}
          />
        )}
        {stage === "education" && (
          <OnboardingEducationForm
            readOnly={viewOnly}
            onCancel={() => navigate("/profile")}
            onSuccess={() => {
              refetch?.();
              navigate("/profile");
            }}
          />
        )}
        {stage === "experience" && (
          <OnboardingExperienceForm
            readOnly={viewOnly}
            onCancel={() => navigate("/profile")}
            onSuccess={() => {
              refetch?.();
              navigate("/profile");
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents — /profile/documents (onboarding editor + minimal accounts)
// ─────────────────────────────────────────────────────────────────────────────

function DocumentsPage() {
  const { data: obData, isLoading: obLoading } = useOnboardingContext();

  if (obLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/40 bg-background/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
        {obData ? (
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Documents</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Upload required identity and academic documents
              </p>
            </div>
            <BackToDashboardButton />
          </div>
        ) : null}
        <DocumentsSection />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Assets / Support — /profile/assets | support
// ─────────────────────────────────────────────────────────────────────────────

function AssetsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/40 bg-background/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
        <AssetsSection />
      </div>
    </div>
  );
}

function SupportPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/40 bg-background/50 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
        <ComplaintsSection />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — /profile
// ─────────────────────────────────────────────────────────────────────────────

function ProfileHome() {
  const { isLoading: obLoading } = useOnboardingContext();

  if (obLoading) return <PageLoader />;

  return <OnboardingView />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout + Routes
// ─────────────────────────────────────────────────────────────────────────────

function ProfileLayout() {
  const { isLoading, error } = useProfileContext();

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive text-center p-6">
        <div className="max-w-md">
          <h2 className="text-xl font-bold mb-2">Error Loading Profile</h2>
          <p className="text-muted-foreground">
            {error.message || "Failed to load profile data"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground selection:bg-primary/10">
      <div className="relative">
        <OnboardingProvider>
          <Routes>
            <Route index element={<ProfileHome />} />
            <Route path="personal" element={<ProfileEditorPage stage="profile" />} />
            <Route path="bank" element={<ProfileEditorPage stage="bank" />} />
            <Route path="education" element={<ProfileEditorPage stage="education" />} />
            <Route path="experience" element={<ProfileEditorPage stage="experience" />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="*" element={<Navigate to="/profile" replace />} />
          </Routes>
        </OnboardingProvider>
      </div>
    </div>
  );
}

// profile provider to give context
export default function ProfilePage() {
  return (
    <ProfileProvider>
      <ProfileLayout />
    </ProfileProvider>
  );
}
