import { useState, useRef } from 'react'
import { Card, CardBody, CardHeader } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import ConfirmModal from '../../shared/components/ConfirmModal'
import {
    ChevronDown, ChevronRight, Pencil, X, RefreshCw, Briefcase,
    Sliders, ExternalLink, Trash2, Plus, Check, Download,
    FileText, Image as ImageIcon, Camera, Link2, Upload, Eye,
    AlertTriangle, Sparkles
} from 'lucide-react'
import useFPAdminRecordsStore from '../../core/stores/useFPAdminRecordsStore'
import useFPAdminLinksStore from '../../core/stores/useFPAdminLinksStore'
import { syncFPAdminRecords, linkFPDocument, readFPRows, extractSpreadsheetId } from '../../infrastructure/google/sheetsService'
import { isAuthError, notifyAuthExpired } from '../../utils/authErrorHelper'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import { isGoogleConfigured } from '../../infrastructure/google/googleConfig'
import { saveFPCloudRegistry, autoDiscoverAndSyncCloudRegistry } from '../../infrastructure/google/fpCloudRegistry'
import toast from 'react-hot-toast'

const DOCUMENTOS_DEFAULT = [
    'Planilla de asistencia',
    'Libro de temas',
    'Acta de examen',
    'Asistencia de alumnos',
    'Tema y asistencia del instructor',
]

