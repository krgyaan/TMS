import { defineConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    root: ".",
    appType: "spa",
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            injectRegister: "auto",
            includeAssets: ["favicon.ico", "pwa-icons/*.png", "pwa-icons/wp.jpg"],
            manifest: {
                name: "TMS Field App",
                short_name: "TMS",
                description: "TMS CRM and Imprest",
                theme_color: "#ffffff",
                background_color: "#ffffff",
                display: "standalone",
                orientation: "portrait",
                scope: "/",
                start_url: "/",
                icons: [
                    {
                        src: "pwa-icons/icon-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "pwa-icons/icon-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "pwa-icons/icon-maskable-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable",
                    },
                ],
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
                // The PWA HTML entry is emitted as index.pwa.html; it is the
                // precached app shell, so route all in-app navigations to it.
                navigateFallback: "index.pwa.html",
                navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
                runtimeCaching: [
                    // NETWORK-FIRST for API data: fresh online, cached offline.
                    // Origin-agnostic so it works in dev (localhost proxy) and prod (VITE_API_URL).
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "tms-api-cache",
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24,
                            },
                            networkTimeoutSeconds: 10,
                        },
                    },
                    // CACHE-FIRST for uploaded files (fast, reuse existing downloads).
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith("/uploads/"),
                        handler: "CacheFirst",
                        options: {
                            cacheName: "tms-uploads-cache",
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24 * 7,
                            },
                        },
                    },
                ],
            },
        }),
    ],
    build: {
        outDir: "dist-pwa",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: path.resolve("index.pwa.html"),
            },
        },
    },
    preview: {
        port: 4173,
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
                secure: false,
            },
            "/uploads": {
                target: "http://localhost:3000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve("./src"),
        },
    },
    server: {
        port: 5174,
        open: "/index.pwa.html",
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
                secure: false,
            },
            "/uploads": {
                target: "http://localhost:3000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
