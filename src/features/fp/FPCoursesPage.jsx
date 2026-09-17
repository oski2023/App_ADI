import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import { Plus, Trash2, ArrowLeft, GraduationCap, RefreshCw } from 'lucide-react'
import useFPCourseStore from '../../core/stores/useFPCourseStore'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import { syncFPCourseSheet } from '../../infrastructure/google/sheetsService'
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

    const [selectedId, setSelectedId] = useState(null)
    const selected = courses.find((c) => c.id === selectedId)
    const courseLink = useFPGoogleLinksStore((s) => s.links.course)
    const [syncing, setSyncing] = useState(false)

    const handleSync = async () => {
        if (!courseLink) {
            toast.error('Primero vinculá el archivo de Ficha de Curso en Configuración')
            return
        }
        setSyncing(true)
        try {
            await syncFPCourseSheet(courseLink.spreadsheetId, courseLink.sheetTitle, selected)
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
                        Ficha de Curso {selected.especialidad ? `— ${selected.especialidad}` : ''}
                    </h1>
                    <Button icon={RefreshCw} loading={syncing} disabled={syncing} onClick={handleSync}>
                        Sincronizar con Sheets
                    </Button>
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Fichas de Curso</h1>
                    <p className="text-sm text-text-secondary mt-1">Formación Profesional</p>
                </div>
                <Button icon={Plus} onClick={() => setSelectedId(addCourse())}>
                    Nuevo Curso
                </Button>
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
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteCourse(c.id) }}
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
