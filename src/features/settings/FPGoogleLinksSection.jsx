import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import { Link2, ExternalLink, Trash2, Cloud, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import useSettingsStore from '../../core/stores/useSettingsStore'
import { linkFPDocument } from '../../infrastructure/google/sheetsService'
import { isGoogleConfigured } from '../../infrastructure/google/googleConfig'
import { saveFPCloudRegistry, autoDiscoverAndSyncCloudRegistry } from '../../infrastructure/google/fpCloudRegistry'
import { isAuthError, notifyAuthExpired } from '../../utils/authErrorHelper'

const DOCS = [
    { key: 'course', label: 'Ficha de Curso' },
    { key: 'topicAttendance', label: 'Planilla de Tema y Asistencia del Instructor' },
    { key: 'attendanceSheet', label: 'Asistencia de Alumnos' },
    { key: 'examAct', label: 'Acta de Examen' },
]

export default function FPGoogleLinksSection() {
    const links = useFPGoogleLinksStore((s) => s.links)
    const setLink = useFPGoogleLinksStore((s) => s.setLink)
    const clearLink = useFPGoogleLinksStore((s) => s.clearLink)
    const googleLinked = useSettingsStore((s) => s.googleLinked)

    const [inputs, setInputs] = useState({})
    const [loadingKey, setLoadingKey] = useState(null)
    const [syncingCloud, setSyncingCloud] = useState(false)

    const handleLink = async (key, label) => {
        if (!googleLinked) {
            toast.error('Primero vinculá tu cuenta de Google en la sección de arriba ("Integración Google Workspace")', { duration: 6000 })
            return
        }
        if (!isGoogleConfigured()) {
            toast.error('Google no está configurado en la app')
            return
        }
        const value = inputs[key]
        if (!value || !value.trim()) {
            toast.error(`Pegá el link o ID de "${label}"`)
            return
        }
        setLoadingKey(key)
        try {
            const result = await linkFPDocument(value)
            setLink(key, result)
            toast.success(`"${label}" vinculado correctamente`)
            saveFPCloudRegistry().catch((err) => console.warn('[FPGoogleLinksSection] Error guardando registro en Drive:', err))
        } catch (error) {
            console.error('[FPGoogleLinksSection] Error vinculando:', error)
            if (isAuthError(error)) {
                notifyAuthExpired(() => handleLink(key, label))
            } else if (error?.status === 403 || error?.result?.error?.code === 403) {
                toast.error(`Permiso denegado: asegurate de tener acceso a "${label}" con tu cuenta de Google.`, { duration: 6000 })
            } else {
                toast.error(`No se pudo vincular "${label}". Verificá el link y tus permisos.`)
            }
        } finally {
            setLoadingKey(null)
        }
    }

    const handleClear = async (key, label) => {
        clearLink(key)
        toast.success(`"${label}" desvinculado`)
        saveFPCloudRegistry().catch((err) => console.warn('[FPGoogleLinksSection] Error guardando en Drive:', err))
    }

    const handlePullFromDrive = async () => {
        if (!googleLinked) {
            toast.error('Primero vinculá tu cuenta de Google')
            return
        }
        setSyncingCloud(true)
        const toastId = toast.loading('Buscando vínculos en Google Drive...')
        try {
            const res = await autoDiscoverAndSyncCloudRegistry()
            toast.dismiss(toastId)
            if (res.success) {
                toast.success(`¡Sincronizado! Se restauraron ${res.linksRestored} vínculo(s) y ${res.coursesRestored} curso(s).`)
            } else {
                toast.error('No se encontraron vínculos guardados en tu Google Drive.')
            }
        } catch (err) {
            toast.dismiss(toastId)
            toast.error('Error buscando vínculos en Google Drive')
        } finally {
            setSyncingCloud(false)
        }
    }

    const handleSaveToDrive = async () => {
        if (!googleLinked) {
            toast.error('Primero vinculá tu cuenta de Google')
            return
        }
        setSyncingCloud(true)
        const toastId = toast.loading('Guardando vínculos en Google Drive...')
        try {
            const ok = await saveFPCloudRegistry()
            toast.dismiss(toastId)
            if (ok) {
                toast.success('Vínculos guardados en tu Google Drive con éxito.')
            } else {
                toast.error('No se pudieron guardar los vínculos en Google Drive.')
            }
        } catch (err) {
            toast.dismiss(toastId)
            toast.error('Error al guardar en Google Drive')
        } finally {
            setSyncingCloud(false)
        }
    }

    return (
        <Card className="lg:col-span-2">
            <div className="px-5 py-4 border-b border-border-light flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    <h2 className="text-base font-semibold text-text-primary">Archivos de Google Sheets — Formación Profesional</h2>
                </div>
                {googleLinked && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            icon={Cloud}
                            loading={syncingCloud}
                            disabled={syncingCloud}
                            onClick={handlePullFromDrive}
                            title="Descarga automáticamente todos los vínculos que guardaste desde tu PC o celular"
                        >
                            Traer de Google Drive
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            icon={RefreshCw}
                            loading={syncingCloud}
                            disabled={syncingCloud}
                            onClick={handleSaveToDrive}
                            title="Guarda los vínculos actuales en Google Drive para que tus otros dispositivos los reconozcan"
                        >
                            Guardar en Drive
                        </Button>
                    </div>
                )}
            </div>
            <CardBody className="space-y-5">
                <p className="text-sm text-text-secondary">
                    Pegá el link de cada archivo que te comparten (ya convertido a Google Sheets nativo). Los vínculos se sincronizan automáticamente con tu Google Drive para que funcionen como espejo entre tu PC y tu celular.
                </p>
                {DOCS.map((doc) => {
                    const linked = links[doc.key]
                    return (
                        <div key={doc.key} className="border border-border-light rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="font-medium text-text-primary text-sm">{doc.label}</p>
                                {linked && (
                                    <span className="text-xs text-secondary font-medium">● Vinculado</span>
                                )}
                            </div>
                            {linked ? (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={ExternalLink}
                                        onClick={() => window.open(linked.spreadsheetUrl, '_blank')}
                                    >
                                        Ver Archivo
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        icon={Trash2}
                                        onClick={() => handleClear(doc.key, doc.label)}
                                    >
                                        Desvincular
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                        className="flex-1"
                                        placeholder="Pegá el link o ID del archivo"
                                        value={inputs[doc.key] || ''}
                                        onChange={(e) => setInputs({ ...inputs, [doc.key]: e.target.value })}
                                    />
                                    <Button
                                        loading={loadingKey === doc.key}
                                        disabled={loadingKey === doc.key}
                                        onClick={() => handleLink(doc.key, doc.label)}
                                    >
                                        Vincular
                                    </Button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </CardBody>
        </Card>
    )
}
