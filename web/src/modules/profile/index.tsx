// web/src/modules/profile/index.tsx

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  FileText, 
  Bell, 
  Laptop, 
  MessageSquare,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

import { ProfileProvider, useProfileContext } from "./contexts/ProfileContext";
import { staggerContainer } from "./animations";

// Standard Profile Components
import { ProfileHeader } from "./components/ProfileHeader";
import { OverviewTab } from "./components/OverviewTab";
import { DocumentsSection } from "./components/DocumentsSection";
import { NotificationsSection } from "./components/NotificationsSection";
import { AssetsSection } from "./components/AssetsSection";
import { ComplaintsSection } from "./components/ComplaintsSection";

// Onboarding Components
import { OnboardingView } from "./components/onboarding/OnboardingView";

// ─────────────────────────────────────────────────────────────────────────────
// Standard Profile View
// Shown when isOnboarding === false (employee has completed onboarding)
// ─────────────────────────────────────────────────────────────────────────────

function StandardProfileView() {
  const { data } = useProfileContext();
  const [activeTab, setActiveTab] = useState("overview");

  const unreadNotifCount = data?.notifications?.filter((n) => !n.read).length || 0;

  const tabs = [
    { value: "overview",       label: "Overview",  icon: User },
    { value: "documents",      label: "Documents", icon: FileText },
    { value: "notifications",  label: "Activity",  icon: Bell,          badge: unreadNotifCount },
    { value: "assets",         label: "Assets",    icon: Laptop },
    { value: "complaints",     label: "Support",   icon: MessageSquare },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header Card */}
      <ProfileHeader />

      {/* Tabs Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
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
                {tab.badge ? (
                  <span className="ml-0.5 min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold px-1.5">
                    {tab.badge}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Contents */}
          <div className="mt-6">
            <AnimatePresence mode="wait">
              {activeTab === "overview" && (
                <TabsContent value="overview" className="outline-none m-0" key="overview" forceMount>
                  <OverviewTab setActiveTab={setActiveTab} />
                </TabsContent>
              )}
              {activeTab === "documents" && (
                <TabsContent value="documents" className="outline-none m-0" key="documents" forceMount>
                  <DocumentsSection />
                </TabsContent>
              )}
              {activeTab === "notifications" && (
                <TabsContent value="notifications" className="outline-none m-0" key="notifications" forceMount>
                  <NotificationsSection />
                </TabsContent>
              )}
              {activeTab === "assets" && (
                <TabsContent value="assets" className="outline-none m-0" key="assets" forceMount>
                  <AssetsSection />
                </TabsContent>
              )}
              {activeTab === "complaints" && (
                <TabsContent value="complaints" className="outline-none m-0" key="complaints" forceMount>
                  <ComplaintsSection />
                </TabsContent>
              )}
            </AnimatePresence>
          </div>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Page Content
// Top-level router: decides between onboarding view and standard profile view
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
      {/* ── Decorative Background Blobs ───────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-[15%] -right-[10%] w-[45%] h-[45%] rounded-full bg-primary/[0.04] blur-[120px]" />
        <div className="absolute top-[30%] -left-[8%]  w-[35%] h-[35%] rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[25%] h-[25%] rounded-full bg-primary/[0.02] blur-[80px]"  />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 relative">
        {/*
         * ── View Router ───────────────────────────────────────────────────
         *
         *  isOnboarding === true
         *    → <OnboardingView /> replaces the entire page.
         *      The standard tabs (Overview, Documents, Assets, Support, Activity)
         *      are NOT rendered — they only make sense after onboarding completes.
         *
         *  isOnboarding === false
         *    → <StandardProfileView /> with the full tab set.
         */}
        {data.isOnboarding ? (
          <OnboardingView />
        ) : (
          <StandardProfileView />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfilePage — Root Export
// Wraps everything in the ProfileProvider (data fetching context)
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <ProfileProvider>
      <ProfilePageContent />
    </ProfileProvider>
  );
}