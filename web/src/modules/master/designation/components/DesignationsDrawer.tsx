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
import { DesignationsContent, type DesignationsContentHandle } from './DesignationsContent';

type DesignationsDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const DesignationsDrawer = ({ open, onOpenChange }: DesignationsDrawerProps) => {
    const contentRef = useRef<DesignationsContentHandle>(null);

    const handleAddClick = () => {
        contentRef.current?.openAddModal();
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[600px] sm:max-w-2xl flex flex-col">
                <SheetHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle>Designations</SheetTitle>
                            <SheetDescription>Manage designations for user management</SheetDescription>
                            <Button variant="default" onClick={handleAddClick} className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Designation
                            </Button>
                        </div>
                    </div>
                </SheetHeader>
                <div className="mt-2 flex-1 min-h-0 overflow-hidden">
                    <DesignationsContent ref={contentRef} showHeader={false} />
                </div>
            </SheetContent>
        </Sheet>
    );
};
