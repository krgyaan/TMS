export type BreadcrumbNavItem = {
    title: string;
    url: string;
    permission?: string;
};

export type BreadcrumbNavGroup = {
    title: string;
    url?: string;
    items?: BreadcrumbNavItem[];
};

export type Crumb = {
    label: string;
    href?: string;
    isCurrent: boolean;
};

const SEGMENT_LABELS: Record<string, string> = {
    create: "Create",
    new: "Create",
    add: "Add",
    edit: "Edit",
    view: "View",
    details: "Details",
    show: "Details",
    update: "Update",
    report: "Report",
    submit: "Submit",
    resubmit: "Resubmit",
    approve: "Approve",
    "mark-missed": "Mark Missed",
    "payment-history": "Payment History",
    voucher: "Voucher",
    "follow-up": "Follow Up",
    "quotation-followup": "Quotation Follow Up",
    "raise-query": "Raise Query",
    assign: "Assign",
    "assign-oe": "Assign OE",
    schedule: "Schedule",
    upload: "Upload",
    "upload-result": "Upload Result",
    closure: "Closure",
    emis: "EMI",
    emi: "EMI",
    tds: "TDS",
    permission: "Permissions",
    permissions: "Permissions",
    "old-entries": "Old Entries",
    "bi-other-than-emds": "BI Other Than EMDs",
    "project-purchase-invoice": "Project Purchase Invoice",
    "purchase-order": "Purchase Order",
    "vendor-work-order": "Vendor Work Order",
    "sale-invoice": "Sale Invoice",
    "payment-request": "Payment Request",
    "work-order": "Work Order",
    "project-dashboard": "Project Dashboard",
    "client-directory": "Client Directory",
    "finance-document": "Finance Document",
    "tender-fee": "Tender Fee",
    "bank-guarantee": "Bank Guarantee",
    "demand-draft": "Demand Draft",
    "bank-transfer": "Bank Transfer",
    "pay-on-portal": "Pay on Portal",
    "reverse-auction": "Reverse Auction",
    "bid-submissions": "Bid Submissions",
    "costing-sheets": "Costing Sheets",
    "costing-approvals": "Costing Approvals",
    "tq-management": "TQ Management",
    "physical-docs": "Physical Docs",
    "emds-tenderfees": "EMD/Tender fees",
    "document-checklists": "Checklists",
    "sale-invoices": "Sale Invoices",
    "purchase-orders": "Purchase Orders",
    "vendor-work-orders": "Vendor Work Orders",
    "payment-requests": "Payment Requests",
    "loan-advances": "Loan & Advances",
    "amc-services": "AMC Services",
    "amc-billing": "AMC Billing",
    "happy-calling": "Happy Calling",
    "maker-requests": "Maker Requests",
    "follow-ups": "Follow Ups",
    profile: "Profile",
    user: "User",
    "work-details": "Work Details",
    induction: "Induction",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_RE = /^\d+$/;
const CUID_RE = /^c[a-z0-9]{20,}$/i;

function isDynamicId(segment: string): boolean {
    return NUMERIC_RE.test(segment) || UUID_RE.test(segment) || CUID_RE.test(segment);
}

function humanizeSegment(segment: string): string {
    return segment
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}

function normalizePath(pathname: string): string {
    const clean = (pathname.split("?")[0] ?? "").split("#")[0] ?? "";
    if (clean.length > 1) return clean.replace(/\/+$/, "");
    return clean || "/";
}

function segmentize(url: string): string[] {
    return url.split("/").filter(Boolean);
}

function hasPrefix(segments: string[], prefix: string[]): boolean {
    if (prefix.length === 0 || segments.length < prefix.length) return false;
    return prefix.every((segment, index) => segment === segments[index]);
}

function labelForSegment(segment: string, isLast: boolean): string {
    if (isDynamicId(segment)) {
        return isLast ? `Details(${segment})` : `#${segment}`;
    }
    return SEGMENT_LABELS[segment] ?? humanizeSegment(segment);
}

export function buildBreadcrumbs(
    pathname: string,
    nav: BreadcrumbNavGroup[]
): Crumb[] {
    const path = normalizePath(pathname);
    const segments = segmentize(path);

    if (segments.length === 0) {
        return [{ label: "Dashboard", isCurrent: true }];
    }

    let matchedGroup: BreadcrumbNavGroup | null = null;
    let matchedItem: BreadcrumbNavItem | null = null;
    let consumed = 0;

    for (const group of nav) {
        const candidates: BreadcrumbNavItem[] = group.items?.length
            ? group.items
            : group.url
                ? [{ title: group.title, url: group.url }]
                : [];

        for (const item of candidates) {
            const itemSegments = segmentize(item.url);
            if (hasPrefix(segments, itemSegments) && itemSegments.length > consumed) {
                matchedGroup = group;
                matchedItem = item;
                consumed = itemSegments.length;
            }
        }
    }

    const crumbs: Crumb[] = [];
    let leftover: string[];

    if (matchedGroup && matchedItem) {
        const isSingleGroup = !matchedGroup.items?.length;
        if (isSingleGroup && matchedGroup.url) {
            crumbs.push({ label: matchedGroup.title, href: matchedGroup.url, isCurrent: false });
        } else {
            crumbs.push({ label: matchedGroup.title, isCurrent: false });
        }
        crumbs.push({
            label: matchedItem.title,
            href: matchedItem.url,
            isCurrent: false,
        });
        leftover = segments.slice(consumed);
    } else {
        const groupByPrefix = nav.find(group => {
            const firstSegments = (group.items?.length
                ? group.items.map(item => segmentize(item.url)[0])
                : group.url
                    ? [segmentize(group.url)[0]]
                    : []
            ).filter(Boolean);
            return firstSegments.includes(segments[0]);
        });

        if (groupByPrefix) {
            crumbs.push({ label: groupByPrefix.title, isCurrent: false });
            leftover = segments.slice(1);
        } else {
            leftover = segments;
        }
    }

    leftover.forEach((segment, index) => {
        const isLast = index === leftover.length - 1;
        crumbs.push({ label: labelForSegment(segment, isLast), isCurrent: false });
    });

    if (crumbs.length === 0) {
        return [{ label: humanizeSegment(segments[segments.length - 1]), isCurrent: true }];
    }

    const lastIndex = crumbs.length - 1;
    crumbs[lastIndex] = {
        label: crumbs[lastIndex].label,
        isCurrent: true,
    };

    return crumbs;
}
