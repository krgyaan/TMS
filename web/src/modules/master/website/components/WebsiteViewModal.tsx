import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import type { Website } from '@/types/api.types'

type WebsiteViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    website: Website | null
}

export const WebsiteViewModal = ({
    open,
    onOpenChange,
    website
}: WebsiteViewModalProps) => {
    if (!website) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Website Details</DialogTitle>
                    <DialogDescription>View website information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-sm font-medium mt-1">{website.name}</p>
                    </div>
                    {website.url && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">URL</label>
                            <div className="mt-1">
                                <a
                                    href={website.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                >
                                    {website.url}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={website.status ? 'default' : 'secondary'}>
                                {website.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {new Date(website.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {new Date(website.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
