import type { AuthUser } from '@/types/auth.types';
import { canRead } from '@/types/auth.types';
import type { LucideIcon } from 'lucide-react';

/**
 * Menu item with permission module mapping
 */
export type MenuItemWithPermission = {
    title: string;
    url: string;
    permissionModule?: string; // Module name for permission check (e.g., 'tenders', 'master.users')
};

export type ParentMenuItem = {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: MenuItemWithPermission[];
};

/**
 * Maps menu item titles to their corresponding permission modules
 * Uses parent menu context to handle duplicate titles (e.g., "Imprests" in both Accounts and Shared)
 */
function getPermissionModule(title: string, parentMenuTitle?: string): string | undefined {
    // Handle duplicate titles by checking parent menu context
    if (title === 'Imprests') {
        if (parentMenuTitle === 'Accounts') {
            return 'accounts.imprests';
        }
        if (parentMenuTitle === 'Shared') {
            return 'shared.imprests';
        }
    }

    // Standard mapping for unique titles
    const MENU_PERMISSION_MAP: Record<string, string> = {
        // Tendering sub-items
        'Tender': 'tenders',
        'Tender Approval': 'tender-approval',
        'Physical Docs': 'physical-docs',
        'RFQs': 'rfqs',
        'EMD/Tender fees': 'emds',
        'Checklists': 'checklists',
        'Costing Sheets': 'costing-sheets',
        'Costing Approval': 'costing-approvals',
        'Bid Submissions': 'bid-submissions',
        'TQ Management': 'tq-management',
        'RA Management': 'reverse-auction',
        'Results': 'tender-result',

        // Operations sub-items
        'Work Order': 'work-orders',
        'Kick Off': 'kick-off',
        'Contract Agreement': 'contract-agreement',

        // Services sub-items
        'Customer': 'customers',
        'Conference': 'conferences',
        'Visit': 'visits',
        'AMC': 'amc',

        // BI Dashboard sub-items
        'Demand Draft': 'bi.demand-draft',
        'FDR': 'bi.fdr',
        'Cheque': 'bi.cheque',
        'Bank Guarantee': 'bi.bank-guarantee',
        'Bank Transfer': 'bi.bank-transfer',
        'Pay on Portal': 'bi.pay-on-portal',

        // Accounts sub-items
        'Financial Docs': 'accounts.financial-docs',
        'Loan & Advances': 'accounts.loan-advances',
        'Projects': 'accounts.projects',
        'Accounts Checklists': 'accounts.checklists',
        'TDS Checklists': 'accounts.tds-checklists',
        'GST Checklists': 'accounts.gst-checklists',
        'Fixed Expenses': 'accounts.fixed-expenses',

        // CRM sub-items
        'Leads': 'crm.leads',
        'Enquiries': 'crm.enquiries',
        'Costings': 'crm.costings',
        'Quotations': 'crm.quotations',

        // Performance sub-items
        'Tender Executive': 'performance.tender-executive',
        'Team Leader': 'performance.team-leader',
        'Operation Team': 'performance.operation-team',
        'Account Team': 'performance.account-team',
        'OEM Dashboard': 'performance.oem-dashboard',
        'Business Dashboard': 'performance.business-dashboard',
        'Customer Dashboard': 'performance.customer-dashboard',
        'Location Dashboard': 'performance.location-dashboard',

        // Settings/Master sub-items
        'Users': 'master.users',
        'Status': 'master.statuses',
        'Items': 'master.items',
        'Locations': 'master.locations',
        'Organizations': 'master.organizations',
        'Vendors': 'master.vendors',
        'Websites': 'master.websites',
        'Document Submitted': 'master.documents-submitted',
        'Imprest Categories': 'master.imprest-categories',
        'Followup Categories': 'master.followup-categories',
        'Financial Year': 'master.financial-years',
        'EMDs Responsibilities': 'master.emds-responsibilities',
        'Lead Types': 'master.lead-types',
        'TQ Types': 'master.tq-types',
        'Loan Parties': 'master.loan-parties',

        // Shared sub-items
        'Follow Ups': 'shared.followups',
        'Couriers': 'shared.couriers',
    };

    return MENU_PERMISSION_MAP[title];
}

/**
 * Check if a menu item should be visible based on user permissions
 */
function isMenuItemVisible(
    user: AuthUser | null,
    item: MenuItemWithPermission,
    parentMenuTitle?: string
): boolean {
    // If no permission module is mapped, show the item (fallback for unmapped items)
    const permissionModule = getPermissionModule(item.title, parentMenuTitle);
    if (!permissionModule) {
        return true; // Show unmapped items by default
    }

    // Check if user has read permission for this module
    return canRead(user, permissionModule);
}

/**
 * Filter menu items based on user permissions
 * Shows parent menu if at least one child is visible
 */
export function filterMenuItemsByPermissions(
    user: AuthUser | null,
    menuItems: ParentMenuItem[]
): ParentMenuItem[] {
    return menuItems
        .map((item) => {
            // Dashboard is always visible (no permission check)
            if (item.title === 'Dashboard') {
                return item;
            }

            // If item has sub-items, filter them and show parent if any child is visible
            if (item.items && item.items.length > 0) {
                const filteredItems = item.items.filter((subItem) =>
                    isMenuItemVisible(user, subItem, item.title)
                );

                // Only show parent if at least one child is visible
                if (filteredItems.length === 0) {
                    return null; // Hide parent menu if no children are visible
                }

                return {
                    ...item,
                    items: filteredItems,
                };
            }

            // For single menu items without sub-items, check permission directly
            // Note: Currently all menu items have sub-items, but this handles future cases
            const permissionModule = getPermissionModule(item.title, item.title);
            if (permissionModule && !canRead(user, permissionModule)) {
                return null; // Hide item if user doesn't have permission
            }

            return item;
        })
        .filter((item): item is ParentMenuItem => item !== null);
}
