const variants = {
    primary: 'bg-primary hover:bg-primary-light text-white shadow-sm shadow-primary/20',
    secondary: 'bg-secondary hover:bg-secondary-light text-white shadow-sm shadow-secondary/20',
    outline: 'border border-border text-text-primary hover:bg-bg-hover',
    danger: 'bg-error hover:bg-error-light text-white shadow-sm shadow-error/20',
    ghost: 'text-text-secondary hover:bg-bg-hover hover:text-text-primary',
    success: 'bg-secondary hover:bg-secondary-light text-white',
}

const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-2.5 text-base rounded-lg',
}

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    disabled = false,
    loading = false,
    className = '',
    ...props
}) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : Icon ? (
                <Icon className="w-4 h-4" />
            ) : null}
            {children}
            {IconRight && <IconRight className="w-4 h-4" />}
        </button>
    )
}
