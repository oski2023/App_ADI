import { useState, useMemo } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import Modal from '../../shared/components/Modal'
import ConfirmModal from '../../shared/components/ConfirmModal'
import { Plus, Trash2, ArrowLeft, ClipboardCheck, RefreshCw, CloudDownload, Link2, Cloud, AlertTriangle } from 'lucide-react'
import useFPAttendanceSheetStore from '../../core/stores/useFPAttendanceSheetStore'
import useFPCourseStore from '../../core/stores/useFPCourseStore'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import useFPUpdateAlertStore from '../../core/stores/useFPUpdateAlertStore'
import { syncFPAttendanceSheet, readFPAttendanceSheet, readAllFPAttendanceSheets, clearFPAttendanceSheet, deleteFPSpreadsheetTab, buildFPAttendanceTabTitle, linkFPDocument } from '../../infrastructure/google/sheetsService'
import { saveFPCloudRegistry, autoDiscoverAndSyncCloudRegistry } from '../../infrastructure/google/fpCloudRegistry'
import { discoverFolderAndFilesForCourse } from '../../infrastructure/google/fpDriveDiscovery'
import { isAuthError, notifyAuthExpired } from '../../utils/authErrorHelper'
import toast from 'react-hot-toast'

const DIAS_SEMANA = [
    { key: 'lunes', label: 'Lunes' },
    { key: 'martes', label: 'Martes' },
    { key: 'miercoles', label: 'Miércoles' },
    { key: 'jueves', label: 'Jueves' },
    { key: 'viernes', label: 'Viernes' },
    { key: 'sabado', label: 'Sábado' },
]

const DIAS_MES = Array.from({ length: 31 }, (_, i) => i + 1)

const MOVIMIENTO_FIELDS = [
    { key: 'totalInicioMes', label: 'Total alumnos al iniciar el mes' },
    { key: 'altas', label: 'Altas' },
    { key: 'bajas', label: 'Bajas' },
    { key: 'totalVarones', label: 'Total varones al finalizar el mes' },
    { key: 'totalMujeres', label: 'Total mujeres al finalizar el mes' },
    { key: 'totalAlumnos', label: 'Total alumnos al finalizar el mes' },
]

