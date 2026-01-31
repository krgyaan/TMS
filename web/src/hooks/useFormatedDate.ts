export const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return '—';
    const d = new Date(date);
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
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).replace(/\//g, '-');
};
