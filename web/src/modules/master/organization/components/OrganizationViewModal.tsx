import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Organization } from '@/types/api.types'
import { Building2 } from 'lucide-react'

type OrganizationViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    organization: Organization | null
}

export const OrganizationViewModal = ({
    open,
    onOpenChange,
    organization,
}: OrganizationViewModalProps) => {
    if (!organization) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {organization.name}
                    </DialogTitle>
                    <DialogDescription>Organization details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    {organization.acronym && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Acronym</label>
                            <p className="text-sm font-medium mt-1">{organization.acronym}</p>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Industry</label>
                        <p className="text-sm font-medium mt-1">
                            {organization.industry?.name || '—'}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={organization.status ? 'default' : 'secondary'}>
                                {organization.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {organization.createdAt
                                    ? new Date(organization.createdAt).toLocaleDateString()
                                    : '—'}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {organization.updatedAt
                                    ? new Date(organization.updatedAt).toLocaleDateString()
                                    : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
