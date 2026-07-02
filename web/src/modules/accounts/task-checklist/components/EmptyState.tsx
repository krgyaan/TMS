// ==================== Empty State Component ====================
interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            {icon && <div className="mb-4">{icon}</div>}
            <h3 className="text-lg font-medium text-center">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground text-center mt-1 max-w-sm">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
};


export default EmptyState;