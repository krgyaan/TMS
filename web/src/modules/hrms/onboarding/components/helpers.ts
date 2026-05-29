export const getInitials = (name: string) => {
  const parts = name.split(" ").filter(Boolean);
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};


export const formatDate = (d?:string | null) =>{
  if(!d) return '—';
  return new Date(d).toLocaleDateString("en-GB", {
    day : "2-digit",
    month: "short",
    year: "numeric"
  });
};


