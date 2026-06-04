import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnboardingStatus } from "@/modules/profile/types";
import { motion } from "framer-motion";
import { Shield, Sparkles, XCircle } from "lucide-react";



function getBannerConfig(onboardingStatus: OnboardingStatus) {
    const { status, employeeCompleted } = onboardingStatus;

    if (status === "rejected") {
        return {
            bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50",
            iconBg: "bg-red-100 dark:bg-red-900/50",
            iconColor: "text-red-600 dark:text-red-400",
            textColor: "text-red-800 dark:text-red-200",
            subtextColor: "text-red-600/80 dark:text-red-400/70",
            icon: XCircle,
            title: "Action Required",
            description: "Some of your submitted details need corrections. Please review and re-submit.",
        };
    }

    if (employeeCompleted && status !== "fully_completed") {
        return {
            bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50",
            iconBg: "bg-blue-100 dark:bg-blue-900/50",
            iconColor: "text-blue-600 dark:text-blue-400",
            textColor: "text-blue-800 dark:text-blue-200",
            subtextColor: "text-blue-600/80 dark:text-blue-400/70",
            icon: Shield,
            title: "Submitted For Review",
            description: "Your onboarding details are being reviewed by HR. You'll be notified once approved.",
        };
    }

    if (!employeeCompleted) {
        return {
            bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50",
            iconBg: "bg-amber-100 dark:bg-amber-900/50",
            iconColor: "text-amber-600 dark:text-amber-400",
            textColor: "text-amber-800 dark:text-amber-200",
            subtextColor: "text-amber-600/80 dark:text-amber-400/70",
            icon: Sparkles,
            title: "Please Complete the Onboarding Details",
            description: "Please complete all the stages",
        };
    }

    return {
        bg: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50",
        iconBg: "bg-indigo-100 dark:bg-indigo-900/50",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        textColor: "text-indigo-800 dark:text-indigo-200",
        subtextColor: "text-indigo-600/80 dark:text-indigo-400/70",
        icon: Sparkles,
        title: "Onboarding In Progress",
        description: "Complete the remaining sections below and submit for HR review.",
    };
}


function OnboardingBanner({ onboardingStatus, onFillProfile }: { onboardingStatus: OnboardingStatus; onFillProfile?: () => void }) {
    const config = getBannerConfig(onboardingStatus);
    const BannerIcon = config.icon;
    const isProfileIncomplete = onboardingStatus.profileStatus === "pending";

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn("relative overflow-hidden rounded-2xl border p-4 sm:p-5", config.bg)}
        >
            <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="80" cy="20" r="60" fill="currentColor" />
                </svg>
            </div>

            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3 sm:gap-4">
                    <div className={cn("shrink-0 rounded-xl p-2.5", config.iconBg)}>
                        <BannerIcon className={cn("h-5 w-5", config.iconColor)} />
                    </div>
                    <div className="min-w-0">
                        <h3 className={cn("text-sm sm:text-base font-semibold", config.textColor)}>{config.title}</h3>
                        <p className={cn("text-xs sm:text-sm mt-0.5 leading-relaxed", config.subtextColor)}>{config.description}</p>
                    </div>
                </div>

                {onFillProfile && isProfileIncomplete && (
                    <Button
                        size="sm"
                        onClick={onFillProfile}
                        className="rounded-xl px-6 h-9 sm:h-10 text-xs sm:text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all shrink-0"
                    >
                        {onboardingStatus.profileStatus === "rejected" ? "Re-fill Profile Details" : "Fill Profile Details"}
                    </Button>
                )}
            </div>
        </motion.div>
    );
}

export default OnboardingBanner;