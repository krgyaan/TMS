import { Fragment, useMemo, useState, type ReactNode } from "react";
import {
    ArrowLeft,
    Building,
    CalendarClock,
    CalendarPlus,
    CircleDot,
    Clock,
    CreditCard,
    Droplet,
    Facebook,
    FileCheck,
    Globe,
    Hash,
    Home,
    ImageIcon,
    Languages,
    Mail,
    MapPin,
    Phone,
    PhoneCall,
    Ruler,
    ShieldCheck,
    UserRound,
    Users,
    UsersRound,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useRolePermissions } from "@/hooks/api/useRoles";
import { useUser } from "@/hooks/api/useUsers";
import { useUserPermissions } from "@/hooks/api/useUserPermissions";
import { isAdminOrAbove } from "@/types/auth.types";

/**
 * Modules whose access is granted per-user only — role permissions are ignored.
 * Mirrors USER_ONLY_MODULES in api/src/modules/auth/services/permission.service.ts.
 */
const USER_ONLY_MODULES = new Set(["tenders"]);

const GroupHeader = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
    <TableRow className="bg-muted/50">
        <TableCell colSpan={4} className="font-semibold text-sm">
            {action ? (
                <div className="flex items-center justify-between gap-2">
                    <span>{children}</span>
                    {action}
                </div>
            ) : (
                children
            )}
        </TableCell>
    </TableRow>
);

const FieldLabel = ({ icon: Icon, children }: { icon: ReactNode; children: ReactNode }) => (
    <TableCell className="text-sm font-medium text-muted-foreground w-1/4">
        <div className="flex items-center gap-2">
            {Icon}
            {children}
        </div>
    </TableCell>
);

const FieldValue = ({ children, span }: { children: ReactNode; span?: number }) => (
    <TableCell className="text-sm font-semibold" colSpan={span}>
        {children ?? "—"}
    </TableCell>
);

const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
        ? "—"
        : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
};

/** Renders a jsonb object, skipping null/empty values so we never show a wall of em-dashes. */
const formatJson = (value?: unknown) => {
    if (!value || typeof value !== "object") return "—";
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => {
        if (v === null || v === undefined || v === "") return false;
        if (typeof v === "object" && Object.keys(v as object).length === 0) return false;
        return true;
    });
    if (entries.length === 0) return "—";
    return entries.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ");
};

