import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { FollowupCategory } from '@/types/api.types'

type FollowupCategoryViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    followupCategory: FollowupCategory | null
}

export const FollowupCategoryViewModal = ({
    open,
    onOpenChange,
    followupCategory
}: FollowupCategoryViewModalProps) => {
    if (!followupCategory) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Followup Category Details</DialogTitle>
                    <DialogDescription>View followup category information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-sm font-medium mt-1">{followupCategory.name}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={followupCategory.status ? 'default' : 'secondary'}>
                                {followupCategory.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {new Date(followupCategory.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {new Date(followupCategory.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
