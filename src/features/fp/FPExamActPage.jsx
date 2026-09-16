import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import { Plus, Trash2, ArrowLeft, FileText, Calculator } from 'lucide-react'
import useFPExamActStore from '../../core/stores/useFPExamActStore'
import useFPAttendanceSheetStore from '../../core/stores/useFPAttendanceSheetStore'
import { numberToWordsEs } from '../../utils/numberToWordsEs'
import toast from 'react-hot-toast'

const RESUMEN_FIELDS = [
    { key: 'inscriptos', label: 'Inscriptos' },
    { key: 'examinados', label: 'Examinados' },
    { key: 'ausentes', label: 'Ausentes' },
    { key: 'desaprobados', label: 'Desaprobados' },
    { key: 'aprobados', label: 'Aprobados' },
]

export default function FPExamActPage() {
    const acts = useFPExamActStore((s) => s.acts)
    const addAct = useFPExamActStore((s) => s.addAct)
    const updateAct = useFPExamActStore((s) => s.updateAct)
    const updateResumen = useFPExamActStore((s) => s.updateResumen)
    const deleteAct = useFPExamActStore((s) => s.deleteAct)
    const addStudent = useFPExamActStore((s) => s.addStudent)
    const updateStudent = useFPExamActStore((s) => s.updateStudent)
    const deleteStudent = useFPExamActStore((s) => s.deleteStudent)

        const [selectedId, setSelectedId] = useState(null)
    const selected = acts.find((a) => a.id === selectedId)
    const attendanceSheets = useFPAttendanceSheetStore((s) => s.sheets)

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

    if (selected) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-3">
                    <Button variant="outline" icon={ArrowLeft} onClick={() => setSelectedId(null)}>
                        Volver
                    </Button>
                    <h1 className="text-xl font-bold text-text-primary">
                        Acta de Examen {selected.especialidad ? `— ${selected.especialidad}` : ''}
                    </h1>
                </div>

                {/* Datos generales */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-semibold text-text-primary">Datos del Acta</h2>
                    </div>
                    <CardBody className="space-y-4">
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
                    <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                        <h2 className="text-base font-semibold text-text-primary">Notas por Estudiante</h2>
                        <div className="flex gap-2">
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
                    <div className="px-5 py-4 border-b border-border-light">
                        <h2 className="text-base font-semibold text-text-primary">Resumen</h2>
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Actas de Examen</h1>
                    <p className="text-sm text-text-secondary mt-1">Formación Profesional</p>
                </div>
                <Button icon={Plus} onClick={() => setSelectedId(addAct())}>
                    Nueva Acta
                </Button>
            </div>

            {acts.length === 0 && (
                <Card>
                    <CardBody className="text-center py-10 text-text-muted">
                        Todavía no cargaste ningún acta. Hacé clic en "Nueva Acta" para empezar.
                    </CardBody>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {acts.map((a) => (
                    <Card key={a.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(a.id)}>
                        <CardBody>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-text-primary">{a.especialidad || 'Sin especialidad'}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">Curso Nº {a.cursoNumero || '—'} · {a.diaSesion || '—'}/{a.mesSesion || '—'}/{a.anioSesion || '—'}</p>
                                    <p className="text-xs text-text-muted mt-1">{a.students.length} estudiante{a.students.length !== 1 ? 's' : ''}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteAct(a.id) }}
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