const COHORTE_OPTIONS = ['Sin cohorte', '1er cohorte', '2da cohorte', '3er cohorte', '4ta cohorte']
const CANTIDAD_OPTIONS = ['1', '2', '3', '4', '5']
const MESES_ORDEN = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Modal para previsualizar la foto del archivo firmado entregado
function FotoFirmadaModal({ isOpen, onClose, record, onSavePhoto }) {
    if (!isOpen || !record) return null

    const photoUrl = record.fotoFirmada || record.comprobanteUrl || ''
    const fileInputRef = useRef(null)

    const isDirectImage = photoUrl && (
        photoUrl.startsWith('data:image/') ||
        photoUrl.startsWith('blob:') ||
        /\.(jpg|jpeg|png|webp|gif|svg)($|\?)/i.test(photoUrl)
    )

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor seleccioná un archivo de imagen (PNG, JPG, etc.)')
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = reader.result
            onSavePhoto(record.id, { fotoFirmada: dataUrl, comprobanteUrl: dataUrl })
            toast.success('Foto firmada actualizada')
        }
        reader.readAsDataURL(file)
    }

    const handleQuitar = () => {
        onSavePhoto(record.id, { fotoFirmada: '', comprobanteUrl: '' })
        toast.success('Foto eliminada')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
            <div className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-bg-hover/50">
                    <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-primary" />
                        <div>
                            <h3 className="font-bold text-text-primary text-base">Foto del Documento Firmado</h3>
                            <p className="text-xs text-text-muted">
                                {record.documento} • {record.mes} • {record.cohorte}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                    {photoUrl ? (
                        <div className="space-y-3">
                            {isDirectImage ? (
                                <div className="rounded-xl overflow-hidden border border-border bg-black/20 flex items-center justify-center p-2 max-h-[55vh]">
                                    <img
                                        src={photoUrl}
                                        alt="Documento firmado"
                                        className="max-h-[50vh] w-auto max-w-full rounded-lg object-contain shadow-md"
                                    />
                                </div>
                            ) : (
                                <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-3 text-center">
                                    <Link2 className="w-8 h-8 text-primary" />
                                    <div>
                                        <p className="font-semibold text-text-primary text-sm">Enlace a imagen o Drive</p>
                                        <p className="text-xs text-text-muted max-w-md truncate mt-0.5">{photoUrl}</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={ExternalLink}
                                        onClick={() => window.open(photoUrl, '_blank')}
                                    >
                                        Abrir enlace de la foto
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 border-2 border-dashed border-border-light rounded-xl flex flex-col items-center justify-center text-center text-text-muted space-y-2">
                            <Camera className="w-10 h-10 stroke-1 text-text-muted" />
                            <p className="text-sm font-medium">Aún no cargaste la foto del papel firmado</p>
                            <p className="text-xs">Podés adjuntar una captura o foto desde tu celular o computadora.</p>
                        </div>
                    )}

                    <div className="pt-2 flex items-center justify-center gap-2">
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            icon={Upload}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {photoUrl ? 'Cambiar foto' : 'Subir foto firmada'}
                        </Button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-border bg-bg-hover/30 flex items-center justify-between">
                    {photoUrl ? (
                        <Button variant="ghost" size="sm" icon={Trash2} onClick={handleQuitar} className="text-error hover:bg-error/10">
                            Eliminar foto
                        </Button>
                    ) : <div />}
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </div>
        </div>
    )
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

    // Subtítulo personalizable (como en la captura del usuario)
    const [subtitle, setSubtitle] = useState(() => {
        return localStorage.getItem('adi_fp_admin_subtitle') || 'Entregas a Sra. Secretaria Lorena — Programación'
    })
    const [editingSubtitle, setEditingSubtitle] = useState(false)
    const [subtitleDraft, setSubtitleDraft] = useState(subtitle)

    const saveSubtitle = () => {
        const val = subtitleDraft.trim() || 'Control mensual de papeles entregados'
        setSubtitle(val)
        localStorage.setItem('adi_fp_admin_subtitle', val)
        setEditingSubtitle(false)
    }

    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [expanded, setExpanded] = useState({})
    const [editingId, setEditingId] = useState(null)
    const [editDraft, setEditDraft] = useState({})
    const [draftByMonth, setDraftByMonth] = useState({})

    // Formulario principal de alta de entrega (orden solicitado por el usuario)
    const [mainForm, setMainForm] = useState({
        mes: 'Abril',
        cantidad: '1',
        documento: 'Planilla de asistencia',
        documentoPersonalizado: '',
        cohorte: '1er cohorte',
        estado: 'Entregado', // 'Pendiente' | 'Entregado'
        link: '',
        fotoFirmada: '',
    })

    const [syncing, setSyncing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [recordToDelete, setRecordToDelete] = useState(null)
    const [tipoToUnlink, setTipoToUnlink] = useState(null)
    const [modalPhotoRecord, setModalPhotoRecord] = useState(null)

    const [mostrarTipos, setMostrarTipos] = useState(false)
    const [nuevoTipo, setNuevoTipo] = useState('')
    const [nuevoTipoLink, setNuevoTipoLink] = useState('')
    const [vinculando, setVinculando] = useState(false)

    const mainFileInputRef = useRef(null)
    const editFileInputRef = useRef(null)

    // Lista combinada de documentos disponibles
    const documentosDisponibles = Array.from(new Set([
        ...DOCUMENTOS_DEFAULT,
        ...tipos,
        ...records.map((r) => r.documento).filter(Boolean)
    ]))

    const handleLoadFromSheets = async () => {
        if (!isGoogleConfigured()) {
            toast.error('Primero vinculá tu cuenta de Google en Configuración')
            return
        }
        setLoading(true)
        const toastId = toast.loading('Descargando registros desde Google Drive...')
        try {
            // 1. Descargar del registro maestro en la nube de Google Drive (restaura entre PC y Celu)
            await autoDiscoverAndSyncCloudRegistry()

            // 2. Si tiene tipos de documento con hojas de Sheets específicas vinculadas, actualizar también desde allí
            if (tipos.length > 0) {
                let allRecords = []
                for (const tipo of tipos) {
                    const rows = await readFPRows(links[tipo].spreadsheetId, links[tipo].sheetTitle, 'A2:H')
                    const parsed = rows
                        .filter((row) => row[0])
                        .map((row) => ({
                            id: row[0],
                            mes: row[1] || '',
                            documento: row[2] || tipo,
                            cohorte: row[3] || 'Sin cohorte',
                            cantidad: row[4] || '1',
                            estado: row[5] || 'Pendiente',
                            link: row[6] || '',
                            comprobanteUrl: row[7] || '',
                            fotoFirmada: row[7] || '',
                        }))
                    allRecords = [...allRecords, ...parsed]
                }
                if (allRecords.length > 0) {
                    setRecords(allRecords)
                }
            }

            toast.dismiss(toastId)
            const currentTotal = useFPAdminRecordsStore.getState().records.length
            toast.success(`¡Actualizado! ${currentTotal} papeles listos en este dispositivo`)
        } catch (error) {
            toast.dismiss(toastId)
            if (isAuthError(error)) {
                notifyAuthExpired(handleLoadFromSheets)
            } else {
                toast.error('Error al traer los datos desde Google')
            }
        } finally {
            setLoading(false)
        }
    }

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

    // Iniciar edición de una fila (Image 2)
    const startEdit = (r) => {
        setEditingId(r.id)
        setEditDraft({
            mes: r.mes,
            documento: r.documento,
            cohorte: r.cohorte,
            cantidad: r.cantidad || '1',
            link: r.link || '',
            fotoFirmada: r.fotoFirmada || r.comprobanteUrl || '',
        })
    }

    // Guardar edición
    const saveEdit = (id) => {
        updateRecord(id, {
            documento: editDraft.documento,
            cohorte: editDraft.cohorte,
            cantidad: editDraft.cantidad || '1',
            link: editDraft.link || '',
            fotoFirmada: editDraft.fotoFirmada || '',
            comprobanteUrl: editDraft.fotoFirmada || '',
        })
        setEditingId(null)
        toast.success('Registro actualizado')
    }

    // Manejo de foto firmada durante la edición de fila
    const handleEditFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor seleccioná un archivo de imagen')
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = reader.result
            setEditDraft((prev) => ({ ...prev, fotoFirmada: dataUrl }))
            toast.success('Foto firmada cargada en el borrador')
        }
        reader.readAsDataURL(file)
    }

    // Manejo del formulario rápido inferior dentro de cada mes
    const getDraft = (mes) => draftByMonth[mes] || {
        documento: 'Planilla de asistencia',
        cohorte: 'Sin cohorte',
        cantidad: '1',
        link: '',
    }
    const setDraft = (mes, data) => setDraftByMonth((prev) => ({ ...prev, [mes]: { ...getDraft(mes), ...data } }))

    const handleAgregarAMes = (mes) => {
        const draft = getDraft(mes)
        if (!draft.documento) {
            toast.error('Elegí un tipo de documento')
            return
        }
        addRecord({
            mes,
            documento: draft.documento,
            cohorte: draft.cohorte || 'Sin cohorte',
            cantidad: draft.cantidad || '1',
            link: draft.link || '',
            fotoFirmada: '',
            comprobanteUrl: '',
            estado: 'Entregado',
        })
        setDraftByMonth((prev) => ({
            ...prev,
            [mes]: { documento: 'Planilla de asistencia', cohorte: 'Sin cohorte', cantidad: '1', link: '' }
        }))
        toast.success(`Agregado a ${mes}`)
    }

    // Agregar desde la card principal superior (orden solicitado por el usuario)
    const handleMainFormSubmit = (e) => {
        e?.preventDefault()
        const mesElegido = mainForm.mes.trim()
        if (!mesElegido) {
            toast.error('Indicá el mes')
            return
        }
        const docFinal = mainForm.documento === '__custom__'
            ? mainForm.documentoPersonalizado.trim()
            : mainForm.documento

        if (!docFinal) {
            toast.error('Elegí o escribí el nombre del archivo')
            return
        }

        addRecord({
            mes: mesElegido,
            cantidad: mainForm.cantidad || '1',
            documento: docFinal,
            cohorte: mainForm.cohorte || 'Sin cohorte',
            estado: mainForm.estado || 'Entregado',
            link: mainForm.link || '',
            fotoFirmada: mainForm.fotoFirmada || '',
            comprobanteUrl: mainForm.fotoFirmada || '',
        })

        // Expandir automáticamente el mes creado
        setExpanded((prev) => ({ ...prev, [mesElegido]: true }))
        toast.success(`Papel registrado en ${mesElegido}`)

        // Resetear campos conservando el mes para facilitar cargas continuas
        setMainForm((prev) => ({
            ...prev,
            documentoPersonalizado: '',
            link: '',
            fotoFirmada: '',
        }))
    }

    const handleMainFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor seleccioná un archivo de imagen')
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            const dataUrl = reader.result
            setMainForm((prev) => ({
                ...prev,
                fotoFirmada: dataUrl,
                estado: 'Entregado',
            }))
            toast.success('Foto firmada adjuntada correctamente')
        }
        reader.readAsDataURL(file)
    }

    const handleSync = async () => {
        if (!isGoogleConfigured()) {
            toast.error('Primero vinculá tu cuenta de Google en Configuración')
            return
        }
        setSyncing(true)
        const toastId = toast.loading('Guardando en Google Drive...')
        try {
            // 1. Guardar en el registro en la nube de Google Drive (para celular y sincronización total)
            const ok = await saveFPCloudRegistry()

            // 2. Si hay tipos vinculados a hojas de cálculo dedicadas, sincronizarlas también
            if (tipos.length > 0) {
                for (const tipo of tipos) {
                    const grupo = records.filter((r) => r.documento === tipo)
                    await syncFPAdminRecords(links[tipo].spreadsheetId, links[tipo].sheetTitle, grupo)
                }
            }

            toast.dismiss(toastId)
            if (ok) {
                toast.success('¡Sincronizado con Google Drive! Listo para abrir en el celular')
            } else {
                toast.error('No se pudo guardar el registro en Google Drive')
            }
        } catch (error) {
            toast.dismiss(toastId)
            if (isAuthError(error)) {
                notifyAuthExpired(handleSync)
            } else {
                toast.error('Error al sincronizar con Google')
            }
        } finally {
            setSyncing(false)
        }
    }

    const MAIN_DOC_LABELS = { course: 'Ficha de Curso', topicAttendance: 'Tema y Asistencia', attendanceSheet: 'Asistencia de Alumnos', examAct: 'Acta de Examen' }

    const handleVincularTipo = async () => {
        if (!isGoogleConfigured()) {
            toast.error('Primero vinculá tu cuenta de Google (en Configuración)')
            return
        }
        if (!nuevoTipo.trim() || !nuevoTipoLink.trim()) {
            toast.error('Completá el nombre y el link')
            return
        }

        const idNuevo = extractSpreadsheetId(nuevoTipoLink)

        for (const [key, label] of Object.entries(MAIN_DOC_LABELS)) {
            if (mainDocLinks[key] && mainDocLinks[key].spreadsheetId === idNuevo) {
                toast.error(`Ese archivo ya está en uso por "${label}". Usá un archivo dedicado para Administrativo.`)
                return
            }
        }
        for (const t of tipos) {
            if (links[t].spreadsheetId === idNuevo) {
                toast.error(`Ese archivo ya está vinculado al tipo "${t}".`)
                return
            }
        }

        setVinculando(true)
        try {
            const result = await linkFPDocument(nuevoTipoLink)
            setLink(nuevoTipo.trim(), result)
            toast.success(`"${nuevoTipo.trim()}" vinculado exitosamente`)
            setNuevoTipo('')
            setNuevoTipoLink('')
        } catch (error) {
            toast.error('No se pudo vincular ese archivo')
        } finally {
            setVinculando(false)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
            {/* Header con título y subtítulo editable */}
            <div>
                <div className="flex items-center gap-3">
                    <span className="text-2xl">📋</span>
                    <h1 className="text-2xl font-black text-text-primary tracking-tight">
                        Registro de Papeles Entregados
                    </h1>
                </div>

                <div className="mt-1 flex items-center gap-2">
                    {editingSubtitle ? (
                        <div className="flex items-center gap-2">
                            <input
                                className="px-2.5 py-1 text-xs rounded-lg border border-border bg-bg-card text-text-primary"
                                value={subtitleDraft}
                                onChange={(e) => setSubtitleDraft(e.target.value)}
                                placeholder="Ej: Entregas a Secretaría..."
                            />
                            <button onClick={saveSubtitle} className="text-secondary hover:opacity-75 cursor-pointer"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingSubtitle(false)} className="text-text-muted hover:opacity-75 cursor-pointer"><X className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <p className="text-xs text-text-secondary flex items-center gap-1.5">
                            <span>{subtitle}</span>
                            <button
                                onClick={() => { setSubtitleDraft(subtitle); setEditingSubtitle(true) }}
                                className="text-text-muted hover:text-primary transition-colors p-0.5 cursor-pointer"
                                title="Editar destinatario o detalle"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        </p>
                    )}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border border-border-light shadow-xs">
                    <CardBody className="text-center py-5">
                        <p className="text-4xl font-black text-text-primary tracking-tight">{totalRegistros}</p>
                        <p className="text-xs font-semibold text-text-secondary mt-1 uppercase tracking-wider">Total registros</p>
                    </CardBody>
                </Card>
                <Card className="border border-secondary/20 bg-secondary/5 shadow-xs">
                    <CardBody className="text-center py-5">
                        <p className="text-4xl font-black text-secondary tracking-tight">{totalEntregados}</p>
                        <p className="text-xs font-semibold text-secondary mt-1 uppercase tracking-wider">Entregados</p>
                    </CardBody>
                </Card>
                <Card className="border border-warning/20 bg-warning/5 shadow-xs">
                    <CardBody className="text-center py-5">
                        <p className="text-4xl font-black text-warning tracking-tight">{totalPendientes}</p>
                        <p className="text-xs font-semibold text-warning mt-1 uppercase tracking-wider">Pendientes</p>
                    </CardBody>
                </Card>
            </div>

            {/* Card Superior: Solicitar mes, cantidad de copias, nombre de archivo, cohorte, estado y comprobante */}
            <Card className="border border-border/80 shadow-md overflow-hidden bg-bg-card">
                <div className="px-5 py-3.5 border-b border-border-light bg-bg-hover/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary" />
                        <h2 className="text-sm font-bold text-text-primary tracking-wide">
                            Registrar Documento / Iniciar Mes
                        </h2>
                    </div>
                    <span className="text-[11px] text-text-muted hidden sm:inline">
                        El nombre del archivo se transformará en el enlace directo
                    </span>
                </div>
                <CardBody className="p-5">
                    <form onSubmit={handleMainFormSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {/* 1. Mes */}
                            <div>
                                <label className="block text-xs font-bold text-text-secondary mb-1">
                                    1. Mes
                                </label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text-primary text-sm focus:border-primary focus:outline-none"
                                    value={mainForm.mes}
                                    onChange={(e) => setMainForm({ ...mainForm, mes: e.target.value })}
                                >
                                    {MESES_ORDEN.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Cantidad de Copias */}
                            <div>
                                <label className="block text-xs font-bold text-text-secondary mb-1">
                                    2. Cant. Copias
                                </label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text-primary text-sm focus:border-primary focus:outline-none"
                                    value={mainForm.cantidad}
                                    onChange={(e) => setMainForm({ ...mainForm, cantidad: e.target.value })}
                                >
                                    {CANTIDAD_OPTIONS.map((c) => (
                                        <option key={c} value={c}>{c} {c === '1' ? 'copia' : 'copias'}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. Nombre del archivo */}
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-text-secondary mb-1">
                                    3. Nombre del archivo
                                </label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text-primary text-sm focus:border-primary focus:outline-none"
                                    value={mainForm.documento}
                                    onChange={(e) => setMainForm({ ...mainForm, documento: e.target.value })}
                                >
                                    {documentosDisponibles.map((doc) => (
                                        <option key={doc} value={doc}>{doc}</option>
                                    ))}
                                    <option value="__custom__">+ Otro documento personalizado...</option>
                                </select>
                                {mainForm.documento === '__custom__' && (
                                    <input
                                        className="mt-2 w-full px-3 py-1.5 rounded-lg border border-border bg-bg text-text-primary text-xs"
                                        placeholder="Escribí el nombre del archivo..."
                                        value={mainForm.documentoPersonalizado}
                                        onChange={(e) => setMainForm({ ...mainForm, documentoPersonalizado: e.target.value })}
                                        autoFocus
                                    />
                                )}
                            </div>

                            {/* 4. Cohorte */}
                            <div>
                                <label className="block text-xs font-bold text-text-secondary mb-1">
                                    4. Cohorte
                                </label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-text-primary text-sm focus:border-primary focus:outline-none"
                                    value={mainForm.cohorte}
                                    onChange={(e) => setMainForm({ ...mainForm, cohorte: e.target.value })}
                                >
                                    {COHORTE_OPTIONS.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 5. Estado */}
                            <div>
                                <label className="block text-xs font-bold text-text-secondary mb-1">
                                    5. Estado inicial
                                </label>
                                <select
                                    className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold focus:outline-none transition-colors ${
                                        mainForm.estado === 'Entregado'
                                            ? 'border-secondary/40 bg-secondary/10 text-secondary'
                                            : 'border-warning/40 bg-warning/10 text-warning'
                                    }`}
                                    value={mainForm.estado}
                                    onChange={(e) => setMainForm({ ...mainForm, estado: e.target.value })}
                                >
                                    <option value="Entregado">✓ Entregado</option>
                                    <option value="Pendiente">▲ Falta entregar</option>
                                </select>
                            </div>
                        </div>

                        {/* 6. Enlace al archivo y Foto firmada opcional */}
                        <div className="pt-2 border-t border-border-light flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[260px]">
                                <Input
                                    placeholder="Pegá el Link de Google Sheets o Drive para enlazar al nombre del archivo..."
                                    value={mainForm.link}
                                    onChange={(e) => setMainForm({ ...mainForm, link: e.target.value })}
                                    className="text-xs"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={mainFileInputRef}
                                    onChange={handleMainFileChange}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant={mainForm.fotoFirmada ? 'secondary' : 'outline'}
                                    size="sm"
                                    icon={Camera}
                                    onClick={() => mainFileInputRef.current?.click()}
                                    title="Opcional: Adjuntar foto del archivo firmado"
                                >
                                    {mainForm.fotoFirmada ? 'Foto adjuntada ✓' : 'Foto firmada (opcional)'}
                                </Button>
                                {mainForm.fotoFirmada && (
                                    <button
                                        type="button"
                                        onClick={() => setMainForm({ ...mainForm, fotoFirmada: '' })}
                                        className="text-text-muted hover:text-error text-xs p-1 cursor-pointer"
                                        title="Quitar foto"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <Button type="submit" icon={Plus} className="shadow-sm">
                                Registrar Entrega
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>

            {/* Filtros y acciones globales */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
                <select
                    className="px-3 py-2 rounded-lg border border-border bg-bg-card text-text-primary text-sm focus:outline-none"
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                >
                    <option value="todos">Todos los estados</option>
                    <option value="Pendiente">Falta entregar</option>
                    <option value="Entregado">Entregados</option>
                </select>
                <Button variant="outline" size="sm" onClick={expandirTodo}>Expandir todo</Button>
                <Button variant="outline" size="sm" onClick={colapsarTodo}>Colapsar todo</Button>
                <Button variant="outline" size="sm" icon={Sliders} onClick={() => setMostrarTipos((v) => !v)}>
                    Vincular a Drive ({tipos.length})
                </Button>
                <div className="flex-1" />
                <Button variant="outline" size="sm" icon={Download} loading={loading} disabled={loading} onClick={handleLoadFromSheets} title="Descarga los meses y papeles guardados en tu Google Drive">
                    Actualizar / Traer de Drive
                </Button>
                <Button size="sm" icon={RefreshCw} loading={syncing} disabled={syncing} onClick={handleSync} title="Guarda tus registros en Google Drive para verlos en tu celular">
                    Sincronizar con Drive
                </Button>
            </div>

            {/* Panel de tipos de documento vinculados (colapsable) */}
            {mostrarTipos && (
                <Card className="border border-border">
                    <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-text-primary">Archivos de Google Sheets Dedicados</h2>
                            <p className="text-xs text-text-secondary mt-0.5">
                                Podés sincronizar los registros de cada documento con una hoja de cálculo dedicada en tu Google Drive.
                            </p>
                        </div>
                        <button onClick={() => setMostrarTipos(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <CardBody className="space-y-4">
                        {tipos.length > 0 && (
                            <div className="space-y-2">
                                {tipos.map((tipo) => (
                                    <div key={tipo} className="flex items-center justify-between border border-border-light rounded-xl p-3 bg-bg-hover/30">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" />
                                            <p className="font-medium text-text-primary text-sm">{tipo}</p>
                                        </div>
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
                        <div className="border border-dashed border-border-light rounded-xl p-4 space-y-3 bg-bg-hover/10">
                            <p className="text-sm font-semibold text-text-primary">Vincular nuevo tipo de documento a Google Sheets</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Input placeholder="Nombre del tipo (ej. Planilla de asistencia)" value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} />
                                <Input placeholder="Link o ID del archivo de Google Sheets" value={nuevoTipoLink} onChange={(e) => setNuevoTipoLink(e.target.value)} />
                            </div>
                            <Button icon={Plus} loading={vinculando} disabled={vinculando} onClick={handleVincularTipo}>
                                Vincular Hoja
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Listado de Meses en Desplegables (Acordeones idénticos a Image 1 e Image 2) */}
            <div className="space-y-3">
                {monthKeys.length === 0 ? (
                    <Card className="border border-border">
                        <CardBody className="text-center py-12 text-text-secondary">
                            <FileText className="w-12 h-12 mx-auto stroke-1 text-text-muted mb-2 opacity-50" />
                            <p className="text-base font-semibold text-text-primary">No hay papeles registrados todavía</p>
                            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                                Usá la card superior para registrar el primer papel entregado o pendiente del mes correspondiente.
                            </p>
                        </CardBody>
                    </Card>
                ) : (
                    monthKeys.map((mes) => {
                        const items = grouped[mes].filter((r) => filtroEstado === 'todos' || r.estado === filtroEstado)
                        const entregadosMes = grouped[mes].filter((r) => r.estado === 'Entregado').length
                        const pendientesMes = grouped[mes].filter((r) => r.estado === 'Pendiente').length
                        const isOpen = !!expanded[mes]
                        const draft = getDraft(mes)

                        return (
                            <Card key={mes} className="border border-border overflow-hidden transition-all duration-200">
                                {/* Encabezado del mes */}
                                <button
                                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-bg-hover transition-colors bg-bg-card cursor-pointer"
                                    onClick={() => toggleMes(mes)}
                                >
                                    <div className="flex items-center gap-2.5">
                                        {isOpen ? (
                                            <ChevronDown className="w-4 h-4 text-text-secondary transition-transform" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-text-secondary transition-transform" />
                                        )}
                                        <span className="font-bold text-text-primary text-base tracking-tight">{mes}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-semibold">
                                        {entregadosMes > 0 && (
                                            <span className="px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/20">
                                                {entregadosMes} {entregadosMes === 1 ? 'entregado' : 'entregados'}
                                            </span>
                                        )}
                                        {pendientesMes > 0 && (
                                            <span className="px-2.5 py-1 rounded-full bg-warning/15 text-warning border border-warning/20">
                                                {pendientesMes} {pendientesMes === 1 ? 'pendiente' : 'pendientes'}
                                            </span>
                                        )}
                                    </div>
                                </button>

                                {/* Contenido expandido del mes */}
                                {isOpen && (
                                    <CardBody className="p-4 pt-1 space-y-2 border-t border-border-light/50 bg-bg/40">
                                        {items.length === 0 ? (
                                            <p className="text-xs text-text-muted py-3 text-center italic">
                                                No hay registros con el filtro seleccionado para {mes}.
                                            </p>
                                        ) : (
                                            items.map((r) => {
                                                const isPendiente = r.estado === 'Pendiente'
                                                const targetUrl = r.link || (links[r.documento] && links[r.documento].spreadsheetUrl)
                                                const hasFoto = !!(r.fotoFirmada || r.comprobanteUrl)

                                                return (
                                                    <div
                                                        key={r.id}
                                                        className={`flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                                                            isPendiente
                                                                ? 'bg-amber-950/20 hover:bg-amber-950/30 border border-amber-600/35 text-amber-200 shadow-xs'
                                                                : 'bg-bg-card hover:bg-bg-hover border border-border-light/70 text-text-primary'
                                                        }`}
                                                    >
                                                        {editingId === r.id ? (
                                                            // Modo Edición (Idéntico a Image 2)
                                                            <div className="flex flex-wrap items-center gap-2 w-full">
                                                                <select
                                                                    className="px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-primary text-xs focus:outline-none"
                                                                    value={editDraft.documento}
                                                                    onChange={(e) => setEditDraft({ ...editDraft, documento: e.target.value })}
                                                                >
                                                                    {documentosDisponibles.map((doc) => (
                                                                        <option key={doc} value={doc}>{doc}</option>
                                                                    ))}
                                                                </select>

                                                                <select
                                                                    className="px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-primary text-xs focus:outline-none"
                                                                    value={editDraft.cohorte}
                                                                    onChange={(e) => setEditDraft({ ...editDraft, cohorte: e.target.value })}
                                                                >
                                                                    {COHORTE_OPTIONS.map((c) => (
                                                                        <option key={c} value={c}>{c}</option>
                                                                    ))}
                                                                </select>

                                                                <input
                                                                    className="w-14 px-2 py-1.5 rounded-lg border border-border bg-bg-card text-text-primary text-xs text-center focus:outline-none"
                                                                    value={editDraft.cantidad}
                                                                    onChange={(e) => setEditDraft({ ...editDraft, cantidad: e.target.value })}
                                                                    title="Cantidad de copias"
                                                                />

                                                                <input
                                                                    className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-primary text-xs focus:outline-none"
                                                                    placeholder="https://docs.google.com/spreadsheets/..."
                                                                    value={editDraft.link}
                                                                    onChange={(e) => setEditDraft({ ...editDraft, link: e.target.value })}
                                                                />

                                                                {/* Foto firmada opcional en modo edición */}
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    ref={editFileInputRef}
                                                                    onChange={handleEditFileChange}
                                                                    className="hidden"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => editFileInputRef.current?.click()}
                                                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                                                        editDraft.fotoFirmada
                                                                            ? 'border-secondary/50 text-secondary bg-secondary/10'
                                                                            : 'border-border text-text-muted hover:text-primary hover:bg-bg-hover'
                                                                    }`}
                                                                    title={editDraft.fotoFirmada ? 'Foto firmada cargada (clic para cambiar)' : 'Adjuntar foto firmada'}
                                                                >
                                                                    <Camera className="w-4 h-4" />
                                                                </button>

                                                                {/* Guardar (Checkmark violeta/acento como en Image 2) */}
                                                                <button
                                                                    onClick={() => saveEdit(r.id)}
                                                                    className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                                                                    title="Guardar cambios"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>

                                                                {/* Cancelar (Cruz como en Image 2) */}
                                                                <button
                                                                    onClick={() => setEditingId(null)}
                                                                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
                                                                    title="Cancelar"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            // Vista Normal (Idéntico a Image 1)
                                                            <>
                                                                <FileText className={`w-4 h-4 shrink-0 ${isPendiente ? 'text-amber-400' : 'text-text-muted'}`} />

                                                                {/* Nombre del archivo que se transforma en el enlace directo */}
                                                                <div className="min-w-[190px] flex-1 sm:flex-initial flex items-center gap-1.5">
                                                                    {targetUrl ? (
                                                                        <a
                                                                            href={targetUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-primary hover:underline hover:text-primary-dark font-medium text-sm tracking-tight cursor-pointer inline-flex items-center gap-1"
                                                                            title={`Abrir ${r.documento} en Google Sheets / Drive`}
                                                                        >
                                                                            <span>{r.documento || 'Sin nombre'}</span>
                                                                        </a>
                                                                    ) : (
                                                                        <span
                                                                            onClick={() => startEdit(r)}
                                                                            className="font-medium text-sm tracking-tight text-text-primary cursor-pointer hover:text-primary transition-colors"
                                                                            title="Hacé clic en el lápiz para agregarle un enlace a este archivo"
                                                                        >
                                                                            {r.documento || 'Sin nombre'}
                                                                        </span>
                                                                    )}

                                                                    {/* Ícono de foto firmada opcional (solo si tiene foto cargada) */}
                                                                    {hasFoto && (
                                                                        <button
                                                                            onClick={() => setModalPhotoRecord(r)}
                                                                            className="p-0.5 text-text-muted hover:text-primary transition-colors cursor-pointer"
                                                                            title="Ver foto del documento firmado"
                                                                        >
                                                                            <Camera className="w-3.5 h-3.5 text-emerald-400" />
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Cohorte */}
                                                                <span className={`text-xs min-w-[110px] ${isPendiente ? 'text-amber-300/90 font-medium' : 'text-text-secondary'}`}>
                                                                    {r.cohorte}
                                                                </span>

                                                                {/* Cantidad de copias */}
                                                                <span className={`text-xs font-bold w-8 text-center ${isPendiente ? 'text-amber-300' : 'text-text-secondary'}`}>
                                                                    {r.cantidad || '1'}
                                                                </span>

                                                                {/* Badge de estado (✓ Entregado / ▲ Falta entregar) */}
                                                                <button
                                                                    onClick={() => updateRecord(r.id, { estado: isPendiente ? 'Entregado' : 'Pendiente' })}
                                                                    className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                                                                        isPendiente
                                                                            ? 'bg-warning/20 text-warning border border-warning/40 hover:bg-warning/30'
                                                                            : 'bg-secondary/20 text-secondary border border-secondary/40 hover:bg-secondary/30'
                                                                    }`}
                                                                    title="Hacé clic para alternar entre Entregado y Falta entregar"
                                                                >
                                                                    {isPendiente ? (
                                                                        <>
                                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                                            <span>Falta entregar</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Check className="w-3.5 h-3.5" />
                                                                            <span>Entregado</span>
                                                                        </>
                                                                    )}
                                                                </button>

                                                                <div className="flex-1" />

                                                                {/* Botones de acción: Lápiz (Editar) y Cruz (Eliminar) como en Image 1 */}
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <button
                                                                        onClick={() => startEdit(r)}
                                                                        className="p-1 rounded-md text-warning/80 hover:text-warning hover:bg-bg-hover transition-colors cursor-pointer"
                                                                        title="Editar este registro (abrir link, cohorte, etc.)"
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setRecordToDelete(r)}
                                                                        className="p-1 rounded-md text-text-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                                                                        title="Eliminar registro"
                                                                    >
                                                                        <X className="w-4 h-4 text-text-muted hover:text-error" />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}

                                        {/* Barra rápida inferior para agregar más papeles dentro del mes (idéntico a Image 1 e Image 2) */}
                                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border-light/40">
                                            <select
                                                className="px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-primary text-xs focus:outline-none"
                                                value={draft.documento}
                                                onChange={(e) => setDraft(mes, { documento: e.target.value })}
                                            >
                                                {documentosDisponibles.map((doc) => (
                                                    <option key={doc} value={doc}>{doc}</option>
                                                ))}
                                            </select>

                                            <select
                                                className="px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-primary text-xs focus:outline-none"
                                                value={draft.cohorte}
                                                onChange={(e) => setDraft(mes, { cohorte: e.target.value })}
                                            >
                                                {COHORTE_OPTIONS.map((c) => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>

                                            <input
                                                className="w-14 px-2 py-1.5 rounded-lg border border-border bg-bg-card text-text-primary text-xs text-center focus:outline-none"
                                                placeholder="1"
                                                value={draft.cantidad}
                                                onChange={(e) => setDraft(mes, { cantidad: e.target.value })}
                                                title="Cantidad de copias"
                                            />

                                            <input
                                                className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border border-border bg-bg-card text-text-primary text-xs focus:outline-none"
                                                placeholder="Link de Drive (opcional)"
                                                value={draft.link}
                                                onChange={(e) => setDraft(mes, { link: e.target.value })}
                                            />

                                            <Button
                                                size="sm"
                                                icon={Plus}
                                                onClick={() => handleAgregarAMes(mes)}
                                                className="font-bold text-xs"
                                            >
                                                + Agregar a {mes}
                                            </Button>
                                        </div>
                                    </CardBody>
                                )}
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Modal de Previsualización de Foto Firmada */}
            <FotoFirmadaModal
                isOpen={!!modalPhotoRecord}
                onClose={() => setModalPhotoRecord(null)}
                record={modalPhotoRecord}
                onSavePhoto={(id, data) => updateRecord(id, data)}
            />

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