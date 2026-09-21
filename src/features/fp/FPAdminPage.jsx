import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import ConfirmModal from '../../shared/components/ConfirmModal'
import {
    ChevronDown, ChevronRight, Pencil, X, RefreshCw, Briefcase,
    Sliders, ExternalLink, Trash2, Plus, Check, Download
} from 'lucide-react'
import useFPAdminRecordsStore from '../../core/stores/useFPAdminRecordsStore'
import useFPAdminLinksStore from '../../core/stores/useFPAdminLinksStore'
import { syncFPAdminRecords, linkFPDocument, readFPRows, extractSpreadsheetId } from '../../infrastructure/google/sheetsService'
import { isAuthError, notifyAuthExpired } from '../../utils/authErrorHelper'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import { isGoogleConfigured } from '../../infrastructure/google/googleConfig'
import toast from 'react-hot-toast'

const COHORTE_OPTIONS = ['Sin cohorte', '1er cohorte', '2da cohorte', '3er cohorte', '4ta cohorte']
const MESES_ORDEN = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function EstadoBadge({ estado }) {
    if (estado === 'Entregado') {
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">✓ Entregado</span>
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">⚠ Falta entregar</span>
}

export default function FPAdminPage() {
    const records = useFPAdminRecordsStore((s) => s.records)
    const setRecords = useFPAdminRecordsStore((s) => s.setRecords)
    const addRecord = useFPAdminRecordsStore((s) => s.addRecord)
    const updateRecord = useFPAdminRecordsStore((s) => s.updateRecord)
    const deleteRecord = useFPAdminRecordsStore((s) => s.deleteRecord)

    const links = useFPAdminLinksStore((s) => s.links)
    const setLink = useFPAdminLinksStore((s) => s.setLink)
    const clearLink = useFPAdminLinksStore((s) => s.clearLink)
    const tipos = Object.keys(links)
    const mainDocLinks = useFPGoogleLinksStore((s) => s.links)

    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [expanded, setExpanded] = useState({})
    const [editingId, setEditingId] = useState(null)
    const [editDraft, setEditDraft] = useState({})
    const [draftByMonth, setDraftByMonth] = useState({})
    const [newMonthDraft, setNewMonthDraft] = useState({ mes: '', documento: '', cohorte: 'Sin cohorte', cantidad: '', link: '' })
    const [syncing, setSyncing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [recordToDelete, setRecordToDelete] = useState(null)
    const [tipoToUnlink, setTipoToUnlink] = useState(null)

    const handleLoadFromSheets = async () => {
        if (tipos.length === 0) {
            toast.error('Primero vinculá al menos un tipo de documento')
            return
        }
        if (!window.confirm('Esto va a reemplazar los registros que tenés cargados en este dispositivo por los que están en Google Sheets. ¿Continuar?')) {
            return
        }
        setLoading(true)
        try {
            let allRecords = []
            for (const tipo of tipos) {
                const rows = await readFPRows(links[tipo].spreadsheetId, links[tipo].sheetTitle, 'A2:G')
                const parsed = rows
                    .filter((row) => row[0])
                    .map((row) => ({
                        id: row[0],
                        mes: row[1] || '',
                        documento: row[2] || tipo,
                        cohorte: row[3] || 'Sin cohorte',
                        cantidad: row[4] || '',
                        estado: row[5] || 'Pendiente',
                        link: row[6] || '',
                    }))
                allRecords = [...allRecords, ...parsed]
            }
            setRecords(allRecords)
                        toast.success(`${allRecords.length} registros traídos desde Google Sheets`)
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(handleLoadFromSheets)
            } else {
                toast.error('Error al traer los datos desde Google Sheets')
            }
        } finally {
            setLoading(false)
        }
    }
    const [mostrarTipos, setMostrarTipos] = useState(false)
    const [nuevoTipo, setNuevoTipo] = useState('')
    const [nuevoTipoLink, setNuevoTipoLink] = useState('')
    const [vinculando, setVinculando] = useState(false)

    // Agrupar por mes
    const grouped = {}
    records.forEach((r) => {
        const key = r.mes || 'Sin mes'
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(r)
    })
    const monthKeys = Object.keys(grouped).sort((a, b) => {
        const ia = MESES_ORDEN.indexOf(a)
        const ib = MESES_ORDEN.indexOf(b)
        if (ia === -1 && ib === -1) return a.localeCompare(b)
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
    })

    const totalRegistros = records.length
    const totalEntregados = records.filter((r) => r.estado === 'Entregado').length
    const totalPendientes = records.filter((r) => r.estado === 'Pendiente').length

    const toggleMes = (mes) => setExpanded((prev) => ({ ...prev, [mes]: !prev[mes] }))
    const expandirTodo = () => {
        const all = {}
        monthKeys.forEach((m) => { all[m] = true })
        setExpanded(all)
    }
    const colapsarTodo = () => setExpanded({})

    const startEdit = (r) => {
        setEditingId(r.id)
        setEditDraft({ documento: r.documento, cohorte: r.cohorte, cantidad: r.cantidad, link: r.link })
    }
    const saveEdit = (id) => {
        updateRecord(id, editDraft)
        setEditingId(null)
    }

    const getDraft = (mes) => draftByMonth[mes] || { documento: '', cohorte: 'Sin cohorte', cantidad: '', link: '' }
    const setDraft = (mes, data) => setDraftByMonth((prev) => ({ ...prev, [mes]: { ...getDraft(mes), ...data } }))

    const handleAgregarAMes = (mes) => {
        const draft = getDraft(mes)
        if (!draft.documento) {
            toast.error('Elegí un tipo de documento')
            return
        }
        addRecord({ mes, ...draft, estado: 'Pendiente' })
        setDraftByMonth((prev) => ({ ...prev, [mes]: { documento: '', cohorte: 'Sin cohorte', cantidad: '', link: '' } }))
    }

    const handleAgregarMesNuevo = () => {
        if (!newMonthDraft.mes.trim()) {
            toast.error('Escribí el nombre del mes (ej. Septiembre)')
            return
        }
        if (!newMonthDraft.documento) {
            toast.error('Elegí un tipo de documento')
            return
        }
        addRecord({ ...newMonthDraft, estado: 'Pendiente' })
        setNewMonthDraft({ mes: '', documento: '', cohorte: 'Sin cohorte', cantidad: '', link: '' })
        setExpanded((prev) => ({ ...prev, [newMonthDraft.mes.trim()]: true }))
    }

    const handleSync = async () => {
        if (tipos.length === 0) {
            toast.error('Primero vinculá al menos un tipo de documento')
            return
        }
        setSyncing(true)
        try {
            for (const tipo of tipos) {
                const grupo = records.filter((r) => r.documento === tipo)
                await syncFPAdminRecords(links[tipo].spreadsheetId, links[tipo].sheetTitle, grupo)
            }
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

        const MAIN_DOC_LABELS = { course: 'Ficha de Curso', topicAttendance: 'Tema y Asistencia', attendanceSheet: 'Asistencia de Alumnos', examAct: 'Acta de Examen' }

    const handleVincularTipo = async () => {
        if (!isGoogleConfigured()) {
            toast.error('Primero vinculá tu cuenta de Google (Configuración)')
            return
        }
        if (!nuevoTipo.trim() || !nuevoTipoLink.trim()) {
            toast.error('Completá el nombre y el link')
            return
        }

        const idNuevo = extractSpreadsheetId(nuevoTipoLink)

        // Chequear contra los 4 documentos principales
        for (const [key, label] of Object.entries(MAIN_DOC_LABELS)) {
            if (mainDocLinks[key] && mainDocLinks[key].spreadsheetId === idNuevo) {
                toast.error(`Ese archivo ya está en uso por "${label}". Usá un archivo distinto y dedicado para Administrativo.`)
                return
            }
        }
        // Chequear contra otros tipos de Administrativo ya vinculados
        for (const t of tipos) {
            if (links[t].spreadsheetId === idNuevo) {
                toast.error(`Ese archivo ya está vinculado al tipo "${t}". Usá un archivo distinto.`)
                return
            }
        }

        setVinculando(true)
        try {
            const result = await linkFPDocument(nuevoTipoLink)
            setLink(nuevoTipo.trim(), result)
            toast.success(`"${nuevoTipo.trim()}" vinculado`)
            setNuevoTipo('')
            setNuevoTipoLink('')
        } catch (error) {
            toast.error('No se pudo vincular ese archivo')
        } finally {
            setVinculando(false)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                    <Briefcase className="w-6 h-6 text-primary" />
                    Registro de Papeles Entregados
                </h1>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card><CardBody className="text-center">
                    <p className="text-3xl font-bold text-text-primary">{totalRegistros}</p>
                    <p className="text-xs text-text-secondary mt-1">Total registros</p>
                </CardBody></Card>
                <Card><CardBody className="text-center">
                    <p className="text-3xl font-bold text-secondary">{totalEntregados}</p>
                    <p className="text-xs text-text-secondary mt-1">Entregados</p>
                </CardBody></Card>
                <Card><CardBody className="text-center">
                    <p className="text-3xl font-bold text-warning">{totalPendientes}</p>
                    <p className="text-xs text-text-secondary mt-1">Pendientes</p>
                </CardBody></Card>
            </div>

            {/* Filtros y acciones */}
            <div className="flex flex-wrap items-center gap-2">
                <select
                    className="px-3 py-2 rounded-lg border border-border bg-bg-card text-text-primary text-sm"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                >
                    <option value="todos">Todos los estados</option>
                    <option value="Pendiente">Pendientes</option>
                    <option value="Entregado">Entregados</option>
                </select>
                <Button variant="outline" size="sm" onClick={expandirTodo}>Expandir todo</Button>
                <Button variant="outline" size="sm" onClick={colapsarTodo}>Colapsar todo</Button>
                <Button variant="outline" size="sm" icon={Sliders} onClick={() => setMostrarTipos((v) => !v)}>
                    Tipos de documento
                </Button>
                <div className="flex-1" />
                <Button variant="outline" icon={Download} loading={loading} disabled={loading} onClick={handleLoadFromSheets}>
                    Actualizar desde Sheets
                </Button>
                <Button icon={RefreshCw} loading={syncing} disabled={syncing} onClick={handleSync}>
                    Sincronizar con Sheets
                </Button>
            </div>

            {/* Panel de tipos de documento (colapsable) */}
            {mostrarTipos && (
                <Card>
                    <div className="px-5 py-4 border-b border-border-light">
                        <h2 className="text-base font-semibold text-text-primary">Tipos de Documento Vinculados</h2>
                    </div>
                    <CardBody className="space-y-4">
                        {tipos.length > 0 && (
                            <div className="space-y-2">
                                {tipos.map((tipo) => (
                                    <div key={tipo} className="flex items-center justify-between border border-border-light rounded-xl p-3">
                                        <p className="font-medium text-text-primary text-sm">{tipo}</p>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" icon={ExternalLink} onClick={() => window.open(links[tipo].spreadsheetUrl, '_blank')}>
                                                Ver Archivo
                                            </Button>
                                            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setTipoToUnlink(tipo)}>
                                                Desvincular
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="border border-dashed border-border-light rounded-xl p-4 space-y-3">
                            <p className="text-sm font-medium text-text-primary">Agregar nuevo tipo</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input placeholder="Nombre del tipo (ej. Certificado)" value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} />
                                <Input placeholder="Link o ID del archivo" value={nuevoTipoLink} onChange={(e) => setNuevoTipoLink(e.target.value)} />
                            </div>
                            <Button icon={Plus} loading={vinculando} disabled={vinculando} onClick={handleVincularTipo}>
                                Vincular
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            )}

            {tipos.length === 0 && (
                <Card>
                    <CardBody className="text-sm text-text-secondary">
                        Todavía no vinculaste ningún tipo de documento. Hacé clic en "Tipos de documento" arriba para agregar el primero.
                    </CardBody>
                </Card>
            )}

            {/* Grupos por mes */}
            <div className="space-y-3">
                {monthKeys.map((mes) => {
                    const items = grouped[mes].filter((r) => filtroEstado === 'todos' || r.estado === filtroEstado)
                    const entregadosMes = grouped[mes].filter((r) => r.estado === 'Entregado').length
                    const pendientesMes = grouped[mes].filter((r) => r.estado === 'Pendiente').length
                    const isOpen = !!expanded[mes]
                    const draft = getDraft(mes)

                    return (
                        <Card key={mes}>
                            <button
                                className="w-full px-5 py-3 flex items-center justify-between hover:bg-bg-hover transition-colors"
                                onClick={() => toggleMes(mes)}
                            >
                                <div className="flex items-center gap-2">
                                    {isOpen ? <ChevronDown className="w-4 h-4 text-text-secondary" /> : <ChevronRight className="w-4 h-4 text-text-secondary" />}
                                    <span className="font-semibold text-text-primary">{mes}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    {entregadosMes > 0 && <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium">{entregadosMes} entregados</span>}
                                    {pendientesMes > 0 && <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">{pendientesMes} pendientes</span>}
                                </div>
                            </button>

                            {isOpen && (
                                <CardBody className="pt-0 space-y-2">
                                    {items.map((r) => (
                                        <div key={r.id} className="flex flex-wrap items-center gap-3 py-2 border-b border-border-light/50 last:border-0">
                                            {editingId === r.id ? (
                                                <>
                                                    <select className="px-2 py-1 rounded border                                                  border-border bg-bg-card                                              text-text-primary text-sm" value={editDraft.documento} onChange={(e) => setEditDraft({ ...editDraft, documento: e.target.value })}>
                                                        <option value="">Elegir documento...</option>
                                                        {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                                                    </select>
                                                    <select className="px-2 py-1 rounded border border-border bg-bg-card text-text-primary text-sm" value={editDraft.cohorte} onChange={(e) => setEditDraft({ ...editDraft, cohorte: e.target.value })}>
                                                        {COHORTE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <input className="w-16 px-2 py-1 rounded border border-border bg-bg-card text-text-primary text-sm" value={editDraft.cantidad} onChange={(e) => setEditDraft({ ...editDraft, cantidad: e.target.value })} />
                                                    <input className="flex-1 min-w-[140px] px-2 py-1 rounded border border-border bg-bg-card text-text-primary text-sm" placeholder="Link opcional" value={editDraft.link} onChange={(e) => setEditDraft({ ...editDraft, link: e.target.value })} />
                                                    <button onClick={() => saveEdit(r.id)} className="text-secondary hover:opacity-70"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-text-muted hover:opacity-70"><X className="w-4 h-4" /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        className="text-primary hover:underline font-medium text-sm min-w-[160px] text-left"
                                                        onClick={() => links[r.documento] && window.open(links[r.documento].spreadsheetUrl, '_blank')}
                                                    >
                                                        {r.documento || 'Sin tipo'}
                                                    </button>
                                                    <span className="text-sm text-text-secondary min-w-[100px]">{r.cohorte}</span>
                                                    <span className="text-sm text-text-secondary w-10">{r.cantidad}</span>
                                                    <EstadoBadge estado={r.estado} />
                                                    <button
                                                        onClick={() => updateRecord(r.id, { estado: r.estado === 'Entregado' ? 'Pendiente' : 'Entregado' })}
                                                        className="text-xs text-primary hover:underline"
                                                    >
                                                        Marcar {r.estado === 'Entregado' ? 'pendiente' : 'entregado'}
                                                    </button>
                                                    <div className="flex-1" />
                                                    <button onClick={() => startEdit(r)} className="text-text-muted hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                                                    <button onClick={() => setRecordToDelete(r)} className="text-text-muted hover:text-error transition-colors"><X className="w-4 h-4" /></button>
                                                </>
                                            )}
                                        </div>
                                    ))}

                                    {/* Agregar a este mes */}
                                    <div className="flex flex-wrap items-center gap-2 pt-3">
                                        <select className="px-2 py-1.5 rounded border border-border bg-bg-card text-text-primary text-sm" value={draft.documento} onChange={(e) => setDraft(mes, { documento: e.target.value })}>
                                            <option value="">Elegir documento...</option>
                                            {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <select className="px-2 py-1.5 rounded border border-border bg-bg-card text-text-primary text-sm" value={draft.cohorte} onChange={(e) => setDraft(mes, { cohorte: e.target.value })}>
                                            {COHORTE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <input className="w-16 px-2 py-1.5 rounded border border-border bg-bg-card text-text-primary text-sm" placeholder="1" value={draft.cantidad} onChange={(e) => setDraft(mes, { cantidad: e.target.value })} />
                                        <input className="flex-1 min-w-[140px] px-2 py-1.5 rounded border border-border bg-bg-card text-text-primary text-sm" placeholder="Link de Drive (opcional)" value={draft.link} onChange={(e) => setDraft(mes, { link: e.target.value })} />
                                        <Button size="sm" icon={Plus} onClick={() => handleAgregarAMes(mes)}>Agregar a {mes}</Button>
                                    </div>
                                </CardBody>
                            )}
                        </Card>
                    )
                })}
            </div>

            {/* Agregar entrega para un mes nuevo */}
            <Card>
                <div className="px-5 py-4 border-b border-border-light">
                    <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Agregar entrega para un mes nuevo</h2>
                </div>
                <CardBody className="flex flex-wrap items-center gap-2">
                    <input className="w-32 px-2 py-1.5 rounded border border-border bg-bg-card text-text-primary text-sm" placeholder="Mes (ej. Septiembre)" value={newMonthDraft.mes} onChange={(e) => setNewMonthDraft({ ...newMonthDraft, mes: e.target.value })} />
                    <select className="px-2 py-1.5 rounded border border-border bg-bg-card text-text-primary text-sm" value={newMonthDraft.documento} onChange={(e) => setNewMonthDraft({ ...newMonthDraft, documento: e.target.value })}>
                        <option value="">Elegir documento...</option>
                        {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select className="px-2 py-1.5 rounded border border-border bg-bg-card text-text-primary text-sm" value={newMonthDraft.cohorte} onChange={(e) => setNewMonthDraft({ ...newMonthDraft, cohorte: e.target.value })}>
                        {COHORTE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className="w-16 px-2 py-1.5 rounded border border-border bg-bg-card text-text-primary text-sm" placeholder="1" value={newMonthDraft.cantidad} onChange={(e) => setNewMonthDraft({ ...newMonthDraft, cantidad: e.target.value })} />
                    <input className="flex-1 min-w-[140px] px-2 py-1.5 rounded border border-border bg-bg-card text-text-primary text-sm" placeholder="Link de Drive (opcional)" value={newMonthDraft.link} onChange={(e) => setNewMonthDraft({ ...newMonthDraft, link: e.target.value })} />
                    <Button icon={Plus} onClick={handleAgregarMesNuevo}>Agregar entrega</Button>
                </CardBody>
            </Card>

            {/* Modal de confirmación para eliminar registro */}
            <ConfirmModal
                isOpen={!!recordToDelete}
                onClose={() => setRecordToDelete(null)}
                onConfirm={() => {
                    if (recordToDelete) {
                        deleteRecord(recordToDelete.id)
                        toast.success('Registro eliminado')
                        setRecordToDelete(null)
                    }
                }}
                title="¿Desea borrar realmente este registro?"
                message={recordToDelete ? `Se eliminará la entrega de "${recordToDelete.documento || 'Documento'}" (${recordToDelete.mes || ''}). Esta acción no se puede deshacer.` : ''}
                confirmText="Sí, borrar"
                cancelText="Cancelar"
                variant="danger"
            />

            {/* Modal de confirmación para desvincular tipo de documento */}
            <ConfirmModal
                isOpen={!!tipoToUnlink}
                onClose={() => setTipoToUnlink(null)}
                onConfirm={() => {
                    if (tipoToUnlink) {
                        clearLink(tipoToUnlink)
                        toast.success(`Tipo "${tipoToUnlink}" desvinculado`)
                        setTipoToUnlink(null)
                    }
                }}
                title="¿Desea desvincular realmente este tipo de documento?"
                message={tipoToUnlink ? `Se quitará la vinculación de "${tipoToUnlink}". La hoja de cálculo no se borrará de Google Drive.` : ''}
                confirmText="Sí, desvincular"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    )
}