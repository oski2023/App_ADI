const variants = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-secondary/10 text-secondary',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
    info: 'bg-info/10 text-info',
    neutral: 'bg-bg-hover text-text-secondary',
}

export default function Badge({ children, variant = 'primary', className = '', dot = false }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}
        >
            {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
            {children}
        </span>
    )
}
