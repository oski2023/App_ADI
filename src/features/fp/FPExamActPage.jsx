import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import Modal from '../../shared/components/Modal'
import ConfirmModal from '../../shared/components/ConfirmModal'
import { Plus, Trash2, ArrowLeft, FileText, Calculator, RefreshCw, CloudDownload, Link2 } from 'lucide-react'
import useFPExamActStore from '../../core/stores/useFPExamActStore'
import useFPCourseStore from '../../core/stores/useFPCourseStore'
import useFPAttendanceSheetStore from '../../core/stores/useFPAttendanceSheetStore'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import { numberToWordsEs } from '../../utils/numberToWordsEs'
import {
    syncFPExamActSheet,
    readFPExamActSheet,
    readAllFPExamActSheets,
    deleteFPSpreadsheetTab,
    buildFPExamActTabTitle,
    linkFPDocument,
} from '../../infrastructure/google/sheetsService'
import { isAuthError, notifyAuthExpired } from '../../utils/authErrorHelper'
import toast from 'react-hot-toast'

const RESUMEN_FIELDS = [
    { key: 'inscriptos', label: 'Inscriptos' },
    { key: 'examinados', label: 'Examinados' },
    { key: 'ausentes', label: 'Ausentes' },
    { key: 'desaprobados', label: 'Desaprobados' },
    { key: 'aprobados', label: 'Aprobados' },
]

