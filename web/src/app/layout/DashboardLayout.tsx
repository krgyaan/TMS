import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { DocumentTitle } from "@/components/document-title";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarFooter, SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
    return (
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
                    <ModeToggle />
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
    );
}
