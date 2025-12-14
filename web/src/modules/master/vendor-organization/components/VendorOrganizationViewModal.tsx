import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { VendorOrganization } from '@/types/api.types'

type VendorOrganizationViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    vendorOrganization: VendorOrganization | null
}

export const VendorOrganizationViewModal = ({
    open,
    onOpenChange,
    vendorOrganization
}: VendorOrganizationViewModalProps) => {
    if (!vendorOrganization) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Vendor Organization Details</DialogTitle>
                    <DialogDescription>View vendor organization information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-sm font-medium mt-1">{vendorOrganization.name}</p>
                    </div>
                    {vendorOrganization.address && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Address</label>
                            <p className="text-sm mt-1">{vendorOrganization.address}</p>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={vendorOrganization.status ? 'default' : 'secondary'}>
                                {vendorOrganization.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {new Date(vendorOrganization.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {new Date(vendorOrganization.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
