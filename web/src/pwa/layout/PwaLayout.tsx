import { DocumentTitle } from "@/components/document-title";
import { ModeToggle } from "@/components/mode-toggle";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Outlet } from "react-router-dom";
import { PwaSidebar } from "./PwaSidebar";
import { ProfileProvider } from "@/modules/profile/contexts/ProfileContext"; // 👈 add

export default function PwaLayout() {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <PwaSidebar />

                {/* 👈 wrap with ProfileProvider same as main app */}
                <ProfileProvider>
                    <SidebarInset className="flex flex-col h-full min-h-0">
                        <DocumentTitle title="TMS Field App" />

                        <header className="flex h-16 shrink-0 items-center justify-between gap-2 bg-accent px-4">
                            <div className="flex items-center gap-2">
                                <SidebarTrigger className="-ml-1 cursor-pointer" />
                                <Separator orientation="vertical" className="h-4" />
                                <Breadcrumb>
                                    <BreadcrumbList>
                                        <BreadcrumbItem>
                                            <BreadcrumbPage>
                                                TMS Field App
                                            </BreadcrumbPage>
                                        </BreadcrumbItem>
                                    </BreadcrumbList>
                                </Breadcrumb>
                            </div>

                            <div className="flex items-center gap-4">
                                <ModeToggle />
                            </div>
                        </header>

                        <div className="flex-1 min-h-0 h-full flex flex-col">
                            <div className="flex-1 h-full min-h-0 overflow-auto p-4">
                                <Outlet />
                            </div>
                        </div>
                    </SidebarInset>
                </ProfileProvider>
            </SidebarProvider>
        </TooltipProvider>
    );
}