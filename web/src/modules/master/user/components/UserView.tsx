import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, UserRound } from "lucide-react";
import type { User } from "@/types/api.types";

const DetailItem = ({ label, value }: { label: string; value?: ReactNode }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground/90">{value ?? "—"}</p>
    </div>
);

interface UserViewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
}

export default function UserView({ open, onOpenChange, user }: UserViewProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserRound className="h-5 w-5" />
                        {user?.name}
                    </DialogTitle>
                    <DialogDescription>User account details</DialogDescription>
                </DialogHeader>
                {user ? (
                    <div className="grid gap-6 md:grid-cols-2">
                        <DetailItem label="Username" value={`@${user.username ?? "—"}`} />
                        <DetailItem label="Employee Code" value={user.profile?.employeeCode || "—"} />
                        <DetailItem label="Team" value={user.team?.name || "—"} />
                        <DetailItem
                            label="Email"
                            value={
                                <span className="inline-flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    {user.email}
                                </span>
                            }
                        />
                        <DetailItem
                            label="Alternate Email"
                            value={
                                user.profile?.altEmail ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        {user.profile.altEmail}
                                    </span>
                                ) : (
                                    "—"
                                )
                            }
                        />
                        <DetailItem
                            label="Mobile"
                            value={
                                user.mobile ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        {user.mobile}
                                    </span>
                                ) : (
                                    "—"
                                )
                            }
                        />
                        <DetailItem
                            label="Status"
                            value={<Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge>}
                        />
                        <DetailItem label="Emergency Contact" value={user.profile?.emergencyContactName || "—"} />
                        <DetailItem label="Contact Phone" value={user.profile?.emergencyContactPhone || "—"} />
                        <DetailItem label="Timezone" value={user.profile?.timezone || "—"} />
                        <DetailItem label="Locale" value={user.profile?.locale || "—"} />
                        <DetailItem label="Created" value={user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"} />
                        <DetailItem label="Updated" value={user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "—"} />
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
