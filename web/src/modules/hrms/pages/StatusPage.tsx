import { useNavigate } from "react-router-dom";
import { Clock, XCircle, RefreshCcw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser, useLogout } from "@/hooks/api/useAuth";
import { paths } from "@/app/routes/paths";

export default function StatusPage() {
    const navigate = useNavigate();
    const { data: user, isLoading } = useCurrentUser();
    const logout = useLogout();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const status = user?.profile?.employeeStatus;
    const rejectionReason = user?.profile?.rejectionReason;

    const isPending = status === "Pending Approval";
    const isRejected = status === "Rejected";

    return (
        <div className="container max-w-2xl mx-auto py-12 px-4">
            <Card className="border-2">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        {isPending ? (
                            <Clock className="h-10 w-10 text-yellow-500" />
                        ) : isRejected ? (
                            <XCircle className="h-10 w-10 text-destructive" />
                        ) : (
                            <Clock className="h-10 w-10 text-muted-foreground" />
                        )}
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {isPending ? "Application Pending Approval" : isRejected ? "Application Rejected" : "Application Status"}
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        {isPending
                            ? "Your registration has been submitted and is currently being reviewed by an administrator."
                            : isRejected
                                ? "Unfortunately, your application for registration was not approved."
                                : "We could not determine your application status."
                        }
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {isRejected && rejectionReason && (
                        <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
                            <h4 className="font-semibold text-destructive mb-1">Reason for Rejection:</h4>
                            <p className="text-sm opacity-90">{rejectionReason}</p>
                        </div>
                    )}

                    <div className="text-sm text-balance text-center text-muted-foreground">
                        {isPending ? (
                            "You will be notified once your account is activated. Please check back later."
                        ) : isRejected ? (
                            "Please review the reason above and resubmit your application with the corrected information."
                        ) : (
                            "Please contact support if you believe this is an error."
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center border-t pt-6">
                    {isRejected && (
                        <Button
                            className="w-full sm:w-auto"
                            onClick={() => navigate(paths.hrms.registration)}
                        >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Resubmit Application
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={() => logout.mutate()}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
