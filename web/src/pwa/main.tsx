window.addEventListener("vite:preloadError", () => {
    window.location.reload();
});

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/react-query";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { Toaster } from "sonner";
import PwaApp from "./App";
import "../index.css";

// 👈 Add this - same as main App.tsx
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="system" storageKey="tms-ui-theme">
                <BrowserRouter>
                    <AuthProvider>
                        <PwaApp />
                    </AuthProvider>
                    <Toaster position="top-right" richColors />
                </BrowserRouter>
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>
);