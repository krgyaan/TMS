const RELOAD_GUARD_KEY = "tms:preload-reload-guard";
const RELOAD_GUARD_WINDOW_MS = 10_000;
const RELOAD_BUTTON_ID = "tms-reload-btn";

let resetting = false;

async function resetServiceWorkerAndReload() {
    if (resetting) return;
    resetting = true;
    try {
        const registration = await navigator.serviceWorker?.getRegistration();
        await registration?.unregister();
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    } catch {
        // Best effort — proceed to reload regardless.
    }
    window.location.reload();
}

function showChunkLoadError() {
    const existing = document.getElementById(RELOAD_BUTTON_ID)?.closest("[data-tms-error-overlay]");
    if (existing) return;

    const overlay = document.createElement("div");
    overlay.setAttribute("data-tms-error-overlay", "true");
    overlay.innerHTML = `
        <div style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:#fff;color:#111;font-family:system-ui,-apple-system,sans-serif">
            <div style="text-align:center;max-width:400px;padding:24px">
                <h2 style="margin:0 0 8px;font-size:18px;font-weight:600">App update failed to load</h2>
                <p style="margin:0 0 16px;font-size:14px;color:#555">A required update could not be loaded. Refresh the page to continue.</p>
                <button id="${RELOAD_BUTTON_ID}" style="padding:8px 16px;border-radius:6px;border:1px solid #ccc;background:#111;color:#fff;cursor:pointer">Refresh</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(`#${RELOAD_BUTTON_ID}`)?.addEventListener("click", () => {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
        resetServiceWorkerAndReload();
    });
}

window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();

    const lastReloadAt = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? "0");
    const now = Date.now();

    if (now - lastReloadAt < RELOAD_GUARD_WINDOW_MS) {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
        showChunkLoadError();
        return;
    }

    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    resetServiceWorkerAndReload();
});

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/react-query";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import { AuthProvider } from "./app/providers/AuthProvider";
import { Toaster } from "sonner";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="system" storageKey="tms-ui-theme">
                <BrowserRouter>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                    <Toaster position="top-right" richColors />
                    <ReactQueryDevtools initialIsOpen={false} />
                </BrowserRouter>
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>
);
