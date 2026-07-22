import type { LearnerProgress } from "@/services/api/training.service";

export const getServerOrigin = () => {
    const base = import.meta.env.VITE_API_URL as string | undefined;
    if (base) {
        try { return new URL(base).origin; } catch { /* fallback */ }
    }
    return "http://localhost:3000";
};

export const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
};

export const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
        "Onboarding": "bg-blue-500/10 text-blue-600 border-blue-500/20",
        "Compliance": "bg-purple-500/10 text-purple-600 border-purple-500/20",
        "Tendering": "bg-orange-500/10 text-orange-600 border-orange-500/20",
        "Operations": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    };
    return colors[category] || "bg-gray-500/10 text-gray-600 border-gray-500/20";
};

export const getUserStats = (items: LearnerProgress[]) => {
    const total = items.length;
    const completed = items.filter(i => i.status === "Completed").length;
    const avgProgress = Math.round(items.reduce((acc, i) => acc + i.progress, 0) / total);
    return { total, completed, avgProgress };
};

export const formatDuration = (durationSeconds: number | null): string => {
    if (!durationSeconds) return "0m";
    const mins = Math.floor(durationSeconds / 60);
    const secs = durationSeconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

export const formatFileSize = (filesize: number | null): string => {
    if (!filesize) return "0 MB";
    const mb = (filesize / (1024 * 1024)).toFixed(1);
    return `${mb} MB`;
};
