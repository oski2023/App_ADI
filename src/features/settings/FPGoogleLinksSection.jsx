import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import { Link2, ExternalLink, Trash2, CloudDownload } from 'lucide-react'
import toast from 'react-hot-toast'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import { linkFPDocument } from '../../infrastructure/google/sheetsService'
import { isGoogleConfigured } from '../../infrastructure/google/googleConfig'
import { pushConfigToCloud, pullConfigFromCloud } from '../../infrastructure/google/cloudConfigService'

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

    const [inputs, setInputs] = useState({})
    const [loadingKey, setLoadingKey] = useState(null)
    const [syncingCloud, setSyncingCloud] = useState(false)

    const handleLink = async (key, label) => {
        if (!isGoogleConfigured()) {
            toast.error('Primero vinculá tu cuenta de Google (sección de arriba)')
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
            // Auto-guardar configuración en Google Drive para compartir con el celular
            pushConfigToCloud()
        } catch (error) {
            toast.error(`No se pudo vincular "${label}"`)
        } finally {
            setLoadingKey(null)
        }
    }

    const handleClearLink = (key) => {
        clearLink(key)
        setTimeout(() => pushConfigToCloud(), 100)
    }

    const handlePullCloud = async () => {
        if (!isGoogleConfigured()) {
            toast.error('Primero vinculá tu cuenta de Google')
            return
        }
        setSyncingCloud(true)
        try {
            const cfg = await pullConfigFromCloud()
            if (cfg?.fp_links && Object.keys(cfg.fp_links).length > 0) {
                toast.success('Enlaces sincronizados desde tu Google Drive')
            } else {
                toast('No se encontraron enlaces guardados en tu Google Drive')
            }
        } catch (error) {
            toast.error('Error al sincronizar enlaces desde Drive')
        } finally {
            setSyncingCloud(false)
        }
    }

    return (
        <Card className="lg:col-span-2">
            <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary" />
                    <h2 className="text-base font-semibold text-text-primary">Archivos de Google Sheets — Formación Profesional</h2>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    icon={CloudDownload}
                    loading={syncingCloud}
                    disabled={syncingCloud}
                    onClick={handlePullCloud}
                    title="Buscar enlaces guardados en tu Google Drive"
                >
                    Recuperar de Drive
                </Button>
            </div>
            <CardBody className="space-y-5">
                <p className="text-sm text-text-secondary">
                    Pegá el link de cada archivo que te comparten (ya convertido a Google Sheets nativo). Se guardan automáticamente en tu Google Drive para que aparezcan en tu celular sin tener que volver a pegarlos.
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
                                        onClick={() => handleClearLink(doc.key)}
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
