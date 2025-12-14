import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { FinancialYear } from '@/types/api.types'

type FinancialYearViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    financialYear: FinancialYear | null
}

export const FinancialYearViewModal = ({
    open,
    onOpenChange,
    financialYear
}: FinancialYearViewModalProps) => {
    if (!financialYear) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Financial Year Details</DialogTitle>
                    <DialogDescription>View financial year information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-sm font-medium mt-1">{financialYear.name}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={financialYear.status ? 'default' : 'secondary'}>
                                {financialYear.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {new Date(financialYear.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {new Date(financialYear.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
