"use client";

import * as React from "react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";

import { useCurrentUser, useLogout } from "@/hooks/api/useAuth";
import { useFieldMode } from "@/hooks/useFieldMode";
import { getStoredUser } from "@/lib/auth";
import { buildFieldMenu, filterMenu, navMain } from "@/lib/nav-config";

import type { AuthUser } from "@/types/auth.types";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const { data: currentUser } = useCurrentUser();
    const storedUser = getStoredUser();
    const isFieldMode = useFieldMode();

    const displayUser = currentUser ??
        storedUser ?? {
            id: 0,
            name: "-",
            email: "-",
            username: null,
            mobile: null,
        };

    const filteredMenuItems = React.useMemo(
        () => (isFieldMode ? buildFieldMenu(currentUser) : filterMenu(currentUser, navMain)),
        [currentUser, isFieldMode]
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
                <NavUser user={displayUser as AuthUser} onLogout={handleLogout} />
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
