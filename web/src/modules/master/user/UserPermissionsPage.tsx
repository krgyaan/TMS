import { useNavigate, useParams } from "react-router-dom";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { paths } from "@/app/routes/paths";
import { useUser } from "@/hooks/api/useUsers";
import { useRoles } from "@/hooks/api/useRoles";
import { usePermissions } from "@/hooks/api/usePermissions";
import { useUserRole } from "@/hooks/api/useUserRoles";
import { useUserPermissions } from "@/hooks/api/useUserPermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import UserPermissionsForm from "./components/UserPermissionsForm";

export default function UserPermissionsPage() {
    const { id } = useParams<{ id: string }>();
    const userId = Number(id);
    const navigate = useNavigate();
    const { data: user, isLoading: userLoading, error: userError } = useUser(userId);
    const { data: roles = [] } = useRoles();
    const { data: allPermissions = [] } = usePermissions();
    const { data: userRole, isLoading: roleLoading } = useUserRole(userId);
    const { data: userPermissionsData, isLoading: permsLoading } = useUserPermissions(userId);

    const loading = userLoading || roleLoading || permsLoading;

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

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-96 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (userError || !user) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>User Permissions</CardTitle>
                    <CardDescription>Manage role and permissions</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>Failed to load user. {userError?.message}</AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <div>
                        <CardTitle>{user.name} — Permissions</CardTitle>
                        <CardDescription>{user.email}</CardDescription>
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
                <UserPermissionsForm
                    userId={userId}
                    roles={roles}
                    allPermissions={allPermissions}
                    userRole={userRole}
                    userPermissionsData={userPermissionsData}
                />
            </CardContent>
        </Card>
    );
}
