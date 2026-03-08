export function Input({ label, error, id, className = '', ...props }) {
    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1.5">
                    {label}
                </label>
            )}
            <input
                id={id}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all duration-200 outline-none bg-bg-card text-text-primary placeholder:text-text-muted ${error
                        ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
                        : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }`}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
        </div>
    )
}

export function Select({ label, error, id, options = [], placeholder, className = '', ...props }) {
    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1.5">
                    {label}
                </label>
            )}
            <select
                id={id}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all duration-200 outline-none bg-bg-card text-text-primary cursor-pointer ${error
                        ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
                        : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }`}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
        </div>
    )
}

export function Textarea({ label, error, id, className = '', ...props }) {
    return (
        <div className={className}>
            {label && (
                <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1.5">
                    {label}
                </label>
            )}
            <textarea
                id={id}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all duration-200 outline-none resize-y bg-bg-card text-text-primary placeholder:text-text-muted ${error
                        ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
                        : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }`}
                rows={3}
                {...props}
            />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
        </div>
    )
}
