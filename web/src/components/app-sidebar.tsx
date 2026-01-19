"use client";

import * as React from "react";
import { FileSearch, Wrench, Headset, BarChart3, Banknote, Users, Gauge, Settings, Share2, LayoutDashboard } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { paths } from "@/app/routes/paths";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";

import { getStoredUser } from "@/lib/auth";
import { useCurrentUser } from "@/hooks/api/useAuth";
import api from "@/lib/axios";

import type { AuthUser } from "@/types/auth.types";
import { canRead } from "@/types/auth.types";
import type { LucideIcon } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type NavItem = {
    title: string;
    url: string;
    permission?: string;
};

type NavGroup = {
    title: string;
    url?: string;
    icon?: LucideIcon;
    items?: NavItem[];
};

/* -------------------------------------------------------------------------- */
/*                             MENU CONFIGURATION                              */
/* -------------------------------------------------------------------------- */

const navMain: NavGroup[] = [
    {
        title: "Dashboard",
        url: paths.dashboard,
        icon: LayoutDashboard,
    },
    {
        title: "Tendering",
        icon: FileSearch,
        items: [
            { title: "Tender", url: paths.tendering.tenders, permission: "tenders" },
            { title: "Tender Approval", url: paths.tendering.tenderApproval, permission: "tender-approval" },
            { title: "Physical Docs", url: paths.tendering.physicalDocs, permission: "physical-docs" },
            { title: "RFQs", url: paths.tendering.rfqs, permission: "rfqs" },
            { title: "EMD/Tender fees", url: paths.tendering.emdsTenderFees, permission: "emds" },
            { title: "Checklists", url: paths.tendering.checklists, permission: "checklists" },
            { title: "Costing Sheets", url: paths.tendering.costingSheets, permission: "costing-sheets" },
            { title: "Costing Approval", url: paths.tendering.costingApprovals, permission: "costing-approvals" },
            { title: "Bid Submissions", url: paths.tendering.bidSubmissions, permission: "bid-submissions" },
            { title: "TQs", url: paths.tendering.tqManagement, permission: "tq-management" },
            { title: "RA", url: paths.tendering.ras, permission: "reverse-auction" },
            { title: "Results", url: paths.tendering.results, permission: "tender-result" },
        ],
    },
    {
        title: "Operations",
        icon: Wrench,
        items: [
            { title: "Work Order", url: paths.operations.workOrder, permission: "work-orders" },
            { title: "Kick Off", url: paths.operations.kickOff, permission: "kick-off" },
            { title: "Contract Agreement", url: paths.operations.contractAgreement, permission: "contract-agreement" },
        ],
    },
    {
        title: "Services",
        icon: Headset,
        items: [
            { title: "Customer", url: paths.services.customer, permission: "customers" },
            { title: "Conference", url: paths.services.conference, permission: "conferences" },
            { title: "Visit", url: paths.services.visit, permission: "visits" },
            { title: "AMC", url: paths.services.amc, permission: "amc" },
        ],
    },
    {
        title: "BI Dashboard",
        icon: BarChart3,
        items: [
            { title: "Bank Guarantee", url: paths.bi.bankGuarantee, permission: "bi.bank-guarantee" },
            { title: "Demand Draft", url: paths.bi.demandDraft, permission: "bi.demand-draft" },
            { title: "Bank Transfer", url: paths.bi.bankTransfer, permission: "bi.bank-transfer" },
            { title: "Pay on Portal", url: paths.bi.payOnPortal, permission: "bi.pay-on-portal" },
            { title: "Cheque", url: paths.bi.cheque, permission: "bi.cheque" },
            { title: "FDR", url: paths.bi.fdr, permission: "bi.fdr" },
        ],
    },
    {
        title: "Accounts",
        icon: Banknote,
        items: [
            { title: "Imprests", url: paths.accounts.imprests, permission: "accounts.imprests" },
            { title: "Financial Docs", url: paths.accounts.financialDocs, permission: "accounts.financial-docs" },
            { title: "Loan & Advances", url: paths.accounts.loanAdvances, permission: "accounts.loan-advances" },
            { title: "Projects", url: paths.accounts.projects, permission: "accounts.projects" },
            { title: "Accounts Checklists", url: paths.accounts.accountChecklists, permission: "accounts.checklists" },
            { title: "TDS Checklists", url: paths.accounts.tdsChecklists, permission: "accounts.tds-checklists" },
            { title: "GST Checklists", url: paths.accounts.gstChecklists, permission: "accounts.gst-checklists" },
            { title: "Fixed Expenses", url: paths.accounts.fixedExpenses, permission: "accounts.fixed-expenses" },
        ],
    },
    {
        title: "CRM",
        icon: Users,
        items: [
            { title: "Leads", url: paths.crm.leads, permission: "crm.leads" },
            { title: "Enquiries", url: paths.crm.enquiries, permission: "crm.enquiries" },
            { title: "Costings", url: paths.crm.costings, permission: "crm.costings" },
            { title: "Quotations", url: paths.crm.quotations, permission: "crm.quotations" },
        ],
    },
    {
        title: "Performance",
        icon: Gauge,
        items: [
            { title: "Tender Executive", url: paths.performance.tenderExecutive, permission: "performance.tender-executive" },
            { title: "Team Leader", url: paths.performance.teamLeader, permission: "performance.team-leader" },
            { title: "Operation Team", url: paths.performance.operationTeam, permission: "performance.operation-team" },
            { title: "Account Team", url: paths.performance.accountTeam, permission: "performance.account-team" },
            { title: "OEM Dashboard", url: paths.performance.oemDashboard, permission: "performance.oem-dashboard" },
            { title: "Business Dashboard", url: paths.performance.businessDashboard, permission: "performance.business-dashboard" },
            { title: "Customer Dashboard", url: paths.performance.customerDashboard, permission: "performance.customer-dashboard" },
            { title: "Location Dashboard", url: paths.performance.locationDashboard, permission: "performance.location-dashboard" },
        ],
    },
    {
        title: "Settings",
        icon: Settings,
        items: [
            { title: "Users", url: paths.master.users, permission: "master.users" },
            { title: "Permissions", url: paths.master.permissions, permission: "master.permissions" },
            { title: "Status", url: paths.master.statuses, permission: "master.statuses" },
            { title: "Items", url: paths.master.items, permission: "master.items" },
            { title: "Locations", url: paths.master.locations, permission: "master.locations" },
            { title: "Organizations", url: paths.master.organizations, permission: "master.organizations" },
            { title: "Vendors", url: paths.master.vendors, permission: "master.vendors" },
            { title: "Websites", url: paths.master.websites, permission: "master.websites" },
            { title: "Document Submitted", url: paths.master.documentSubmitted, permission: "master.documents-submitted" },
            { title: "Imprest Categories", url: paths.master.imprestCategories, permission: "master.imprest-categories" },
            { title: "Followup Categories", url: paths.master.followupCategories, permission: "master.followup-categories" },
            // { title: "Financial Year", url: paths.master.financialYears, permission: "master.financial-years" },
            { title: "EMDs Responsibilities", url: paths.master.emdsResponsibilities, permission: "master.emds-responsibilities" },
            { title: "Lead Types", url: paths.master.leadTypes, permission: "master.lead-types" },
            { title: "TQ Types", url: paths.master.tqTypes, permission: "master.tq-types" },
            { title: "Loan Parties", url: paths.master.loanParties, permission: "master.loan-parties" },
        ],
    },
    {
        title: "Shared",
        icon: Share2,
        items: [
            { title: "Follow Ups", url: paths.shared.followUp, permission: "shared.followups" },
            { title: "Couriers", url: paths.shared.couriers, permission: "shared.couriers" },
            { title: "Imprests", url: paths.shared.imprest, permission: "shared.imprests" },
        ],
    },
];

