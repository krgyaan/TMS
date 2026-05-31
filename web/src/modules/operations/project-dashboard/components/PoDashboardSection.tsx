import { ShoppingCart } from "lucide-react";

interface PoDashboardSectionProps {
    woDetailId: number;
}

export function PoDashboardSection({ woDetailId: _woDetailId }: PoDashboardSectionProps) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Raised PO and WO</p>
            <p className="text-sm mt-2">Raised purchase order and work order details will be available here.</p>
        </div>
    );
}
