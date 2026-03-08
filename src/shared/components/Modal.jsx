import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    if (!isOpen || !mounted) return null

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="absolute inset-0 z-0" onClick={onClose} />
            <div
                className={`relative z-10 bg-bg-card w-full sm:w-auto rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-slide-in sm:animate-scale-in ${sizeClasses[size]}`}
                style={{ width: '100%', maxWidth: size === 'lg' ? '42rem' : '32rem' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-bg-card">
                    <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4 text-text-secondary" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4 overflow-y-auto flex-1">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
