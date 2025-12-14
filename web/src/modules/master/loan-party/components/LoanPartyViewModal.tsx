import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { LoanParty } from '@/types/api.types'

type LoanPartyViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    loanParty: LoanParty | null
}

export const LoanPartyViewModal = ({
    open,
    onOpenChange,
    loanParty
}: LoanPartyViewModalProps) => {
    if (!loanParty) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Loan Party Details</DialogTitle>
                    <DialogDescription>View loan party information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-sm font-medium mt-1">{loanParty.name}</p>
                    </div>
                    {loanParty.description && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Description</label>
                            <p className="text-sm mt-1">{loanParty.description}</p>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={loanParty.status ? 'default' : 'secondary'}>
                                {loanParty.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {new Date(loanParty.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {new Date(loanParty.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
