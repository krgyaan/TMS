import { paths } from "@/app/routes/paths";
import { FileText, Landmark, Receipt, Send, Truck, Wallet, type LucideIcon } from "lucide-react";

export const getCircularFileUrl = (path?: string | null) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const baseUrl = (import.meta.env.VITE_UPLOADS_URL || "").replace(/\/+$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const uploadPath = normalizedPath.startsWith("/uploads") ? normalizedPath : `/uploads${normalizedPath}`;
    return `${baseUrl}${uploadPath}`;
};

export interface TenderInfo {
    id: string;
    tender_name: string;
    due_date: string;
    team_member: string;
    users: {
        name: string;
    };
    tq_received: Array<{
        tq_submission_date?: string;
    }>;
}

export interface FollowUp {
    id: string;
    party_name: string;
    created_at: string;
    assigned_to: string;
}

export interface DashboardData {
    role: string;
    google_oauth_connected: boolean;
    userCount: number;
    tenderInfoCount: number;
    bided: number;
    tender_info: TenderInfo[];
    follow_ups: FollowUp[];
}

export interface QuickAction {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    path?: string;
}

export const mockDashboardData: DashboardData = {
    role: "Admin",
    google_oauth_connected: false,
    userCount: 45,
    tenderInfoCount: 123,
    bided: 67,
    tender_info: [
        {
            id: "1",
            tender_name: "Road Construction Project",
            due_date: "2026-09-15",
            team_member: "user1",
            users: { name: "John Doe" },
            tq_received: [{ tq_submission_date: "2024-02-10" }],
        },
        {
            id: "2",
            tender_name: "Building Maintenance",
            due_date: "2026-09-20",
            team_member: "user2",
            users: { name: "Jane Smith" },
            tq_received: [],
        },
    ],
    follow_ups: [
        {
            id: "1",
            party_name: "ABC Corporation",
            created_at: "2026-09-05",
            assigned_to: "user1",
        },
    ],
};

export const mockUsers = [
    { id: "user1", name: "John Doe" },
    { id: "user2", name: "Jane Smith" },
    { id: "user3", name: "Mike Johnson" },
];

export const quickActions: QuickAction[] = [
    {
        title: "Add Imprest",
        subtitle: "Create New Imprest Entry",
        icon: Wallet,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        path: paths.shared.imprestCreate
    },
    {
        title: "Add Courier",
        subtitle: "Create New Courier Entry",
        icon: Truck,
        color: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-950/30",
        path: paths.shared.courierCreate
    },
    {
        title: "New Tender",
        subtitle: "Create New Tender Entry",
        icon: FileText,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        path: paths.tendering.tenderCreate
    },
    {
        title: "New Follow-up",
        subtitle: "Create New Follow Up",
        icon: Send,
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-950/30",
        path: paths.shared.followUpCreate
    },
    {
        title: "BI Other Than EMDs",
        subtitle: "Request New BI",
        icon: Landmark,
        color: "text-pink-600",
        bgColor: "bg-pink-50 dark:bg-pink-950/30",
        path: paths.tendering.biOtherThanEmdsCreate()
    },
    {
        title: "New Maker Request",
        subtitle: "Request Non-Project Payment",
        icon: Receipt,
        color: "text-teal-600",
        bgColor: "bg-teal-50 dark:bg-teal-950/30",
        path: paths.shared.makerRequestCreate
    },
    {
        title: "New Work Order",
        subtitle: "Create Work Order Entry",
        icon: FileText,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
        path: paths.operations.woBasicDetailCreatePage
    },
];