import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Status } from '@/types/api.types'

type StatusViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    status: Status | null
}

export const StatusViewModal = ({ open, onOpenChange, status }: StatusViewModalProps) => {
    if (!status) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{status.name}</DialogTitle>
                    <DialogDescription>Tender status details and metadata</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={status.status ? 'default' : 'secondary'}>
                                {status.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Tender Category</label>
                        <p className="text-sm font-medium mt-1">{status.tenderCategory || '—'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {status.createdAt ? new Date(status.createdAt).toLocaleDateString() : '—'}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {status.updatedAt ? new Date(status.updatedAt).toLocaleDateString() : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
