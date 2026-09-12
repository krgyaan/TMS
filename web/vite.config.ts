import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            injectRegister: "auto",
            includeAssets: ["ve_favicon.png", "pwa-icons/*.png"],
            manifest: {
                name: "TMS App",
                short_name: "TMS",
                description: "Tender Management System",
                theme_color: "#ffffff",
                background_color: "#ffffff",
                display: "standalone",
                orientation: "portrait",
                scope: "/",
                start_url: "/",
                id: "/",
                related_applications: [{ platform: "webapp", url: "/manifest.webmanifest" }],
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
                // Lean precache: only the shell, and only for production
                // builds. Route chunks are cached at runtime as users visit
                // them (CacheFirst for hashed assets). Empty in dev — the
                // dev service worker has nothing to precache.
                globPatterns: command === "build" ? ["index.html", "manifest.webmanifest"] : [],
                navigateFallback: "/index.html",
                navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
                runtimeCaching: [
                    // Hashed, immutable bundles — safe to cache-first.
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith("/assets/"),
                        handler: "CacheFirst",
                        options: {
                            cacheName: "tms-assets",
                            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                        },
                    },
                    // Origin-agnostic, same as the previous field-app SW:
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "tms-api-cache",
                            networkTimeoutSeconds: 10,
                            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
                        },
                    },
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith("/uploads/"),
                        handler: "CacheFirst",
                        options: {
                            cacheName: "tms-uploads-cache",
                            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
                        },
                    },
                ],
            },
            devOptions: {
                enabled: true,
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
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
}));
