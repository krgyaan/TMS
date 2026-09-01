import { useAuth } from "@/contexts/AuthContext"; // reuse existing
import PwaRouter from "./router";
import Login from "@/modules/auth/login"; // reuse existing login page

export default function PwaApp() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login />;  // reuse existing login page
    }

    return <PwaRouter />;
}