export default function FPExamActPage() {
    const courses = useFPCourseStore((s) => s.courses)
    const acts = useFPExamActStore((s) => s.acts)
    const addAct = useFPExamActStore((s) => s.addAct)
    const updateAct = useFPExamActStore((s) => s.updateAct)
    const updateResumen = useFPExamActStore((s) => s.updateResumen)
    const deleteAct = useFPExamActStore((s) => s.deleteAct)
    const addStudent = useFPExamActStore((s) => s.addStudent)
    const updateStudent = useFPExamActStore((s) => s.updateStudent)
    const deleteStudent = useFPExamActStore((s) => s.deleteStudent)
    const calculateResumen = useFPExamActStore((s) => s.calculateResumen)
    const syncStudentsFromCourse = useFPExamActStore((s) => s.syncStudentsFromCourse)
    const importOrUpdateAct = useFPExamActStore((s) => s.importOrUpdateAct)
    const syncAllFromCloud = useFPExamActStore((s) => s.syncAllFromCloud)

    const [selectedCourseId, setSelectedCourseId] = useState('')
    const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0] || null

    const filteredActs = !activeCourse || selectedCourseId === 'ALL'
        ? acts
        : acts.filter((a) => (a.cursoId && a.cursoId === activeCourse.id) || (a.cursoNumero && a.cursoNumero === activeCourse.cursoNumero))

    const [selectedId, setSelectedId] = useState(null)
    const selected = acts.find((a) => a.id === selectedId)
    const attendanceSheets = useFPAttendanceSheetStore((s) => s.sheets)

    const examActLink = useFPGoogleLinksStore((s) => s.links.examAct)
    const setLink = useFPGoogleLinksStore((s) => s.setLink)

    const [syncing, setSyncing] = useState(false)
    const [pulling, setPulling] = useState(false)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [linkInput, setLinkInput] = useState('')
    const [linking, setLinking] = useState(false)

    const [actToDelete, setActToDelete] = useState(null)
    const [showSyncSelectModal, setShowSyncSelectModal] = useState(false)

    const handleAddNewAct = () => {
        if (!activeCourse) {
            toast.error('Primero debés cargar o crear un Curso en "Ficha de Curso"')
            return
        }

        const initialStudents = (activeCourse.students || []).map((st, idx) => ({
            id: crypto.randomUUID(),
            nroEgresados: '',
            nro: String(idx + 1),
            apellidosNombres: st.apellidosNombres || '',
            asistenciasNota: '',
            asistenciasLetras: '',
            practicasNota: '',
            practicasLetras: '',
            participacionNota: '',
            participacionLetras: '',
            examenFinalNota: '',
            examenFinalLetras: '',
            documentoTipo: st.documentoTipo || 'DNI',
            documentoNumero: st.documentoNumero || '',
        }))

        const now = new Date()
        const newId = addAct({
            cursoId: activeCourse.id,
            cfpNumero: activeCourse.cfpNumero || '',
            distrito: activeCourse.distrito || '',
            especialidad: activeCourse.especialidad || '',
            cursoNumero: activeCourse.cursoNumero || '',
            localidad: '',
            domicilioSede: activeCourse.lugarDictado || '',
            diaSesion: String(now.getDate()),
            mesSesion: String(now.getMonth() + 1),
            anioSesion: String(now.getFullYear()),
            students: initialStudents,
            resumen: {
                inscriptos: String(initialStudents.length),
                examinados: '0',
                ausentes: String(initialStudents.length),
                desaprobados: '0',
                aprobados: '0',
            },
        })
        setSelectedId(newId)
        toast.success(`Nueva acta iniciada para Curso Nº ${activeCourse.cursoNumero || '—'} (${initialStudents.length} estudiantes heredados)`)
    }

    const handleSyncStudentsFromCourse = () => {
        const matchingCourse = courses.find((c) => c.id === selected.cursoId || c.cursoNumero === selected.cursoNumero)
        if (!matchingCourse) {
            toast.error('No se encontró la Ficha de Curso correspondiente a este acta')
            return
        }
        syncStudentsFromCourse(selected.id, matchingCourse.students)
        calculateResumen(selected.id)
        toast.success(`Estudiantes actualizados desde Ficha de Curso (${matchingCourse.students.length} estudiantes)`)
    }

    const handleCalcularAsistencia = () => {
        const matchingSheets = attendanceSheets.filter(
            (as) => as.cursoNumero && selected.cursoNumero && as.cursoNumero.trim() === selected.cursoNumero.trim()
        )
        if (matchingSheets.length === 0) {
            toast.error('No se encontraron informes de Asistencia de Alumnos para este Curso Nº')
            return
        }

        selected.students.forEach((st) => {
            let totalPres = 0
            let totalAus = 0
            let found = false
            matchingSheets.forEach((as) => {
                const match = as.students.find(
                    (s) => s.apellidosNombres.trim().toLowerCase() === st.apellidosNombres.trim().toLowerCase()
                )
                if (match) {
                    found = true
                    totalPres += Number(match.totalPres) || 0
                    totalAus += Number(match.totalAus) || 0
                }
            })
            if (found && totalPres + totalAus > 0) {
                const pct = Math.round((totalPres / (totalPres + totalAus)) * 100)
                updateStudent(selected.id, st.id, {
                    asistenciasNota: String(pct),
                    asistenciasLetras: numberToWordsEs(pct),
                })
            }
        })

        toast.success('Asistencia calculada y completada')
    }

    const handleSyncSingle = async (actToSync) => {
        const targetSpreadsheetId = actToSync.spreadsheetId || examActLink?.spreadsheetId
        const targetSheetTitle = actToSync.googleSheetTitle || examActLink?.sheetTitle
        if (!targetSpreadsheetId) {
            setShowLinkModal(true)
            return
        }
        setSyncing(true)
        try {
            const res = await syncFPExamActSheet(targetSpreadsheetId, targetSheetTitle, actToSync)
            if (res?.sheetTitle && res.sheetTitle !== actToSync.googleSheetTitle) {
                updateAct(actToSync.id, { googleSheetTitle: res.sheetTitle, spreadsheetId: targetSpreadsheetId })
            }
            toast.success(`"${actToSync.especialidad || 'Acta'}" sincronizada con Google Sheets`)
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(() => handleSyncSingle(actToSync))
            } else {
                toast.error('Error al sincronizar con Google Sheets')
            }
        } finally {
            setSyncing(false)
        }
    }

    const handleSyncAll = async () => {
        if (acts.length === 0) {
            toast.error('No tenés actas cargadas para sincronizar')
            return
        }
        setSyncing(true)
        let count = 0
        try {
            for (const a of acts) {
                const targetSpreadsheetId = a.spreadsheetId || examActLink?.spreadsheetId
                const targetSheetTitle = a.googleSheetTitle || examActLink?.sheetTitle
                if (!targetSpreadsheetId) continue
                const res = await syncFPExamActSheet(targetSpreadsheetId, targetSheetTitle, a)
                if (res?.sheetTitle && res.sheetTitle !== a.googleSheetTitle) {
                    updateAct(a.id, { googleSheetTitle: res.sheetTitle, spreadsheetId: targetSpreadsheetId })
                }
                count++
            }
            if (count === 0 && !examActLink) {
                setShowLinkModal(true)
                return
            }
            toast.success(`${count} acta(s) sincronizada(s) con Google Sheets`)
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
        const hasAnyLink = acts.some((a) => a.spreadsheetId) || examActLink
        if (!hasAnyLink) {
            setShowLinkModal(true)
            return
        }
        if (acts.length === 0) {
            toast.error('No tenés actas cargadas para sincronizar')
            return
        }
        if (acts.length === 1) {
            await handleSyncSingle(acts[0])
            return
        }
        setShowSyncSelectModal(true)
    }

    const executePull = async (spreadsheetId, sheetTitle, targetActId = null) => {
        setPulling(true)
        try {
            if (targetActId) {
                const current = acts.find((a) => a.id === targetActId)
                const tabTitle = current?.googleSheetTitle || sheetTitle
                const data = await readFPExamActSheet(spreadsheetId, tabTitle)
                if (!data) {
                    toast.error('No se pudieron leer los datos del acta')
                    return
                }
                const updatedId = importOrUpdateAct(data, targetActId)
                setSelectedId(updatedId)
                toast.success(`Acta traída desde Google Sheets (${data.students?.length || 0} estudiantes)`)
            } else {
                const allActs = await readAllFPExamActSheets(spreadsheetId)
                if (!allActs || allActs.length === 0) {
                    toast.error('No se encontraron actas en la hoja de cálculo')
                    return
                }
                syncAllFromCloud(allActs)
                toast.success(`Se sincronizaron ${allActs.length} acta(s) desde Google Sheets`)
            }
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(() => executePull(spreadsheetId, sheetTitle, targetActId))
            } else {
                toast.error('Error al traer los datos desde Google Sheets')
            }
        } finally {
            setPulling(false)
        }
    }

    const handlePullFromSheets = (targetActId = null) => {
        const targetAct = targetActId ? acts.find((a) => a.id === targetActId) : null
        const targetSpreadsheetId = targetAct?.spreadsheetId || examActLink?.spreadsheetId
        const targetSheetTitle = targetAct?.googleSheetTitle || examActLink?.sheetTitle
        if (!targetSpreadsheetId) {
            setShowLinkModal(true)
            return
        }
        const confirmMsg = targetActId
            ? 'Esto va a recargar los datos de esta acta desde Google Sheets. ¿Continuar?'
            : 'Esto va a sincronizar este dispositivo con Google Sheets. Las actas quedarán exactamente iguales a las de la nube. ¿Continuar?'
        if (!window.confirm(confirmMsg)) {
            return
        }
        executePull(targetSpreadsheetId, targetSheetTitle, targetActId)
    }

    const handleLinkAndPull = async () => {
        if (!linkInput.trim()) {
            toast.error('Pegá el link o ID de la hoja de cálculo')
            return
        }
        setLinking(true)
        try {
            const result = await linkFPDocument(linkInput.trim())
            setLink('examAct', result)
            setShowLinkModal(false)
            setLinkInput('')
            toast.success('Archivo vinculado correctamente')
            await executePull(result.spreadsheetId, result.sheetTitle, selectedId)
        } catch (error) {
            console.error('[FPExamActPage] Error al vincular y descargar:', error)
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

    const handleDeleteClick = (e, act) => {
        e.stopPropagation()
        setActToDelete(act)
    }

    const handleConfirmDelete = async () => {
        if (!actToDelete) return
        const targetId = actToDelete.id
        const targetName = actToDelete.especialidad || 'Acta'
        const targetTab = actToDelete.googleSheetTitle || buildFPExamActTabTitle(actToDelete)
        const targetCurso = actToDelete.cursoNumero
        deleteAct(targetId)
        setActToDelete(null)

        const targetSpreadsheetId = actToDelete.spreadsheetId || examActLink?.spreadsheetId
        if (targetSpreadsheetId) {
            setSyncing(true)
            try {
                await deleteFPSpreadsheetTab(targetSpreadsheetId, targetTab, targetCurso)
                toast.success(`"${targetName}" eliminada`)
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

    if (selected) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" icon={ArrowLeft} onClick={() => setSelectedId(null)}>
                        Volver
                    </Button>
                    <h1 className="text-xl font-bold text-text-primary flex-1">
                        Acta de Examen {selected.especialidad ? `— ${selected.especialidad}` : ''}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            icon={CloudDownload}
                            loading={pulling}
                            disabled={pulling || syncing}
                            onClick={() => handlePullFromSheets(selected.id)}
                            title="Recarga los datos de esta acta desde Google Sheets"
                        >
                            Cargar de Sheets
                        </Button>
                        <Button
                            icon={RefreshCw}
                            loading={syncing}
                            disabled={syncing || pulling}
                            onClick={() => handleSyncSingle(selected)}
                        >
                            Sincronizar con Sheets
                        </Button>
                    </div>
                </div>

                {/* Datos generales */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-semibold text-text-primary">Datos del Acta</h2>
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
                                                updateAct(selected.id, {
                                                    cursoId: found.id,
                                                    cursoNumero: found.cursoNumero || selected.cursoNumero,
                                                    especialidad: found.especialidad || selected.especialidad,
                                                    cfpNumero: found.cfpNumero || selected.cfpNumero,
                                                    distrito: found.distrito || selected.distrito,
                                                    domicilioSede: found.lugarDictado || selected.domicilioSede,
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
                            <Input label="C.F.P. Nº" value={selected.cfpNumero} onChange={(e) => updateAct(selected.id, { cfpNumero: e.target.value })} />
                            <Input label="Distrito" value={selected.distrito} onChange={(e) => updateAct(selected.id, { distrito: e.target.value })} />
                            <Input className="md:col-span-2" label="Especialidad" value={selected.especialidad} onChange={(e) => updateAct(selected.id, { especialidad: e.target.value })} />
                        </div>
                        <Input label="Curso Nº" value={selected.cursoNumero} onChange={(e) => updateAct(selected.id, { cursoNumero: e.target.value })} className="max-w-xs" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="Localidad" value={selected.localidad} onChange={(e) => updateAct(selected.id, { localidad: e.target.value })} />
                            <Input label="Domicilio de la Sede" value={selected.domicilioSede} onChange={(e) => updateAct(selected.id, { domicilioSede: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input label="Día de la sesión" value={selected.diaSesion} onChange={(e) => updateAct(selected.id, { diaSesion: e.target.value })} />
                            <Input label="Mes" value={selected.mesSesion} onChange={(e) => updateAct(selected.id, { mesSesion: e.target.value })} />
                            <Input label="Año" value={selected.anioSesion} onChange={(e) => updateAct(selected.id, { anioSesion: e.target.value })} />
                        </div>

                        <p className="text-xs text-text-secondary italic bg-bg-hover p-3 rounded-lg">
                            En dependencia del Centro de Formación Profesional {selected.cfpNumero || '...'} de la localidad de {selected.localidad || '...'},
                            distrito de {selected.distrito || '...'}, con domicilio en {selected.domicilioSede || '...'}, a los {selected.diaSesion || '...'} días
                            del mes de {selected.mesSesion || '...'} del año {selected.anioSesion || '...'} se reúne la Comisión Examinadora, con el objeto de
                            llevar a cabo la evaluación final a los alumnos del curso cuya especialidad y Nº están detallados en la presente,
                            llegando al resultado que se consigna a continuación.
                        </p>
                    </CardBody>
                </Card>

                {/* Tabla de notas */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-base font-semibold text-text-primary">Notas por Estudiante</h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSyncStudentsFromCourse}
                                title="Actualiza la lista de estudiantes desde la Ficha de Curso vinculada"
                            >
                                Actualizar de Ficha de Curso
                            </Button>
                            <Button variant="outline" icon={Calculator} size="sm" onClick={handleCalcularAsistencia}>
                                Calcular Asistencia
                            </Button>
                            <Button icon={Plus} size="sm" onClick={() => addStudent(selected.id)}>
                                Agregar Estudiante
                            </Button>
                        </div>
                    </div>
                    <CardBody className="overflow-x-auto">
                        <table className="text-sm border-collapse min-w-[1400px]">
                            <thead>
                                <tr className="text-left text-text-secondary border-b border-border-light">
                                    <th className="py-2 pr-2 w-24">Nº Egresados</th>
                                    <th className="py-2 pr-2 w-14">Nº</th>
                                    <th className="py-2 pr-2 min-w-[180px]">Apellidos y Nombres</th>
                                    <th className="py-2 pr-2 w-20 text-center">Asist. Nº</th>
                                    <th className="py-2 pr-2 w-28 text-center">Asist. Letras</th>
                                    <th className="py-2 pr-2 w-20 text-center">Práct. Nº</th>
                                    <th className="py-2 pr-2 w-28 text-center">Práct. Letras</th>
                                    <th className="py-2 pr-2 w-20 text-center">Particip. Nº</th>
                                    <th className="py-2 pr-2 w-28 text-center">Particip. Letras</th>
                                    <th className="py-2 pr-2 w-20 text-center">Examen Nº</th>
                                    <th className="py-2 pr-2 w-28 text-center">Examen Letras</th>
                                    <th className="py-2 pr-2 w-24">Doc. Tipo</th>
                                    <th className="py-2 pr-2 w-28">Doc. Número</th>
                                    <th className="py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {selected.students.map((st) => (
                                    <tr key={st.id} className="border-b border-border-light/50">
                                        <td className="py-1 pr-2"><input className="w-20 px-1 py-1 rounded border border-border bg-bg-card text-text-primary" value={st.nroEgresados} onChange={(e) => updateStudent(selected.id, st.id, { nroEgresados: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-12 px-1 py-1 rounded border border-border bg-bg-card text-text-primary text-center" value={st.nro} onChange={(e) => updateStudent(selected.id, st.id, { nro: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-full min-w-[170px] px-2 py-1 rounded border border-border bg-bg-card text-text-primary" value={st.apellidosNombres} onChange={(e) => updateStudent(selected.id, st.id, { apellidosNombres: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-16 px-1 py-1 rounded border border-border bg-bg-card text-text-primary text-center" value={st.asistenciasNota} onChange={(e) => updateStudent(selected.id, st.id, { asistenciasNota: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-24 px-1 py-1 rounded border border-border bg-bg-card text-text-primary" value={st.asistenciasLetras} onChange={(e) => updateStudent(selected.id, st.id, { asistenciasLetras: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-16 px-1 py-1 rounded border border-border bg-bg-card text-text-primary text-center" value={st.practicasNota} onChange={(e) => updateStudent(selected.id, st.id, { practicasNota: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-24 px-1 py-1 rounded border border-border bg-bg-card text-text-primary" value={st.practicasLetras} onChange={(e) => updateStudent(selected.id, st.id, { practicasLetras: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-16 px-1 py-1 rounded border border-border bg-bg-card text-text-primary text-center" value={st.participacionNota} onChange={(e) => updateStudent(selected.id, st.id, { participacionNota: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-24 px-1 py-1 rounded border border-border bg-bg-card text-text-primary" value={st.participacionLetras} onChange={(e) => updateStudent(selected.id, st.id, { participacionLetras: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-16 px-1 py-1 rounded border border-border bg-bg-card text-text-primary text-center" value={st.examenFinalNota} onChange={(e) => updateStudent(selected.id, st.id, { examenFinalNota: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-24 px-1 py-1 rounded border border-border bg-bg-card text-text-primary" value={st.examenFinalLetras} onChange={(e) => updateStudent(selected.id, st.id, { examenFinalLetras: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-20 px-1 py-1 rounded border border-border bg-bg-card text-text-primary" value={st.documentoTipo} onChange={(e) => updateStudent(selected.id, st.id, { documentoTipo: e.target.value })} /></td>
                                        <td className="py-1 pr-2"><input className="w-24 px-1 py-1 rounded border border-border bg-bg-card text-text-primary" value={st.documentoNumero} onChange={(e) => updateStudent(selected.id, st.id, { documentoNumero: e.target.value })} /></td>
                                        <td className="py-1">
                                            <button onClick={() => deleteStudent(selected.id, st.id)} className="text-text-muted hover:text-error transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {selected.students.length === 0 && (
                                    <tr>
                                        <td colSpan={14} className="py-6 text-center text-text-muted">
                                            No hay estudiantes cargados todavía.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <p className="text-xs text-text-muted mt-3">Se considerará aprobado con un mínimo de 70 puntos.</p>
                    </CardBody>
                </Card>

                {/* Resumen */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-base font-semibold text-text-primary">Resumen</h2>
                            <p className="text-xs text-text-muted mt-0.5">
                                Calculado automáticamente según las notas ingresadas (Aprobado ≥ 70)
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            icon={RefreshCw}
                            onClick={() => {
                                calculateResumen(selected.id)
                                toast.success('Resumen recalculado')
                            }}
                        >
                            Recalcular Resumen
                        </Button>
                    </div>
                    <CardBody className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {RESUMEN_FIELDS.map((f) => (
                            <Input
                                key={f.key}
                                label={f.label}
                                value={selected.resumen[f.key]}
                                onChange={(e) => updateResumen(selected.id, f.key, e.target.value)}
                            />
                        ))}
                    </CardBody>
                </Card>

                {/* Firmas */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light">
                        <h2 className="text-base font-semibold text-text-primary">Firmas</h2>
                    </div>
                    <CardBody className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <Input label="Vocal 1" value={selected.vocal1} onChange={(e) => updateAct(selected.id, { vocal1: e.target.value })} />
                        <Input label="Vocal 2" value={selected.vocal2} onChange={(e) => updateAct(selected.id, { vocal2: e.target.value })} />
                        <Input label="Presidente" value={selected.presidente} onChange={(e) => updateAct(selected.id, { presidente: e.target.value })} />
                        <Input label="Director o Regente" value={selected.directorRegente} onChange={(e) => updateAct(selected.id, { directorRegente: e.target.value })} />
                        <Input label="Inspector" value={selected.inspector} onChange={(e) => updateAct(selected.id, { inspector: e.target.value })} />
                    </CardBody>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Actas de Examen</h1>
                    <p className="text-sm text-text-secondary mt-1">Formación Profesional</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        icon={CloudDownload}
                        loading={pulling}
                        disabled={pulling || syncing}
                        onClick={() => handlePullFromSheets(null)}
                        title="Descarga las actas de examen desde Google Sheets hacia este dispositivo"
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
                    <Button icon={Plus} onClick={handleAddNewAct}>
                        Nueva Acta
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
                        <span><strong>Estudiantes:</strong> {activeCourse.students?.length || 0}</span>
                    </div>
                )}
            </div>

            {filteredActs.length === 0 && (
                <Card>
                    <CardBody className="text-center py-10 text-text-muted">
                        {courses.length === 0
                            ? 'Para comenzar a registrar actas de examen, primero debés cargar un curso en la pestaña "Ficha de Curso".'
                            : `Todavía no hay actas para el curso seleccionado (Curso Nº ${activeCourse?.cursoNumero || '—'}). Hacé clic en "Nueva Acta" para crear una.`}
                    </CardBody>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredActs.map((a) => (
                    <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(a.id)}>
                        <CardBody>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-text-primary">{a.especialidad || 'Sin especialidad'}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">Curso Nº {a.cursoNumero || '—'} · {a.diaSesion || '—'}/{a.mesSesion || '—'}/{a.anioSesion || '—'}</p>
                                    <p className="text-xs text-text-muted mt-1">{a.students.length} estudiante{a.students.length !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleSyncSingle(a)
                                        }}
                                        className="p-1.5 text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-bg-hover"
                                        title="Sincronizar esta acta con Google Sheets"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, a)}
                                        className="p-1.5 text-text-muted hover:text-error transition-colors rounded-lg hover:bg-bg-hover"
                                        title="Eliminar acta"
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
                isOpen={!!actToDelete}
                onClose={() => setActToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar acta de examen?"
                description={`¿Estás seguro de que querés eliminar "${actToDelete?.especialidad || 'esta acta'}" (Curso Nº ${actToDelete?.cursoNumero || '—'})? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar y Sincronizar"
            />

            {/* Modal para elegir cuál acta sincronizar si hay varias */}
            <Modal
                isOpen={showSyncSelectModal}
                onClose={() => setShowSyncSelectModal(false)}
                title="Sincronizar con Google Sheets"
            >
                <div className="space-y-4 p-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light">
                        <p className="text-sm text-text-secondary">
                            Tenés {acts.length} actas cargadas.
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
                            Sincronizar Todas ({acts.length})
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                        {acts.map((a) => (
                            <div
                                key={a.id}
                                className="flex items-center justify-between p-3 rounded-xl border border-border-light hover:bg-bg-hover transition-colors"
                            >
                                <div className="min-w-0 pr-3">
                                    <p className="font-semibold text-text-primary text-sm truncate">
                                        {a.especialidad || 'Sin especialidad'}
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                        Curso Nº {a.cursoNumero || '—'} · {a.diaSesion || '—'}/{a.mesSesion || '—'}/{a.anioSesion || '—'} ({a.students.length} estudiantes)
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    icon={RefreshCw}
                                    loading={syncing}
                                    disabled={syncing}
                                    onClick={async () => {
                                        setShowSyncSelectModal(false)
                                        await handleSyncSingle(a)
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
                title="Vincular Actas de Examen"
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
