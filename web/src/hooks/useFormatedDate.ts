function parseLocalDate(date: string | Date) {
  if (date instanceof Date) return date;
  if (!date) return new Date();

  const trimmed = String(date).trim();

  // 1. Handle date-only format "YYYY-MM-DD"
  // We parse this manually to ensure it's treated as local midnight, 
  // avoiding the default browser behavior of treating it as UTC midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // 2. For everything else (ISO, space-separated, etc.), use the native Date constructor.
  // We normalize by replacing spaces with 'T' and removing extra spaces to ensure
  // the browser can correctly identify and respect any timezone offsets (+HH:mm or Z).
  const normalized = trimmed
    .replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T') // Replace space between date and time
    .replace(/ ([+-]\d{2}:?\d{2})$/, '$1');  // Remove space before timezone offset

  const d = new Date(normalized);
  
  // Fallback to original string if normalization failed
  return isNaN(d.getTime()) ? new Date(date) : d;
}

export const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return '—';
    const d = parseLocalDate(date);
    const formattedDate = d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
    const formattedTime = d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
    return `${formattedDate} ${formattedTime}`;
};

export const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '—';
    const d = parseLocalDate(date);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
};
