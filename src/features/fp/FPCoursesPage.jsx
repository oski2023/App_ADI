import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import Modal from '../../shared/components/Modal'
import ConfirmModal from '../../shared/components/ConfirmModal'
import { Plus, Trash2, ArrowLeft, GraduationCap, RefreshCw, CloudDownload, Link2, AlertCircle, Cloud, AlertTriangle } from 'lucide-react'
import useFPCourseStore from '../../core/stores/useFPCourseStore'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import useSettingsStore from '../../core/stores/useSettingsStore'
import useFPUpdateAlertStore from '../../core/stores/useFPUpdateAlertStore'
import { syncFPCourseSheet, readFPCourseSheet, readAllFPCourseSheets, clearFPCourseSheet, deleteFPSpreadsheetTab, buildFPCourseTabTitle, linkFPDocument } from '../../infrastructure/google/sheetsService'
import { saveFPCloudRegistry, autoDiscoverAndSyncCloudRegistry } from '../../infrastructure/google/fpCloudRegistry'
import { isAuthError, notifyAuthExpired } from '../../utils/authErrorHelper'
import { calculateAge } from '../../utils/dateUtils'
import toast from 'react-hot-toast'

const DIAS = [
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
]

export default function FPCoursesPage() {
    const courses = useFPCourseStore((s) => s.courses)
    const addCourse = useFPCourseStore((s) => s.addCourse)
    const updateCourse = useFPCourseStore((s) => s.updateCourse)
    const updateCourseHorario = useFPCourseStore((s) => s.updateCourseHorario)
    const updateCourseMatricula = useFPCourseStore((s) => s.updateCourseMatricula)
    const deleteCourse = useFPCourseStore((s) => s.deleteCourse)
    const addStudent = useFPCourseStore((s) => s.addStudent)
    const updateStudent = useFPCourseStore((s) => s.updateStudent)
    const deleteStudent = useFPCourseStore((s) => s.deleteStudent)
    const importOrUpdateCourse = useFPCourseStore((s) => s.importOrUpdateCourse)
    const syncAllFromCloud = useFPCourseStore((s) => s.syncAllFromCloud)

    const navigate = useNavigate()
    const googleLinked = useSettingsStore((s) => s.googleLinked)
    const [selectedId, setSelectedId] = useState(null)
    const selected = courses.find((c) => c.id === selectedId)
    const courseLink = useFPGoogleLinksStore((s) => s.links.course)
    const setLink = useFPGoogleLinksStore((s) => s.setLink)
    const pendingUpdates = useFPUpdateAlertStore((s) => s.pendingUpdates)
    const hasAlertForSelected = selected
        ? Boolean(pendingUpdates[selected.id]?.attendance || pendingUpdates[selected.id]?.exam)
        : false

    const [syncing, setSyncing] = useState(false)
    const [pulling, setPulling] = useState(false)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [linkInput, setLinkInput] = useState('')
    const [linking, setLinking] = useState(false)

    // Modal para Nuevo Curso (con link o en blanco)
    const [showNewCourseModal, setShowNewCourseModal] = useState(false)
    const [newCourseLinkInput, setNewCourseLinkInput] = useState('')
    const [creatingFromLink, setCreatingFromLink] = useState(false)

    // Estados para confirmación de eliminación y selección de sincronización
    const [courseToDelete, setCourseToDelete] = useState(null)
    const [showSyncSelectModal, setShowSyncSelectModal] = useState(false)

    const handleCreateCourseFromLink = async () => {
        if (!newCourseLinkInput.trim()) {
            toast.error('Pegá el link o ID de la hoja de cálculo del curso')
            return
        }
        if (!googleLinked) {
            toast.error('Primero debés vincular tu cuenta de Google en Configuración.', { duration: 6000 })
            return
        }
        setCreatingFromLink(true)
        try {
            const linkRes = await linkFPDocument(newCourseLinkInput.trim())
            if (!linkRes) {
                toast.error('No se pudo interpretar el archivo de Google Sheets')
                return
            }
            let courseData = null
            try {
                courseData = await readFPCourseSheet(linkRes.spreadsheetId, linkRes.sheetTitle)
            } catch (err) {
                console.warn('[FPCoursesPage] Error leyendo hoja específica, buscando pestaña con datos:', err)
            }

            if (!courseData) {
                const all = await readAllFPCourseSheets(linkRes.spreadsheetId)
                if (all && all.length > 0) {
                    courseData = all[0]
                }
            }

            if (courseData) {
                courseData.spreadsheetId = linkRes.spreadsheetId
                courseData.spreadsheetUrl = newCourseLinkInput.trim()
                courseData.googleSheetTitle = linkRes.sheetTitle || courseData.googleSheetTitle
                const newId = importOrUpdateCourse(courseData)
                if (!courseLink) {
                    setLink('course', linkRes)
                }
                setShowNewCourseModal(false)
                setNewCourseLinkInput('')
                setSelectedId(newId)
                toast.success(`Curso Nº ${courseData.cursoNumero || '—'} importado con éxito (${courseData.students?.length || 0} estudiantes)`)
                saveFPCloudRegistry().catch((err) => console.warn('[FPCoursesPage] Error guardando registro en Drive:', err))
            } else {
                const newId = addCourse({
                    spreadsheetId: linkRes.spreadsheetId,
                    spreadsheetUrl: newCourseLinkInput.trim(),
                    googleSheetTitle: linkRes.sheetTitle,
                })
                if (!courseLink) {
                    setLink('course', linkRes)
                }
                setShowNewCourseModal(false)
                setNewCourseLinkInput('')
                setSelectedId(newId)
                toast.success('Curso creado y vinculado a la hoja de Google Sheets')
                saveFPCloudRegistry().catch((err) => console.warn('[FPCoursesPage] Error guardando registro en Drive:', err))
            }
        } catch (error) {
            console.error('[FPCoursesPage] Error al crear curso desde link:', error)
            if (isAuthError(error)) {
                notifyAuthExpired(handleCreateCourseFromLink)
            } else if (error?.status === 403 || error?.result?.error?.code === 403) {
                toast.error('Permiso denegado: tu cuenta de Google no tiene acceso a esta hoja. Compartila con tu cuenta.', { duration: 6000 })
            } else if (error?.status === 404 || error?.result?.error?.code === 404) {
                toast.error('Hoja no encontrada en Google Drive. Verificá que el link sea correcto.', { duration: 5000 })
            } else {
                toast.error('No se pudo vincular la hoja. Verificá que sea una hoja nativa de Google Sheets y tus permisos de Google Drive.')
            }
        } finally {
            setCreatingFromLink(false)
        }
    }

    const handleCreateBlankCourse = () => {
        const newId = addCourse()
        setShowNewCourseModal(false)
        setNewCourseLinkInput('')
        setSelectedId(newId)
    }

    const handleSyncSingle = async (courseToSync) => {
        const targetSpreadsheetId = courseToSync.spreadsheetId || courseLink?.spreadsheetId
        const targetSheetTitle = courseToSync.googleSheetTitle || courseLink?.sheetTitle
        if (!targetSpreadsheetId) {
            setShowLinkModal(true)
            return
        }
        setSyncing(true)
        try {
            const res = await syncFPCourseSheet(targetSpreadsheetId, targetSheetTitle, courseToSync)
            if (res?.sheetTitle && res.sheetTitle !== courseToSync.googleSheetTitle) {
                updateCourse(courseToSync.id, { googleSheetTitle: res.sheetTitle, spreadsheetId: targetSpreadsheetId })
            }
            toast.success(`"${courseToSync.especialidad || 'Curso'}" sincronizado con Google Sheets`)
            saveFPCloudRegistry().catch((err) => console.warn('[FPCoursesPage] Error guardando registro en Drive:', err))
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(() => handleSyncSingle(courseToSync))
            } else {
                toast.error('Error al sincronizar con Google Sheets')
            }
        } finally {
            setSyncing(false)
        }
    }

    const handleSyncAll = async () => {
        if (courses.length === 0) {
            toast.error('No tenés cursos cargados para sincronizar')
            return
        }
        setSyncing(true)
        let count = 0
        try {
            for (const c of courses) {
                const targetSpreadsheetId = c.spreadsheetId || courseLink?.spreadsheetId
                const targetSheetTitle = c.googleSheetTitle || courseLink?.sheetTitle
                if (!targetSpreadsheetId) continue
                const res = await syncFPCourseSheet(targetSpreadsheetId, targetSheetTitle, c)
                if (res?.sheetTitle && res.sheetTitle !== c.googleSheetTitle) {
                    updateCourse(c.id, { googleSheetTitle: res.sheetTitle, spreadsheetId: targetSpreadsheetId })
                }
                count++
            }
            if (count === 0 && !courseLink) {
                setShowLinkModal(true)
                return
            }
            toast.success(`${count} curso(s) sincronizado(s) con Google Sheets`)
            saveFPCloudRegistry().catch((err) => console.warn('[FPCoursesPage] Error guardando registro en Drive:', err))
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
        const hasAnyLink = courses.some((c) => c.spreadsheetId) || courseLink
        if (!hasAnyLink) {
            setShowLinkModal(true)
            return
        }
        if (courses.length === 0) {
            toast.error('No tenés cursos cargados para sincronizar')
            return
        }
        if (courses.length === 1) {
            await handleSyncSingle(courses[0])
            return
        }
        setShowSyncSelectModal(true)
    }

    const handleDeleteClick = (e, course) => {
        e.stopPropagation()
        setCourseToDelete(course)
    }

    const handleConfirmDelete = async () => {
        if (!courseToDelete) return
        const targetId = courseToDelete.id
        const targetName = courseToDelete.especialidad || 'Curso'
        const targetTab = courseToDelete.googleSheetTitle || buildFPCourseTabTitle(courseToDelete)
        const targetCurso = courseToDelete.cursoNumero
        const targetSpreadsheetId = courseToDelete.spreadsheetId || courseLink?.spreadsheetId
        const targetSheetTitle = courseToDelete.googleSheetTitle || courseLink?.sheetTitle
        deleteCourse(targetId)
        setCourseToDelete(null)

        if (targetSpreadsheetId) {
            const remainingCourses = courses.filter((c) => c.id !== targetId && (c.spreadsheetId === targetSpreadsheetId || (!c.spreadsheetId && targetSpreadsheetId === courseLink?.spreadsheetId)))
            setSyncing(true)
            try {
                if (remainingCourses.length === 0) {
                    await clearFPCourseSheet(targetSpreadsheetId, targetSheetTitle)
                    toast.success(`"${targetName}" eliminado y Google Sheets vaciado`)
                } else {
                    await deleteFPSpreadsheetTab(targetSpreadsheetId, targetTab, targetCurso)
                    toast.success(`"${targetName}" eliminado`)
                }
                saveFPCloudRegistry().catch((err) => console.warn('[FPCoursesPage] Error guardando registro en Drive:', err))
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
            toast.success(`"${targetName}" eliminado`)
            saveFPCloudRegistry().catch((err) => console.warn('[FPCoursesPage] Error guardando registro en Drive:', err))
        }
    }

    const executePullSingle = async (spreadsheetId, sheetTitle, targetCourseId) => {
        setPulling(true)
        try {
            const current = courses.find((c) => c.id === targetCourseId)
            const tabTitle = current?.googleSheetTitle || sheetTitle
            let data = null
            try {
                data = await readFPCourseSheet(spreadsheetId, tabTitle)
            } catch (err) {
                console.warn('[FPCoursesPage] Error leyendo pestaña específica, buscando en el archivo:', err)
            }
            if (!data) {
                const all = await readAllFPCourseSheets(spreadsheetId)
                if (all && all.length > 0) {
                    data = all.find((c) => (c.cursoNumero && c.cursoNumero === current?.cursoNumero) || c.googleSheetTitle === tabTitle) || all[0]
                }
            }
            if (!data) {
                toast.error('No se pudieron leer los datos del curso desde Google Sheets')
                return
            }
            const updatedId = importOrUpdateCourse({
                ...data,
                spreadsheetId,
                spreadsheetUrl: current?.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
            }, targetCourseId)
            setSelectedId(updatedId)
            toast.success(`Curso traído desde Google Sheets (${data.students.length} estudiantes)`)
            saveFPCloudRegistry().catch((err) => console.warn('[FPCoursesPage] Error guardando registro en Drive:', err))
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(() => executePullSingle(spreadsheetId, sheetTitle, targetCourseId))
            } else {
                toast.error('Error al traer los datos desde Google Sheets')
            }
        } finally {
            setPulling(false)
        }
    }

    const executePullAll = async (spreadsheetsList) => {
        setPulling(true)
        try {
            let allCourses = []
            let fetchedFilesCount = 0

            for (const sItem of spreadsheetsList) {
                const sId = sItem.spreadsheetId
                if (!sId) continue
                try {
                    const coursesInSheet = await readAllFPCourseSheets(sId)
                    if (coursesInSheet && coursesInSheet.length > 0) {
                        coursesInSheet.forEach((c) => {
                            c.spreadsheetId = sId
                            c.spreadsheetUrl = sItem.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${sId}/edit`
                        })
                        allCourses.push(...coursesInSheet)
                        fetchedFilesCount++
                    }
                } catch (sheetErr) {
                    console.warn(`[FPCoursesPage] Error leyendo hoja ${sId}:`, sheetErr)
                    if (isAuthError(sheetErr)) {
                        notifyAuthExpired(() => executePullAll(spreadsheetsList))
                        return
                    }
                }
            }

            if (allCourses.length === 0) {
                toast.error('No se encontraron cursos en las hojas vinculadas')
                return
            }

            syncAllFromCloud(allCourses)
            toast.success(`Se sincronizaron ${allCourses.length} curso(s) desde ${fetchedFilesCount} archivo(s) de Google Sheets`)
            saveFPCloudRegistry().catch((err) => console.warn('[FPCoursesPage] Error guardando registro en Drive:', err))
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(() => executePullAll(spreadsheetsList))
            } else {
                toast.error('Error al traer los datos desde Google Sheets')
            }
        } finally {
            setPulling(false)
        }
    }

    const executePull = async (spreadsheetId, sheetTitle, targetCourseId = null) => {
        if (targetCourseId) {
            return executePullSingle(spreadsheetId, sheetTitle, targetCourseId)
        }
        return executePullAll([{ spreadsheetId, spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` }])
    }

    const handlePullFromSheets = async (targetCourseId = null) => {
        if (targetCourseId) {
            let targetCourse = courses.find((c) => c.id === targetCourseId)
            let targetSpreadsheetId = targetCourse?.spreadsheetId || courseLink?.spreadsheetId
            let targetSheetTitle = targetCourse?.googleSheetTitle || courseLink?.sheetTitle

            if (!targetSpreadsheetId) {
                setPulling(true)
                const toastId = toast.loading('Buscando vínculos en Google Drive...')
                try {
                    const cloudRes = await autoDiscoverAndSyncCloudRegistry()
                    toast.dismiss(toastId)
                    if (cloudRes.success) {
                        const freshCourseLink = useFPGoogleLinksStore.getState().links.course
                        const freshCourses = useFPCourseStore.getState().courses
                        targetCourse = freshCourses.find((c) => c.id === targetCourseId)
                        targetSpreadsheetId = targetCourse?.spreadsheetId || freshCourseLink?.spreadsheetId
                        targetSheetTitle = targetCourse?.googleSheetTitle || freshCourseLink?.sheetTitle
                    }
                } catch (err) {
                    toast.dismiss(toastId)
                    console.warn('[FPCoursesPage] Error buscando en Drive:', err)
                } finally {
                    setPulling(false)
                }
            }

            if (!targetSpreadsheetId) {
                setShowLinkModal(true)
                return
            }

            const confirmMsg = 'Esto va a recargar los datos de este curso desde Google Sheets. ¿Continuar?'
            if (!window.confirm(confirmMsg)) {
                return
            }
            await executePullSingle(targetSpreadsheetId, targetSheetTitle, targetCourseId)
            return
        }

        // Pull general de TODOS los cursos (PC y Celular)
        setPulling(true)
        const toastId = toast.loading('Buscando cursos y vínculos en Google Drive...')
        try {
            await autoDiscoverAndSyncCloudRegistry()
        } catch (err) {
            console.warn('[FPCoursesPage] Error auto-descubriendo registro:', err)
        } finally {
            toast.dismiss(toastId)
            setPulling(false)
        }

        const freshCourses = useFPCourseStore.getState().courses
        const freshCourseLink = useFPGoogleLinksStore.getState().links.course

        // Recolectar todas las planillas únicas registradas
        const spreadsheetsMap = new Map()
        if (freshCourseLink?.spreadsheetId) {
            spreadsheetsMap.set(freshCourseLink.spreadsheetId, {
                spreadsheetId: freshCourseLink.spreadsheetId,
                spreadsheetUrl: freshCourseLink.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${freshCourseLink.spreadsheetId}/edit`,
            })
        }
        freshCourses.forEach((c) => {
            if (c.spreadsheetId) {
                spreadsheetsMap.set(c.spreadsheetId, {
                    spreadsheetId: c.spreadsheetId,
                    spreadsheetUrl: c.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${c.spreadsheetId}/edit`,
                })
            }
        })

        const uniqueSpreadsheets = Array.from(spreadsheetsMap.values())

        if (uniqueSpreadsheets.length === 0) {
            setShowLinkModal(true)
            return
        }

        const confirmMsg = `Esto va a sincronizar este dispositivo con Google Sheets (${uniqueSpreadsheets.length} archivo(s) vinculado(s)). ¿Continuar?`
        if (!window.confirm(confirmMsg)) {
            return
        }

        await executePullAll(uniqueSpreadsheets)
    }

    const handleLinkAndPull = async () => {
        if (!linkInput.trim()) {
            toast.error('Pegá el link o ID de la hoja de cálculo')
            return
        }
        if (!googleLinked) {
            toast.error('Primero debés vincular tu cuenta de Google en Configuración.', { duration: 6000 })
            return
        }
        setLinking(true)
        try {
            const result = await linkFPDocument(linkInput.trim())
            if (!result) {
                toast.error('No se pudo interpretar el archivo de Google Sheets')
                return
            }
            if (!courseLink) {
                setLink('course', result)
            }
            setShowLinkModal(false)
            setLinkInput('')
            toast.success('Archivo vinculado correctamente')

            if (selectedId) {
                updateCourse(selectedId, {
                    spreadsheetId: result.spreadsheetId,
                    spreadsheetUrl: linkInput.trim(),
                    googleSheetTitle: result.sheetTitle,
                })
                saveFPCloudRegistry().catch((err) => console.warn('[FPCoursesPage] Error guardando registro en Drive:', err))
                await executePullSingle(result.spreadsheetId, result.sheetTitle, selectedId)
            } else {
                const coursesInSheet = await readAllFPCourseSheets(result.spreadsheetId)
                if (coursesInSheet && coursesInSheet.length > 0) {
                    coursesInSheet.forEach((c) => {
                        c.spreadsheetId = result.spreadsheetId
                        c.spreadsheetUrl = linkInput.trim()
                    })
                    syncAllFromCloud(coursesInSheet, result.spreadsheetId)
                    saveFPCloudRegistry().catch((err) => console.warn('[FPCoursesPage] Error guardando registro en Drive:', err))
                    toast.success(`Se importaron ${coursesInSheet.length} curso(s) desde la hoja vinculada`)
                }
            }
        } catch (error) {
            console.error('[FPCoursesPage] Error al vincular y descargar:', error)
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
                        Ficha de Curso {selected.especialidad ? `— ${selected.especialidad}` : ''}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            icon={CloudDownload}
                            loading={pulling}
                            disabled={pulling || syncing}
                            onClick={() => handlePullFromSheets(selected.id)}
                            title="Recarga los datos de este curso desde Google Sheets"
                        >
                            Cargar de Sheets
                        </Button>
                        <Button icon={RefreshCw} loading={syncing} disabled={syncing || pulling} onClick={() => handleSyncSingle(selected)}>
                            Sincronizar con Sheets
                        </Button>
                    </div>
                </div>

                {/* Datos generales del curso */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-semibold text-text-primary">Datos del Curso</h2>
                    </div>
                    <CardBody className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input label="C.F.P. Nº" value={selected.cfpNumero} onChange={(e) => updateCourse(selected.id, { cfpNumero: e.target.value })} />
                            <Input label="Distrito" value={selected.distrito} onChange={(e) => updateCourse(selected.id, { distrito: e.target.value })} />
                            <Input label="Año" value={selected.anio} onChange={(e) => updateCourse(selected.id, { anio: e.target.value })} />
                            <Input label="Curso Nº" value={selected.cursoNumero} onChange={(e) => updateCourse(selected.id, { cursoNumero: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input className="md:col-span-2" label="Especialidad" value={selected.especialidad} onChange={(e) => updateCourse(selected.id, { especialidad: e.target.value })} />
                            <Input label="Tipo" value={selected.tipo} onChange={(e) => updateCourse(selected.id, { tipo: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Input label="Fecha de Inicio" type="date" value={selected.fechaInicio} onChange={(e) => updateCourse(selected.id, { fechaInicio: e.target.value })} />
                            <Input label="Fecha de Terminación" type="date" value={selected.fechaTerminacion} onChange={(e) => updateCourse(selected.id, { fechaTerminacion: e.target.value })} />
                            <Input label="Duración" value={selected.duracion} onChange={(e) => updateCourse(selected.id, { duracion: e.target.value })} />
                            <Input label="F.O." value={selected.fo} onChange={(e) => updateCourse(selected.id, { fo: e.target.value })} />
                        </div>
                        <Input label="Lugar de Dictado" value={selected.lugarDictado} onChange={(e) => updateCourse(selected.id, { lugarDictado: e.target.value })} />
                        <Input label="Instructor" value={selected.instructor} onChange={(e) => updateCourse(selected.id, { instructor: e.target.value })} />

                        <div>
                            <p className="block text-sm font-medium text-text-secondary mb-1.5">Horarios</p>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                {DIAS.map((d) => (
                                    <Input
                                        key={d.key}
                                        label={d.label}
                                        placeholder="Ej. 18 a 22"
                                        value={selected.horarios[d.key]}
                                        onChange={(e) => updateCourseHorario(selected.id, d.key, e.target.value)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="block text-sm font-medium text-text-secondary mb-1.5">Matrícula</p>
                            <div className="grid grid-cols-3 gap-3 max-w-xs">
                                <Input label="V" value={selected.matricula.v} onChange={(e) => updateCourseMatricula(selected.id, 'v', e.target.value)} />
                                <Input label="M" value={selected.matricula.m} onChange={(e) => updateCourseMatricula(selected.id, 'm', e.target.value)} />
                                <Input label="X" value={selected.matricula.x} onChange={(e) => updateCourseMatricula(selected.id, 'x', e.target.value)} />
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Nómina de estudiantes */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                        <h2 className="text-base font-semibold text-text-primary">Nómina de Estudiantes</h2>
                        <Button
                            icon={Plus}
                            size="sm"
                            onClick={() => {
                                addStudent(selected.id)
                                useFPUpdateAlertStore.getState().setPendingUpdate(selected.id, selected.especialidad, selected.cursoNumero)
                                toast(
                                    (t) => (
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-amber-700 dark:text-amber-300">¡Alumno agregado a Ficha de Curso!</span>
                                            <span className="text-xs text-text-secondary">
                                                Recordá presionar <strong>"Actualizar de Ficha de Curso"</strong> en <strong>Asistencia de Alumnos</strong> y en <strong>Actas de Examen</strong>.
                                            </span>
                                        </div>
                                    ),
                                    { duration: 7000, icon: '📋' }
                                )
                            }}
                        >
                            Agregar Estudiante
                        </Button>
                    </div>

                    {hasAlertForSelected && (
                        <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200 animate-fade-in">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                                <strong>Recordatorio de sincronización:</strong> Tenés alumnos nuevos cargados. Recordá presionar el botón <em>"Actualizar de Ficha de Curso"</em> cuando visites <strong>Asistencia de Alumnos</strong> y <strong>Actas de Examen</strong>.
                            </span>
                        </div>
                    )}

                    <CardBody className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[1100px]">
                            <thead>
                                <tr className="text-left text-text-secondary border-b border-border-light">
                                    <th className="py-2 pr-2 w-10">Nº</th>
                                    <th className="py-2 pr-2">Tipo Doc.</th>
                                    <th className="py-2 pr-2">Número Doc.</th>
                                    <th className="py-2 pr-2 w-20">Sexo</th>
                                    <th className="py-2 pr-2">Apellidos y Nombres</th>
                                    <th className="py-2 pr-2">Fecha Nac.</th>
                                    <th className="py-2 pr-2">Nacionalidad</th>
                                    <th className="py-2 pr-2">Domicilio</th>
                                    <th className="py-2 pr-2">Localidad</th>
                                    <th className="py-2 pr-2 w-24">Edad</th>
                                    <th className="py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {selected.students.map((s, idx) => (
                                    <tr key={s.id} className="border-b border-border-light/50">
                                        <td className="py-1.5 pr-2 text-text-muted">{idx + 1}</td>
                                        <td className="py-1.5 pr-2"><Input value={s.documentoTipo} onChange={(e) => updateStudent(selected.id, s.id, { documentoTipo: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={s.documentoNumero} onChange={(e) => updateStudent(selected.id, s.id, { documentoNumero: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2">
                                            <select
                                                className="w-16 px-2 py-1.5 rounded-lg border border-border bg-bg-card text-text-primary text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                                                value={(s.sexo || '').toUpperCase()}
                                                onChange={(e) => updateStudent(selected.id, s.id, { sexo: e.target.value.toUpperCase() })}
                                            >
                                                <option value="">—</option>
                                                <option value="M">M</option>
                                                <option value="F">F</option>
                                                <option value="X">X</option>
                                            </select>
                                        </td>
                                        <td className="py-1.5 pr-2"><Input value={s.apellidosNombres} onChange={(e) => updateStudent(selected.id, s.id, { apellidosNombres: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2">
                                            <Input
                                                type="date"
                                                value={s.fechaNacimiento || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value
                                                    const calculatedAge = calculateAge(val)
                                                    updateStudent(selected.id, s.id, {
                                                        fechaNacimiento: val,
                                                        edad: calculatedAge !== '' ? String(calculatedAge) : (val ? '' : s.edad),
                                                    })
                                                }}
                                            />
                                        </td>
                                        <td className="py-1.5 pr-2"><Input value={s.nacionalidad} onChange={(e) => updateStudent(selected.id, s.id, { nacionalidad: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={s.domicilio} onChange={(e) => updateStudent(selected.id, s.id, { domicilio: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={s.localidad} onChange={(e) => updateStudent(selected.id, s.id, { localidad: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                max="130"
                                                placeholder="Edad..."
                                                value={s.edad !== undefined && s.edad !== '' ? s.edad : calculateAge(s.fechaNacimiento)}
                                                onChange={(e) => updateStudent(selected.id, s.id, { edad: e.target.value })}
                                                className="w-20 text-center font-medium"
                                                title="Calculada automáticamente a partir de la Fecha de Nacimiento"
                                            />
                                        </td>
                                        <td className="py-1.5">
                                            <button onClick={() => deleteStudent(selected.id, s.id)} className="text-text-muted hover:text-error transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {selected.students.length === 0 && (
                                    <tr>
                                        <td colSpan={11} className="py-6 text-center text-text-muted">
                                            No hay estudiantes cargados todavía.
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
                    <h1 className="text-2xl font-bold text-text-primary">Fichas de Curso</h1>
                    <p className="text-sm text-text-secondary mt-1">Formación Profesional</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        icon={CloudDownload}
                        loading={pulling}
                        disabled={pulling || syncing}
                        onClick={() => handlePullFromSheets()}
                        title="Descarga los cursos guardados en Google Sheets a este dispositivo"
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
                    <Button icon={Plus} onClick={() => setShowNewCourseModal(true)}>
                        Nuevo Curso
                    </Button>
                </div>
            </div>

            {courses.length === 0 && (
                <Card>
                    <CardBody className="text-center py-10 text-text-muted">
                        Todavía no cargaste ningún curso. Hacé clic en "Nuevo Curso" para empezar.
                    </CardBody>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((c) => (
                    <Card key={c.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(c.id)}>
                        <CardBody>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-text-primary">{c.especialidad || 'Sin especialidad'}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">Curso Nº {c.cursoNumero || '—'} · C.F.P. Nº {c.cfpNumero || '—'}</p>
                                    <p className="text-xs text-text-muted mt-1">{c.students.length} estudiante{c.students.length !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleSyncSingle(c)
                                        }}
                                        className="p-1.5 text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-bg-hover"
                                        title="Sincronizar este curso con Google Sheets"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, c)}
                                        className="p-1.5 text-text-muted hover:text-error transition-colors rounded-lg hover:bg-bg-hover"
                                        title="Eliminar curso"
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
                isOpen={!!courseToDelete}
                onClose={() => setCourseToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Eliminar curso?"
                description={`¿Estás seguro de que querés eliminar "${courseToDelete?.especialidad || 'este curso'}" (Curso Nº ${courseToDelete?.cursoNumero || '—'})? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar y Sincronizar"
            />

            {/* Modal para elegir cuál curso sincronizar si hay varios */}
            <Modal
                isOpen={showSyncSelectModal}
                onClose={() => setShowSyncSelectModal(false)}
                title="Sincronizar con Google Sheets"
            >
                <div className="space-y-4 p-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border-light">
                        <p className="text-sm text-text-secondary">
                            Tenés {courses.length} cursos cargados.
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
                            Sincronizar Todos ({courses.length})
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                        {courses.map((c) => (
                            <div
                                key={c.id}
                                className="flex items-center justify-between p-3 rounded-xl border border-border-light hover:bg-bg-hover transition-colors"
                            >
                                <div className="min-w-0 pr-3">
                                    <p className="font-semibold text-text-primary text-sm truncate">
                                        {c.especialidad || 'Sin especialidad'}
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                        Curso Nº {c.cursoNumero || '—'} · C.F.P. Nº {c.cfpNumero || '—'} ({c.students.length} estudiantes)
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    icon={RefreshCw}
                                    loading={syncing}
                                    disabled={syncing}
                                    onClick={async () => {
                                        setShowSyncSelectModal(false)
                                        await handleSyncSingle(c)
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
                title="Vincular Fichas de Curso"
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
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <Button
                            variant="outline"
                            icon={Cloud}
                            disabled={linking}
                            onClick={async () => {
                                setLinking(true)
                                const toastId = toast.loading('Buscando en Google Drive...')
                                try {
                                    const res = await autoDiscoverAndSyncCloudRegistry()
                                    toast.dismiss(toastId)
                                    if (res.success) {
                                        toast.success(`¡Sincronizado desde Drive! (${res.coursesRestored} cursos)`)
                                        setShowLinkModal(false)
                                        await handlePullFromSheets()
                                    } else {
                                        toast.error('No se encontraron vínculos guardados en Google Drive')
                                    }
                                } catch (e) {
                                    toast.dismiss(toastId)
                                    toast.error('Error buscando en Drive')
                                } finally {
                                    setLinking(false)
                                }
                            }}
                        >
                            Buscar en Google Drive
                        </Button>
                        <div className="flex gap-2">
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
                </div>
            </Modal>

            {/* Modal para Crear Nuevo Curso (Vincular Sheets o en Blanco) */}
            <Modal
                isOpen={showNewCourseModal}
                onClose={() => {
                    if (!creatingFromLink) {
                        setShowNewCourseModal(false)
                        setNewCourseLinkInput('')
                    }
                }}
                title="Nuevo Curso"
            >
                <div className="space-y-4 p-2">
                    {!googleLinked && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <div className="space-y-1">
                                <p className="font-semibold">Cuenta de Google no vinculada en este dispositivo</p>
                                <p>Para poder leer y sincronizar planillas de Google Drive, primero debés conectar tu cuenta de Google en Configuración.</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNewCourseModal(false)
                                        navigate('/settings')
                                    }}
                                    className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-100 mt-1 inline-block cursor-pointer"
                                >
                                    Ir a Configuración para conectar Google →
                                </button>
                            </div>
                        </div>
                    )}
                    <p className="text-sm text-text-secondary">
                        Ingresá el link o ID de la hoja de Google Sheets de este nuevo curso. La aplicación mapeará automáticamente todos los datos del curso y la lista de alumnos:
                    </p>
                    <Input
                        placeholder="https://docs.google.com/spreadsheets/d/... o ID"
                        value={newCourseLinkInput}
                        onChange={(e) => setNewCourseLinkInput(e.target.value)}
                        disabled={creatingFromLink}
                    />
                    <div className="flex justify-end gap-2 pt-1">
                        <Button
                            icon={Link2}
                            loading={creatingFromLink}
                            disabled={creatingFromLink}
                            onClick={handleCreateCourseFromLink}
                        >
                            Vincular y Cargar Curso
                        </Button>
                    </div>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border-light"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-bg-surface px-2 text-text-muted font-medium">o bien</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                        <p className="text-xs text-text-muted">
                            Si no tenés un link todavía, podés crearlo en blanco y completarlo manualmente.
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={creatingFromLink}
                            onClick={handleCreateBlankCourse}
                        >
                            Crear Curso en Blanco
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
