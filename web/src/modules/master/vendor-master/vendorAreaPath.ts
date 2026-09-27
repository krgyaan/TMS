import { paths } from "@/app/routes/paths";

/**
 * The vendor master pages are mounted in two places (Settings > Vendors and
 * Accounts > Vendor Master). Resolve the area the current page is mounted in
 * so list/create/edit navigation stays inside that section.
 */
export function vendorAreaBase(pathname: string): string {
    return pathname.startsWith(paths.accounts.vendorMaster) ? paths.accounts.vendorMaster : paths.master.vendors;
}
