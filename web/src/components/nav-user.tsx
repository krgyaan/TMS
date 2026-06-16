import { useCallback } from "react";
import {
    Bell,
    ChevronsUpDown,
    LogOut,
    User,
} from "lucide-react";

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import type { AuthUser } from "@/types/auth.types";
import { Link, useNavigate } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { cn } from "@/lib/utils";

const getInitials = (name?: string | null) => {
    if (!name) return "U";
    const segments = name.trim().split(/\s+/).slice(0, 2);
    return segments.map((segment) => segment.charAt(0).toUpperCase()).join("");
};

const avatarColors = [
    "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    "bg-violet-500/15 text-violet-700 dark:text-violet-400",
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    "bg-rose-500/15 text-rose-700 dark:text-rose-400",
    "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
    "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
];

const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
};

type NavUserProps = {
    user?: AuthUser | null;
    onLogout?: () => void;
};

export function NavUser({ user, onLogout }: NavUserProps) {
    const navigate = useNavigate();
    const { isMobile } = useSidebar();

    const handleLogout = useCallback(() => {
        onLogout?.();
    }, [onLogout]);

    const initials = getInitials(user?.name) || getInitials(user?.email);
    const avatarUrl = user?.profile?.profilePhoto || user?.profile?.googlePhoto || null;

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarImage src={avatarUrl} alt={user?.name ?? "User"} />
                                <AvatarFallback className={cn("rounded-lg font-bold", getAvatarColor(user?.name ?? "User"))}>
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-medium">{user?.name ?? "User"}</span>
                                <span className="truncate text-xs">{user?.email ?? ""}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <Link to="/profile">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={avatarUrl} alt={user?.name ?? "User"} />
                                        <AvatarFallback className={cn("rounded-lg font-bold", getAvatarColor(user?.name ?? "User"))}>
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-medium">{user?.name ?? "User"}</span>
                                        <span className="truncate text-xs">{user?.email ?? ""}</span>
                                    </div>
                                </div>
                            </Link>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <Bell />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(paths.profile)}>
                                <User />
                                Profile
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" variant="destructive" onClick={handleLogout}>
                            <LogOut />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
