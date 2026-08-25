import { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin, Locate } from 'lucide-react';
import type { LiveLocation } from '../helpers/leads.type';

// Custom marker icon (avoids default Leaflet icon asset issues)
const customIcon = L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#ffffff" stroke="#ef4444" stroke-width="1.5"/></svg>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
});

interface LocationPickerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialLat?: number;
    initialLng?: number;
    onConfirm: (location: LiveLocation) => void;
}

// Handler for map drag events + marker drag end
function MapEvents({
    onPositionChange,
}: {
    onPositionChange: (pos: [number, number]) => void;
}) {
    useMapEvents({
        dragend: (e) => {
            const center = (e.target as L.Map).getCenter();
            onPositionChange([center.lat, center.lng]);
        },
    });
    return null;
}

// Recenter the map when the marker position changes
function RecenterMap({ position }: { position: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(position, map.getZoom());
    }, [position, map]);
    return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`,
            {
                headers: {
                    'User-Agent': 'tms-web/1.0',
                },
            }
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data?.display_name || null;
    } catch {
        return null;
    }
}

export function LocationPickerModal({
    open,
    onOpenChange,
    initialLat,
    initialLng,
    onConfirm,
}: LocationPickerModalProps) {
    const [position, setPosition] = useState<[number, number]>([20.5937, 78.9629]); // default: India
    const [address, setAddress] = useState<string | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);

    // Initialize from detected position when opened
    useEffect(() => {
        if (open && initialLat != null && initialLng != null) {
            setPosition([initialLat, initialLng]);
        }
    }, [open, initialLat, initialLng]);

    // Reverse geocode whenever the pin moves
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setIsGeocoding(true);
        reverseGeocode(position[0], position[1]).then((addr) => {
            if (!cancelled) {
                setAddress(addr);
                setIsGeocoding(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [open, position]);

    const center = useMemo(() => position, [position]);

    const handleConfirm = () => {
        onConfirm({
            address,
            latitude: position[0],
            longitude: position[1],
            capturedAt: new Date().toISOString(),
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-red-600" />
                        Pinpoint Your Live Location
                    </DialogTitle>
                    <DialogDescription>
                        Drag the pin to the correct location, then confirm.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="h-[380px] w-full rounded-md overflow-hidden border">
                        <MapContainer
                            center={center}
                            zoom={15}
                            style={{ height: '100%', width: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker
                                position={position}
                                icon={customIcon}
                                draggable
                                eventHandlers={{
                                    dragend: (e) => {
                                        const marker = e.target as L.Marker;
                                        const latLng = marker.getLatLng();
                                        setPosition([latLng.lat, latLng.lng]);
                                    },
                                }}
                            />
                            <MapEvents onPositionChange={setPosition} />
                            <RecenterMap position={position} />
                        </MapContainer>
                    </div>

                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                        {isGeocoding ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Fetching address...
                            </div>
                        ) : (
                            <>
                                <p className="font-medium text-sm mb-1">Detected Address</p>
                                <p className="text-muted-foreground">
                                    {address || 'Could not resolve address. You can still confirm the coordinates.'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Lat: {position[0].toFixed(6)} · Lng: {position[1].toFixed(6)}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleConfirm} disabled={isGeocoding}>
                        <Locate className="mr-2 h-4 w-4" />
                        Confirm Location
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
