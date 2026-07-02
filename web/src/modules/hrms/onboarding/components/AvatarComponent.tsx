import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "./helpers";
import { cn } from "@/lib/utils";

interface AvatarComponentProps {
    user?: {
        name?: string;
        userName?: string;
        profilePhoto?: string | null;
    } | null;
    className?: string;
    fallbackClassName?: string;
}

const AvatarComponent = ({ user, className, fallbackClassName }: AvatarComponentProps) => {
    const displayName = user?.name || user?.userName || "User";

    return (
        <Avatar className={cn("h-14 w-14 rounded-2xl ring-2 ring-border/50", className)}>
            {user?.profilePhoto && (
                <AvatarImage src={user.profilePhoto} alt={displayName} className="object-cover" />
            )}
            <AvatarFallback className={cn("rounded-2xl text-lg font-bold", fallbackClassName)}>
                {getInitials(displayName)}
            </AvatarFallback>
        </Avatar>
    );
};

export default AvatarComponent;
