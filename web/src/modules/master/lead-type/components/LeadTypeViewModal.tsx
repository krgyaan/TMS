import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { LeadType } from '@/types/api.types'

type LeadTypeViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    leadType: LeadType | null
}

export const LeadTypeViewModal = ({
    open,
    onOpenChange,
    leadType
}: LeadTypeViewModalProps) => {
    if (!leadType) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Lead Type Details</DialogTitle>
                    <DialogDescription>View lead type information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-sm font-medium mt-1">{leadType.name}</p>
                    </div>
                    {leadType.description && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Description</label>
                            <p className="text-sm mt-1">{leadType.description}</p>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={leadType.status ? 'default' : 'secondary'}>
                                {leadType.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {new Date(leadType.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {new Date(leadType.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
