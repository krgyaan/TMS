const SUFFIX_MAP: Record<string, string> = {
    private: "Pvt",
    pvt: "Pvt",
    limited: "Ltd",
    ltd: "Ltd",
};

const isAcronym = (token: string): boolean => {
    const core = token.replace(/[^A-Za-z0-9]/g, "");
    return core.length >= 2 && core === core.toUpperCase() && /[A-Z]/.test(core);
};

const formatToken = (token: string, isFirstWord: boolean): string => {
    if (!token) return token;
    if (isFirstWord && isAcronym(token)) return token;

    const titleCased = token.toLowerCase().replace(/(^|[-'/])([a-z])/g, (_, prefix: string, char: string) => prefix + char.toUpperCase());

    const match = titleCased.match(/^([A-Za-z]+)(\.?)$/);
    if (match) {
        const mapped = SUFFIX_MAP[match[1].toLowerCase()];
        if (mapped) return mapped;
    }

    return titleCased;
};

/** Title Case a vendor name, keeping a leading acronym and normalizing Pvt/Ltd. */
export const formatVendorName = (name: string | null | undefined): string => {
    const trimmed = (name ?? "").trim();
    if (!trimmed) return "";

    let wordIndex = 0;
    return trimmed
        .split(/(\s+)/)
        .map(part => {
            if (!part || /^\s+$/.test(part)) return part;
            const formatted = formatToken(part, wordIndex === 0);
            wordIndex += 1;
            return formatted;
        })
        .join("");
};
