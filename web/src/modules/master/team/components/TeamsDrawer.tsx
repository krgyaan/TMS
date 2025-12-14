import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Plus } from 'lucide-react';
import { TeamsContent, type TeamsContentHandle } from './TeamsContent';

type TeamsDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const TeamsDrawer = ({ open, onOpenChange }: TeamsDrawerProps) => {
    const contentRef = useRef<TeamsContentHandle>(null);

    const handleAddClick = () => {
        contentRef.current?.openAddModal();
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[600px] sm:max-w-2xl flex flex-col">
                <SheetHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle>Teams</SheetTitle>
                            <SheetDescription>Manage organizational teams</SheetDescription>
                            <Button variant="default" onClick={handleAddClick} className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Team
                            </Button>
                        </div>
                    </div>
                </SheetHeader>
                <div className="mt-2 flex-1 min-h-0 overflow-hidden">
                    <TeamsContent ref={contentRef} showHeader={false} />
                </div>
            </SheetContent>
        </Sheet>
    );
};
