export const buildFileUrl = (value?: unknown): string => {
    if (typeof value !== "string" || !value) return "";

    if (value.startsWith("http")) return value;

    if (value.includes("/")) {
        if (value.startsWith("follow-ups/")) return `/uploads/accounts/${value}`;
        return `/uploads/${value}`;
    }

    return `/uploads/accounts/follow-ups/${value}`;
};

export const getFileName = (url: string): string => {
    const parts = url.split("/");
    return parts[parts.length - 1] || url;
};

export const isImageFile = (url: string): boolean =>
    ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(url.split(".").pop()?.toLowerCase() ?? "");
