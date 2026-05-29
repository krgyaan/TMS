import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "./helpers";

const AvatarComponent = ({ user }: { user: any }) => {
    return (
        <>
            <Avatar className="h-14 w-14 rounded-2xl ring-2 ring-border/50">
              {user?.profilePhoto && (
                <AvatarImage src={user.profilePhoto} alt={user.name} className="object-cover" />
              )}
              <AvatarFallback
                className="rounded-2xl text-lg font-bold"
              >
                {getInitials(user?.name || "User")}
              </AvatarFallback>
            </Avatar>
        </>
    );
};

export default AvatarComponent;
