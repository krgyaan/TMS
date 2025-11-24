"use client";

import * as React from "react";
import {
    AudioWaveform,
    Command,
    GalleryVerticalEnd,
    FileSearch,
    Wrench,
    Headset,
    BarChart3,
    Banknote,
    Users,
    Gauge,
    Settings,
    Share2,
    LayoutDashboard,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { paths } from "@/app/routes/paths";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { getStoredUser, clearAuthSession } from "@/lib/auth";

const data = {
    user: {
        name: "Gyan",
        email: "gyan@volkenergie.in",
        avatar: "/avatars/shadcn.jpg",
    },
    teams: [
        {
            name: "Volks Energie",
            logo: Command,
            plan: "For all teams",
        },
        {
            name: "Team AC",
            logo: GalleryVerticalEnd,
            plan: "only AC team",
        },
        {
            name: "Team DC",
            logo: AudioWaveform,
            plan: "only DC team",
        },
    ],
    navMain: [
        {
            title: "Dashboard",
            url: paths.dashboard,
            icon: LayoutDashboard,
            isActive: false,
        },
        {
            title: "Tendering",
            url: "#",
            icon: FileSearch,
            isActive: false,
            items: [
                {
                    title: "Tender",
                    url: paths.tendering.tenders,
                },
                {
                    title: "Tender Approval",
                    url: paths.tendering.tenderApproval,
                },
                {
                    title: "Physical Docs",
                    url: paths.tendering.phydocs,
                },
                {
                    title: "RFQs",
                    url: paths.tendering.rfqs,
                },
                {
                    title: "EMD/Tender fees",
                    url: paths.tendering.emdsTenderFees,
                },
                {
                    title: "Checklists",
                    url: paths.tendering.checklists,
                },
                {
                    title: "Costing Sheets",
                    url: paths.tendering.costingSheets,
                },
                {
                    title: "Costing Approval",
                    url: paths.tendering.costingApproval,
                },
                {
                    title: "Bid Submissions",
                    url: paths.tendering.bidSubmissions,
                },
                {
                    title: "TQs",
                    url: paths.tendering.tqs,
                },
                {
                    title: "RA",
                    url: paths.tendering.ras,
                },
                {
                    title: "Results",
                    url: paths.tendering.results,
                },
            ],
        },
        {
            title: "Operations",
            url: "#",
            icon: Wrench,
            items: [
                {
                    title: "Work Order",
                    url: paths.operations.workOrder,
                },
                {
                    title: "Kick Off",
                    url: paths.operations.kickOff,
                },
                {
                    title: "Contract Agreement",
                    url: paths.operations.contractAgreement,
                },
            ],
        },
        {
            title: "Services",
            url: "#",
            icon: Headset,
            items: [
                {
                    title: "Customer",
                    url: paths.services.customer,
                },
                {
                    title: "Conference",
                    url: paths.services.conference,
                },
                {
                    title: "Visit",
                    url: paths.services.visit,
                },
                {
                    title: "AMC",
                    url: paths.services.amc,
                },
            ],
        },
        {
            title: "BI Dashboard",
            url: "#",
            icon: BarChart3,
            items: [
                {
                    title: "Demand Draft",
                    url: paths.bi.demandDraft,
                },
                {
                    title: "FDR",
                    url: paths.bi.fdr,
                },
                {
                    title: "Cheque",
                    url: paths.bi.cheque,
                },
                {
                    title: "Bank Guarantee",
                    url: paths.bi.bankGuarantee,
                },
                {
                    title: "Bank Transfer",
                    url: paths.bi.bankTransfer,
                },
                {
                    title: "Pay on Portal",
                    url: paths.bi.payOnPortal,
                },
            ],
        },
        {
            title: "Accounts",
            url: "#",
            icon: Banknote,
            items: [
                {
                    title: "Imprests",
                    url: paths.accounts.imprests,
                },
                {
                    title: "Financial Docs",
                    url: paths.accounts.financialDocs,
                },
                {
                    title: "Loan & Advances",
                    url: paths.accounts.loanAdvances,
                },
                {
                    title: "Projects",
                    url: paths.accounts.projects,
                },
                {
                    title: "Accounts Checklists",
                    url: paths.accounts.accountChecklists,
                },
                {
                    title: "TDS Checklists",
                    url: paths.accounts.tdsChecklists,
                },
                {
                    title: "GST Checklists",
                    url: paths.accounts.gstChecklists,
                },
                {
                    title: "Fixed Expenses",
                    url: paths.accounts.fixedExpenses,
                },
            ],
        },
        {
            title: "CRM",
            url: "#",
            icon: Users,
            items: [
                {
                    title: "Leads",
                    url: paths.crm.leads,
                },
                {
                    title: "Enquiries",
                    url: paths.crm.enquiries,
                },
                {
                    title: "Costings",
                    url: paths.crm.costings,
                },
                {
                    title: "Quotations",
                    url: paths.crm.quotations,
                },
            ],
        },
        {
            title: "Performance",
            url: "#",
            icon: Gauge,
            items: [
                {
                    title: "Tender Executive",
                    url: paths.performance.tenderExecutive,
                },
                {
                    title: "Team Leader",
                    url: paths.performance.teamLeader,
                },
                {
                    title: "Operation Team",
                    url: paths.performance.operationTeam,
                },
                {
                    title: "Account Team",
                    url: paths.performance.accountTeam,
                },
                {
                    title: "OEM Dashboard",
                    url: paths.performance.oemDashboard,
                },
                {
                    title: "Business Dashboard",
                    url: paths.performance.businessDashboard,
                },
                {
                    title: "Customer Dashboard",
                    url: paths.performance.customerDashboard,
                },
                {
                    title: "Location Dashboard",
                    url: paths.performance.locationDashboard,
                },
            ],
        },
        {
            title: "Settings",
            url: "#",
            icon: Settings,
            items: [
                {
                    title: "Users",
                    url: paths.master.users,
                },
                {
                    title: "Status",
                    url: paths.master.statuses,
                },
                {
                    title: "Items",
                    url: paths.master.items,
                },
                {
                    title: "Locations",
                    url: paths.master.locations,
                },
                {
                    title: "Organizations",
                    url: paths.master.organizations,
                },
                {
                    title: "Vendors",
                    url: paths.master.vendors,
                },
                {
                    title: "Websites",
                    url: paths.master.websites,
                },
                {
                    title: "Document Submitted",
                    url: paths.master.documentSubmitted,
                },
                {
                    title: "Imprest Categories",
                    url: paths.master.imprestCategories,
                },
                {
                    title: "Followup Categories",
                    url: paths.master.followupCategories,
                },
                {
                    title: "Financial Year",
                    url: paths.master.financialYears,
                },
                {
                    title: "EMDs Responsibilities",
                    url: paths.master.emdsResponsibilities,
                },
                {
                    title: "Lead Types",
                    url: paths.master.leadTypes,
                },
                {
                    title: "TQ Types",
                    url: paths.master.tqTypes,
                },
                {
                    title: "Loan Parties",
                    url: paths.master.loanParties,
                },
            ],
        },
        {
            title: "Shared",
            url: "#",
            icon: Share2,
            items: [
                {
                    title: "Follow Ups",
                    url: paths.shared.followUps,
                },
                {
                    title: "Couriers",
                    url: paths.shared.couriers,
                },
                {
                    title: "Imprests",
                    url: paths.shared.imprests,
                },
            ],
        },
    ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const storedUser = getStoredUser();
    const currentUser = storedUser ?? {
        id: 0,
        name: data.user.name,
        email: data.user.email,
        username: null,
        mobile: null,
    };

    const handleLogout = React.useCallback(() => {
        clearAuthSession();
        window.location.href = "/login";
    }, []);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={data.teams} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={currentUser} onLogout={handleLogout} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