/* -------------------------------------------------------------------------- */
/*                            MENU FILTER FUNCTION                             */
/* -------------------------------------------------------------------------- */

function filterMenu(user: AuthUser | null, menu: NavGroup[]): NavGroup[] {
    return menu
        .map(group => {
            if (group.title === "Dashboard") return group;
            if (!group.items) return group;

            const visibleItems = group.items.filter(item => !item.permission || canRead(user, item.permission));

            if (visibleItems.length === 0) return null;
            return { ...group, items: visibleItems };
        })
        .filter(Boolean) as NavGroup[];
}

/* -------------------------------------------------------------------------- */
/*                               SIDEBAR COMPONENT                             */
/* -------------------------------------------------------------------------- */

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const { data: currentUser } = useCurrentUser();
    const storedUser = getStoredUser();

    const displayUser = currentUser ??
        storedUser ?? {
            id: 0,
            name: "Gyan",
            email: "gyan@volkenergie.in",
            username: null,
            mobile: null,
        };

    const filteredMenuItems = React.useMemo(() => filterMenu(currentUser, navMain), [currentUser]);

    const handleLogout = React.useCallback(async () => {
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== "/") {
            sessionStorage.setItem("auth_redirect", currentPath);
        }

        try {
            await api.post("/auth/logout", undefined, { withCredentials: true });
            window.location.replace("/login");
        } catch {}
    }, []);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher />
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={filteredMenuItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser user={displayUser as AuthUser} onLogout={handleLogout} />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
