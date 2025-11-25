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
            <SidebarInset className="flex flex-col min-h-screen">
                <DocumentTitle />
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-accent">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1 cursor-pointer" />
                        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                        <Breadcrumb className="cusor-pointer">
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="mr-5">
                        <ModeToggle />
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-auto p-4 mb-[0px]">
                    <Outlet />
                </main>

                <SidebarFooter className="min-h-[60px] bg-card border-t p-4">
                    <div className="flex justify-center items-center">
                        <span className="text-sm text-muted-foreground py-2">Copyright © 2025 Volks Energie. All rights reserved.</span>
                    </div>
                </SidebarFooter>
            </SidebarInset>
        </SidebarProvider>
    );
}
