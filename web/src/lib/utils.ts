import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parses a file path value which could be a JSON stringified array,
 * a comma-separated string, or a single path string.
 * This handles both legacy single strings and modern JSON arrays.
 */
export function parseFileArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string") {
    const trimmed = val.trim();
    // Check if it's a JSON array
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch {
        // Fallback to treat as plain string if JSON parse fails
      }
    }
    // Handle comma-separated or single path
    return trimmed.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}
