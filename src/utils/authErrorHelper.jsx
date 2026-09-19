import toast from 'react-hot-toast'
import { reconnectGoogle } from '../infrastructure/google/googleAuth'

// Detecta si un error de la API de Google es por sesión/token vencido
export function isAuthError(error) {
    return (
        error?.status === 401 ||
        error?.result?.error?.code === 401 ||
        error?.result?.error?.status === 'UNAUTHENTICATED' ||
        (typeof error?.message === 'string' && (
            error.message.includes('401') ||
            error.message.toLowerCase().includes('unauthenticated') ||
            error.message.toLowerCase().includes('login required')
        ))
    )
}

// Muestra un aviso con un botón "Reconectar" que renueva la sesión con un clic,
// y reintenta automáticamente la acción que falló (onRetry) si se reconecta bien.
export function notifyAuthExpired(onRetry) {
    toast((t) => (
        <div className="flex items-center gap-3">
            <span className="text-sm">Tu sesión de Google venció.</span>
            <button
                onClick={async () => {
                    toast.dismiss(t.id)
                    try {
                        await reconnectGoogle()
                        toast.success('Reconectado. Reintentando...', { duration: 3000, pauseOnHover: false })
                        if (onRetry) onRetry()
                    } catch (error) {
                        toast.error('No se pudo reconectar automáticamente. Probá desde Configuración.', { duration: 4000, pauseOnHover: false })
                    }
                }}
                className="underline font-bold text-primary"
            >
                Reconectar
            </button>
        </div>
    ), { duration: 10000, pauseOnHover: false })
}