export default function UserViewPage() {
    const { id } = useParams<{ id: string }>();
    const userId = Number(id);
    const navigate = useNavigate();
    const { data: user, isLoading, error, refetch } = useUser(userId);
    const { data: overrides = [], isLoading: overridesLoading } = useUserPermissions(userId);
    const { data: rolePermissions = [], isLoading: roleLoading } = useRolePermissions(user?.role?.id ?? null);
    const [retrying, setRetrying] = useState(false);

    const permsLoading = overridesLoading || roleLoading;

    const byModule = useMemo(() => {
        const effective = new Set<string>();

        rolePermissions.forEach(perm => {
            if (!USER_ONLY_MODULES.has(perm.module)) {
                effective.add(`${perm.module}:${perm.action}`);
            }
        });

        overrides.forEach(override => {
            const key = `${override.module}:${override.action}`;
            if (override.granted) {
                effective.add(key);
            } else {
                effective.delete(key);
            }
        });

        const grouped = new Map<string, Set<string>>();
        effective.forEach(key => {
            const [module, action] = key.split(":");
            const actions = grouped.get(module) ?? new Set<string>();
            actions.add(action);
            grouped.set(module, actions);
        });

        return Array.from(grouped.entries())
            .map(([module, actions]) => ({ module, actions: Array.from(actions).sort() }))
            .sort((a, b) => a.module.localeCompare(b.module));
    }, [rolePermissions, overrides]);

    const effectiveCount = byModule.reduce((total, entry) => total + entry.actions.length, 0);
    const hasFullAccess = isAdminOrAbove(user?.role?.name);

    const permissionRows = useMemo(() => {
        const rows: Array<Array<(typeof byModule)[number] | undefined>> = [];
        for (let i = 0; i < byModule.length; i += 2) {
            rows.push([byModule[i], byModule[i + 1]]);
        }
        return rows;
    }, [byModule]);

    if (!userId) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>User not found</CardTitle>
                    <CardDescription>Invalid user identifier</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="mt-2 h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (error || !user) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>User Details</CardTitle>
                    <CardDescription>View user account information</CardDescription>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate(paths.master.users)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to users
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertDescription>Failed to load user. {error?.message}</AlertDescription>
                    </Alert>
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        disabled={retrying}
                        onClick={() => {
                            setRetrying(true);
                            refetch().finally(() => setRetrying(false));
                        }}
                    >
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <UserRound className="h-5 w-5" />
                    <div>
                        <CardTitle>{user.name}</CardTitle>
                        <CardDescription>User account details</CardDescription>
                    </div>
                </div>
                <CardAction>
                    <Button variant="outline" onClick={() => navigate(paths.master.users)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to users
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Identity */}
                        <GroupHeader>Identity</GroupHeader>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<UserRound className="h-4 w-4" />}>Full Name</FieldLabel>
                            <FieldValue>{user.name}</FieldValue>
                            <FieldLabel icon={<Hash className="h-4 w-4" />}>Employee Code</FieldLabel>
                            <FieldValue>{user.profile?.employeeCode || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<FileCheck className="h-4 w-4" />}>Profile Status</FieldLabel>
                            <FieldValue>
                                <Badge variant={user.profile?.profileCompleted ? "default" : "secondary"}>
                                    {user.profile?.profileCompleted ? "Complete" : "Incomplete"}
                                </Badge>
                            </FieldValue>
                            <FieldLabel icon={<ImageIcon className="h-4 w-4" />}>Photo</FieldLabel>
                            <FieldValue>{user.profile?.image || "—"}</FieldValue>
                        </TableRow>

                        {/* Account */}
                        <GroupHeader>Account</GroupHeader>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Hash className="h-4 w-4" />}>User ID</FieldLabel>
                            <FieldValue>{user.id}</FieldValue>
                            <FieldLabel icon={<UserRound className="h-4 w-4" />}>Username</FieldLabel>
                            <FieldValue>{user.username ? `@${user.username}` : "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<CircleDot className="h-4 w-4" />}>Status</FieldLabel>
                            <FieldValue>
                                <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>
                            </FieldValue>
                            <FieldLabel icon={<ShieldCheck className="h-4 w-4" />}>Role</FieldLabel>
                            <FieldValue>{user.role?.name || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Clock className="h-4 w-4" />}>Timezone</FieldLabel>
                            <FieldValue>{user.profile?.timezone || "—"}</FieldValue>
                            <FieldLabel icon={<Languages className="h-4 w-4" />}>Locale</FieldLabel>
                            <FieldValue>{user.profile?.locale || "—"}</FieldValue>
                        </TableRow>

                        {/* Contact */}
                        <GroupHeader>Contact</GroupHeader>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Mail className="h-4 w-4" />}>Email</FieldLabel>
                            <FieldValue>{user.email}</FieldValue>
                            <FieldLabel icon={<Mail className="h-4 w-4" />}>Alternate Email</FieldLabel>
                            <FieldValue>{user.profile?.altEmail || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Phone className="h-4 w-4" />}>Mobile</FieldLabel>
                            <FieldValue>{user.mobile || "—"}</FieldValue>
                            <FieldLabel icon={<PhoneCall className="h-4 w-4" />}>Phone</FieldLabel>
                            <FieldValue>{user.profile?.phone || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<PhoneCall className="h-4 w-4" />}>Emergency Contact</FieldLabel>
                            <FieldValue>{user.profile?.emergencyContactName || "—"}</FieldValue>
                            <FieldLabel icon={<PhoneCall className="h-4 w-4" />}>Contact Phone</FieldLabel>
                            <FieldValue>{user.profile?.emergencyContactPhone || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<PhoneCall className="h-4 w-4" />}>Emergency Details</FieldLabel>
                            <FieldValue span={3}>{formatJson(user.profile?.emergencyContact)}</FieldValue>
                        </TableRow>

                        {/* Employment */}
                        <GroupHeader>Employment</GroupHeader>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Users className="h-4 w-4" />}>Team</FieldLabel>
                            <FieldValue>{user.team?.name || "—"}</FieldValue>
                            <FieldLabel icon={<UsersRound className="h-4 w-4" />}>Sub Team</FieldLabel>
                            <FieldValue>{user.subTeam?.name || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<CalendarPlus className="h-4 w-4" />}>Date of Joining</FieldLabel>
                            <FieldValue>{formatDate(user.profile?.dateOfJoining)}</FieldValue>
                            <FieldLabel icon={<CalendarClock className="h-4 w-4" />}>Date of Exit</FieldLabel>
                            <FieldValue>{formatDate(user.profile?.dateOfExit)}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Users className="h-4 w-4" />}>Gender</FieldLabel>
                            <FieldValue>{user.profile?.gender || "—"}</FieldValue>
                            <FieldLabel icon={<UsersRound className="h-4 w-4" />}>Marital Status</FieldLabel>
                            <FieldValue>{user.profile?.maritalStatus || "—"}</FieldValue>
                        </TableRow>

                        {/* Personal */}
                        <GroupHeader>Personal</GroupHeader>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<CalendarPlus className="h-4 w-4" />}>Date of Birth</FieldLabel>
                            <FieldValue>{formatDate(user.profile?.dateOfBirth)}</FieldValue>
                            <FieldLabel icon={<Globe className="h-4 w-4" />}>Nationality</FieldLabel>
                            <FieldValue>{user.profile?.nationality || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Droplet className="h-4 w-4" />}>Blood Group</FieldLabel>
                            <FieldValue>{user.profile?.bloodGroup || "—"}</FieldValue>
                            <FieldLabel icon={<CreditCard className="h-4 w-4" />}>Aadhaar Number</FieldLabel>
                            <FieldValue>{user.profile?.aadharNumber || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Ruler className="h-4 w-4" />}>PAN Number</FieldLabel>
                            <FieldValue>{user.profile?.panNumber || "—"}</FieldValue>
                            <FieldLabel icon={<Building className="h-4 w-4" />}>PF Number</FieldLabel>
                            <FieldValue>{user.profile?.pfNumber || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Facebook className="h-4 w-4" />}>LinkedIn</FieldLabel>
                            <FieldValue span={3}>{user.profile?.linkedinProfile || "—"}</FieldValue>
                        </TableRow>

                        {/* Addresses */}
                        <GroupHeader>Addresses</GroupHeader>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Home className="h-4 w-4" />}>Current Address</FieldLabel>
                            <FieldValue span={3}>{formatJson(user.profile?.currentAddress)}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<MapPin className="h-4 w-4" />}>Permanent Address</FieldLabel>
                            <FieldValue span={3}>{formatJson(user.profile?.permanentAddress)}</FieldValue>
                        </TableRow>

                        {/* Audit */}
                        <GroupHeader>Audit</GroupHeader>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<CalendarPlus className="h-4 w-4" />}>Created</FieldLabel>
                            <FieldValue>{formatDateTime(String(user.createdAt))}</FieldValue>
                            <FieldLabel icon={<CalendarClock className="h-4 w-4" />}>Updated</FieldLabel>
                            <FieldValue>{formatDateTime(String(user.updatedAt))}</FieldValue>
                        </TableRow>
                        

                        {/* Permissions */}
                        <GroupHeader
                            action={
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate(paths.master.users_permissions(userId))}
                                >
                                    <ShieldCheck className="mr-2 h-4 w-4" />
                                    Update Permissions
                                </Button>
                            }
                        >
                            {hasFullAccess ? "Permissions" : `Permissions (${effectiveCount})`}
                        </GroupHeader>
                        {permsLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="p-4">
                                    <Skeleton className="h-10 w-full" />
                                </TableCell>
                            </TableRow>
                        ) : hasFullAccess ? (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <FieldLabel icon={<ShieldCheck className="h-4 w-4" />}>Access</FieldLabel>
                                <FieldValue span={3}>
                                    <Badge variant="default">Full access — all modules and actions</Badge>
                                </FieldValue>
                            </TableRow>
                        ) : byModule.length === 0 ? (
                            <TableRow className="hover:bg-muted/30 transition-colors">
                                <FieldLabel icon={<ShieldCheck className="h-4 w-4" />}>Access</FieldLabel>
                                <FieldValue span={3}>— No permissions assigned</FieldValue>
                            </TableRow>
                        ) : (
                            permissionRows.map((pair, rowIndex) => (
                                <TableRow key={`row-${rowIndex}`} className="hover:bg-muted/30 transition-colors">
                                    {pair.map(entry =>
                                        entry ? (
                                            <Fragment key={entry.module}>
                                                <FieldLabel icon={<Users className="h-4 w-4" />}>{entry.module}</FieldLabel>
                                                <FieldValue>
                                                    <span className="flex flex-wrap gap-1">
                                                        {entry.actions.map(action => (
                                                            <Badge key={action} variant="secondary" className="capitalize">
                                                                {action}
                                                            </Badge>
                                                        ))}
                                                    </span>
                                                </FieldValue>
                                            </Fragment>
                                        ) : (
                                            <Fragment key={`empty-${rowIndex}`}>
                                                <TableCell className="w-1/4" />
                                                <TableCell />
                                            </Fragment>
                                        )
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}