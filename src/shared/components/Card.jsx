export function Card({ children, className = '', onClick, hover = false }) {
    return (
        <div
            onClick={onClick}
            className={`bg-bg-card rounded-xl border border-border shadow-sm transition-all duration-300 ${hover ? 'hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 cursor-pointer' : ''
                } ${onClick ? 'cursor-pointer' : ''} ${className}`}
        >
            {children}
        </div>
    )
}

export function CardHeader({ children, className = '', action }) {
    return (
        <div className={`flex items-center justify-between px-5 py-4 border-b border-border-light ${className}`}>
            <div>{children}</div>
            {action && <div>{action}</div>}
        </div>
    )
}

export function CardBody({ children, className = '' }) {
    return <div className={`p-5 ${className}`}>{children}</div>
}
