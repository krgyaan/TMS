import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Item } from '@/types/api.types'
import { Package } from 'lucide-react'

type ItemViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: Item | null
}

export const ItemViewModal = ({ open, onOpenChange, item }: ItemViewModalProps) => {
    if (!item) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {item.name}
                    </DialogTitle>
                    <DialogDescription>Item details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Team</label>
                        <p className="text-sm font-medium mt-1">{item.team?.name || '—'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Heading</label>
                        <p className="text-sm font-medium mt-1">{item.heading?.name || '—'}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={item.status ? 'default' : 'secondary'}>
                                {item.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
