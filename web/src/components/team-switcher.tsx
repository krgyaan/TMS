'use client';

import * as React from 'react';
import { ChevronsUpDown, Building2, Check, Globe } from 'lucide-react';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useTeamContext } from '@/contexts/TeamContext';
import { Badge } from '@/components/ui/badge';

export function TeamSwitcher() {
    const { isMobile } = useSidebar();
    const { activeTeam, activeTeamId, availableTeams, canSwitchTeam, userRole, dataScope, isLoadingTeams, setActiveTeam, currentUser } = useTeamContext();

    // Display info based on role
    const displayName = activeTeam?.name ?? 'All Teams';
    const displaySubtext = React.useMemo(() => {
        if (!currentUser) return '';

        switch (dataScope) {
            case 'self':
                return `${userRole} • Personal View`;
            case 'team':
                return `${userRole} • Team View`;
            case 'all':
                return activeTeamId ? `${userRole} • Filtered` : `${userRole} • All Data`;
            default:
                return userRole ?? '';
        }
    }, [dataScope, userRole, activeTeamId, currentUser]);

    // If user can't switch teams, show read-only display
    if (!canSwitchTeam) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton
                        size="lg"
                        className="cursor-default hover:bg-transparent"
                    >
                        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                            <Building2 className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium">
                                {currentUser?.team?.name ?? 'No Team'}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                                {displaySubtext}
                            </span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    // Admin/Super User: Show team switcher
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                                {activeTeamId ? (
                                    <Building2 className="size-4" />
                                ) : (
                                    <Globe className="size-4" />
                                )}
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{displayName}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {displaySubtext}
                                </span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        align="start"
                        side={isMobile ? 'bottom' : 'right'}
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            Switch Team View
                        </DropdownMenuLabel>

                        {/* All Teams Option */}
                        <DropdownMenuItem
                            onClick={() => setActiveTeam(null)}
                            className="gap-2 p-2"
                        >
                            <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                                <Globe className="size-3.5 shrink-0" />
                            </div>
                            <span className="flex-1">All Teams</span>
                            {activeTeamId === null && (
                                <Check className="size-4 text-primary" />
                            )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuLabel className="text-muted-foreground text-xs">
                            Teams
                        </DropdownMenuLabel>

                        {isLoadingTeams ? (
                            <DropdownMenuItem disabled className="gap-2 p-2">
                                <span className="text-muted-foreground">Loading teams...</span>
                            </DropdownMenuItem>
                        ) : availableTeams.length === 0 ? (
                            <DropdownMenuItem disabled className="gap-2 p-2">
                                <span className="text-muted-foreground">No teams available</span>
                            </DropdownMenuItem>
                        ) : (
                            availableTeams.map((team) => (
                                <DropdownMenuItem
                                    key={team.id}
                                    onClick={() => setActiveTeam(team.id)}
                                    className="gap-2 p-2"
                                >
                                    <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                                        <Building2 className="size-3.5 shrink-0" />
                                    </div>
                                    <span className="flex-1">{team.name}</span>
                                    {/* Show badge if it's user's primary team */}
                                    {team.id === currentUser?.team?.id && (
                                        <Badge variant="secondary" className="text-xs">
                                            My Team
                                        </Badge>
                                    )}
                                    {activeTeamId === team.id && (
                                        <Check className="size-4 text-primary" />
                                    )}
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
