import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { DocumentTitle } from "@/components/document-title";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useProfileContext } from "@/modules/profile/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export default function DashboardLayout() {
    const { data } = useProfileContext();
    const navigate = useNavigate();
    const location = useLocation();

    const isOnboarding = data?.isOnboarding;
    const onboardingStatus = data?.onboardingStatus;
    const isOnboardingPage = location.pathname === "/profile";

    const isRejected = isOnboarding && (onboardingStatus?.hrStatus === "rejected" || onboardingStatus?.status === "rejected");
    const isSubmitted = isOnboarding && onboardingStatus?.employeeCompleted;
    const isPending = isOnboarding && !isSubmitted && !isRejected;

    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />

                {/* MAIN LAYOUT FIXED → flex, h-full, min-h-0 */}
                <SidebarInset className="flex flex-col h-full min-h-0">
                    <DocumentTitle title={"Dashboard - TMS"} />

                    {/* HEADER (fixed height) */}
                    <header className="flex h-16 shrink-0 items-center justify-between gap-2 bg-accent px-4">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1 cursor-pointer" />
                            <Separator orientation="vertical" className="h-4" />
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>Dashboard</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {isOnboarding && !isOnboardingPage && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className={cn(
                                                "relative h-9 w-9 rounded-xl transition-colors",
                                                isRejected && "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50",
                                                isSubmitted && "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50",
                                                isPending && "bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                                            )}
                                            onClick={() => navigate("/profile")}
                                        >
                                            {isRejected && <XCircle className="h-5 w-5" />}
                                            {isSubmitted && <CheckCircle2 className="h-5 w-5" />}
                                            {isPending && <AlertCircle className="h-5 w-5" />}

                                            {(isRejected || isPending) && (
                                                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                                    <span className={cn(
                                                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                                        isRejected ? "bg-red-400" : "bg-amber-400"
                                                    )}></span>
                                                    <span className={cn(
                                                        "relative inline-flex rounded-full h-2.5 w-2.5 border-2 border-background",
                                                        isRejected ? "bg-red-500" : "bg-amber-500"
                                                    )}></span>
                                                </span>
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="end" className="text-xs font-medium">
                                        {isRejected && "Onboarding rejected"}
                                        {isSubmitted && "Onboarding details submitted successfully"}
                                        {isPending && "Complete your onboarding"}
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            <ModeToggle />
                        </div>
                    </header>

                {/* MAIN CONTENT AREA — MUST BE flex-1 + min-h-0 */}
                <div className="flex-1 min-h-0 h-full flex flex-col">
                    {/* OUTLET WRAPPER — ALSO FLEX-1 + min-h-0 */}
                    <div className="flex-1 h-full min-h-0 overflow-auto p-4">
                        <Outlet />
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
        </TooltipProvider>
    );
}
