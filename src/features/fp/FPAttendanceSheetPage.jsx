import { useState } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import { Input } from '../../shared/components/Input'
import { Plus, Trash2, ArrowLeft, ClipboardCheck, RefreshCw } from 'lucide-react'
import useFPAttendanceSheetStore from '../../core/stores/useFPAttendanceSheetStore'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import { syncFPAttendanceSheet } from '../../infrastructure/google/sheetsService'
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

    const [selectedId, setSelectedId] = useState(null)
    const selected = sheets.find((s) => s.id === selectedId)
    const attendanceLink = useFPGoogleLinksStore((s) => s.links.attendanceSheet)
    const [syncing, setSyncing] = useState(false)

    const handleSync = async () => {
        if (!attendanceLink) {
            toast.error('Primero vinculá el archivo de Asistencia de Alumnos en Configuración')
            return
        }
        setSyncing(true)
        try {
            await syncFPAttendanceSheet(attendanceLink.spreadsheetId, attendanceLink.sheetTitle, selected)
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
                        Asistencia de Alumnos {selected.especialidad ? `— ${selected.especialidad}` : ''}
                    </h1>
                    <Button icon={RefreshCw} loading={syncing} disabled={syncing} onClick={handleSync}>
                        Sincronizar con Sheets
                    </Button>
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
                                        value={selected.horarios[d.key]}
                                        onChange={(e) => updateSheetHorario(selected.id, d.key, e.target.value)}
                                    />
                                ))}
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Grilla de asistencia */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                        <h2 className="text-base font-semibold text-text-primary">Grilla de Asistencia (P = Presente, A = Ausente)</h2>
                        <Button icon={Plus} size="sm" onClick={() => addStudent(selected.id)}>
                            Agregar Alumno
                        </Button>
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
                                {selected.students.map((st, idx) => (
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
                                                    className="w-7 h-7 text-center rounded border border-border bg-bg-card text-text-primary text-xs"
                                                    value={st.days[d]}
                                                    maxLength={1}
                                                    onChange={(e) => updateStudentDay(selected.id, st.id, d, e.target.value.toUpperCase())}
                                                />
                                            </td>
                                        ))}
                                        <td className="py-1 px-1">
                                            <input
                                                className="w-12 px-1 py-1 rounded border border-border text-center bg-bg-card text-text-primary"
                                                value={st.totalAus}
                                                onChange={(e) => updateStudent(selected.id, st.id, { totalAus: e.target.value })}
                                            />
                                        </td>
                                        <td className="py-1 px-1">
                                            <input
                                                className="w-12 px-1 py-1 rounded border border-border text-center bg-bg-card text-text-primary"
                                                value={st.totalPres}
                                                onChange={(e) => updateStudent(selected.id, st.id, { totalPres: e.target.value })}
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
                                            <button onClick={() => deleteStudent(selected.id, st.id)} className="text-text-muted hover:text-error transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
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
                        <h2 className="text-base font-semibold text-text-primary">Bajas de Alumnos/as</h2>
                        <Button icon={Plus} size="sm" onClick={() => addBaja(selected.id)}>
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
                                            <button onClick={() => deleteBaja(selected.id, b.id)} className="text-text-muted hover:text-error transition-colors">
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
                    <div className="px-5 py-4 border-b border-border-light">
                        <h2 className="text-base font-semibold text-text-primary">Movimiento de Alumnos</h2>
                    </div>
                    <CardBody className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {MOVIMIENTO_FIELDS.map((f) => (
                            <Input
                                key={f.key}
                                label={f.label}
                                value={selected.movimiento[f.key]}
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
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Asistencia de Alumnos</h1>
                    <p className="text-sm text-text-secondary mt-1">Formación Profesional</p>
                </div>
                <Button icon={Plus} onClick={() => setSelectedId(addSheet())}>
                    Nuevo Informe Mensual
                </Button>
            </div>

            {sheets.length === 0 && (
                <Card>
                    <CardBody className="text-center py-10 text-text-muted">
                        Todavía no cargaste ningún informe mensual. Hacé clic en "Nuevo Informe Mensual" para empezar.
                    </CardBody>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sheets.map((s) => (
                    <Card key={s.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedId(s.id)}>
                        <CardBody>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-text-primary">{s.especialidad || 'Sin especialidad'}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">Curso Nº {s.cursoNumero || '—'} · {s.informeMes || 'Sin mes'} {s.informeAnio}</p>
                                    <p className="text-xs text-text-muted mt-1">{s.students.length} alumno{s.students.length !== 1 ? 's' : ''}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteSheet(s.id) }}
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
