import { AppSidebar } from "@/components/app-sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { DocumentTitle } from "@/components/document-title"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { Outlet, useLocation } from "react-router-dom"
import { Fragment } from "react"

function humanize(segment: string) {
    const specials: Record<string, string> = {
        "bi-dashboard": "BI Dashboard",
        "rfqs": "RFQs",
        "emds-tenderfees": "EMD/Tender Fee",
        "fdr": "FDR",
        "oem-dashboard": "OEM Dashboard",
        "tds-checklists": "TDS Checklists",
        "gst-checklists": "GST Checklists",
        "pay-on-portal": "Pay on Portals",
        "bank-tranfer": "Bank Transfers",
        "tqs": "TQs",
    }
    if (specials[segment]) return specials[segment]
    return segment
        .split("-")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ")
}

export default function Dashboard() {
    const location = useLocation()
    const parts = location.pathname.split("/").filter(Boolean)
    const crumbs = parts.map((seg, idx) => {
        const path = "/" + parts.slice(0, idx + 1).join("/")
        return { label: humanize(seg), path }
    })
    const documentTitle = (crumbs.length > 0 ? crumbs.map((c) => c.label).join(" | ") : "Dashboard") + " - TMS"
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <DocumentTitle title={documentTitle} />
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-accent">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1 cursor-ew-resize" />
                        <Separator
                            orientation="vertical"
                            className="mr-2 data-[orientation=vertical]:h-4"
                        />
                        <Breadcrumb>
                            <BreadcrumbList>
                                {crumbs.length > 4 && (
                                    <BreadcrumbSeparator className="hidden md:block" />
                                )}

                                {crumbs.slice(1).map((c, i, slicedCrumbs) => (
                                    i < slicedCrumbs.length - 1 ? (
                                        <Fragment key={c.path}>
                                            <BreadcrumbItem className="hidden md:block">
                                                <BreadcrumbLink href={c.path}>{c.label}</BreadcrumbLink>
                                            </BreadcrumbItem>
                                            <BreadcrumbSeparator className="hidden md:block" />
                                        </Fragment>
                                    ) : (
                                        <BreadcrumbItem key={c.path}>
                                            <BreadcrumbPage>{c.label}</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    )
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="mr-5">
                        <ModeToggle />
                    </div>
                </header>
                <div className="p-2">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
