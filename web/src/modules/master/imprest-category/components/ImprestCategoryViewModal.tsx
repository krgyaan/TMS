import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { ImprestCategory } from '@/types/api.types'

type ImprestCategoryViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    imprestCategory: ImprestCategory | null
}

export const ImprestCategoryViewModal = ({
    open,
    onOpenChange,
    imprestCategory
}: ImprestCategoryViewModalProps) => {
    if (!imprestCategory) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Imprest Category Details</DialogTitle>
                    <DialogDescription>View imprest category information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-sm font-medium mt-1">{imprestCategory.name}</p>
                    </div>
                    {imprestCategory.heading && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Heading</label>
                            <p className="text-sm mt-1">{imprestCategory.heading}</p>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={imprestCategory.status ? 'default' : 'secondary'}>
                                {imprestCategory.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {new Date(imprestCategory.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {new Date(imprestCategory.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
