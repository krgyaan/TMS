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
import { RolesContent, type RolesContentHandle } from './RolesContent';

type RolesDrawerProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const RolesDrawer = ({ open, onOpenChange }: RolesDrawerProps) => {
    const contentRef = useRef<RolesContentHandle>(null);

    const handleAddClick = () => {
        contentRef.current?.openAddModal();
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[600px] sm:max-w-2xl flex flex-col">
                <SheetHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle>Roles</SheetTitle>
                            <SheetDescription>Manage user roles and permissions</SheetDescription>
                            <Button variant="default" onClick={handleAddClick} className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Role
                            </Button>
                        </div>
                    </div>
                </SheetHeader>
                <div className="mt-2 flex-1 min-h-0 overflow-hidden">
                    <RolesContent ref={contentRef} showHeader={false} />
                </div>
            </SheetContent>
        </Sheet>
    );
};
