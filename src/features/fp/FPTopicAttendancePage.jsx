import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import Modal from '../../shared/components/Modal'
import ConfirmModal from '../../shared/components/ConfirmModal'
import { Plus, Trash2, ArrowLeft, NotebookPen, RefreshCw, CloudDownload, Link2 } from 'lucide-react'
import useFPTopicAttendanceStore from '../../core/stores/useFPTopicAttendanceStore'
import useFPCourseStore from '../../core/stores/useFPCourseStore'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import { syncFPTopicAttendanceSheet, readFPTopicAttendanceSheet, readAllFPTopicAttendanceSheets, clearFPTopicAttendanceSheet, deleteFPSpreadsheetTab, buildFPTopicTabTitle, linkFPDocument } from '../../infrastructure/google/sheetsService'
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
    const courses = useFPCourseStore((s) => s.courses)
    const sheets = useFPTopicAttendanceStore((s) => s.sheets)
    const addSheet = useFPTopicAttendanceStore((s) => s.addSheet)
    const updateSheet = useFPTopicAttendanceStore((s) => s.updateSheet)
    const updateSheetHorario = useFPTopicAttendanceStore((s) => s.updateSheetHorario)
    const deleteSheet = useFPTopicAttendanceStore((s) => s.deleteSheet)
    const addEntry = useFPTopicAttendanceStore((s) => s.addEntry)
    const updateEntry = useFPTopicAttendanceStore((s) => s.updateEntry)
    const deleteEntry = useFPTopicAttendanceStore((s) => s.deleteEntry)
    const importOrUpdateSheet = useFPTopicAttendanceStore((s) => s.importOrUpdateSheet)
    const syncAllFromCloud = useFPTopicAttendanceStore((s) => s.syncAllFromCloud)

    const [selectedCourseId, setSelectedCourseId] = useState('')
    const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0] || null

    const filteredSheets = !activeCourse || selectedCourseId === 'ALL'
        ? sheets
        : sheets.filter((s) => (s.cursoId && s.cursoId === activeCourse.id) || (s.cursoNumero && s.cursoNumero === activeCourse.cursoNumero))

    const [selectedId, setSelectedId] = useState(null)
    const selected = sheets.find((s) => s.id === selectedId)
    const topicLink = useFPGoogleLinksStore((s) => s.links.topicAttendance)
    const setLink = useFPGoogleLinksStore((s) => s.setLink)

    const handleAddNewSheet = () => {
        if (!activeCourse) {
            toast.error('Primero debés cargar o crear un Curso en "Ficha de Curso"')
            return
        }
        const newId = addSheet({
            cursoId: activeCourse.id,
            cursoNumero: activeCourse.cursoNumero || '',
            especialidad: activeCourse.especialidad || '',
            cfpNumero: activeCourse.cfpNumero || '',
            distrito: activeCourse.distrito || '',
            sedeDictado: activeCourse.lugarDictado || '',
            instructor: activeCourse.instructor || '',
            horarios: activeCourse.horarios ? { ...activeCourse.horarios } : undefined,
            mesDe: '',
        })
        setSelectedId(newId)
        toast.success(`Nueva planilla mensual para Curso Nº ${activeCourse.cursoNumero || '—'}`)
    }

    const [syncing, setSyncing] = useState(false)
    const [pulling, setPulling] = useState(false)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [linkInput, setLinkInput] = useState('')
    const [linking, setLinking] = useState(false)

    // Estados para confirmación de eliminación y selección de sincronización
    const [sheetToDelete, setSheetToDelete] = useState(null)
    const [showSyncSelectModal, setShowSyncSelectModal] = useState(false)

    const handleSyncSingle = async (sheetToSync) => {
        if (!topicLink) {
            setShowLinkModal(true)
            return
        }
        setSyncing(true)
        try {
            const res = await syncFPTopicAttendanceSheet(topicLink.spreadsheetId, topicLink.sheetTitle, sheetToSync)
            if (res?.sheetTitle && res.sheetTitle !== sheetToSync.googleSheetTitle) {
                updateSheet(sheetToSync.id, { googleSheetTitle: res.sheetTitle })
            }
            toast.success(`"${sheetToSync.especialidad || 'Planilla'}" sincronizada con Google Sheets`)
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(() => handleSyncSingle(sheetToSync))
            } else {
                toast.error('Error al sincronizar con Google Sheets')
            }
        } finally {
            setSyncing(false)
        }
    }

    const handleSyncAll = async () => {
        if (!topicLink) {
            setShowLinkModal(true)
            return
        }
        if (sheets.length === 0) {
            toast.error('No tenés planillas cargadas para sincronizar')
            return
        }
        setSyncing(true)
        let count = 0
        try {
            for (const s of sheets) {
                const res = await syncFPTopicAttendanceSheet(topicLink.spreadsheetId, topicLink.sheetTitle, s)
                if (res?.sheetTitle && res.sheetTitle !== s.googleSheetTitle) {
                    updateSheet(s.id, { googleSheetTitle: res.sheetTitle })
                }
                count++
            }
            toast.success(`${count} planilla(s) sincronizada(s) con Google Sheets`)
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(handleSyncAll)
            } else {
                toast.error('Error al sincronizar con Google Sheets')
            }
        } finally {
            setSyncing(false)
        }
    }

    const handleSyncGeneral = async () => {
        if (!topicLink) {
            setShowLinkModal(true)
            return
        }
        if (sheets.length === 0) {
            toast.error('No tenés planillas cargadas para sincronizar')
            return
        }
        if (sheets.length === 1) {
            await handleSyncSingle(sheets[0])
            return
        }
        setShowSyncSelectModal(true)
    }

    const handleDeleteClick = (e, sheet) => {
        e.stopPropagation()
        setSheetToDelete(sheet)
    }

    const handleConfirmDelete = async () => {
        if (!sheetToDelete) return
        const targetId = sheetToDelete.id
        const targetName = sheetToDelete.especialidad || 'Planilla'
        const targetTab = sheetToDelete.googleSheetTitle || buildFPTopicTabTitle(sheetToDelete)
        const targetCurso = sheetToDelete.cursoNumero
        deleteSheet(targetId)
        setSheetToDelete(null)

        if (topicLink) {
            const remainingSheets = sheets.filter((s) => s.id !== targetId)
            setSyncing(true)
            try {
                if (remainingSheets.length === 0) {
                    await clearFPTopicAttendanceSheet(topicLink.spreadsheetId, topicLink.sheetTitle)
                    toast.success(`"${targetName}" eliminada y Google Sheets vaciado`)
                } else {
                    await deleteFPSpreadsheetTab(topicLink.spreadsheetId, targetTab, targetCurso)
                    toast.success(`"${targetName}" eliminada`)
                }
            } catch (error) {
                if (isAuthError(error)) {
                    notifyAuthExpired(handleConfirmDelete)
                } else {
                    toast.error('Se eliminó localmente, pero falló la sincronización con Google Sheets')
                }
            } finally {
                setSyncing(false)
            }
        } else {
            toast.success(`"${targetName}" eliminada`)
        }
    }

    const executePull = async (spreadsheetId, sheetTitle, targetSheetId = null) => {
        setPulling(true)
        try {
            if (targetSheetId) {
                const current = sheets.find((s) => s.id === targetSheetId)
                const tabTitle = current?.googleSheetTitle || sheetTitle
                const data = await readFPTopicAttendanceSheet(spreadsheetId, tabTitle)
                if (!data) {
                    toast.error('No se pudieron leer los datos de la planilla')
                    return
                }
                const updatedId = importOrUpdateSheet(data, targetSheetId)
                setSelectedId(updatedId)
                toast.success(`Planilla traída desde Google Sheets (${data.entries.length} clases)`)
            } else {
                const allSheets = await readAllFPTopicAttendanceSheets(spreadsheetId)
                if (!allSheets || allSheets.length === 0) {
                    toast.error('No se encontraron planillas de tema y asistencia en la hoja')
                    return
                }
                syncAllFromCloud(allSheets)
                toast.success(`Se sincronizaron ${allSheets.length} planilla(s) desde Google Sheets`)
            }
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(() => executePull(spreadsheetId, sheetTitle, targetSheetId))
            } else {
                toast.error('Error al traer los datos desde Google Sheets')
            }
        } finally {
            setPulling(false)
        }
    }

    const handlePullFromSheets = (targetSheetId = null) => {
        if (!topicLink) {
            setShowLinkModal(true)
            return
        }
        const confirmMsg = targetSheetId
            ? 'Esto va a recargar los datos de esta planilla desde Google Sheets. ¿Continuar?'
            : 'Esto va a sincronizar este dispositivo con Google Sheets. Las planillas quedarán exactamente iguales a las de la nube (se actualizarán y se eliminarán las que ya no existan en Google Sheets). ¿Continuar?'
        if (!window.confirm(confirmMsg)) {
            return
        }
        executePull(topicLink.spreadsheetId, topicLink.sheetTitle, targetSheetId)
    }

    const handleLinkAndPull = async () => {
        if (!linkInput.trim()) {
            toast.error('Pegá el link o ID de la hoja de cálculo')
            return
        }
        setLinking(true)
        try {
            const result = await linkFPDocument(linkInput.trim())
            setLink('topicAttendance', result)
            setShowLinkModal(false)
            setLinkInput('')
            toast.success('Archivo vinculado correctamente')
            await executePull(result.spreadsheetId, result.sheetTitle, selectedId)
        } catch (error) {
            console.error('[FPTopicAttendancePage] Error al vincular y descargar:', error)
            if (isAuthError(error)) {
                notifyAuthExpired(handleLinkAndPull)
            } else if (error?.status === 403 || error?.result?.error?.code === 403) {
                toast.error('Permiso denegado: tu cuenta de Google no tiene acceso a esta planilla.', { duration: 6000 })
            } else if (error?.status === 404 || error?.result?.error?.code === 404) {
                toast.error('Hoja no encontrada en Google Drive. Verificá que el link sea correcto.', { duration: 5000 })
            } else {
                toast.error('No se pudo vincular el archivo. Verificá el link y tus permisos.')
            }
        } finally {
            setLinking(false)
        }
    }

    if (selected) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" icon={ArrowLeft} onClick={() => setSelectedId(null)}>
                        Volver
                    </Button>
                    <h1 className="text-xl font-bold text-text-primary flex-1">
                        Planilla de Tema y Asistencia {selected.especialidad ? `— ${selected.especialidad}` : ''}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            icon={CloudDownload}
                            loading={pulling}
                            disabled={pulling || syncing}
                            onClick={() => handlePullFromSheets(selected.id)}
                            title="Recarga los datos de esta planilla desde Google Sheets (útil si la editaste en la PC)"
                        >
                            Cargar de Sheets
                        </Button>
                        <Button icon={RefreshCw} loading={syncing} disabled={syncing || pulling} onClick={() => handleSyncSingle(selected)}>
                            Sincronizar con Sheets
                        </Button>
                    </div>
                </div>

                {/* Datos generales */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                        <NotebookPen className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-semibold text-text-primary">Datos Generales</h2>
                    </div>
                    <CardBody className="space-y-4">
                        {courses.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-bg-main/50 border border-border-light rounded-xl">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-text-primary whitespace-nowrap">📚 Curso Vinculado:</span>
                                    <select
                                        className="bg-bg-surface border border-border-light rounded-lg px-2.5 py-1 text-xs font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        value={selected.cursoId || courses.find((c) => c.cursoNumero === selected.cursoNumero)?.id || ''}
                                        onChange={(e) => {
                                            const found = courses.find((c) => c.id === e.target.value)
                                            if (found) {
                                                updateSheet(selected.id, {
                                                    cursoId: found.id,
                                                    cursoNumero: found.cursoNumero || selected.cursoNumero,
                                                    especialidad: found.especialidad || selected.especialidad,
                                                    cfpNumero: found.cfpNumero || selected.cfpNumero,
                                                    distrito: found.distrito || selected.distrito,
                                                    sedeDictado: found.lugarDictado || selected.sedeDictado,
                                                    instructor: found.instructor || selected.instructor,
                                                    horarios: found.horarios ? { ...found.horarios } : selected.horarios,
                                                })
                                                toast.success(`Datos sincronizados con Curso Nº ${found.cursoNumero || '—'}`)
                                            }
                                        }}
                                    >
                                        <option value="">Seleccionar curso...</option>
                                        {courses.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                Curso Nº {c.cursoNumero || '—'} · {c.especialidad || 'Sin especialidad'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <span className="text-xs text-text-muted">
                                    Hereda datos de la Ficha de Curso seleccionada
                                </span>
                            </div>
                        )}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Planillas de Tema y Asistencia</h1>
                    <p className="text-sm text-text-secondary mt-1">Formación Profesional</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        icon={CloudDownload}
                        loading={pulling}
                        disabled={pulling || syncing}
                        onClick={() => handlePullFromSheets(null)}
                        title="Descarga la planilla desde Google Sheets hacia este dispositivo"
                    >
                        Traer de Google Sheets
                    </Button>
                    <Button
                        icon={RefreshCw}
                        loading={syncing}
                        disabled={syncing || pulling}
                        onClick={handleSyncGeneral}
                        title="Sincroniza los datos con Google Sheets"
                    >
                        Sincronizar con Sheets
                    </Button>
                    <Button icon={Plus} onClick={handleAddNewSheet}>
                        Nueva Planilla
                    </Button>
                </div>
            </div>

            {/* Selector de Curso */}
            <div className="bg-bg-surface border border-border-light rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary whitespace-nowrap">📚 Número de Curso:</span>
                    {courses.length > 0 ? (
                        <select
                            className="bg-bg-main border border-border-light rounded-lg px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={activeCourse ? activeCourse.id : ''}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                        >
                            {courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    Curso Nº {c.cursoNumero || '—'} · {c.especialidad || 'Sin especialidad'}
                                </option>
                            ))}
                            {courses.length > 1 && <option value="ALL">Mostrar todos los cursos</option>}
                        </select>
                    ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            No hay cursos cargados. Creá primero un curso en la pestaña "Ficha de Curso".
                        </span>
                    )}
                </div>
                {activeCourse && (
                    <div className="text-xs text-text-secondary flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span><strong>C.F.P. Nº:</strong> {activeCourse.cfpNumero || '—'}</span>
                        <span><strong>Distrito:</strong> {activeCourse.distrito || '—'}</span>
                        <span><strong>Instructor:</strong> {activeCourse.instructor || '—'}</span>
                    </div>
                )}
            </div>

            {filteredSheets.length === 0 && (
                <Card>
                    <CardBody className="text-center py-10 text-text-muted">
                        {courses.length === 0
                            ? 'Para comenzar a registrar temas y asistencia, primero debés cargar un curso en la pestaña "Ficha de Curso".'
                            : `Todavía no hay planillas para el curso seleccionado (Curso Nº ${activeCourse?.cursoNumero || '—'}). Hacé clic en "Nueva Planilla" para crear la primera del mes.`}
                    </CardBody>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSheets.map((s) => (
                    <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(s.id)}>
                        <CardBody>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-text-primary">{s.especialidad || 'Sin especialidad'}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">Curso Nº {s.cursoNumero || '—'} · {s.mesDe || 'Sin mes'}</p>
                                    <p className="text-xs text-text-muted mt-1">{s.entries.length} clase{s.entries.length !== 1 ? 's' : ''} registrada{s.entries.length !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleSyncSingle(s)
                                        }}
                                        className="p-1.5 text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-bg-hover"
                                        title="Sincronizar esta planilla con Google Sheets"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, s)}
                                        className="p-1.5 text-text-muted hover:text-error transition-colors rounded-lg hover:bg-bg-hover"
                                        title="Eliminar planilla"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Modal de confirmación al eliminar */}
            <ConfirmModal
                isOpen={!!sheetToDelete}
                onClose={() => setSheetToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar planilla?"
                description={`¿Estás seguro de que querés eliminar "${sheetToDelete?.especialidad || 'esta planilla'}" (Curso Nº ${sheetToDelete?.cursoNumero || '—'})? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar y Sincronizar"
            />

            {/* Modal para elegir cuál planilla sincronizar si hay varias */}
            <Modal
                isOpen={showSyncSelectModal}
                onClose={() => setShowSyncSelectModal(false)}
                title="Sincronizar con Google Sheets"
            >
                <div className="space-y-4 p-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light">
                        <p className="text-sm text-text-secondary">
                            Tenés {sheets.length} planillas cargadas.
                        </p>
                        <Button
                            size="sm"
                            icon={RefreshCw}
                            loading={syncing}
                            disabled={syncing}
                            onClick={async () => {
                                setShowSyncSelectModal(false)
                                await handleSyncAll()
                            }}
                        >
                            Sincronizar Todas ({sheets.length})
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                        {sheets.map((s) => (
                            <div
                                key={s.id}
                                className="flex items-center justify-between p-3 rounded-xl border border-border-light hover:bg-bg-hover transition-colors"
                            >
                                <div className="min-w-0 pr-3">
                                    <p className="font-semibold text-text-primary text-sm truncate">
                                        {s.especialidad || 'Sin especialidad'}
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                        Curso Nº {s.cursoNumero || '—'} · {s.mesDe || 'Sin mes'} ({s.entries.length} clases)
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    icon={RefreshCw}
                                    loading={syncing}
                                    disabled={syncing}
                                    onClick={async () => {
                                        setShowSyncSelectModal(false)
                                        await handleSyncSingle(s)
                                    }}
                                >
                                    Sincronizar
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button variant="ghost" onClick={() => setShowSyncSelectModal(false)}>
                            Cerrar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal para vincular la hoja en este dispositivo si todavía no se vinculó */}
            <Modal
                isOpen={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                title="Vincular Planilla de Tema y Asistencia"
            >
                <div className="space-y-4 p-2">
                    <p className="text-sm text-text-secondary">
                        Para sincronizar con este dispositivo (ej. tu celular), pegá el link o ID de la hoja de cálculo de Google Sheets correspondiente:
                    </p>
                    <Input
                        placeholder="https://docs.google.com/spreadsheets/d/... o ID"
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setShowLinkModal(false)}>
                            Cancelar
                        </Button>
                        <Button
                            icon={Link2}
                            loading={linking}
                            disabled={linking}
                            onClick={handleLinkAndPull}
                        >
                            Vincular y Descargar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
