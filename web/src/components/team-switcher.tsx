import { ChevronsUpDown, Check, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/api/useTeams';
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
import { Skeleton } from '@/components/ui/skeleton';

export function TeamSwitcher() {
    const { isMobile } = useSidebar();
    const {
        role,
        dataScope,
        canSwitchTeams,
        teamId: userTeamId,
        activeTeamId,
        setActiveTeamId,
    } = useAuth();

    const { data: teams = [], isLoading: isLoadingTeams } = useTeams();

    if (isLoadingTeams) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" className="cursor-default">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="grid flex-1 gap-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    const userTeam = teams.find((t) => t.id === userTeamId);
    const activeTeam = activeTeamId ? teams.find((t) => t.id === activeTeamId) : null;

    if (!canSwitchTeams) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Building2 className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">
                                {userTeam?.name ?? 'My Team'}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                                {role} • {dataScope} access
                            </span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        );
    }

    const displayTeam = activeTeam ?? userTeam;
    const displayName = activeTeamId === null ? 'All Teams' : (displayTeam?.name ?? 'Select Team');

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                {activeTeamId === null ? (
                                    <span className="text-xs font-bold">ALL</span>
                                ) : (
                                    <Building2 className="size-4" />
                                )}
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{displayName}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {role} • {dataScope} access
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
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            View Data For
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                            onClick={() => setActiveTeamId(null)}
                            className="gap-2 p-2"
                        >
                            <div className="flex size-6 items-center justify-center rounded-sm border bg-muted">
                                <span className="text-[10px] font-bold">ALL</span>
                            </div>
                            <span>All Teams</span>
                            {activeTeamId === null && (
                                <Check className="ml-auto size-4" />
                            )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {teams.map((team) => (
                            <DropdownMenuItem
                                key={team.id}
                                onClick={() => setActiveTeamId(team.id)}
                                className="gap-2 p-2"
                            >
                                <div className="flex size-6 items-center justify-center rounded-sm border">
                                    <span className="text-xs">{team.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <span className={cn(team.id === userTeamId && 'font-medium')}>
                                    {team.name}
                                    {team.id === userTeamId && (
                                        <span className="ml-1 text-xs text-muted-foreground">*</span>
                                    )}
                                </span>
                                {activeTeamId === team.id && (
                                    <Check className="ml-auto size-4" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
