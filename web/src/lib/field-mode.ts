/**
 * Field-mode configuration — single source of truth.
 *
 * Field mode = the app running inside an installed standalone window
 * (see useFieldMode). In field mode the sidebar flattens to Dashboard +
 * the five field pages (see FIELD_DASHBOARD_TILES, each gated by the
 * user's own permissions) and the route guard allows only these URL
 * prefixes.
 */
import { BookUser, Mail, PhoneCall, Wallet, type LucideIcon } from "lucide-react";
import { paths } from "@/app/routes/paths";

/** URL prefixes reachable in field mode (besides "/" and "/profile").
 *  Covers the create/edit/detail/followup sub-pages of each field module. */
export const FIELD_PATH_PREFIXES = [
    "/document-dashboard/client-directory",
    "/crm/happy-calling",
    "/crm/leads",
    "/crm/followup", // leads follow-up page lives at /crm/followup/:leadId
    "/crm/enquiries",
    "/shared/imprests",
    "/operations/po", // PO PDF TL approval page (/operations/po/:id/approval)
    "/operations/wo", // WO PDF TL approval page (/operations/wo/:id/approval)
    "/operations/vwo", // VWO PDF TL approval alias (/operations/vwo/:id/approval)
    "/operations/purchase-orders", // PO full detail view linked from approval page
    "/operations/vendor-work-orders", // WO full detail view linked from approval page
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
    {
        title: "Purchase Orders",
        subtitle: "Manage purchase orders",
        icon: Wallet,   
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950/30",
        url: paths.operations.purchaseOrders,
        permission: "operations.purchase_orders",
    }
    
];
