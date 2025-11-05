import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { paths } from "@/app/routes/paths";

const GoogleIntegrationStatus = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const status = params.get("status") ?? "success";
    const errorMessage = params.get("error");
    const connectionId = params.get("connectionId");
    const userId = params.get("userId");

    const success = status === "success";

    const heading = success ? "Google account linked" : "Google connection failed";
    const description = success
        ? "The Google account is now linked. You can close this window or return to the integrations page."
        : errorMessage ?? "Google rejected the request. Please try again.";

    const handleBack = () => {
        navigate(paths.integrations.google, { replace: true });
    };

    const handleClose = () => {
        if (window.opener) {
            window.close();
        } else {
            navigate(paths.integrations.google, { replace: true });
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
            <Card className="max-w-lg">
                <CardHeader>
                    <CardTitle>{heading}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {success ? (
                        <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                            <p>Connection id: {connectionId ?? "unknown"}</p>
                            <p>User id: {userId ?? "unknown"}</p>
                        </div>
                    ) : null}
                    {!success && errorMessage ? (
                        <p className="text-sm text-red-500">{errorMessage}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleBack}>Back to integrations</Button>
                        <Button variant="outline" onClick={handleClose}>
                            Close window
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default GoogleIntegrationStatus;
