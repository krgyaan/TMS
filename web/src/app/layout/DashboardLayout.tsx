import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { DocumentTitle } from "@/components/document-title";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useProfileContext } from "@/modules/profile/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
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

    const showOnboardingNotify = data?.isOnboarding && !data?.onboardingStatus?.employeeCompleted;
    const isOnboardingPage = location.pathname === "/profile";

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
                            {showOnboardingNotify && !isOnboardingPage && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="relative h-9 w-9 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors"
                                            onClick={() => navigate("/profile")}
                                        >
                                            <AlertCircle className="h-5 w-5" />
                                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border-2 border-background"></span>
                                            </span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="end" className="text-xs font-medium">
                                        Complete your onboarding
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