export default function FPAttendanceSheetPage() {
    const courses = useFPCourseStore((s) => s.courses)
    const sheets = useFPAttendanceSheetStore((s) => s.sheets)
    const addSheet = useFPAttendanceSheetStore((s) => s.addSheet)
    const updateSheet = useFPAttendanceSheetStore((s) => s.updateSheet)
    const updateSheetHorario = useFPAttendanceSheetStore((s) => s.updateSheetHorario)
    const updateMovimiento = useFPAttendanceSheetStore((s) => s.updateMovimiento)
    const deleteSheet = useFPAttendanceSheetStore((s) => s.deleteSheet)
    const addStudent = useFPAttendanceSheetStore((s) => s.addStudent)
    const updateStudent = useFPAttendanceSheetStore((s) => s.updateStudent)
    const updateStudentDay = useFPAttendanceSheetStore((s) => s.updateStudentDay)
    const deleteStudent = useFPAttendanceSheetStore((s) => s.deleteStudent)
    const addBaja = useFPAttendanceSheetStore((s) => s.addBaja)
    const updateBaja = useFPAttendanceSheetStore((s) => s.updateBaja)
    const deleteBaja = useFPAttendanceSheetStore((s) => s.deleteBaja)
    const calculateMovimiento = useFPAttendanceSheetStore((s) => s.calculateMovimiento)
    const syncStudentsFromCourse = useFPAttendanceSheetStore((s) => s.syncStudentsFromCourse)
    const importOrUpdateSheet = useFPAttendanceSheetStore((s) => s.importOrUpdateSheet)
    const syncAllFromCloud = useFPAttendanceSheetStore((s) => s.syncAllFromCloud)

    const [selectedCourseId, setSelectedCourseId] = useState('')
    const activeCourse = courses.find((c) => c.id === selectedCourseId) || courses[0] || null

    const filteredSheets = !activeCourse || selectedCourseId === 'ALL'
        ? sheets
        : sheets.filter((s) => (s.cursoId && s.cursoId === activeCourse.id) || (s.cursoNumero && s.cursoNumero === activeCourse.cursoNumero))

    const [selectedId, setSelectedId] = useState(null)
    const activeTabId = (selectedId && filteredSheets.some((s) => s.id === selectedId))
        ? selectedId
        : (filteredSheets[0]?.id || null)
    const selected = sheets.find((s) => s.id === activeTabId)

    const attendanceLink = useFPGoogleLinksStore((s) => s.links.attendanceSheet)
    const setLink = useFPGoogleLinksStore((s) => s.setLink)
    const pendingUpdates = useFPUpdateAlertStore((s) => s.pendingUpdates)
    const hasAttendanceAlertForSelected = selected
        ? Boolean(
            (selected.cursoId && pendingUpdates[selected.cursoId]?.attendance) ||
            (selected.cursoNumero && Object.values(pendingUpdates || {}).some((u) => u.attendance && u.cursoNumero && u.cursoNumero.trim().toLowerCase() === selected.cursoNumero.trim().toLowerCase()))
        )
        : false

    const [studentToDelete, setStudentToDelete] = useState(null)
    const [bajaToDelete, setBajaToDelete] = useState(null)

    const [showAddBajaModal, setShowAddBajaModal] = useState(false)
    const [bajaStudentId, setBajaStudentId] = useState('')

    const handleAddNewSheet = () => {
        if (!activeCourse) {
            toast.error('Primero debés cargar o crear un Curso en "Ficha de Curso"')
            return
        }
        const emptyDaysMap = {}
        for (let i = 1; i <= 31; i++) emptyDaysMap[i] = ''

        const initialStudents = (activeCourse.students || []).map((st) => ({
            id: crypto.randomUUID(),
            sexo: (st.sexo || '').toUpperCase(),
            apellidosNombres: st.apellidosNombres || '',
            days: { ...emptyDaysMap },
            totalAus: '',
            totalPres: '',
            temasTratados: '',
        }))

        // Calcular el próximo mes sugerido según las pestañas ya existentes
        const mesesNombres = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero']
        const existingMeses = filteredSheets.map((s) => (s.informeMes || s.googleSheetTitle || '').trim().toLowerCase())
        const nextMonth = mesesNombres.find((m) => !existingMeses.includes(m.toLowerCase())) || 'Nuevo Mes'

        const newId = addSheet({
            cursoId: activeCourse.id,
            centroNumero: activeCourse.cfpNumero || '',
            distrito: activeCourse.distrito || '',
            cursoNumero: activeCourse.cursoNumero || '',
            especialidad: activeCourse.especialidad || '',
            lugarDictado: activeCourse.lugarDictado || '',
            enLaCalle: '',
            localidad: '',
            horarios: activeCourse.horarios ? { ...activeCourse.horarios } : undefined,
            students: initialStudents,
            informeMes: nextMonth,
            informeAnio: new Date().getFullYear().toString(),
            googleSheetTitle: nextMonth.toUpperCase(),
            movimiento: {
                totalInicioMes: initialStudents.length > 0 ? String(initialStudents.length) : '',
                altas: '',
                bajas: '0',
                totalVarones: '',
                totalMujeres: '',
                totalAlumnos: '',
            },
        })
        setSelectedId(newId)
        toast.success(`Nueva pestaña "${nextMonth.toUpperCase()}" para Curso Nº ${activeCourse.cursoNumero || '—'} (${initialStudents.length} alumnos)`)
    }

    // Alumnos del curso: reúne los alumnos cargados en la planilla y los de la Ficha de Curso correspondiente
    const matchingCourse = courses.find((c) =>
        (c.id && c.id === selected?.cursoId) ||
        (c.cursoNumero && selected?.cursoNumero && c.cursoNumero.trim().toLowerCase() === selected.cursoNumero.trim().toLowerCase())
    ) || activeCourse

    const allCourseStudents = useMemo(() => {
        if (!selected) return []
        const list = []
        const seen = new Set()

        // 1. Alumnos de esta planilla de asistencia
        const sheetStudents = selected.students || []
        sheetStudents.forEach((st) => {
            const key = (st.apellidosNombres || '').trim().toLowerCase()
            if (key && !seen.has(key)) {
                seen.add(key)
                list.push(st)
            }
        })

        // 2. Alumnos de la Ficha de Curso vinculada
        const courseStudents = matchingCourse?.students || []
        courseStudents.forEach((st) => {
            const key = (st.apellidosNombres || '').trim().toLowerCase()
            if (key && !seen.has(key)) {
                seen.add(key)
                list.push(st)
            }
        })

        return list
    }, [selected?.students, matchingCourse?.students])

    const handleOpenAddBajaModal = () => {
        if (!selected) return
        if (allCourseStudents.length > 0) {
            setBajaStudentId(allCourseStudents[0].id)
        } else {
            setBajaStudentId('')
        }
        setShowAddBajaModal(true)
    }

    const handleConfirmAddBaja = () => {
        if (!selected) return
        const chosen = allCourseStudents.find((st) => st.id === bajaStudentId)
        if (chosen) {
            addBaja(selected.id, {
                sexo: (chosen.sexo || '').toUpperCase(),
                apellidosNombres: chosen.apellidosNombres || '',
            })
            toast.success(`Baja registrada para ${chosen.apellidosNombres}`)
        } else {
            addBaja(selected.id)
            toast.info('Se agregó una fila de baja para cargar manualmente')
        }
        setShowAddBajaModal(false)
        setBajaStudentId('')
    }

    const handleSyncStudentsFromCourse = () => {
        const matchingCourse = courses.find((c) => c.id === selected.cursoId || c.cursoNumero === selected.cursoNumero)
        if (!matchingCourse) {
            toast.error('No se encontró la Ficha de Curso correspondiente a este informe')
            return
        }
        syncStudentsFromCourse(selected.id, matchingCourse.students)
        calculateMovimiento(selected.id)
        useFPUpdateAlertStore.getState().clearAttendanceAlert(matchingCourse.id, selected.cursoNumero)
        toast.success(`Lista de alumnos sincronizada desde Ficha de Curso (${matchingCourse.students.length} alumnos)`)
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
        const courseForSheet = courses.find((c) =>
            (c.id && c.id === sheetToSync.cursoId) ||
            (c.cursoNumero && sheetToSync.cursoNumero && c.cursoNumero.trim().toLowerCase() === sheetToSync.cursoNumero.trim().toLowerCase())
        ) || activeCourse

        let targetSpreadsheetId = sheetToSync.spreadsheetId || courseForSheet?.links?.attendanceSheet?.spreadsheetId || attendanceLink?.spreadsheetId
        let targetSheetTitle = sheetToSync.googleSheetTitle || courseForSheet?.links?.attendanceSheet?.sheetTitle || attendanceLink?.sheetTitle

        // Si no está vinculado aún, intentar auto-descubrirlo desde la carpeta del curso en Drive
        if (!targetSpreadsheetId && courseForSheet) {
            setSyncing(true)
            const toastId = toast.loading('Buscando archivo de Asistencia en Drive...')
            try {
                const disc = await discoverFolderAndFilesForCourse(courseForSheet.spreadsheetId || courseForSheet.spreadsheetUrl, courseForSheet.cursoNumero)
                if (disc.success && disc.links?.attendanceSheet?.spreadsheetId) {
                    useFPCourseStore.getState().updateCourse(courseForSheet.id, {
                        folderId: disc.folderId || courseForSheet.folderId || '',
                        folderName: disc.folderName || courseForSheet.folderName || '',
                        links: { ...(courseForSheet.links || {}), ...disc.links },
                    })
                    saveFPCloudRegistry().catch((err) => console.warn('[FPAttendanceSheetPage] Error guardando registro:', err))
                    targetSpreadsheetId = disc.links.attendanceSheet.spreadsheetId
                    toast.success(`Archivo detectado en carpeta "${disc.folderName || courseForSheet.cursoNumero}"`)
                }
            } catch (discErr) {
                console.warn('[FPAttendanceSheetPage] Error en auto-descubrimiento al sincronizar:', discErr)
            } finally {
                toast.dismiss(toastId)
                setSyncing(false)
            }
        }

        if (!targetSpreadsheetId) {
            setShowLinkModal(true)
            return
        }

        setSyncing(true)
        try {
            const res = await syncFPAttendanceSheet(targetSpreadsheetId, targetSheetTitle, sheetToSync)
            if (res?.sheetTitle && res.sheetTitle !== sheetToSync.googleSheetTitle) {
                updateSheet(sheetToSync.id, { googleSheetTitle: res.sheetTitle, spreadsheetId: targetSpreadsheetId })
            } else if (!sheetToSync.spreadsheetId) {
                updateSheet(sheetToSync.id, { spreadsheetId: targetSpreadsheetId })
            }
            toast.success(`"${sheetToSync.especialidad || 'Planilla'}" sincronizada con Google Sheets`)
            saveFPCloudRegistry().catch((err) => console.warn('[FPAttendanceSheetPage] Error guardando registro en Drive:', err))
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
        if (sheets.length === 0) {
            toast.error('No tenés planillas cargadas para sincronizar')
            return
        }
        setSyncing(true)
        let count = 0
        try {
            for (const s of sheets) {
                const courseForSheet = courses.find((c) =>
                    (c.id && c.id === s.cursoId) ||
                    (c.cursoNumero && s.cursoNumero && c.cursoNumero.trim().toLowerCase() === s.cursoNumero.trim().toLowerCase())
                ) || activeCourse

                let targetSpreadsheetId = s.spreadsheetId || courseForSheet?.links?.attendanceSheet?.spreadsheetId || attendanceLink?.spreadsheetId
                let targetSheetTitle = s.googleSheetTitle || courseForSheet?.links?.attendanceSheet?.sheetTitle || attendanceLink?.sheetTitle

                if (!targetSpreadsheetId && courseForSheet) {
                    try {
                        const disc = await discoverFolderAndFilesForCourse(courseForSheet.spreadsheetId || courseForSheet.spreadsheetUrl, courseForSheet.cursoNumero)
                        if (disc.success && disc.links?.attendanceSheet?.spreadsheetId) {
                            useFPCourseStore.getState().updateCourse(courseForSheet.id, {
                                folderId: disc.folderId || courseForSheet.folderId || '',
                                folderName: disc.folderName || courseForSheet.folderName || '',
                                links: { ...(courseForSheet.links || {}), ...disc.links },
                            })
                            targetSpreadsheetId = disc.links.attendanceSheet.spreadsheetId
                        }
                    } catch (e) {}
                }

                if (!targetSpreadsheetId) continue

                const res = await syncFPAttendanceSheet(targetSpreadsheetId, targetSheetTitle, s)
                if (res?.sheetTitle && res.sheetTitle !== s.googleSheetTitle) {
                    updateSheet(s.id, { googleSheetTitle: res.sheetTitle, spreadsheetId: targetSpreadsheetId })
                } else if (!s.spreadsheetId) {
                    updateSheet(s.id, { spreadsheetId: targetSpreadsheetId })
                }
                count++
            }

            if (count === 0 && !attendanceLink) {
                setShowLinkModal(true)
                return
            }

            toast.success(`${count} planilla(s) sincronizada(s) con Google Sheets`)
            saveFPCloudRegistry().catch((err) => console.warn('[FPAttendanceSheetPage] Error guardando registro en Drive:', err))
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
        const hasAnyLink = sheets.some((s) => s.spreadsheetId) ||
            courses.some((c) => c.links?.attendanceSheet?.spreadsheetId) ||
            attendanceLink

        if (!hasAnyLink) {
            if (activeCourse) {
                const disc = await discoverFolderAndFilesForCourse(activeCourse.spreadsheetId || activeCourse.spreadsheetUrl, activeCourse.cursoNumero)
                if (disc.success && disc.links?.attendanceSheet?.spreadsheetId) {
                    useFPCourseStore.getState().updateCourse(activeCourse.id, {
                        folderId: disc.folderId || activeCourse.folderId || '',
                        folderName: disc.folderName || activeCourse.folderName || '',
                        links: { ...(activeCourse.links || {}), ...disc.links },
                    })
                    saveFPCloudRegistry().catch((err) => console.warn(err))
                    toast.success(`Archivo detectado en carpeta "${disc.folderName || activeCourse.cursoNumero}"`)
                } else {
                    setShowLinkModal(true)
                    return
                }
            } else {
                setShowLinkModal(true)
                return
            }
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
        const targetName = sheetToDelete.googleSheetTitle || sheetToDelete.informeMes || sheetToDelete.especialidad || 'Planilla'
        const targetTab = sheetToDelete.googleSheetTitle || buildFPAttendanceTabTitle(sheetToDelete)
        const targetCurso = sheetToDelete.cursoNumero

        const courseForSheet = courses.find((c) =>
            (c.id && c.id === sheetToDelete.cursoId) ||
            (c.cursoNumero && sheetToDelete.cursoNumero && c.cursoNumero.trim().toLowerCase() === sheetToDelete.cursoNumero.trim().toLowerCase())
        ) || activeCourse
        const targetSpreadsheetId = sheetToDelete.spreadsheetId || courseForSheet?.links?.attendanceSheet?.spreadsheetId || attendanceLink?.spreadsheetId

        deleteSheet(targetId)
        if (selectedId === targetId) {
            setSelectedId(null)
        }
        setSheetToDelete(null)

        if (targetSpreadsheetId) {
            const remainingSheets = sheets.filter((s) => s.id !== targetId && (s.spreadsheetId === targetSpreadsheetId || s.cursoNumero === targetCurso))
            setSyncing(true)
            try {
                if (remainingSheets.length === 0) {
                    await clearFPAttendanceSheet(targetSpreadsheetId, targetTab)
                    toast.success(`"${targetName}" eliminada y Google Sheets vaciado`)
                } else {
                    await deleteFPSpreadsheetTab(targetSpreadsheetId, targetTab, targetCurso)
                    toast.success(`"${targetName}" eliminada`)
                }
                saveFPCloudRegistry().catch((err) => console.warn('[FPAttendanceSheetPage] Error guardando registro en Drive:', err))
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
            saveFPCloudRegistry().catch((err) => console.warn('[FPAttendanceSheetPage] Error guardando registro en Drive:', err))
        }
    }

    const executePull = async (spreadsheetId, sheetTitle, targetSheetId = null) => {
        setPulling(true)
        try {
            if (targetSheetId) {
                const current = sheets.find((s) => s.id === targetSheetId)
                const tabTitle = current?.googleSheetTitle || sheetTitle
                let data = null
                let notFound = false

                try {
                    data = await readFPAttendanceSheet(spreadsheetId, tabTitle)
                } catch (readErr) {
                    if (isAuthError(readErr)) throw readErr
                    const errMsg = (readErr?.message || readErr?.result?.error?.message || '').toLowerCase()
                    const is400 = readErr?.status === 400 || readErr?.result?.error?.code === 400
                    if (is400 || errMsg.includes('unable to parse range') || errMsg.includes('not found')) {
                        notFound = true
                    } else {
                        throw readErr
                    }
                }

                if (notFound || !data) {
                    // La pestaña fue eliminada en Google Sheets.
                    deleteSheet(targetSheetId)
                    const allSheets = await readAllFPAttendanceSheets(spreadsheetId).catch(() => [])
                    if (allSheets && allSheets.length > 0) {
                        syncAllFromCloud(allSheets, spreadsheetId, activeCourse?.cursoNumero)
                    }
                    saveFPCloudRegistry().catch((err) => console.warn(err))
                    toast(`La pestaña "${tabTitle || 'Asistencia'}" no existe en Google Drive (fue eliminada). Se actualizó la app.`, {
                        icon: 'ℹ️',
                        duration: 5000,
                    })
                    return
                }

                const updatedId = importOrUpdateSheet(data, targetSheetId)
                setSelectedId(updatedId)
                toast.success(`Asistencia traída desde Google Sheets (${data.students.length} alumnos)`)
            } else {
                const allSheets = await readAllFPAttendanceSheets(spreadsheetId)
                if (!allSheets || allSheets.length === 0) {
                    toast.error('No se encontraron planillas de asistencia en la hoja')
                    return
                }
                syncAllFromCloud(allSheets, spreadsheetId, activeCourse?.cursoNumero)
                toast.success(`Se sincronizaron ${allSheets.length} pestaña(s) desde Google Sheets`)
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

    const handlePullFromSheets = async (targetSheetId = null) => {
        if (targetSheetId) {
            const current = sheets.find((s) => s.id === targetSheetId)
            const courseForSheet = courses.find((c) =>
                (c.id && c.id === current?.cursoId) ||
                (c.cursoNumero && current?.cursoNumero && c.cursoNumero.trim().toLowerCase() === current.cursoNumero.trim().toLowerCase())
            ) || activeCourse

            let targetSpreadsheetId = current?.spreadsheetId || courseForSheet?.links?.attendanceSheet?.spreadsheetId || attendanceLink?.spreadsheetId
            let targetSheetTitle = current?.googleSheetTitle || courseForSheet?.links?.attendanceSheet?.sheetTitle || attendanceLink?.sheetTitle

            if (!targetSpreadsheetId && courseForSheet) {
                setPulling(true)
                const toastId = toast.loading('Buscando archivo de Asistencia en Drive...')
                try {
                    const disc = await discoverFolderAndFilesForCourse(courseForSheet.spreadsheetId || courseForSheet.spreadsheetUrl, courseForSheet.cursoNumero)
                    if (disc.success && disc.links?.attendanceSheet?.spreadsheetId) {
                        useFPCourseStore.getState().updateCourse(courseForSheet.id, {
                            folderId: disc.folderId || courseForSheet.folderId || '',
                            folderName: disc.folderName || courseForSheet.folderName || '',
                            links: { ...(courseForSheet.links || {}), ...disc.links },
                        })
                        saveFPCloudRegistry().catch((err) => console.warn(err))
                        targetSpreadsheetId = disc.links.attendanceSheet.spreadsheetId
                        toast.success(`Archivo detectado en carpeta "${disc.folderName || courseForSheet.cursoNumero}"`)
                    }
                } catch (e) {
                    console.warn(e)
                } finally {
                    toast.dismiss(toastId)
                    setPulling(false)
                }
            }

            if (!targetSpreadsheetId) {
                setShowLinkModal(true)
                return
            }

            const confirmMsg = 'Esto va a recargar los datos de esta planilla desde Google Sheets. ¿Continuar?'
            if (!window.confirm(confirmMsg)) return
            await executePull(targetSpreadsheetId, targetSheetTitle, targetSheetId)
            return
        }

        // Pull de las pestañas del curso activo (o general si se seleccionó 'ALL')
        if (activeCourse && selectedCourseId !== 'ALL') {
            let targetSpreadsheetId = activeCourse.links?.attendanceSheet?.spreadsheetId || attendanceLink?.spreadsheetId
            let targetSheetTitle = activeCourse.links?.attendanceSheet?.sheetTitle || attendanceLink?.sheetTitle

            if (!targetSpreadsheetId) {
                setPulling(true)
                const toastId = toast.loading('Buscando archivo de Asistencia en Drive...')
                try {
                    const disc = await discoverFolderAndFilesForCourse(activeCourse.spreadsheetId || activeCourse.spreadsheetUrl, activeCourse.cursoNumero)
                    if (disc.success && disc.links?.attendanceSheet?.spreadsheetId) {
                        useFPCourseStore.getState().updateCourse(activeCourse.id, {
                            folderId: disc.folderId || activeCourse.folderId || '',
                            folderName: disc.folderName || activeCourse.folderName || '',
                            links: { ...(activeCourse.links || {}), ...disc.links },
                        })
                        saveFPCloudRegistry().catch((err) => console.warn(err))
                        targetSpreadsheetId = disc.links.attendanceSheet.spreadsheetId
                        toast.success(`Archivo detectado en carpeta "${disc.folderName || activeCourse.cursoNumero}"`)
                    }
                } catch (e) {
                    console.warn(e)
                } finally {
                    toast.dismiss(toastId)
                    setPulling(false)
                }
            }

            if (!targetSpreadsheetId) {
                setShowLinkModal(true)
                return
            }

            const confirmMsg = `Esto va a sincronizar las pestañas de asistencia del Curso Nº ${activeCourse.cursoNumero || '—'} con Google Sheets. ¿Continuar?`
            if (!window.confirm(confirmMsg)) return
            await executePull(targetSpreadsheetId, targetSheetTitle, null)
            return
        }

        // Pull general de todas las planillas (modo ALL)
        setPulling(true)
        const toastId = toast.loading('Buscando planillas de Asistencia en Google Drive...')
        try {
            await autoDiscoverAndSyncCloudRegistry()
        } catch (e) {
            console.warn(e)
        } finally {
            toast.dismiss(toastId)
            setPulling(false)
        }

        const freshCourses = useFPCourseStore.getState().courses
        const freshAttendanceLink = useFPGoogleLinksStore.getState().links.attendanceSheet
        const spreadsheetsMap = new Map()

        if (freshAttendanceLink?.spreadsheetId) {
            spreadsheetsMap.set(freshAttendanceLink.spreadsheetId, {
                spreadsheetId: freshAttendanceLink.spreadsheetId,
                sheetTitle: freshAttendanceLink.sheetTitle,
            })
        }
        freshCourses.forEach((c) => {
            if (c.links?.attendanceSheet?.spreadsheetId) {
                spreadsheetsMap.set(c.links.attendanceSheet.spreadsheetId, {
                    spreadsheetId: c.links.attendanceSheet.spreadsheetId,
                    sheetTitle: c.links.attendanceSheet.name || '',
                })
            }
        })
        sheets.forEach((s) => {
            if (s.spreadsheetId) {
                spreadsheetsMap.set(s.spreadsheetId, {
                    spreadsheetId: s.spreadsheetId,
                    sheetTitle: s.googleSheetTitle || '',
                })
            }
        })

        const uniqueSpreadsheets = Array.from(spreadsheetsMap.values())
        if (uniqueSpreadsheets.length === 0) {
            setShowLinkModal(true)
            return
        }

        const confirmMsg = `Esto va a sincronizar este dispositivo con Google Sheets (${uniqueSpreadsheets.length} archivo(s)). ¿Continuar?`
        if (!window.confirm(confirmMsg)) return

        for (const sItem of uniqueSpreadsheets) {
            await executePull(sItem.spreadsheetId, sItem.sheetTitle, null)
        }
    }

    const handleLinkAndPull = async () => {
        if (!linkInput.trim()) {
            toast.error('Pegá el link o ID de la hoja de cálculo')
            return
        }
        setLinking(true)
        try {
            const result = await linkFPDocument(linkInput.trim())
            if (!result) {
                toast.error('No se pudo interpretar el archivo de Google Sheets')
                return
            }
            setLink('attendanceSheet', result)

            const courseForLink = matchingCourse || activeCourse
            if (courseForLink) {
                useFPCourseStore.getState().updateCourse(courseForLink.id, {
                    links: {
                        ...(courseForLink.links || {}),
                        attendanceSheet: {
                            spreadsheetId: result.spreadsheetId,
                            spreadsheetUrl: linkInput.trim(),
                            name: 'Asistencia de Alumnos',
                        },
                    },
                })
            }

            if (selectedId) {
                updateSheet(selectedId, { spreadsheetId: result.spreadsheetId, googleSheetTitle: result.sheetTitle })
            }

            setShowLinkModal(false)
            setLinkInput('')
            toast.success('Archivo vinculado correctamente')
            saveFPCloudRegistry().catch((err) => console.warn('[FPAttendanceSheetPage] Error guardando registro en Drive:', err))
            await executePull(result.spreadsheetId, result.sheetTitle, selectedId)
        } catch (error) {
            console.error('[FPAttendanceSheetPage] Error al vincular y descargar:', error)
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

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Cabecera Principal */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Asistencia de Alumnos</h1>
                    <p className="text-sm text-text-secondary mt-1">Formación Profesional — Registro Mensual de Asistencia</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        icon={CloudDownload}
                        loading={pulling}
                        disabled={pulling || syncing}
                        onClick={() => handlePullFromSheets(null)}
                        title="Descarga la planilla de asistencia desde Google Sheets hacia este dispositivo"
                    >
                        Traer de Google Sheets
                    </Button>
                    <Button
                        icon={RefreshCw}
                        loading={syncing}
                        disabled={syncing || pulling}
                        onClick={selected ? () => handleSyncSingle(selected) : handleSyncGeneral}
                        title="Sincroniza los datos con Google Sheets"
                    >
                        {selected ? 'Sincronizar Pestaña' : 'Sincronizar con Sheets'}
                    </Button>
                    <Button icon={Plus} onClick={handleAddNewSheet}>
                        Nueva Pestaña / Mes
                    </Button>
                </div>
            </div>

            {/* Selector de Curso (Siempre visible) */}
            <div className="bg-bg-surface border border-border-light rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary whitespace-nowrap">📚 Número de Curso:</span>
                    {courses.length > 0 ? (
                        <select
                            className="bg-bg-main border border-border-light rounded-lg px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={activeCourse ? activeCourse.id : ''}
                            onChange={(e) => {
                                setSelectedCourseId(e.target.value)
                                setSelectedId(null)
                            }}
                        >
                            {courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    Curso Nº {c.cursoNumero || '—'} · {c.especialidad || 'Sin especialidad'}
                                </option>
                            ))}
                            {courses.length > 1 && <option value="ALL">Mostrar todos los cursos (Vista resumen)</option>}
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
                        <span><strong>Alumnos en Ficha:</strong> {activeCourse.students?.length || 0}</span>
                        {activeCourse.folderName && (
                            <span className="text-primary font-medium">📁 {activeCourse.folderName}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Vista Resumen cuando se selecciona "Mostrar todos los cursos" */}
            {selectedCourseId === 'ALL' && (
                <div className="space-y-4">
                    <h2 className="text-base font-semibold text-text-primary">Todas las Planillas de Asistencia</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSheets.map((s) => (
                            <Card
                                key={s.id}
                                className="cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => {
                                    if (s.cursoId) setSelectedCourseId(s.cursoId)
                                    setSelectedId(s.id)
                                }}
                            >
                                <CardBody>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-text-primary">{s.especialidad || 'Sin especialidad'}</p>
                                            <p className="text-xs text-text-secondary mt-0.5">Curso Nº {s.cursoNumero || '—'} · {s.informeMes || 'Sin mes'} {s.informeAnio}</p>
                                            <p className="text-xs text-text-muted mt-1">{s.students?.length || 0} alumnos</p>
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
                </div>
            )}

            {/* Vista por Curso con Pestañas y Espejo Completo */}
            {selectedCourseId !== 'ALL' && (
                <>
                    {filteredSheets.length === 0 ? (
                        <Card>
                            <CardBody className="text-center py-12 space-y-4">
                                <p className="text-text-secondary">
                                    {courses.length === 0
                                        ? 'Para comenzar a registrar la asistencia mensual, primero debés cargar un curso en la pestaña "Ficha de Curso".'
                                        : `Todavía no hay informes mensuales para el Curso Nº ${activeCourse?.cursoNumero || '—'}.`}
                                </p>
                                {activeCourse && (
                                    <div className="flex items-center justify-center gap-3 pt-2">
                                        <Button icon={Plus} onClick={handleAddNewSheet}>
                                            Crear Primera Pestaña (Mes)
                                        </Button>
                                        <Button
                                            variant="outline"
                                            icon={CloudDownload}
                                            loading={pulling}
                                            disabled={pulling}
                                            onClick={() => handlePullFromSheets(null)}
                                        >
                                            Traer de Google Sheets
                                        </Button>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    ) : selected ? (
                        <div className="space-y-5">
                            {/* Barra de Navegación de Pestañas (Estilo Google Sheets) */}
                            <div className="bg-bg-surface border border-border-light rounded-xl p-2 shadow-sm">
                                <div className="flex items-center justify-between gap-2 mb-2 px-2 pt-1">
                                    <span className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                        📑 Pestañas de Asistencia (Meses)
                                    </span>
                                    <span className="text-xs text-text-muted">
                                        Hacé clic para navegar entre las distintas pestañas
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                                    {filteredSheets.map((s, idx) => {
                                        const isActive = s.id === activeTabId
                                        const tabTitle = s.googleSheetTitle || (s.informeMes ? `${s.informeMes} ${s.informeAnio || ''}`.trim() : `Pestaña ${idx + 1}`)
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => setSelectedId(s.id)}
                                                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap border ${
                                                    isActive
                                                        ? 'bg-primary text-white border-primary shadow-sm font-semibold'
                                                        : 'bg-bg-main text-text-secondary hover:text-text-primary hover:bg-bg-hover border-border-light'
                                                }`}
                                            >
                                                <ClipboardCheck className={`w-4 h-4 ${isActive ? 'text-white' : 'text-text-muted'}`} />
                                                <span>{tabTitle}</span>
                                                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                                                    isActive ? 'bg-white/20 text-white font-bold' : 'bg-border-light text-text-muted'
                                                }`}>
                                                    {s.students?.length || 0}
                                                </span>
                                            </button>
                                        )
                                    })}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={Plus}
                                        onClick={handleAddNewSheet}
                                        className="whitespace-nowrap shrink-0 text-xs ml-1"
                                        title="Crear nueva pestaña / mes para este curso"
                                    >
                                        Nueva Pestaña
                                    </Button>
                                </div>
                            </div>

                            {/* Barra de Acciones de la Pestaña Activa */}
                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-bg-surface border border-border-light rounded-xl shadow-sm">
                                <div>
                                    <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                                        <span>Planilla: {selected.googleSheetTitle || (selected.informeMes ? `${selected.informeMes} ${selected.informeAnio || ''}`.trim() : 'Sin mes')}</span>
                                        <span className="text-xs font-normal text-text-secondary">· Curso Nº {selected.cursoNumero || activeCourse?.cursoNumero || '—'} ({selected.especialidad || 'Sin especialidad'})</span>
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={CloudDownload}
                                        loading={pulling}
                                        disabled={pulling || syncing}
                                        onClick={() => handlePullFromSheets(selected.id)}
                                        title="Recarga los datos de esta pestaña desde Google Sheets"
                                    >
                                        Cargar de Sheets
                                    </Button>
                                    <Button
                                        size="sm"
                                        icon={RefreshCw}
                                        loading={syncing}
                                        disabled={syncing || pulling}
                                        onClick={() => handleSyncSingle(selected)}
                                        title="Sincroniza esta pestaña con Google Sheets"
                                    >
                                        Sincronizar Pestaña
                                    </Button>
                                    <button
                                        onClick={(e) => handleDeleteClick(e, selected)}
                                        className="p-2 text-text-muted hover:text-error transition-colors rounded-lg hover:bg-bg-hover"
                                        title="Eliminar esta pestaña / informe mensual"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Datos generales */}
                            <Card>
                                <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                                    <ClipboardCheck className="w-4 h-4 text-primary" />
                                    <h2 className="text-base font-semibold text-text-primary">Datos Generales</h2>
                                </div>
                                <CardBody className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <Input label="Centro Nº" value={selected.centroNumero} onChange={(e) => updateSheet(selected.id, { centroNumero: e.target.value })} />
                                        <Input label="Distrito" value={selected.distrito} onChange={(e) => updateSheet(selected.id, { distrito: e.target.value })} />
                                        <Input label="Tipo" value={selected.tipo} onChange={(e) => updateSheet(selected.id, { tipo: e.target.value })} />
                                        <Input label="F.O." value={selected.fo} onChange={(e) => updateSheet(selected.id, { fo: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input label="Curso Nº" value={selected.cursoNumero} onChange={(e) => updateSheet(selected.id, { cursoNumero: e.target.value })} />
                                        <Input className="md:col-span-2" label="Especialidad" value={selected.especialidad} onChange={(e) => updateSheet(selected.id, { especialidad: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input label="Informe del mes de" value={selected.informeMes} onChange={(e) => updateSheet(selected.id, { informeMes: e.target.value })} />
                                        <Input label="Año" value={selected.informeAnio} onChange={(e) => updateSheet(selected.id, { informeAnio: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Input label="Lugar donde dicta" value={selected.lugarDictado} onChange={(e) => updateSheet(selected.id, { lugarDictado: e.target.value })} />
                                        <Input label="En la calle" value={selected.enLaCalle} onChange={(e) => updateSheet(selected.id, { enLaCalle: e.target.value })} />
                                        <Input label="Localidad" value={selected.localidad} onChange={(e) => updateSheet(selected.id, { localidad: e.target.value })} />
                                    </div>

                                    <div>
                                        <p className="block text-sm font-medium text-text-secondary mb-1.5">Horarios</p>
                                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                            {DIAS_SEMANA.map((d) => (
                                                <Input
                                                    key={d.key}
                                                    label={d.label}
                                                    placeholder="Ej. 18 a 22"
                                                    value={selected.horarios?.[d.key] || ''}
                                                    onChange={(e) => updateSheetHorario(selected.id, d.key, e.target.value)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Banner recordatorio si se agregaron alumnos en Ficha de Curso */}
                            {hasAttendanceAlertForSelected && (
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 animate-fade-in shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-text-primary">
                                                Hay alumnos nuevos agregados en Ficha de Curso
                                            </h4>
                                            <p className="text-xs text-text-secondary mt-0.5">
                                                Presioná el botón <strong>"Actualizar de Ficha de Curso"</strong> para sincronizar la nómina en esta planilla mensual.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0"
                                        icon={RefreshCw}
                                        onClick={handleSyncStudentsFromCourse}
                                    >
                                        Actualizar de Ficha de Curso
                                    </Button>
                                </div>
                            )}

                            {/* Grilla de asistencia (Espejo completo) */}
                            <Card>
                                <div className="px-5 py-4 border-b border-border-light flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-base font-semibold text-text-primary">Grilla de Asistencia (P = Presente, A = Ausente)</h2>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSyncStudentsFromCourse}
                                            title="Actualiza la lista de alumnos desde la Ficha de Curso correspondiente"
                                        >
                                            Actualizar de Ficha de Curso
                                        </Button>
                                        <Button icon={Plus} size="sm" onClick={() => addStudent(selected.id)}>
                                            Agregar Alumno
                                        </Button>
                                    </div>
                                </div>
                                <CardBody className="overflow-x-auto">
                                    <table className="text-sm border-collapse">
                                        <thead>
                                            <tr className="text-left text-text-secondary border-b border-border-light">
                                                <th className="py-2 pr-2 w-10">Nº</th>
                                                <th className="py-2 pr-2 w-16">Sexo</th>
                                                <th className="py-2 pr-2 min-w-[180px]">Apellidos y Nombres</th>
                                                {DIAS_MES.map((d) => (
                                                    <th key={d} className="py-2 px-0.5 w-8 text-center">{d}</th>
                                                ))}
                                                <th className="py-2 px-1 w-14 text-center">Aus.</th>
                                                <th className="py-2 px-1 w-14 text-center">Pres.</th>
                                                <th className="py-2 pl-2 min-w-[200px]">Temas tratados desde el último informe</th>
                                                <th className="py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selected.students.map((st, idx) => {
                                                const ausCount = DIAS_MES.filter((d) => (st.days?.[d] || '').trim().toUpperCase() === 'A').length
                                                const presCount = DIAS_MES.filter((d) => (st.days?.[d] || '').trim().toUpperCase() === 'P').length
                                                const valAus = (st.totalAus !== '' && st.totalAus !== undefined && Number(st.totalAus) > 0) ? st.totalAus : String(ausCount)
                                                const valPres = (st.totalPres !== '' && st.totalPres !== undefined && Number(st.totalPres) > 0) ? st.totalPres : String(presCount)

                                                return (
                                                    <tr key={st.id} className="border-b border-border-light/50">
                                                        <td className="py-1 pr-2 text-text-muted">{idx + 1}</td>
                                                        <td className="py-1 pr-2">
                                                            <input
                                                                className="w-12 px-1 py-1 rounded border border-border text-center bg-bg-card text-text-primary"
                                                                value={st.sexo}
                                                                maxLength={1}
                                                                onChange={(e) => updateStudent(selected.id, st.id, { sexo: e.target.value.toUpperCase() })}
                                                            />
                                                        </td>
                                                        <td className="py-1 pr-2">
                                                            <input
                                                                className="w-full min-w-[170px] px-2 py-1 rounded border border-border bg-bg-card text-text-primary"
                                                                value={st.apellidosNombres}
                                                                onChange={(e) => updateStudent(selected.id, st.id, { apellidosNombres: e.target.value })}
                                                            />
                                                        </td>
                                                        {DIAS_MES.map((d) => (
                                                            <td key={d} className="py-1 px-0.5">
                                                                <input
                                                                    className="w-7 h-7 text-center rounded border border-border bg-bg-card text-text-primary text-xs font-semibold"
                                                                    value={st.days[d]}
                                                                    maxLength={1}
                                                                    onChange={(e) => updateStudentDay(selected.id, st.id, d, e.target.value.toUpperCase())}
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="py-1 px-1">
                                                            <input
                                                                className="w-12 px-1 py-1 rounded border border-border text-center bg-bg-card text-text-primary font-bold text-xs"
                                                                value={valAus}
                                                                onChange={(e) => updateStudent(selected.id, st.id, { totalAus: e.target.value })}
                                                                title="Total Ausentes (Suma 1 por cada 'A')"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-1">
                                                            <input
                                                                className="w-12 px-1 py-1 rounded border border-border text-center bg-bg-card text-text-primary font-bold text-xs"
                                                                value={valPres}
                                                                onChange={(e) => updateStudent(selected.id, st.id, { totalPres: e.target.value })}
                                                                title="Total Presentes (Suma 1 por cada 'P')"
                                                            />
                                                        </td>
                                                        <td className="py-1 pl-2">
                                                            <input
                                                                className="w-full min-w-[190px] px-2 py-1 rounded border border-border bg-bg-card text-text-primary"
                                                                value={st.temasTratados}
                                                                onChange={(e) => updateStudent(selected.id, st.id, { temasTratados: e.target.value })}
                                                            />
                                                        </td>
                                                        <td className="py-1">
                                                            <button
                                                                onClick={() => setStudentToDelete(st)}
                                                                className="text-text-muted hover:text-error transition-colors p-1 rounded hover:bg-bg-hover"
                                                                title="Eliminar alumno de la asistencia"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                            {selected.students.length === 0 && (
                                                <tr>
                                                    <td colSpan={38} className="py-6 text-center text-text-muted">
                                                        No hay alumnos cargados todavía.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </CardBody>
                            </Card>

                            {/* Bajas de alumnos */}
                            <Card>
                                <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                                    <div>
                                        <h2 className="text-base font-semibold text-text-primary">Bajas de Alumnos/as</h2>
                                        <p className="text-xs text-text-muted mt-0.5">Al hacer click podés seleccionar un alumno cargado en el curso</p>
                                    </div>
                                    <Button icon={Plus} size="sm" onClick={handleOpenAddBajaModal}>
                                        Agregar Baja
                                    </Button>
                                </div>
                                <CardBody className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-text-secondary border-b border-border-light">
                                                <th className="py-2 pr-2 w-24">Sexo</th>
                                                <th className="py-2 pr-2">Apellidos y Nombres</th>
                                                <th className="py-2 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selected.bajas.map((b) => (
                                                <tr key={b.id} className="border-b border-border-light/50">
                                                    <td className="py-1.5 pr-2"><Input value={b.sexo} onChange={(e) => updateBaja(selected.id, b.id, { sexo: e.target.value })} /></td>
                                                    <td className="py-1.5 pr-2"><Input value={b.apellidosNombres} onChange={(e) => updateBaja(selected.id, b.id, { apellidosNombres: e.target.value })} /></td>
                                                    <td className="py-1.5">
                                                        <button
                                                            onClick={() => setBajaToDelete(b)}
                                                            className="text-text-muted hover:text-error transition-colors p-1 rounded hover:bg-bg-hover"
                                                            title="Eliminar registro de baja"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {selected.bajas.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="py-4 text-center text-text-muted">Sin bajas registradas.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </CardBody>
                            </Card>

                            {/* Movimiento de Alumnos */}
                            <Card>
                                <div className="px-5 py-4 border-b border-border-light flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-base font-semibold text-text-primary">Movimiento de Alumnos</h2>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            Calculado automáticamente según asistencia y bajas (Altas se ingresa manualmente por teclado)
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={RefreshCw}
                                        onClick={() => {
                                            calculateMovimiento(selected.id)
                                            toast.success('Movimiento de alumnos recalculado')
                                        }}
                                    >
                                        Recalcular
                                    </Button>
                                </div>
                                <CardBody className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {MOVIMIENTO_FIELDS.map((f) => (
                                        <Input
                                            key={f.key}
                                            label={f.label}
                                            value={selected.movimiento?.[f.key] || ''}
                                            onChange={(e) => updateMovimiento(selected.id, f.key, e.target.value)}
                                        />
                                    ))}
                                </CardBody>
                            </Card>

                            {/* Firmas */}
                            <Card>
                                <CardBody className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Input label="Firma" value={selected.firma} onChange={(e) => updateSheet(selected.id, { firma: e.target.value })} />
                                    <Input label="Instructor" value={selected.instructor} onChange={(e) => updateSheet(selected.id, { instructor: e.target.value })} />
                                    <Input label="Entregó" value={selected.entrego} onChange={(e) => updateSheet(selected.id, { entrego: e.target.value })} />
                                    <Input label="Recibió" value={selected.recibio} onChange={(e) => updateSheet(selected.id, { recibio: e.target.value })} />
                                </CardBody>
                            </Card>
                        </div>
                    ) : null}
                </>
            )}

            {/* Modal de confirmación al eliminar pestaña / informe mensual */}
            <ConfirmModal
                isOpen={!!sheetToDelete}
                onClose={() => setSheetToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Desea borrar realmente esta pestaña / informe mensual?"
                description={`¿Está seguro de que desea eliminar "${sheetToDelete?.googleSheetTitle || sheetToDelete?.informeMes || sheetToDelete?.especialidad || 'esta planilla'}" (Curso Nº ${sheetToDelete?.cursoNumero || '—'})? Esta acción no se puede deshacer.`}
                confirmLabel="Sí, eliminar y sincronizar"
            />

            {/* Modal de confirmación al eliminar alumno de la asistencia */}
            <ConfirmModal
                isOpen={!!studentToDelete}
                onClose={() => setStudentToDelete(null)}
                onConfirm={() => {
                    if (studentToDelete && selected) {
                        deleteStudent(selected.id, studentToDelete.id)
                        toast.success(`Alumno/a "${studentToDelete.apellidosNombres || 'seleccionado'}" eliminado/a de la asistencia`)
                        setStudentToDelete(null)
                    }
                }}
                title="¿Desea borrar realmente este alumno/a de la asistencia?"
                description={`¿Está seguro de que desea eliminar a "${studentToDelete?.apellidosNombres || 'este alumno'}" de esta planilla de asistencia? Esta acción no se puede deshacer.`}
                confirmLabel="Sí, borrar alumno"
            />

            {/* Modal de confirmación al eliminar baja */}
            <ConfirmModal
                isOpen={!!bajaToDelete}
                onClose={() => setBajaToDelete(null)}
                onConfirm={() => {
                    if (bajaToDelete && selected) {
                        deleteBaja(selected.id, bajaToDelete.id)
                        toast.success(`Baja de "${bajaToDelete.apellidosNombres || 'alumno'}" eliminada`)
                        setBajaToDelete(null)
                    }
                }}
                title="¿Desea borrar realmente esta baja?"
                description={`¿Está seguro de que desea eliminar la baja de "${bajaToDelete?.apellidosNombres || 'este alumno'}"?`}
                confirmLabel="Sí, borrar baja"
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
                            Tenés {sheets.length} informes cargados.
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
                                        Curso Nº {s.cursoNumero || '—'} · {s.informeMes || 'Sin mes'} {s.informeAnio} ({s.students.length} alumno{s.students.length !== 1 ? 's' : ''})
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
                title="Vincular Asistencia de Alumnos"
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
                                    const course = matchingCourse || activeCourse
                                    let found = false
                                    if (course) {
                                        const disc = await discoverFolderAndFilesForCourse(course.spreadsheetId || course.spreadsheetUrl, course.cursoNumero)
                                        if (disc.success && disc.links?.attendanceSheet?.spreadsheetId) {
                                            useFPCourseStore.getState().updateCourse(course.id, {
                                                folderId: disc.folderId || course.folderId || '',
                                                folderName: disc.folderName || course.folderName || '',
                                                links: { ...(course.links || {}), ...disc.links },
                                            })
                                            saveFPCloudRegistry().catch((err) => console.warn(err))
                                            toast.success(`¡Archivo detectado en carpeta "${disc.folderName || course.cursoNumero}"!`)
                                            setShowLinkModal(false)
                                            found = true
                                            if (selectedId) {
                                                updateSheet(selectedId, { spreadsheetId: disc.links.attendanceSheet.spreadsheetId })
                                            }
                                            await executePull(disc.links.attendanceSheet.spreadsheetId, disc.links.attendanceSheet.name || '', selectedId)
                                            return
                                        }
                                    }

                                    const res = await autoDiscoverAndSyncCloudRegistry()
                                    if (res.success) {
                                        const freshLink = useFPGoogleLinksStore.getState().links.attendanceSheet
                                        if (freshLink?.spreadsheetId) {
                                            toast.success('¡Vínculo detectado desde Drive!')
                                            setShowLinkModal(false)
                                            found = true
                                            await executePull(freshLink.spreadsheetId, freshLink.sheetTitle, selectedId)
                                            return
                                        }
                                    }

                                    if (!found) {
                                        toast.error('No se encontró el archivo de Asistencia en Drive. Podés pegar el link arriba.')
                                    }
                                } catch (e) {
                                    console.error('[FPAttendanceSheetPage] Error buscando en Drive:', e)
                                    toast.error('Error buscando en Drive')
                                } finally {
                                    toast.dismiss(toastId)
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

            {/* Modal para Agregar Baja seleccionando de la lista de alumnos */}
            <Modal
                isOpen={showAddBajaModal}
                onClose={() => setShowAddBajaModal(false)}
                title="Agregar Baja de Alumno/a"
            >
                <div className="space-y-4 p-2">
                    <p className="text-sm text-text-secondary">
                        Seleccioná el alumno/a cargado en este curso para registrar su baja. Se autocompletará su Apellidos y Nombres y Sexo:
                    </p>
                    {allCourseStudents && allCourseStudents.length > 0 ? (
                        <div>
                            <label className="block text-xs font-semibold text-text-primary mb-1.5">
                                Alumno/a del curso:
                            </label>
                            <select
                                className="w-full bg-bg-main border border-border-light rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={bajaStudentId}
                                onChange={(e) => setBajaStudentId(e.target.value)}
                            >
                                <option value="">-- Seleccionar un alumno/a del curso --</option>
                                {allCourseStudents.map((st) => {
                                    const isAlreadyBaja = (selected?.bajas || []).some(
                                        (b) => b.apellidosNombres && st.apellidosNombres && b.apellidosNombres.trim().toLowerCase() === st.apellidosNombres.trim().toLowerCase()
                                    )
                                    return (
                                        <option key={st.id} value={st.id}>
                                            {st.apellidosNombres || 'Sin nombre'} {st.sexo ? `(Sexo: ${st.sexo})` : ''} {isAlreadyBaja ? '— [Ya en bajas]' : ''}
                                        </option>
                                    )
                                })}
                            </select>
                        </div>
                    ) : (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400">
                            No hay alumnos cargados en este curso o informe para seleccionar. Podés cargar una fila de baja en blanco y completarla manualmente.
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (selected) addBaja(selected.id)
                                setShowAddBajaModal(false)
                                setBajaStudentId('')
                            }}
                        >
                            Cargar en Blanco
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setShowAddBajaModal(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleConfirmAddBaja}
                                disabled={!bajaStudentId}
                            >
                                Confirmar Baja
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
