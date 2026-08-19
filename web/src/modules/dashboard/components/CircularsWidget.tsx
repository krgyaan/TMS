import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActiveCirculars } from "@/hooks/api/useCirculars";
import { CircularViewModal } from "@/modules/master/circulars/components/CircularViewModal";
import type { Circular } from "@/types/api.types";
import { Bell, FileText, Loader2, Megaphone } from "lucide-react";
import { useState } from "react";

export const CircularsWidget = () => {
    const { data: activeCirculars, isLoading, error } = useActiveCirculars();
    const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);

    if (isLoading) {
        return (
            <Card className="border border-border/50 shadow-lg bg-card/60 backdrop-blur-xl rounded-2xl p-6">
                <div className="flex flex-col items-center justify-center py-6 space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Loading notice board announcements...</p>
                </div>
            </Card>
        );
    }

    if (error) {
        return null;
    }

    const notices = activeCirculars || [];

    return (
        <Card className="border border-border/50 shadow-xl bg-card/60 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5">
            <CardHeader className="border-b border-border/40">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary/10 text-primary rounded-xl dark:bg-primary/20 dark:text-primary hidden lg:block">
                            <Megaphone className="h-4 w-4" />
                        </div>
                        <div className="space-y-0.5">
                            <CardTitle className="font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                                Notice Board & Circulars
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">Latest official updates and company policies</p>
                        </div>
                    </div>
                    {notices.length > 0 && (
                        <Badge variant="secondary" className="font-mono bg-primary/10 text-primary border-none rounded-full hidden lg:block">
                            {notices.length}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {notices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                        <Bell className="h-10 w-10 text-muted-foreground/40 mb-2" />
                        <p className="text-sm font-semibold text-foreground">All caught up!</p>
                        <p className="text-xs text-muted-foreground max-w-xs mt-1">No active announcements or circular notices currently published.</p>
                    </div>
                ) : (
                    <div className="max-h-[350px] overflow-y-auto p-3">
                        {notices.map((circular) => (
                            <div
                                key={circular.id}
                                onClick={() => setSelectedCircular(circular)}
                                className="p-2 bg-muted/10 hover:bg-muted/20 border border-border/10 hover:border-primary/20 rounded-xl cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.01]"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="flex p-2 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                        <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate" title={circular.title}>
                                            {circular.title}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <CircularViewModal
                open={!!selectedCircular}
                onOpenChange={(open) => !open && setSelectedCircular(null)}
                circular={selectedCircular}
            />
        </Card>
    );
};