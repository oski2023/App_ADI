export default function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
            {Icon && (
                <div className="w-16 h-16 rounded-2xl bg-bg-hover flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-text-muted" />
                </div>
            )}
            <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
            {description && <p className="text-sm text-text-secondary max-w-sm">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}
