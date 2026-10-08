import { useState, type ReactNode } from "react";
import {
    ArrowLeft,
    CalendarClock,
    CalendarPlus,
    CircleDot,
    Clock,
    Hash,
    Languages,
    Mail,
    Pencil,
    Phone,
    PhoneCall,
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
import { useUser } from "@/hooks/api/useUsers";

const GroupHeader = ({ children }: { children: ReactNode }) => (
    <TableRow className="bg-muted/50">
        <TableCell colSpan={4} className="font-semibold text-sm">
            {children}
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

export default function UserViewPage() {
    const { id } = useParams<{ id: string }>();
    const userId = Number(id);
    const navigate = useNavigate();
    const { data: user, isLoading, error, refetch } = useUser(userId);
    const [retrying, setRetrying] = useState(false);

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
                <CardAction className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(paths.master.users)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to users
                    </Button>
                    <Button variant="outline" onClick={() => navigate(paths.master.users_edit(userId))}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {/* Account Information */}
                        <GroupHeader>Account Information</GroupHeader>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<UserRound className="h-4 w-4" />}>Username</FieldLabel>
                            <FieldValue>{`@${user.username ?? "—"}`}</FieldValue>
                            <FieldLabel icon={<Hash className="h-4 w-4" />}>Employee Code</FieldLabel>
                            <FieldValue>{user.profile?.employeeCode || "—"}</FieldValue>
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
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<CalendarPlus className="h-4 w-4" />}>Created</FieldLabel>
                            <FieldValue>{user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}</FieldValue>
                            <FieldLabel icon={<CalendarClock className="h-4 w-4" />}>Updated</FieldLabel>
                            <FieldValue>{user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "—"}</FieldValue>
                        </TableRow>

                        {/* Contact Information */}
                        <GroupHeader>Contact Information</GroupHeader>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Mail className="h-4 w-4" />}>Email</FieldLabel>
                            <FieldValue>{user.email}</FieldValue>
                            <FieldLabel icon={<Mail className="h-4 w-4" />}>Alternate Email</FieldLabel>
                            <FieldValue>{user.profile?.altEmail || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Phone className="h-4 w-4" />}>Mobile</FieldLabel>
                            <FieldValue>{user.mobile || "—"}</FieldValue>
                            <FieldLabel icon={<PhoneCall className="h-4 w-4" />}>Emergency Contact</FieldLabel>
                            <FieldValue>{user.profile?.emergencyContactName || "—"}</FieldValue>
                        </TableRow>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<PhoneCall className="h-4 w-4" />}>Contact Phone</FieldLabel>
                            <FieldValue span={3}>{user.profile?.emergencyContactPhone || "—"}</FieldValue>
                        </TableRow>

                        {/* Team Information */}
                        <GroupHeader>Team Information</GroupHeader>
                        <TableRow className="hover:bg-muted/30 transition-colors">
                            <FieldLabel icon={<Users className="h-4 w-4" />}>Team</FieldLabel>
                            <FieldValue>{user.team?.name || "—"}</FieldValue>
                            <FieldLabel icon={<UsersRound className="h-4 w-4" />}>Sub Team</FieldLabel>
                            <FieldValue>{user.subTeam?.name || "—"}</FieldValue>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}