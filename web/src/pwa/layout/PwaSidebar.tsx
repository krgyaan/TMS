import * as React from "react";
import { Users, Share2 } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@/components/ui/sidebar";
import { useCurrentUser, useLogout } from "@/hooks/api/useAuth";
import { getStoredUser } from "@/lib/auth";
import type { AuthUser } from "@/types/auth.types";
import { canRead } from "@/types/auth.types";
import type { LucideIcon } from "lucide-react";

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

// 👈 Only CRM + Imprest items
const pwaNavItems: NavGroup[] = [
    {
        title: "CRM",
        icon: Users,
        items: [
            { title: "Happy Calling", url: paths.crm.happyCalling, permission: "crm.happy_calling" },
            { title: "Leads", url: paths.crm.leads, permission: "crm.leads" },
            { title: "Enquiries", url: paths.crm.enquiries, permission: "crm.enquiries" },
        ],
    },
    {
        title: "Shared",
        icon: Share2,
        items: [
            { title: "Imprests", url: paths.shared.imprest, permission: "shared.imprests" },
        ],
    },
];

function filterMenu(user: AuthUser | null, menu: NavGroup[]): NavGroup[] {
    return menu
        .map(group => {
            if (!group.items) return group;
            const visibleItems = group.items.filter(
                item => !item.permission || canRead(user, item.permission)
            );
            if (visibleItems.length === 0) return null;
            return { ...group, items: visibleItems };
        })
        .filter(Boolean) as NavGroup[];
}

export function PwaSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const { data: currentUser } = useCurrentUser();
    const storedUser = getStoredUser();

    const displayUser =
        currentUser ??
        storedUser ?? {
            id: 0,
            name: "-",
            email: "-",
            username: null,
            mobile: null,
        };

    const filteredMenuItems = React.useMemo(
        () => filterMenu(currentUser ?? null, pwaNavItems),
        [currentUser]
    );

    const logoutMutation = useLogout();

    const handleLogout = React.useCallback(() => {
        logoutMutation.mutate();
    }, [logoutMutation]);

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <TeamSwitcher />
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={filteredMenuItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser
                    user={displayUser as AuthUser}
                    onLogout={handleLogout}
                />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}