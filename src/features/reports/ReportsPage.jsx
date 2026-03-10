import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Card, CardBody, CardHeader } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Badge from '../../shared/components/Badge'
import Tabs from '../../shared/components/Tabs'
import { Select, Input } from '../../shared/components/Input'
import { BarChart3, FileDown, Calendar, Users, BookOpen, Printer, PieChart, TrendingUp, Download, Eye, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import useCourseStore from '../../core/stores/useCourseStore'
import useStudentStore from '../../core/stores/useStudentStore'
import useAttendanceStore from '../../core/stores/useAttendanceStore'
import useGradeStore from '../../core/stores/useGradeStore'
import useSettingsStore from '../../core/stores/useSettingsStore'
import useAuthStore from '../../core/stores/useAuthStore'
import { generateDailyReport, generateWeeklyReport, generateStudentBoletin } from '../../infrastructure/pdf/pdfService'
import toast from 'react-hot-toast'

export default function ReportsPage() {
    const courses = useCourseStore((s) => s.courses)
    const allStudents = useStudentStore((s) => s.students)
    const attendanceRecords = useAttendanceStore((s) => s.records)
    const passingGrade = useSettingsStore((s) => s.settings.passingGrade)
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
    const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || '')
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
        <div className="space-y-8 animate-fade-in relative">
            {/* Background Glow Decorations */}
            <div className="fixed top-20 right-20 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
            <div className="fixed bottom-20 left-20 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -z-10 pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/10">
                <div className="relative">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-full hidden md:block" />
                    <h1 className="text-4xl font-black text-text-primary tracking-tight">
                        Centro de <span className="text-primary">Estrategia</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary font-medium uppercase tracking-wider">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <span>Analítica Aplicada</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-border mx-1" />
                        <span>Reportes de Gestión</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button icon={Printer} variant="outline" className="border-border/50 hover:bg-bg-hover transition-all">Imprimir</Button>
                    <Button
                        icon={Download}
                        onClick={handleExportPDF}
                        disabled={reportType === 'grades' && !selectedStudent && courseStudents.length > 0}
                        className="shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                    >
                        Exportar PDF
                    </Button>
                </div>
            </div>

            {/* Selection Strategy */}
            <div className="p-6 rounded-3xl bg-bg-card border border-border shadow-xl shadow-black/5 flex flex-wrap gap-6 items-end relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

                <div className="w-full lg:w-auto flex-1 min-w-[300px]">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Tipo de Análisis</label>
                    <Tabs
                        tabs={[
                            { value: 'daily', label: 'Diario' },
                            { value: 'weekly', label: 'Semanal' },
                            { value: 'grades', label: 'Académico' },
                        ]}
                        activeTab={reportType}
                        onChange={(v) => { setReportType(v); setSelectedStudent('') }}
                        className="!gap-1 !p-1 bg-bg-hover/50 rounded-2xl border border-border/50"
                    />
                </div>

                <div className="w-full sm:w-64">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Seleccionar Curso</label>
                    <Select
                        id="reportCourse" label="" value={selectedCourse} placeholder="Todos los cursos"
                        options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}"` }))}
                        onChange={(e) => { setSelectedCourse(e.target.value); setSelectedStudent('') }}
                        className="!bg-bg-hover/50 !border-transparent focus:!border-primary/30"
                    />
                </div>

                {reportType === 'grades' && selectedCourse && (
                    <div className="w-full sm:w-64">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Estudiante</label>
                        <Select
                            id="reportStudent" label="" value={selectedStudent} placeholder="Todos los alumnos"
                            options={courseStudents.map((s) => ({ value: s.id, label: `${s.lastName}, ${s.name}` }))}
                            onChange={(e) => setSelectedStudent(e.target.value)}
                            className="!bg-bg-hover/50 !border-transparent focus:!border-primary/30"
                        />
                    </div>
                )}

                {reportType !== 'daily' && reportType !== 'grades' && (
                    <div className="flex gap-3">
                        <div className="w-40">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Desde</label>
                            <Input id="dateFrom" type="date" label="" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="!bg-bg-hover/50 !border-transparent" />
                        </div>
                        <div className="w-40">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Hasta</label>
                            <Input id="dateTo" type="date" label="" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="!bg-bg-hover/50 !border-transparent" />
                        </div>
                    </div>
                )}
            </div>

            {/* Report Strategy View */}
            <Card className="border-none shadow-xl shadow-black/5 overflow-hidden !rounded-3xl animate-slide-in">
                <CardHeader
                    className="!border-none pt-6 bg-gradient-to-r from-bg-card to-primary/5"
                    action={<Badge variant="primary" className="!rounded-lg !px-3 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">VISTA PREVIA</Badge>}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-text-primary tracking-tight">
                                {reportType === 'daily' ? 'Reporte de Asistencia Diaria' : reportType === 'weekly' ? 'Seguimiento Semanal' : 'Boletín de Notas Académico'}
                            </h2>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{courseName}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardBody className="!pt-2">
                    {reportType === 'grades' ? (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead>
                                    <tr className="bg-bg-hover/30 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                        <th className="px-6 py-4 border-b border-border/50 sticky left-0 z-20 bg-bg-card backdrop-blur-md">Estudiante</th>
                                        {subjects.filter(s => !selectedCourse || s.year === selectedCourseObj?.year).slice(0, 4).map((sub) => (
                                            <th key={sub.id} className="px-6 py-4 border-b border-border/50 text-center whitespace-nowrap">{sub.name}</th>
                                        ))}
                                        <th className="px-6 py-4 border-b border-border/50 text-right">Promedio Final</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {(selectedStudent ? courseStudents.filter(s => s.id === selectedStudent) : courseStudents).slice(0, 10).map((student) => (
                                        <tr key={student.id} className="hover:bg-primary/5 transition-all group">
                                            <td className="px-6 py-4 sticky left-0 z-10 bg-bg-card border-r border-border/30 group-hover:bg-bg-hover/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-xs font-black">
                                                        {student.lastName[0]}{student.name[0]}
                                                    </div>
                                                    <p className="text-sm font-black text-text-primary tracking-tight group-hover:text-primary transition-colors">
                                                        {student.lastName}, {student.name}
                                                    </p>
                                                </div>
                                            </td>
                                            {subjects.filter(s => !selectedCourse || s.year === selectedCourseObj?.year).slice(0, 4).map((sub) => {
                                                const final = calculateFinalGrade(student.id, sub.id)
                                                const approved = isApproved(student.id, sub.id, passingGrade)
                                                return (
                                                    <td key={sub.id} className="px-6 py-4 text-center">
                                                        <span className={`text-sm font-black tracking-tighter ${approved === true ? 'text-secondary' : approved === false ? 'text-error' : 'text-text-muted/40'}`}>
                                                            {final !== null ? final.toFixed(1) : '——'}
                                                        </span>
                                                    </td>
                                                )
                                            })}
                                            <td className="px-6 py-4 text-right">
                                                <Badge variant="neutral" className="!rounded-lg !px-3 font-black text-[9px] uppercase tracking-widest opacity-60 italic">VISTA PREVIA</Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Summary Impact Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="p-1 rounded-3xl bg-gradient-to-br from-bg-card to-primary/10 border border-white/10 shadow-sm">
                                    <div className="bg-bg-card/50 rounded-[22px] p-5">
                                        <p className="text-3xl font-black text-text-primary leading-none">{courseStudents.length}</p>
                                        <div className="flex items-center gap-2 mt-2 font-bold text-text-muted text-[10px] uppercase tracking-widest">
                                            <Users className="w-3.5 h-3.5" /> Total Alumnos
                                        </div>
                                    </div>
                                </div>
                                <div className="p-1 rounded-3xl bg-gradient-to-br from-bg-card to-secondary/10 border border-white/10 shadow-sm">
                                    <div className="bg-bg-card/50 rounded-[22px] p-5">
                                        <p className="text-3xl font-black text-secondary leading-none">
                                            {(() => {
                                                if (reportType === 'daily') return 1;
                                                const start = new Date(dateFrom);
                                                const end = new Date(dateTo);
                                                let count = 0;
                                                let cur = new Date(start);
                                                while (cur <= end) {
                                                    const day = cur.getDay();
                                                    if (day !== 0 && day !== 6) count++;
                                                    cur.setDate(cur.getDate() + 1);
                                                }
                                                return count || 1;
                                            })()}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 font-bold text-secondary text-[10px] uppercase tracking-widest">
                                            <Calendar className="w-3.5 h-3.5" /> Días Hábiles
                                        </div>
                                    </div>
                                </div>
                                <div className="p-1 rounded-3xl bg-gradient-to-br from-bg-card to-warning/10 border border-white/10 shadow-sm">
                                    <div className="bg-bg-card/50 rounded-[22px] p-5">
                                        <p className="text-3xl font-black text-warning leading-none">
                                            {courseStudents.length > 0
                                                ? Math.round(courseStudents.reduce((acc, s) => acc + computeAttendance(s.id).percentage, 0) / courseStudents.length)
                                                : 0}%
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 font-bold text-warning text-[10px] uppercase tracking-widest">
                                            <PieChart className="w-3.5 h-3.5" /> Asistencia Global
                                        </div>
                                    </div>
                                </div>
                                <div className="p-1 rounded-3xl bg-gradient-to-br from-bg-card to-primary/10 border border-white/10 shadow-sm">
                                    <div className="bg-bg-card/50 rounded-[22px] p-5">
                                        <p className="text-3xl font-black text-primary leading-none">
                                            {(() => {
                                                let count = 0;
                                                courseStudents.forEach(s => {
                                                    subjects.forEach(sub => {
                                                        const key = `${s.id}_${sub.id}`;
                                                        const sg = grades[key] || [];
                                                        count += sg.filter(g => g !== null && g !== undefined && g !== '').length;
                                                    });
                                                });
                                                return count;
                                            })()}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 font-bold text-primary text-[10px] uppercase tracking-widest">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Notas Cargadas
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Strategy Data Table */}
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-separate border-spacing-0">
                                    <thead>
                                        <tr className="bg-bg-hover/30 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                            <th className="px-6 py-4 border-b border-border/50">Estudiante</th>
                                            <th className="px-6 py-4 border-b border-border/50 text-center">Asistencias</th>
                                            <th className="px-6 py-4 border-b border-border/50 text-center">Inasistencias</th>
                                            <th className="px-6 py-4 border-b border-border/50 text-right">Rendimiento Asist.</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {courseStudents.slice(0, 10).map((student) => {
                                            const summary = computeAttendance(student.id)
                                            return (
                                                <tr key={student.id} className="hover:bg-primary/5 transition-all group">
                                                    <td className="px-6 py-4 font-black text-text-primary tracking-tight group-hover:text-primary transition-colors">
                                                        {student.lastName}, {student.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-sm font-black text-secondary">{summary.present}</td>
                                                    <td className="px-6 py-4 text-center text-sm font-black text-error">{summary.absent}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Badge variant={summary.percentage >= 75 ? 'success' : 'error'} className="!rounded-lg !px-3 font-black text-[10px]">
                                                            {summary.percentage}%
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    )
}
