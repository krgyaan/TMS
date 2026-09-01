import * as React from "react";
import { BookUser, Mail, PhoneCall, Users, Wallet } from "lucide-react";
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
    icon?: LucideIcon;
    permission?: string;
};

// 👈 Flat field options (no grouped folders)
const pwaNavItems: NavItem[] = [
    { title: "Client Directory", url: paths.documentDashboard.clientDirectory, icon: BookUser, permission: "shared.client-directory" },
    { title: "Happy Calling", url: paths.crm.happyCalling, icon: PhoneCall, permission: "crm.happy_calling" },
    { title: "Leads", url: paths.crm.leads, icon: Users, permission: "crm.leads" },
    { title: "Enquiries", url: paths.crm.enquiries, icon: Mail, permission: "crm.enquiries" },
    { title: "Imprest", url: paths.shared.imprest, icon: Wallet, permission: "shared.imprests" },
];

function filterMenu(user: AuthUser | null, menu: NavItem[]): NavItem[] {
    return menu.filter(item => !item.permission || canRead(user, item.permission));
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