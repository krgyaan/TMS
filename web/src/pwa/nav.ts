import { BookUser, Mail, PhoneCall, Users, Wallet } from "lucide-react";
import { paths } from "@/app/routes/paths";
import type { LucideIcon } from "lucide-react";

export type PwaNavItem = {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    url: string;
};

// 👈 The 5 field options shown on the PWA dashboard (and sidebar)
export const pwaNavItems: PwaNavItem[] = [
    {
        title: "Client Directory",
        subtitle: "Contact directory",
        icon: BookUser,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-950/30",
        url: paths.documentDashboard.clientDirectory,
    },
    {
        title: "Happy Calling",
        subtitle: "Call & follow ups",
        icon: PhoneCall,
        color: "text-purple-600",
        bgColor: "bg-purple-50 dark:bg-purple-950/30",
        url: paths.crm.happyCalling,
    },
    {
        title: "Leads",
        subtitle: "Manage leads",
        icon: Users,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        url: paths.crm.leads,
    },
    {
        title: "Enquiries",
        subtitle: "Manage enquiries",
        icon: Mail,
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-950/30",
        url: paths.crm.enquiries,
    },
    {
        title: "Imprest",
        subtitle: "Manage imprests",
        icon: Wallet,
        color: "text-pink-600",
        bgColor: "bg-pink-50 dark:bg-pink-950/30",
        url: paths.shared.imprest,
    },
];
