function parseLocalDate(date: string | Date) {
  if (date instanceof Date) return date;

  // Handle both ISO 'T' and SQL space separators
  const parts = date.split(/[T ]/);
  const d = parts[0];
  const t = parts[1] || "";

  const [year, month, day] = d.split("-").map(Number);
  
  // Extract hour and minute, ignoring seconds/milliseconds/offsets
  const timeParts = t.split(":");
  const hour = Number(timeParts[0]) || 0;
  const minute = Number(timeParts[1]) || 0;

  return new Date(year, month - 1, day, hour, minute);
}

export const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return '—';
    
    // Normalize string format for cross-browser compatibility (replace space with T)
    // and handle the +0530 offset correctly
    const d = typeof date === 'string' 
        ? new Date(date.includes(' ') && !date.includes('T') ? date.replace(' ', 'T') : date) 
        : date;
    
    if (isNaN(d.getTime())) return '—';

    // Force Asia/Kolkata (IST) to match DB (+05:30) and ensure consistency
    const tzOption = { timeZone: 'Asia/Kolkata' };

    const formattedDate = d.toLocaleDateString('en-GB', {
        ...tzOption,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');

    const formattedTime = d.toLocaleTimeString('en-IN', {
        ...tzOption,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    return `${formattedDate} ${formattedTime}`;
};

export const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '—';
    const d = typeof date === 'string' 
        ? new Date(date.includes(' ') && !date.includes('T') ? date.replace(' ', 'T') : date) 
        : date;
        
    if (isNaN(d.getTime())) return '—';

    return d.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
};
