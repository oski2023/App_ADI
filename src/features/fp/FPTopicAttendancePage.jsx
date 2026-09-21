import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import Modal from '../../shared/components/Modal'
import ConfirmModal from '../../shared/components/ConfirmModal'
import { Plus, Trash2, ArrowLeft, NotebookPen, RefreshCw, CloudDownload, Link2, Cloud } from 'lucide-react'
import useFPTopicAttendanceStore from '../../core/stores/useFPTopicAttendanceStore'
import useFPCourseStore from '../../core/stores/useFPCourseStore'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import { syncFPTopicAttendanceSheet, readFPTopicAttendanceSheet, readAllFPTopicAttendanceSheets, clearFPTopicAttendanceSheet, deleteFPSpreadsheetTab, buildFPTopicTabTitle, linkFPDocument } from '../../infrastructure/google/sheetsService'
import { saveFPCloudRegistry, autoDiscoverAndSyncCloudRegistry } from '../../infrastructure/google/fpCloudRegistry'
import { discoverFolderAndFilesForCourse } from '../../infrastructure/google/fpDriveDiscovery'
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
    const [entryToDelete, setEntryToDelete] = useState(null)
    const [showSyncSelectModal, setShowSyncSelectModal] = useState(false)

    const handleSyncSingle = async (sheetToSync) => {
        const courseForSheet = courses.find((c) =>
            (c.id && c.id === sheetToSync.cursoId) ||
            (c.cursoNumero && sheetToSync.cursoNumero && c.cursoNumero.trim().toLowerCase() === sheetToSync.cursoNumero.trim().toLowerCase())
        ) || activeCourse

        let targetSpreadsheetId = sheetToSync.spreadsheetId || courseForSheet?.links?.topicAttendance?.spreadsheetId || topicLink?.spreadsheetId
        let targetSheetTitle = sheetToSync.googleSheetTitle || courseForSheet?.links?.topicAttendance?.sheetTitle || topicLink?.sheetTitle

        if (!targetSpreadsheetId && courseForSheet) {
            setSyncing(true)
            const toastId = toast.loading('Buscando planilla de Tema en Drive...')
            try {
                const disc = await discoverFolderAndFilesForCourse(courseForSheet.spreadsheetId || courseForSheet.spreadsheetUrl, courseForSheet.cursoNumero)
                if (disc.success && disc.links?.topicAttendance?.spreadsheetId) {
                    useFPCourseStore.getState().updateCourse(courseForSheet.id, {
                        folderId: disc.folderId || courseForSheet.folderId || '',
                        folderName: disc.folderName || courseForSheet.folderName || '',
                        links: { ...(courseForSheet.links || {}), ...disc.links },
                    })
                    saveFPCloudRegistry().catch((err) => console.warn(err))
                    targetSpreadsheetId = disc.links.topicAttendance.spreadsheetId
                    toast.success(`Archivo detectado en carpeta "${disc.folderName || courseForSheet.cursoNumero}"`)
                }
            } catch (discErr) {
                console.warn('[FPTopicAttendancePage] Error en auto-descubrimiento al sincronizar:', discErr)
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
            const res = await syncFPTopicAttendanceSheet(targetSpreadsheetId, targetSheetTitle, sheetToSync)
            if (res?.sheetTitle && res.sheetTitle !== sheetToSync.googleSheetTitle) {
                updateSheet(sheetToSync.id, { googleSheetTitle: res.sheetTitle, spreadsheetId: targetSpreadsheetId })
            } else if (!sheetToSync.spreadsheetId) {
                updateSheet(sheetToSync.id, { spreadsheetId: targetSpreadsheetId })
            }
            toast.success(`"${sheetToSync.especialidad || 'Planilla'}" sincronizada con Google Sheets`)
            saveFPCloudRegistry().catch((err) => console.warn('[FPTopicAttendancePage] Error guardando registro en Drive:', err))
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

                let targetSpreadsheetId = s.spreadsheetId || courseForSheet?.links?.topicAttendance?.spreadsheetId || topicLink?.spreadsheetId
                let targetSheetTitle = s.googleSheetTitle || courseForSheet?.links?.topicAttendance?.sheetTitle || topicLink?.sheetTitle

                if (!targetSpreadsheetId && courseForSheet) {
                    try {
                        const disc = await discoverFolderAndFilesForCourse(courseForSheet.spreadsheetId || courseForSheet.spreadsheetUrl, courseForSheet.cursoNumero)
                        if (disc.success && disc.links?.topicAttendance?.spreadsheetId) {
                            useFPCourseStore.getState().updateCourse(courseForSheet.id, {
                                folderId: disc.folderId || courseForSheet.folderId || '',
                                folderName: disc.folderName || courseForSheet.folderName || '',
                                links: { ...(courseForSheet.links || {}), ...disc.links },
                            })
                            targetSpreadsheetId = disc.links.topicAttendance.spreadsheetId
                        }
                    } catch (e) {}
                }

                if (!targetSpreadsheetId) continue

                const res = await syncFPTopicAttendanceSheet(targetSpreadsheetId, targetSheetTitle, s)
                if (res?.sheetTitle && res.sheetTitle !== s.googleSheetTitle) {
                    updateSheet(s.id, { googleSheetTitle: res.sheetTitle, spreadsheetId: targetSpreadsheetId })
                } else if (!s.spreadsheetId) {
                    updateSheet(s.id, { spreadsheetId: targetSpreadsheetId })
                }
                count++
            }

            if (count === 0 && !topicLink) {
                setShowLinkModal(true)
                return
            }

            toast.success(`${count} planilla(s) sincronizada(s) con Google Sheets`)
            saveFPCloudRegistry().catch((err) => console.warn('[FPTopicAttendancePage] Error guardando registro en Drive:', err))
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
            courses.some((c) => c.links?.topicAttendance?.spreadsheetId) ||
            topicLink

        if (!hasAnyLink) {
            if (activeCourse) {
                const disc = await discoverFolderAndFilesForCourse(activeCourse.spreadsheetId || activeCourse.spreadsheetUrl, activeCourse.cursoNumero)
                if (disc.success && disc.links?.topicAttendance?.spreadsheetId) {
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
        const targetName = sheetToDelete.especialidad || 'Planilla'
        const targetTab = sheetToDelete.googleSheetTitle || buildFPTopicTabTitle(sheetToDelete)
        const targetCurso = sheetToDelete.cursoNumero

        const courseForSheet = courses.find((c) =>
            (c.id && c.id === sheetToDelete.cursoId) ||
            (c.cursoNumero && sheetToDelete.cursoNumero && c.cursoNumero.trim().toLowerCase() === sheetToDelete.cursoNumero.trim().toLowerCase())
        ) || activeCourse
        const targetSpreadsheetId = sheetToDelete.spreadsheetId || courseForSheet?.links?.topicAttendance?.spreadsheetId || topicLink?.spreadsheetId

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
                    await clearFPTopicAttendanceSheet(targetSpreadsheetId, targetTab)
                    toast.success(`"${targetName}" eliminada y Google Sheets vaciado`)
                } else {
                    await deleteFPSpreadsheetTab(targetSpreadsheetId, targetTab, targetCurso)
                    toast.success(`"${targetName}" eliminada`)
                }
                saveFPCloudRegistry().catch((err) => console.warn('[FPTopicAttendancePage] Error guardando registro en Drive:', err))
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
            saveFPCloudRegistry().catch((err) => console.warn('[FPTopicAttendancePage] Error guardando registro en Drive:', err))
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
                    data = await readFPTopicAttendanceSheet(spreadsheetId, tabTitle)
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
                    deleteSheet(targetSheetId)
                    const allSheets = await readAllFPTopicAttendanceSheets(spreadsheetId).catch(() => [])
                    if (allSheets && allSheets.length > 0) {
                        syncAllFromCloud(allSheets, spreadsheetId, activeCourse?.cursoNumero)
                    }
                    saveFPCloudRegistry().catch((err) => console.warn(err))
                    toast(`La planilla "${tabTitle || 'Tema y Asistencia'}" no existe en Google Drive (fue eliminada). Se actualizó la app.`, {
                        icon: 'ℹ️',
                        duration: 5000,
                    })
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
                syncAllFromCloud(allSheets, spreadsheetId, activeCourse?.cursoNumero)
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

    const handlePullFromSheets = async (targetSheetId = null) => {
        if (targetSheetId) {
            const current = sheets.find((s) => s.id === targetSheetId)
            const courseForSheet = courses.find((c) =>
                (c.id && c.id === current?.cursoId) ||
                (c.cursoNumero && current?.cursoNumero && c.cursoNumero.trim().toLowerCase() === current.cursoNumero.trim().toLowerCase())
            ) || activeCourse

            let targetSpreadsheetId = current?.spreadsheetId || courseForSheet?.links?.topicAttendance?.spreadsheetId || topicLink?.spreadsheetId
            let targetSheetTitle = current?.googleSheetTitle || courseForSheet?.links?.topicAttendance?.sheetTitle || topicLink?.sheetTitle

            if (!targetSpreadsheetId && courseForSheet) {
                setPulling(true)
                const toastId = toast.loading('Buscando planilla de Tema en Drive...')
                try {
                    const disc = await discoverFolderAndFilesForCourse(courseForSheet.spreadsheetId || courseForSheet.spreadsheetUrl, courseForSheet.cursoNumero)
                    if (disc.success && disc.links?.topicAttendance?.spreadsheetId) {
                        useFPCourseStore.getState().updateCourse(courseForSheet.id, {
                            folderId: disc.folderId || courseForSheet.folderId || '',
                            folderName: disc.folderName || courseForSheet.folderName || '',
                            links: { ...(courseForSheet.links || {}), ...disc.links },
                        })
                        saveFPCloudRegistry().catch((err) => console.warn(err))
                        targetSpreadsheetId = disc.links.topicAttendance.spreadsheetId
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

        // Pull general de todas las planillas de tema
        setPulling(true)
        const toastId = toast.loading('Buscando planillas de Tema en Google Drive...')
        try {
            await autoDiscoverAndSyncCloudRegistry()
        } catch (e) {
            console.warn(e)
        } finally {
            toast.dismiss(toastId)
            setPulling(false)
        }

        const freshCourses = useFPCourseStore.getState().courses
        const freshTopicLink = useFPGoogleLinksStore.getState().links.topicAttendance
        const spreadsheetsMap = new Map()

        if (freshTopicLink?.spreadsheetId) {
            spreadsheetsMap.set(freshTopicLink.spreadsheetId, {
                spreadsheetId: freshTopicLink.spreadsheetId,
                sheetTitle: freshTopicLink.sheetTitle,
            })
        }
        freshCourses.forEach((c) => {
            if (c.links?.topicAttendance?.spreadsheetId) {
                spreadsheetsMap.set(c.links.topicAttendance.spreadsheetId, {
                    spreadsheetId: c.links.topicAttendance.spreadsheetId,
                    sheetTitle: c.links.topicAttendance.name || '',
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
            await executePull(sItem.spreadsheetId, sItem.sheetTitle)
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
            setLink('topicAttendance', result)

            const courseForLink = activeCourse
            if (courseForLink) {
                useFPCourseStore.getState().updateCourse(courseForLink.id, {
                    links: {
                        ...(courseForLink.links || {}),
                        topicAttendance: {
                            spreadsheetId: result.spreadsheetId,
                            spreadsheetUrl: linkInput.trim(),
                            name: 'Planilla de Tema y Asistencia',
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
            saveFPCloudRegistry().catch((err) => console.warn('[FPTopicAttendancePage] Error guardando registro en Drive:', err))
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
                                            <button
                                                onClick={() => setEntryToDelete(e)}
                                                className="text-text-muted hover:text-error transition-colors p-1 rounded hover:bg-bg-hover"
                                                title="Eliminar clase"
                                            >
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

                {/* Modal de confirmación al eliminar clase */}
                <ConfirmModal
                    isOpen={!!entryToDelete}
                    onClose={() => setEntryToDelete(null)}
                    onConfirm={() => {
                        if (entryToDelete && selected) {
                            deleteEntry(selected.id, entryToDelete.id)
                            toast.success('Clase eliminada')
                            setEntryToDelete(null)
                        }
                    }}
                    title="¿Desea borrar realmente esta clase?"
                    description={`¿Está seguro de que desea eliminar la clase del día ${entryToDelete?.fecha || 'registrada'} ("${entryToDelete?.tema || 'Sin tema'}")? Esta acción no se puede deshacer.`}
                    confirmLabel="Sí, borrar clase"
                />
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

            {/* Modal de confirmación al eliminar planilla */}
            <ConfirmModal
                isOpen={!!sheetToDelete}
                onClose={() => setSheetToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="¿Desea borrar realmente esta planilla?"
                description={`¿Está seguro de que desea eliminar "${sheetToDelete?.especialidad || 'esta planilla'}" (Curso Nº ${sheetToDelete?.cursoNumero || '—'})? Esta acción no se puede deshacer.`}
                confirmLabel="Sí, eliminar y sincronizar"
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
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                        <Button
                            variant="outline"
                            icon={Cloud}
                            disabled={linking}
                            onClick={async () => {
                                setLinking(true)
                                const toastId = toast.loading('Buscando en Google Drive...')
                                try {
                                    const course = activeCourse
                                    let found = false
                                    if (course) {
                                        const disc = await discoverFolderAndFilesForCourse(course.spreadsheetId || course.spreadsheetUrl, course.cursoNumero)
                                        if (disc.success && disc.links?.topicAttendance?.spreadsheetId) {
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
                                                updateSheet(selectedId, { spreadsheetId: disc.links.topicAttendance.spreadsheetId })
                                            }
                                            await executePull(disc.links.topicAttendance.spreadsheetId, disc.links.topicAttendance.name || '', selectedId)
                                            return
                                        }
                                    }

                                    const res = await autoDiscoverAndSyncCloudRegistry()
                                    if (res.success) {
                                        const freshLink = useFPGoogleLinksStore.getState().links.topicAttendance
                                        if (freshLink?.spreadsheetId) {
                                            toast.success('¡Vínculo detectado desde Drive!')
                                            setShowLinkModal(false)
                                            found = true
                                            await executePull(freshLink.spreadsheetId, freshLink.sheetTitle, selectedId)
                                            return
                                        }
                                    }

                                    if (!found) {
                                        toast.error('No se encontró el archivo de Tema y Asistencia en Drive. Podés pegar el link arriba.')
                                    }
                                } catch (e) {
                                    console.error('[FPTopicAttendancePage] Error buscando en Drive:', e)
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
        </div>
    )
}
