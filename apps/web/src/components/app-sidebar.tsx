"use client"

import * as React from "react"
import {
    AudioWaveform,
    BookOpen,
    Bot,
    Command,
    GalleryVerticalEnd,
    Settings2,
    SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { paths } from "@/app/routes/paths"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar"

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
        }
    ],
    navMain: [
        {
            title: "Tendering",
            url: "#",
            icon: SquareTerminal,
            isActive: false,
            items: [
                {
                    title: "Tender",
                    url: paths.tendering.tenders,
                },
                {
                    title: "Info Sheet",
                    url: paths.tendering.infoSheet,
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
                    title: "EMD/Tender fee",
                    url: paths.tendering.emdsTenderFees,
                },
                {
                    title: "Document Checklist",
                    url: paths.tendering.checklists,
                },
                {
                    title: "Costing Creation",
                    url: paths.tendering.costingSheets,
                },
                {
                    title: "Costing Approval",
                    url: paths.tendering.costingApproval,
                },
                {
                    title: "Bid Submission",
                    url: paths.tendering.bidSubmissions,
                },
                {
                    title: "TQ Management",
                    url: paths.tendering.tqs,
                },
                {
                    title: "RA Managaement",
                    url: paths.tendering.ras,
                },
                {
                    title: "Result",
                    url: paths.tendering.results,
                }
            ],
        },
        {
            title: "Operations",
            url: "#",
            icon: Bot,
            isActive: false,
            items: [
                {
                    title: "Work Order",
                    url: paths.operations.workOrder,
                },
                {
                    title: "Kick Off Meeting",
                    url: paths.operations.kickOff,
                },
                {
                    title: "Contract Agreement",
                    url: paths.operations.contractAgreement,
                },
            ],
        },
        {
            title: "Service",
            url: "#",
            icon: BookOpen,
            isActive: false,
            items: [
                {
                    title: "Customer Service",
                    url: paths.services.customer,
                },
                {
                    title: "Conference Call",
                    url: paths.services.conference,
                },
                {
                    title: "Service Visit",
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
            icon: Settings2,
            isActive: false,
            items: [
                {
                    title: "Demand Drafts",
                    url: paths.bi.demandDraft,
                },
                {
                    title: "FDRs",
                    url: paths.bi.fdr,
                },
                {
                    title: "Cheques",
                    url: paths.bi.cheque,
                },
                {
                    title: "Bank Guarantees",
                    url: paths.bi.bankGuarantee,
                },
                {
                    title: "Bank Transfers",
                    url: paths.bi.bankTransfer,
                },
                {
                    title: "Pay on Portals",
                    url: paths.bi.payOnPortal,
                },
            ],
        },
        {
            title: "Accounts",
            url: "#",
            icon: Settings2,
            isActive: false,
            items: [
                {
                    title: "Employee Imprest",
                    url: paths.accounts.imprests,
                },
                {
                    title: "Finance Docs",
                    url: paths.accounts.financialDocs,
                },
                {
                    title: "Loan & Advances",
                    url: paths.accounts.loanAdvances,
                },
                {
                    title: "Projects",
                    url: "#",
                },
                {
                    title: "Account Checklists",
                    url: paths.accounts.accountChecklists,
                },
                {
                    title: "GST Checklists",
                    url: paths.accounts.gstChecklists,
                },
                {
                    title: "Fixes Expense",
                    url: paths.accounts.fixedExpenses,
                },
            ],
        },
        {
            title: "CRM",
            url: "#",
            icon: Settings2,
            isActive: false,
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
                    title: "Approve Costing",
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
            icon: Settings2,
            isActive: false,
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
                    title: "Operation",
                    url: paths.performance.operationTeam,
                },
                {
                    title: "Accounts",
                    url: paths.performance.accountTeam,
                },
                {
                    title: "OEMs",
                    url: paths.performance.oemDashboard,
                },
                {
                    title: "Business",
                    url: paths.performance.businessDashboard,
                },
                {
                    title: "Customer",
                    url: paths.performance.customerDashboard,
                },
                {
                    title: "Location",
                    url: paths.performance.locationDashboard,
                },
            ],
        },
        {
            title: "Master",
            url: "#",
            icon: Settings2,
            isActive: false,
            items: [
                {
                    title: "Employees",
                    url: paths.master.employees,
                },
                {
                    title: "Tender Statuses",
                    url: paths.master.statuses,
                },
                {
                    title: "Tender Orgs",
                    url: paths.master.organizations,
                },
                {
                    title: "Items and Headings",
                    url: paths.master.items,
                },
                {
                    title: "Vendors/OEM",
                    url: paths.master.vendors,
                },
                {
                    title: "Tender Websites",
                    url: paths.master.websites,
                },
                {
                    title: "Tender Locations",
                    url: paths.master.locations,
                },
                {
                    title: "Document Submitted",
                    url: paths.master.documentSubmitted,
                },
                {
                    title: "Imprest Categories",
                    url: paths.master.imprestCategory,
                },
                {
                    title: "Document Types",
                    url: paths.master.documentType,
                },
                {
                    title: "Financial Year",
                    url: paths.master.financialYear,
                },
                {
                    title: "Followup Categories",
                    url: paths.master.followupCategories,
                },
                {
                    title: "EMD Responsibilities",
                    url: paths.master.emdsResponsibilities,
                },
            ],
        },
        {
            title: 'Shared',
            url: '#',
            icon: Settings2,
            isActive: true,
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
                    url: "#",
                }
            ],
        },
    ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher teams={data.teams} />
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
