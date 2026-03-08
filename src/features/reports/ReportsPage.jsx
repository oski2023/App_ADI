import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Badge from '../../shared/components/Badge'
import Tabs from '../../shared/components/Tabs'
import { Select, Input } from '../../shared/components/Input'
import { BarChart3, FileDown, Calendar, Users, BookOpen, Printer } from 'lucide-react'
import useCourseStore from '../../core/stores/useCourseStore'
import useStudentStore from '../../core/stores/useStudentStore'
import useAttendanceStore from '../../core/stores/useAttendanceStore'
import useGradeStore from '../../core/stores/useGradeStore'
import useAuthStore from '../../core/stores/useAuthStore'
import { generateDailyReport, generateWeeklyReport, generateStudentBoletin } from '../../infrastructure/pdf/pdfService'
import toast from 'react-hot-toast'

export default function ReportsPage() {
    const courses = useCourseStore((s) => s.courses)
    const allStudents = useStudentStore((s) => s.students)
    const attendanceRecords = useAttendanceStore((s) => s.records)
    const { subjects, grades, calculateFinalGrade, isApproved } = useGradeStore(useShallow((s) => ({ subjects: s.subjects, grades: s.grades, calculateFinalGrade: s.calculateFinalGrade, isApproved: s.isApproved })))
    const user = useAuthStore((s) => s.user)
    const computeAttendance = (sid) => {
        let present = 0, absent = 0, late = 0
        Object.values(attendanceRecords).forEach((dr) => {
            if (dr[sid] === 'P') present++; else if (dr[sid] === 'A') absent++; else if (dr[sid] === 'T') late++
        })
        const total = present + absent + late
        return { present, absent, late, total, percentage: total > 0 ? Math.round((present / total) * 100) : 100 }
    }
    const [reportType, setReportType] = useState('daily')
    const [selectedCourse, setSelectedCourse] = useState('')
    const [selectedStudent, setSelectedStudent] = useState('')
    const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

    const activeStudents = allStudents.filter((s) => s.status === 'active')
    const courseStudents = selectedCourse
        ? activeStudents.filter((s) => s.courseId === selectedCourse)
        : activeStudents

    const selectedCourseObj = courses.find((c) => c.id === selectedCourse)
    const courseName = selectedCourseObj ? `${selectedCourseObj.year} "${selectedCourseObj.division}" — ${selectedCourseObj.shift}` : 'Todos los cursos'
    const teacherName = user?.name || 'Docente'

    const handleExportPDF = () => {
        try {
            if (reportType === 'daily') {
                const dateKey = `${dateFrom}_${selectedCourse || courses[0]?.id}`
                const dayData = attendanceRecords[dateKey] || {}
                generateDailyReport({
                    date: dateFrom,
                    courseName,
                    students: courseStudents,
                    attendanceData: dayData,
                    teacherName,
                })
            } else if (reportType === 'weekly') {
                generateWeeklyReport({
                    dateFrom, dateTo, courseName,
                    students: courseStudents,
                    attendanceRecords,
                    teacherName,
                })
            } else if (reportType === 'grades') {
                const student = courseStudents.find((s) => s.id === selectedStudent) || courseStudents[0]
                if (student) {
                    generateStudentBoletin({
                        student, courseName, subjects, grades,
                        calculateFinalGrade, isApproved,
                        attendanceSummary: computeAttendance(student.id),
                        teacherName,
                    })
                } else {
                    toast.error('No hay alumnos en el curso seleccionado')
                }
            }
        } catch (error) {
            console.error('Error exporting PDF:', error)
            toast.error('Hubo un error al generar el PDF. Revisa la consola para más detalles.')
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Reportes</h1>
                    <p className="text-sm text-text-secondary mt-1">Generá informes de asistencia, notas y progreso</p>
                </div>
                <Button icon={Printer} variant="outline">Imprimir</Button>
            </div>

            <Tabs
                tabs={[
                    { value: 'daily', label: 'Reporte Diario' },
                    { value: 'weekly', label: 'Reporte Semanal' },
                    { value: 'grades', label: 'Boletín de Notas' },
                ]}
                activeTab={reportType} onChange={(v) => { setReportType(v); setSelectedStudent('') }}
            />

            <div className="flex gap-4 items-end flex-wrap">
                <Select
                    id="reportCourse" label="Curso" value={selectedCourse} placeholder="Todos los cursos"
                    options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}" — ${c.shift}` }))}
                    onChange={(e) => { setSelectedCourse(e.target.value); setSelectedStudent('') }}
                    className="w-64"
                />
                {reportType === 'grades' && selectedCourse && (
                    <Select
                        id="reportStudent" label="Alumno" value={selectedStudent} placeholder="Seleccionar alumno"
                        options={courseStudents.map((s) => ({ value: s.id, label: `${s.lastName}, ${s.name}` }))}
                        onChange={(e) => setSelectedStudent(e.target.value)}
                        className="w-64"
                    />
                )}
                {reportType !== 'daily' && reportType !== 'grades' && (
                    <>
                        <Input id="dateFrom" type="date" label="Desde" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-44" />
                        <Input id="dateTo" type="date" label="Hasta" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-44" />
                    </>
                )}
                <Button
                    icon={FileDown}
                    variant="secondary"
                    onClick={handleExportPDF}
                    disabled={reportType === 'grades' && !selectedStudent && courseStudents.length > 0}
                >
                    Exportar PDF
                </Button>
            </div>

            {/* Report Preview */}
            <Card>
                <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                    <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        {reportType === 'daily' ? 'Reporte Diario' : reportType === 'weekly' ? 'Reporte Semanal' : 'Boletín de Notas'}
                    </h2>
                    <Badge variant="primary">Vista previa</Badge>
                </div>
                <CardBody>
                    {reportType === 'grades' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left text-xs font-semibold text-text-muted uppercase px-4 py-2">Alumno</th>
                                        {subjects.slice(0, 4).map((sub) => (
                                            <th key={sub.id} className="text-center text-xs font-semibold text-text-muted uppercase px-4 py-2">{sub.name}</th>
                                        ))}
                                        <th className="text-center text-xs font-semibold text-text-muted uppercase px-4 py-2">Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courseStudents.slice(0, 10).map((student) => (
                                        <tr key={student.id} className="border-b border-border-light">
                                            <td className="px-4 py-3 text-sm font-medium text-text-primary">{student.lastName}, {student.name}</td>
                                            {subjects.slice(0, 4).map((sub) => {
                                                const final = calculateFinalGrade(student.id, sub.id)
                                                const approved = isApproved(student.id, sub.id)
                                                return (
                                                    <td key={sub.id} className="px-4 py-3 text-center">
                                                        <span className={`text-sm font-bold ${approved === true ? 'text-secondary' : approved === false ? 'text-error' : 'text-text-muted'}`}>
                                                            {final !== null ? final.toFixed(1) : '—'}
                                                        </span>
                                                    </td>
                                                )
                                            })}
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant="neutral">En curso</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center p-4 rounded-xl bg-primary/5">
                                    <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-text-primary">{courseStudents.length}</p>
                                    <p className="text-xs text-text-secondary">Alumnos</p>
                                </div>
                                <div className="text-center p-4 rounded-xl bg-secondary/5">
                                    <Calendar className="w-6 h-6 text-secondary mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-text-primary">{reportType === 'daily' ? 1 : 5}</p>
                                    <p className="text-xs text-text-secondary">Días hábiles</p>
                                </div>
                                <div className="text-center p-4 rounded-xl bg-secondary/5">
                                    <Users className="w-6 h-6 text-secondary mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-secondary">92%</p>
                                    <p className="text-xs text-text-secondary">Asist. promedio</p>
                                </div>
                                <div className="text-center p-4 rounded-xl bg-warning/5">
                                    <BookOpen className="w-6 h-6 text-warning mx-auto mb-2" />
                                    <p className="text-2xl font-bold text-warning">3</p>
                                    <p className="text-xs text-text-secondary">Notas cargadas</p>
                                </div>
                            </div>

                            {/* Student List */}
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left text-xs font-semibold text-text-muted uppercase px-4 py-2">Alumno</th>
                                        <th className="text-center text-xs font-semibold text-text-muted uppercase px-4 py-2">Presentes</th>
                                        <th className="text-center text-xs font-semibold text-text-muted uppercase px-4 py-2">Ausentes</th>
                                        <th className="text-center text-xs font-semibold text-text-muted uppercase px-4 py-2">% Asistencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courseStudents.slice(0, 10).map((student) => {
                                        const summary = computeAttendance(student.id)
                                        return (
                                            <tr key={student.id} className="border-b border-border-light">
                                                <td className="px-4 py-2.5 text-sm font-medium text-text-primary">{student.lastName}, {student.name}</td>
                                                <td className="px-4 py-2.5 text-center text-sm text-secondary font-medium">{summary.present}</td>
                                                <td className="px-4 py-2.5 text-center text-sm text-error font-medium">{summary.absent}</td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <Badge variant={summary.percentage >= 75 ? 'success' : 'error'}>{summary.percentage}%</Badge>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    )
}
