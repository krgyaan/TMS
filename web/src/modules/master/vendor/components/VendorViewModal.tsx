import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Vendor } from '@/types/api.types'
import { Users, Mail, MapPin, Building2 } from 'lucide-react'

type VendorViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    vendor: Vendor | null
}

export const VendorViewModal = ({ open, onOpenChange, vendor }: VendorViewModalProps) => {
    if (!vendor) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        {vendor.name}
                    </DialogTitle>
                    <DialogDescription>Vendor details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    {vendor.organization && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Organization</label>
                            <div className="flex items-center gap-2 mt-1">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium">{vendor.organization.name}</p>
                            </div>
                        </div>
                    )}
                    {vendor.email && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Email</label>
                            <div className="flex items-center gap-2 mt-1">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium">{vendor.email}</p>
                            </div>
                        </div>
                    )}
                    {vendor.address && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Address</label>
                            <div className="flex items-start gap-2 mt-1">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <p className="text-sm font-medium">{vendor.address}</p>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={vendor.status ? 'default' : 'secondary'}>
                                {vendor.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : '—'}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {vendor.updatedAt ? new Date(vendor.updatedAt).toLocaleDateString() : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
