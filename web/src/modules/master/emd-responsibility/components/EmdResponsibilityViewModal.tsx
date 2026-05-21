import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useGetTeamMembers } from "@/hooks/api/useUsers";
import type { EmdResponsibility } from '@/types/api.types'

type EmdResponsibilityViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    emdResponsibility: EmdResponsibility | null
}

export const EmdResponsibilityViewModal = ({
    open,
    onOpenChange,
    emdResponsibility
}: EmdResponsibilityViewModalProps) => {
    const { data: accountsUsers = [] } = useGetTeamMembers(5);
    const assignedUser = emdResponsibility?.assignedUserId
        ? accountsUsers.find(u => u.id === emdResponsibility.assignedUserId)
        : undefined;

    if (!emdResponsibility) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>EMD Responsibility Details</DialogTitle>
                    <DialogDescription>View EMD responsibility information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-sm font-medium mt-1">{emdResponsibility.name}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Instrument Type</label>
                        <p className="text-sm font-medium mt-1">{emdResponsibility.instrumentType || <span className="text-muted-foreground">—</span>}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Assigned User</label>
                        {assignedUser ? (
                            <div className="flex flex-col mt-1">
                                <span className="text-sm font-medium">{assignedUser.name}</span>
                                <span className="text-xs text-muted-foreground">{assignedUser.email}</span>
                            </div>
                        ) : (
                            <p className="text-sm font-medium mt-1 text-muted-foreground">—</p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {new Date(emdResponsibility.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {new Date(emdResponsibility.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
