/**
 * Field-mode configuration — single source of truth.
 *
 * Field mode = the app running inside an installed standalone window
 * (see useFieldMode). In field mode the sidebar narrows to the exact
 * items below (each still gated by the user's own permissions) and
 * the route guard allows only these URL prefixes.
 */

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
