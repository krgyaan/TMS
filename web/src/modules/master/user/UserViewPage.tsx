import { useState, type ReactNode } from "react";
import { ArrowLeft, Mail, Pencil, Phone, UserRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { paths } from "@/app/routes/paths";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/hooks/api/useUsers";

const DetailItem = ({ label, value }: { label: string; value?: ReactNode }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground/90">{value ?? "—"}</p>
    </div>
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
        <div className="space-y-6">
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
                    <div className="grid gap-6 md:grid-cols-2">
                        <DetailItem label="Username" value={`@${user.username ?? "—"}`} />
                        <DetailItem label="Employee Code" value={user.profile?.employeeCode || "—"} />
                        <DetailItem label="Team" value={user.team?.name || "—"} />
                        <DetailItem
                            label="Sub Team"
                            value={user.subTeam?.name || "—"}
                        />
                        <DetailItem label="Role" value={user.role?.name || "—"} />
                        <DetailItem
                            label="Email"
                            value={
                                <span className="inline-flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    {user.email}
                                </span>
                            }
                        />
                        <DetailItem
                            label="Alternate Email"
                            value={
                                user.profile?.altEmail ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        {user.profile.altEmail}
                                    </span>
                                ) : (
                                    "—"
                                )
                            }
                        />
                        <DetailItem
                            label="Mobile"
                            value={
                                user.mobile ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        {user.mobile}
                                    </span>
                                ) : (
                                    "—"
                                )
                            }
                        />
                        <DetailItem
                            label="Status"
                            value={<Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>}
                        />
                        <DetailItem label="Emergency Contact" value={user.profile?.emergencyContactName || "—"} />
                        <DetailItem label="Contact Phone" value={user.profile?.emergencyContactPhone || "—"} />
                        <DetailItem label="Timezone" value={user.profile?.timezone || "—"} />
                        <DetailItem label="Locale" value={user.profile?.locale || "—"} />
                        <DetailItem label="Created" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"} />
                        <DetailItem label="Updated" value={user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "—"} />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}