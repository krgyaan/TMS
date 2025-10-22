import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GoogleConnection {
    id: number;
    userId: number;
    providerEmail: string | null;
    avatar: string | null;
    scopes: string[];
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
    hasRefreshToken: boolean;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1";
const DEFAULT_USER_ID = Number(import.meta.env.VITE_DUMMY_USER_ID ?? 1);

const GoogleIntegration = () => {
    const [userId, setUserId] = useState<number>(Number.isNaN(DEFAULT_USER_ID) ? 1 : DEFAULT_USER_ID);
    const [connections, setConnections] = useState<GoogleConnection[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [disconnectingId, setDisconnectingId] = useState<number | null>(null);

    const canLoad = useMemo(() => Number.isInteger(userId) && userId > 0, [userId]);

    const fetchConnections = useCallback(async () => {
        if (!canLoad) {
            setConnections([]);
            return;
        }
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/integrations/google/connections?userId=${userId}`);
            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Failed to load Google connections");
            }
            const json = await response.json();
            setConnections(json.connections ?? []);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unexpected error while loading connections");
        } finally {
            setLoading(false);
        }
    }, [canLoad, userId]);

    useEffect(() => {
        fetchConnections();
    }, [fetchConnections]);

    const handleConnect = useCallback(async () => {
        if (!canLoad) {
            setError("Enter a valid numeric user id before connecting Google");
            return;
        }
        setConnecting(true);
        try {
            const response = await fetch(`${API_BASE}/integrations/google/auth-url?userId=${userId}`);
            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || "Failed to create Google auth URL");
            }
            const json = await response.json();
            if (!json.url) {
                throw new Error("Auth URL missing in response");
            }
            window.location.href = json.url as string;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unexpected error while starting Google OAuth");
        } finally {
            setConnecting(false);
        }
    }, [canLoad, userId]);

    const handleDisconnect = useCallback(
        async (connectionId: number) => {
            if (!canLoad) {
                setError("Enter a valid user id before disconnecting");
                return;
            }
            setDisconnectingId(connectionId);
            try {
                const response = await fetch(
                    `${API_BASE}/integrations/google/connections/${connectionId}?userId=${userId}`,
                    {
                        method: "DELETE",
                    },
                );
                if (!response.ok) {
                    const message = await response.text();
                    throw new Error(message || "Failed to disconnect Google account");
                }
                await fetchConnections();
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unexpected error while disconnecting Google account");
            } finally {
                setDisconnectingId(null);
            }
        },
        [canLoad, fetchConnections, userId],
    );

    return (
        <div className="p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Google Workspace Integration</CardTitle>
                    <CardDescription>
                        Link a Google account with Gmail, Drive, Docs and Sheets scopes using placeholder credentials. Replace the
                        dummy user id and OAuth client details once real auth is available.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="google-user-id">User ID</Label>
                        <Input
                            id="google-user-id"
                            type="number"
                            value={Number.isNaN(userId) ? "" : String(userId)}
                            onChange={(event) => setUserId(Number(event.target.value))}
                            min={1}
                        />
                        <p className="text-sm text-muted-foreground">
                            Temporary helper until the core auth flow exposes the signed-in user id.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleConnect} disabled={!canLoad || connecting}>
                            {connecting ? "Redirecting..." : "Connect Google Account"}
                        </Button>
                        <Button onClick={fetchConnections} variant="secondary" disabled={loading}>
                            {loading ? "Refreshing..." : "Refresh"}
                        </Button>
                    </div>

                    {error ? <p className="text-sm text-red-500">{error}</p> : null}

                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold">Linked Accounts</h2>
                        {!connections.length ? (
                            <p className="text-sm text-muted-foreground">No Google accounts linked yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {connections.map((connection) => (
                                    <div
                                        key={connection.id}
                                        className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between"
                                    >
                                        <div className="space-y-1">
                                            <p className="font-medium">
                                                {connection.providerEmail ?? `Google user ${connection.id}`}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Scopes: {connection.scopes.length ? connection.scopes.join(", ") : "—"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Expires at: {connection.expiresAt ? new Date(connection.expiresAt).toLocaleString() : "n/a"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Refresh token stored: {connection.hasRefreshToken ? "yes" : "no"}
                                            </p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => handleDisconnect(connection.id)}
                                            disabled={disconnectingId === connection.id}
                                        >
                                            {disconnectingId === connection.id ? "Disconnecting..." : "Disconnect"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default GoogleIntegration;