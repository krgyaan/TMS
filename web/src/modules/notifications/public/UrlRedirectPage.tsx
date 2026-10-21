import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { Loader2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { urlShortenerService } from "@/services/api";

const BRAND_LOGO = "https://tmsv2.volksenergie.in/ve_favicon.png";

type RedirectState = "loading" | "expired" | "error";

/**
 * Short-link landing page for `/n/:token` — resolves the token via the
 * API and immediately jumps to the full `/notify/<jwt>` page.
 */
export default function UrlRedirectPage() {
    const { token } = useParams<{ token: string }>();
    const [state, setState] = useState<RedirectState>("loading");

    useEffect(() => {
        if (!token) {
            setState("expired");
            return;
        }

        let cancelled = false;

        urlShortenerService
            .resolve(token)
            .then(({ url }) => {
                if (!cancelled) window.location.replace(url);
            })
            .catch(error => {
                if (cancelled) return;
                const gone = isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 404);
                setState(gone ? "expired" : "error");
            });

        return () => {
            cancelled = true;
        };
    }, [token]);

    let body;
    if (state === "loading") {
        body = (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    } else if (state === "expired") {
        body = (
            <Card className="p-10 flex flex-col items-center justify-center gap-3 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
                <h2 className="text-lg font-semibold">Link expired or invalid</h2>
                <p className="text-sm text-muted-foreground">This link is no longer valid. Please request an updated link from the TMS team.</p>
            </Card>
        );
    } else {
        body = (
            <Card className="p-10 flex flex-col items-center justify-center gap-3 text-center">
                <AlertTriangle className="h-10 w-10 text-amber-500" />
                <h2 className="text-lg font-semibold">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">We could not open this link right now. Please try again later.</p>
            </Card>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <header className="flex items-center justify-center bg-[linear-gradient(135deg,#110703,#3a322d)] px-4 py-4">
                <div className="w-full max-w-2xl">
                    <img src={BRAND_LOGO} alt="Volks Energie" className="h-10 sm:h-12 w-auto object-contain" />
                </div>
            </header>

            <main className="flex-1 w-full mx-auto max-w-xl px-4 py-6 sm:py-10">{body}</main>

            <footer className="bg-[linear-gradient(90deg,#ff6a00,#ff9500)] text-white py-3 text-center">
                <p className="text-xs sm:text-sm">&copy; {new Date().getFullYear()} Volks Energie. All Rights Reserved.</p>
            </footer>
        </div>
    );
}
