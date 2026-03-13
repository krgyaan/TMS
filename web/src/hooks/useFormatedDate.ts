function parseLocalDate(date: string | Date) {
  if (date instanceof Date) return date;

  const [d, t] = date.split("T");
  const [year, month, day] = d.split("-").map(Number);
  const [hour = 0, minute = 0] = (t || "").split(":").map(Number);

  return new Date(year, month - 1, day, hour, minute);
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
