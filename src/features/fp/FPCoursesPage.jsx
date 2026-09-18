import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import Modal from '../../shared/components/Modal'
import ConfirmModal from '../../shared/components/ConfirmModal'
import { Plus, Trash2, ArrowLeft, GraduationCap, RefreshCw, CloudDownload, Link2 } from 'lucide-react'
import useFPCourseStore from '../../core/stores/useFPCourseStore'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import { syncFPCourseSheet, readFPCourseSheet, readAllFPCourseSheets, clearFPCourseSheet, deleteFPSpreadsheetTab, buildFPCourseTabTitle, linkFPDocument } from '../../infrastructure/google/sheetsService'
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

    const [selectedId, setSelectedId] = useState(null)
    const selected = courses.find((c) => c.id === selectedId)
    const courseLink = useFPGoogleLinksStore((s) => s.links.course)
    const setLink = useFPGoogleLinksStore((s) => s.setLink)

    const [syncing, setSyncing] = useState(false)
    const [pulling, setPulling] = useState(false)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [linkInput, setLinkInput] = useState('')
    const [linking, setLinking] = useState(false)

    // Estados para confirmación de eliminación y selección de sincronización
    const [courseToDelete, setCourseToDelete] = useState(null)
    const [showSyncSelectModal, setShowSyncSelectModal] = useState(false)

    const handleSyncSingle = async (courseToSync) => {
        if (!courseLink) {
            setShowLinkModal(true)
            return
        }
        setSyncing(true)
        try {
            const res = await syncFPCourseSheet(courseLink.spreadsheetId, courseLink.sheetTitle, courseToSync)
            if (res?.sheetTitle && res.sheetTitle !== courseToSync.googleSheetTitle) {
                updateCourse(courseToSync.id, { googleSheetTitle: res.sheetTitle })
            }
            toast.success(`"${courseToSync.especialidad || 'Curso'}" sincronizado con Google Sheets`)
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
        if (!courseLink) {
            setShowLinkModal(true)
            return
        }
        if (courses.length === 0) {
            toast.error('No tenés cursos cargados para sincronizar')
            return
        }
        setSyncing(true)
        let count = 0
        try {
            for (const c of courses) {
                const res = await syncFPCourseSheet(courseLink.spreadsheetId, courseLink.sheetTitle, c)
                if (res?.sheetTitle && res.sheetTitle !== c.googleSheetTitle) {
                    updateCourse(c.id, { googleSheetTitle: res.sheetTitle })
                }
                count++
            }
            toast.success(`${count} curso(s) sincronizado(s) con Google Sheets`)
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
        if (!courseLink) {
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
        deleteCourse(targetId)
        setCourseToDelete(null)

        if (courseLink) {
            const remainingCourses = courses.filter((c) => c.id !== targetId)
            setSyncing(true)
            try {
                if (remainingCourses.length === 0) {
                    await clearFPCourseSheet(courseLink.spreadsheetId, courseLink.sheetTitle)
                    toast.success(`"${targetName}" eliminado y Google Sheets vaciado`)
                } else {
                    await deleteFPSpreadsheetTab(courseLink.spreadsheetId, targetTab, targetCurso)
                    toast.success(`"${targetName}" eliminado`)
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
            toast.success(`"${targetName}" eliminado`)
        }
    }

    const executePull = async (spreadsheetId, sheetTitle, targetCourseId = null) => {
        setPulling(true)
        try {
            if (targetCourseId) {
                const current = courses.find((c) => c.id === targetCourseId)
                const tabTitle = current?.googleSheetTitle || sheetTitle
                const data = await readFPCourseSheet(spreadsheetId, tabTitle)
                if (!data) {
                    toast.error('No se pudieron leer los datos del curso')
                    return
                }
                const updatedId = importOrUpdateCourse(data, targetCourseId)
                setSelectedId(updatedId)
                toast.success(`Curso traído desde Google Sheets (${data.students.length} estudiantes)`)
            } else {
                const allCourses = await readAllFPCourseSheets(spreadsheetId)
                if (!allCourses || allCourses.length === 0) {
                    toast.error('No se encontraron cursos en la hoja')
                    return
                }
                syncAllFromCloud(allCourses)
                toast.success(`Se sincronizaron ${allCourses.length} curso(s) desde Google Sheets`)
            }
        } catch (error) {
            if (isAuthError(error)) {
                notifyAuthExpired(() => executePull(spreadsheetId, sheetTitle, targetCourseId))
            } else {
                toast.error('Error al traer los datos desde Google Sheets')
            }
        } finally {
            setPulling(false)
        }
    }

    const handlePullFromSheets = (targetCourseId = null) => {
        if (!courseLink) {
            setShowLinkModal(true)
            return
        }
        const confirmMsg = targetCourseId
            ? 'Esto va a recargar los datos de este curso desde Google Sheets. ¿Continuar?'
            : 'Esto va a sincronizar este dispositivo con Google Sheets. Los cursos quedarán exactamente iguales a los de la nube (se actualizarán y se eliminarán los que ya no existan en Google Sheets). ¿Continuar?'
        if (!window.confirm(confirmMsg)) {
            return
        }
        executePull(courseLink.spreadsheetId, courseLink.sheetTitle, targetCourseId)
    }

    const handleLinkAndPull = async () => {
        if (!linkInput.trim()) {
            toast.error('Pegá el link o ID de la hoja de cálculo')
            return
        }
        setLinking(true)
        try {
            const result = await linkFPDocument(linkInput.trim())
            setLink('course', result)
            setShowLinkModal(false)
            setLinkInput('')
            toast.success('Archivo vinculado correctamente')
            await executePull(result.spreadsheetId, result.sheetTitle, selectedId)
        } catch (error) {
            toast.error('No se pudo vincular el archivo. Verificá el link y tus permisos.')
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
                        <Button icon={Plus} size="sm" onClick={() => addStudent(selected.id)}>
                            Agregar Estudiante
                        </Button>
                    </div>
                    <CardBody className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[1100px]">
                            <thead>
                                <tr className="text-left text-text-secondary border-b border-border-light">
                                    <th className="py-2 pr-2 w-10">Nº</th>
                                    <th className="py-2 pr-2">Tipo Doc.</th>
                                    <th className="py-2 pr-2">Número Doc.</th>
                                    <th className="py-2 pr-2">Sexo</th>
                                    <th className="py-2 pr-2">Apellidos y Nombres</th>
                                    <th className="py-2 pr-2">Fecha Nac.</th>
                                    <th className="py-2 pr-2">Nacionalidad</th>
                                    <th className="py-2 pr-2">Domicilio</th>
                                    <th className="py-2 pr-2">Localidad</th>
                                    <th className="py-2 pr-2">Contacto</th>
                                    <th className="py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {selected.students.map((s, idx) => (
                                    <tr key={s.id} className="border-b border-border-light/50">
                                        <td className="py-1.5 pr-2 text-text-muted">{idx + 1}</td>
                                        <td className="py-1.5 pr-2"><Input value={s.documentoTipo} onChange={(e) => updateStudent(selected.id, s.id, { documentoTipo: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={s.documentoNumero} onChange={(e) => updateStudent(selected.id, s.id, { documentoNumero: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={s.sexo} onChange={(e) => updateStudent(selected.id, s.id, { sexo: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={s.apellidosNombres} onChange={(e) => updateStudent(selected.id, s.id, { apellidosNombres: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input type="date" value={s.fechaNacimiento} onChange={(e) => updateStudent(selected.id, s.id, { fechaNacimiento: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={s.nacionalidad} onChange={(e) => updateStudent(selected.id, s.id, { nacionalidad: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={s.domicilio} onChange={(e) => updateStudent(selected.id, s.id, { domicilio: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={s.localidad} onChange={(e) => updateStudent(selected.id, s.id, { localidad: e.target.value })} /></td>
                                        <td className="py-1.5 pr-2"><Input value={s.contacto} onChange={(e) => updateStudent(selected.id, s.id, { contacto: e.target.value })} /></td>
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
                    <Button icon={Plus} onClick={() => setSelectedId(addCourse())}>
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
