/**
 * Field-mode configuration — single source of truth.
 *
 * Field mode = the app running inside an installed standalone window
 * (see useFieldMode). In field mode the sidebar narrows to the exact
 * items below (each still gated by the user's own permissions) and
 * the route guard allows only these URL prefixes.
 */
import { BookUser, Mail, PhoneCall, Users, Wallet, type LucideIcon } from "lucide-react";
import { paths } from "@/app/routes/paths";

/** Sidebar items shown in field mode (exact URLs from app-sidebar navMain). */
export const FIELD_ITEM_URLS = [
    "/document-dashboard/client-directory", // Client Directory
    "/crm/happy-calling", // Happy Calling
    "/crm/leads", // Leads
    "/crm/enquiries", // Enquiries
    "/shared/imprests", // Imprests
] as const;

/** URL prefixes reachable in field mode (besides "/" and "/profile").
 *  Covers the create/edit/detail/followup sub-pages of each field module. */
export const FIELD_PATH_PREFIXES = [
    "/document-dashboard/client-directory",
    "/crm/happy-calling",
    "/crm/leads",
    "/crm/followup", // leads follow-up page lives at /crm/followup/:leadId
    "/crm/enquiries",
    "/shared/imprests",
] as const;

/** Always-allowed standalone routes: the main dashboard and the profile page. */
const ALWAYS_ALLOWED_PATHS = ["/", "/profile"];

export function isFieldPath(pathname: string): boolean {
    if (ALWAYS_ALLOWED_PATHS.includes(pathname)) return true;
    return FIELD_PATH_PREFIXES.some(
        prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
}

/** Dashboard tiles shown in field mode — the five field pages, rendered
 *  with QuickActionCard and filtered by the user's read permissions. */
export interface FieldDashboardTile {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    url: string;
    permission: string;
}

export const FIELD_DASHBOARD_TILES: FieldDashboardTile[] = [
    {
        title: "Client Directory",
        subtitle: "Browse client contacts",
        icon: BookUser,
        color: "text-cyan-600",
        bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
        url: paths.documentDashboard.clientDirectory,
        permission: "shared.client-directory",
    },
    {
        title: "Happy Calling",
        subtitle: "Manage call follow-ups",
        icon: PhoneCall,
        color: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-950/30",
        url: paths.crm.happyCalling,
        permission: "crm.happy_calling",
    },
    {
        title: "Leads",
        subtitle: "Manage leads",
        icon: Users,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        url: paths.crm.leads,
        permission: "crm.leads",
    },
    {
        title: "Enquiries",
        subtitle: "Manage enquiries",
        icon: Mail,
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-950/30",
        url: paths.crm.enquiries,
        permission: "crm.enquiries",
    },
    {
        title: "Imprests",
        subtitle: "Manage imprests",
        icon: Wallet,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        url: paths.shared.imprest,
        permission: "shared.imprests",
    },
];
