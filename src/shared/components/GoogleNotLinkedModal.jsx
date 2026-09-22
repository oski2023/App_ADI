import Modal from './Modal'
import Button from './Button'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function GoogleNotLinkedBanner({ onClose }) {
    const navigate = useNavigate()
    return (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
                <p className="font-semibold text-sm">Cuenta de Google no vinculada en este dispositivo</p>
                <p>Para poder leer y sincronizar planillas de Google Drive, primero debés conectar tu cuenta de Google en Configuración.</p>
                <button
                    type="button"
                    onClick={() => {
                        if (onClose) onClose()
                        navigate('/settings')
                    }}
                    className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-100 mt-1 inline-block cursor-pointer text-left"
                >
                    Ir a Configuración para conectar Google →
                </button>
            </div>
        </div>
    )
}

export default function GoogleNotLinkedModal({ isOpen, onClose }) {
    const navigate = useNavigate()

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Conexión con Google Drive"
        >
            <div className="space-y-4 p-2">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1.5">
                        <p className="font-semibold text-sm">Cuenta de Google no vinculada en este dispositivo</p>
                        <p className="leading-relaxed">
                            Para poder leer y sincronizar planillas de Google Drive, primero debés conectar tu cuenta de Google en Configuración.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                onClose()
                                navigate('/settings')
                            }}
                            className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-100 mt-1.5 inline-block cursor-pointer text-left"
                        >
                            Ir a Configuración para conectar Google →
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                    <Button
                        icon={ArrowRight}
                        onClick={() => {
                            onClose()
                            navigate('/settings')
                        }}
                    >
                        Ir a Configuración
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
