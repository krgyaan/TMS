import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { Location } from '@/types/api.types'
import { MapPin, Globe, Compass } from 'lucide-react'

type LocationViewModalProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    location: Location | null
}

export const LocationViewModal = ({ open, onOpenChange, location }: LocationViewModalProps) => {
    if (!location) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {location.name}
                    </DialogTitle>
                    <DialogDescription>Location details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                    {location.acronym && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Acronym</label>
                            <p className="text-sm font-medium mt-1">{location.acronym}</p>
                        </div>
                    )}
                    {location.state && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">State</label>
                            <div className="flex items-center gap-2 mt-1">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium">{location.state}</p>
                            </div>
                        </div>
                    )}
                    {location.region && (
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Region</label>
                            <div className="flex items-center gap-2 mt-1">
                                <Compass className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium">{location.region}</p>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                            <Badge variant={location.status ? 'default' : 'secondary'}>
                                {location.status ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Created At</label>
                            <p className="text-sm mt-1">
                                {location.createdAt ? new Date(location.createdAt).toLocaleDateString() : '—'}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                            <p className="text-sm mt-1">
                                {location.updatedAt ? new Date(location.updatedAt).toLocaleDateString() : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
