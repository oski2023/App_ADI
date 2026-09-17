import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import { Plus, Trash2, ArrowLeft, NotebookPen, RefreshCw } from 'lucide-react'
import useFPTopicAttendanceStore from '../../core/stores/useFPTopicAttendanceStore'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import { syncFPTopicAttendanceSheet } from '../../infrastructure/google/sheetsService'
import { isAuthError, notifyAuthExpired } from '../../utils/authErrorHelper'
import toast from 'react-hot-toast'

const DIAS = [
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
]

export default function FPTopicAttendancePage() {
    const sheets = useFPTopicAttendanceStore((s) => s.sheets)
    const addSheet = useFPTopicAttendanceStore((s) => s.addSheet)
    const updateSheet = useFPTopicAttendanceStore((s) => s.updateSheet)
    const updateSheetHorario = useFPTopicAttendanceStore((s) => s.updateSheetHorario)
    const deleteSheet = useFPTopicAttendanceStore((s) => s.deleteSheet)
    const addEntry = useFPTopicAttendanceStore((s) => s.addEntry)
    const updateEntry = useFPTopicAttendanceStore((s) => s.updateEntry)
    const deleteEntry = useFPTopicAttendanceStore((s) => s.deleteEntry)

        const [selectedId, setSelectedId] = useState(null)
    const selected = sheets.find((s) => s.id === selectedId)
    const topicLink = useFPGoogleLinksStore((s) => s.links.topicAttendance)
    const [syncing, setSyncing] = useState(false)

    const handleSync = async () => {
        if (!topicLink) {
            toast.error('Primero vinculá el archivo de Tema y Asistencia en Configuración')
            return
        }
        setSyncing(true)
        try {
            await syncFPTopicAttendanceSheet(topicLink.spreadsheetId, topicLink.sheetTitle, selected)
            toast.success('Sincronizado con Google Sheets')
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(handleSync)
            } else {
                toast.error('Error al sincronizar con Google Sheets')
            }
        } finally {
            setSyncing(false)
        }
    }

    if (selected) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3">
                    <Button variant="outline" icon={ArrowLeft} onClick={() => setSelectedId(null)}>
                        Volver
                    </Button>
                    <h1 className="text-xl font-bold text-text-primary flex-1">
                        Planilla de Tema y Asistencia {selected.especialidad ? `— ${selected.especialidad}` : ''}
                    </h1>
                    <Button icon={RefreshCw} loading={syncing} disabled={syncing} onClick={handleSync}>
                        Sincronizar con Sheets
                    </Button>
                </div>

                {/* Datos generales */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                        <NotebookPen className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-semibold text-text-primary">Datos Generales</h2>
                    </div>
                    <CardBody className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input label="Región" value={selected.region} onChange={(e) => updateSheet(selected.id, { region: e.target.value })} />
                            <Input label="Distrito" value={selected.distrito} onChange={(e) => updateSheet(selected.id, { distrito: e.target.value })} />
                            <Input label="CFP Nº" value={selected.cfpNumero} onChange={(e) => updateSheet(selected.id, { cfpNumero: e.target.value })} />
                            <Input label="Curso Nº" value={selected.cursoNumero} onChange={(e) => updateSheet(selected.id, { cursoNumero: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input className="md:col-span-2" label="Especialidad" value={selected.especialidad} onChange={(e) => updateSheet(selected.id, { especialidad: e.target.value })} />
                            <Input label="Mes de" value={selected.mesDe} onChange={(e) => updateSheet(selected.id, { mesDe: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Sede Dictado" value={selected.sedeDictado} onChange={(e) => updateSheet(selected.id, { sedeDictado: e.target.value })} />
                            <Input label="Instructor" value={selected.instructor} onChange={(e) => updateSheet(selected.id, { instructor: e.target.value })} />
                        </div>

                        <div>
                            <p className="block text-sm font-medium text-text-secondary mb-1.5">Horarios</p>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                {DIAS.map((d) => (
                                    <Input
                                        key={d.key}
                                        label={d.label}
                                        placeholder="Ej. 18 a 22"
                                        value={selected.horarios[d.key]}
                                        onChange={(e) => updateSheetHorario(selected.id, d.key, e.target.value)}
                                    />
                                ))}
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Registro diario */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                        <h2 className="text-base font-semibold text-text-primary">Registro de Temas y Asistencia</h2>
                        <Button icon={Plus} size="sm" onClick={() => addEntry(selected.id)}>
                            Agregar Clase
                        </Button>
                    </div>
                    <CardBody className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[1000px]">
                            <thead>
                                <tr className="text-left text-text-secondary border-b border-border-light">
                                    <th className="py-2 pr-2">Fecha</th>
                                    <th className="py-2 pr-2">UE Nº / Tema de trabajo</th>
                                    <th className="py-2 pr-2">Tiempo estimado</th>
                                    <th className="py-2 pr-2">Firma Instructor</th>
                                    <th className="py-2 pr-2">Observaciones</th>
                                    <th className="py-2 pr-2">Firma Director</th>
                                    <th className="py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {selected.entries.map((e) => (
                                    <tr key={e.id} className="border-b border-border-light/50">
                                        <td className="py-1.5 pr-2 w-36"><Input type="date" value={e.fecha} onChange={(ev) => updateEntry(selected.id, e.id, { fecha: ev.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={e.tema} onChange={(ev) => updateEntry(selected.id, e.id, { tema: ev.target.value })} /></td>
                                        <td className="py-1.5 pr-2 w-32"><Input placeholder="Ej. 4hs" value={e.tiempoEstimado} onChange={(ev) => updateEntry(selected.id, e.id, { tiempoEstimado: ev.target.value })} /></td>
                                        <td className="py-1.5 pr-2 w-28"><Input placeholder="Firmado" value={e.firmaInstructor} onChange={(ev) => updateEntry(selected.id, e.id, { firmaInstructor: ev.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={e.observaciones} onChange={(ev) => updateEntry(selected.id, e.id, { observaciones: ev.target.value })} /></td>
                                        <td className="py-1.5 pr-2 w-28"><Input placeholder="Firmado" value={e.firmaDirector} onChange={(ev) => updateEntry(selected.id, e.id, { firmaDirector: ev.target.value })} /></td>
                                        <td className="py-1.5">
                                            <button onClick={() => deleteEntry(selected.id, e.id)} className="text-text-muted hover:text-error transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {selected.entries.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-6 text-center text-text-muted">
                                            No hay clases registradas todavía.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardBody>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Planillas de Tema y Asistencia</h1>
                    <p className="text-sm text-text-secondary mt-1">Formación Profesional</p>
                </div>
                <Button icon={Plus} onClick={() => setSelectedId(addSheet())}>
                    Nueva Planilla
                </Button>
            </div>

            {sheets.length === 0 && (
                <Card>
                    <CardBody className="text-center py-10 text-text-muted">
                        Todavía no cargaste ninguna planilla. Hacé clic en "Nueva Planilla" para empezar.
                    </CardBody>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sheets.map((s) => (
                    <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(s.id)}>
                        <CardBody>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-text-primary">{s.especialidad || 'Sin especialidad'}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">Curso Nº {s.cursoNumero || '—'} · {s.mesDe || 'Sin mes'}</p>
                                    <p className="text-xs text-text-muted mt-1">{s.entries.length} clase{s.entries.length !== 1 ? 's' : ''} registrada{s.entries.length !== 1 ? 's' : ''}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteSheet(s.id) }}
                                    className="text-text-muted hover:text-error transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>
        </div>
    )
}
