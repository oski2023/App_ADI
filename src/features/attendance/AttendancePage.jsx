import { useState, useMemo } from 'react'
import { Check, X, Clock, CheckCheck, AlertTriangle, GraduationCap, CalendarDays, Users, UserCheck, UserX, UserMinus, ChevronRight, Info } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Badge from '../../shared/components/Badge'
import { Select } from '../../shared/components/Input'
import EmptyState from '../../shared/components/EmptyState'
import useStudentStore from '../../core/stores/useStudentStore'
import useCourseStore from '../../core/stores/useCourseStore'
import useAttendanceStore from '../../core/stores/useAttendanceStore'
import useSettingsStore from '../../core/stores/useSettingsStore'
import useCalendarStore from '../../core/stores/useCalendarStore'
import { EVENT_TYPES } from '../../core/constants'

export default function AttendancePage() {
    const courses = useCourseStore((s) => s.courses)
    const allStudents = useStudentStore((s) => s.students)
    const records = useAttendanceStore((s) => s.records)
    const setAttendance = useAttendanceStore((s) => s.setAttendance)
    const setAllPresent = useAttendanceStore((s) => s.setAllPresent)
    const threshold = useSettingsStore((s) => s.settings.absenceThreshold)
    const calendarEvents = useCalendarStore((s) => s.events)

    const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || '')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    const isStrikeDay = calendarEvents.some((e) => e.date === selectedDate && e.type === EVENT_TYPES.STRIKE)

    const students = selectedCourse ? allStudents.filter((s) => s.courseId === selectedCourse && s.status === 'active') : []
    const dayKey = `${selectedDate}_${selectedCourse}`
    const dayRecord = records[dayKey] || {}

    // Calculate attendance summary for a given student
    const getStudentSummary = (studentId) => {
        let present = 0, absent = 0, late = 0
        Object.values(records).forEach((dr) => {
            if (dr[studentId] === 'P') present++
            else if (dr[studentId] === 'A') absent++
            else if (dr[studentId] === 'T') late++
        })
        const total = present + absent + late
        const percentage = total > 0 ? Math.round((present / total) * 100) : 100
        return { present, absent, late, total, percentage }
    }

    const allMarked = students.length > 0 && students.every((s) => dayRecord[s.id])
    const presentCount = students.filter((s) => dayRecord[s.id] === 'P' || dayRecord[s.id] === 'T').length
    const absentCount = students.filter((s) => dayRecord[s.id] === 'A').length
    const lateCount = students.filter((s) => dayRecord[s.id] === 'T').length

    const handleMarkAll = () => {
        setAllPresent(selectedDate, selectedCourse, students.map((s) => s.id))
    }

    const handleSetAttendance = (studentId, status) => {
        setAttendance(selectedDate, selectedCourse, studentId, status)
    }

    const statusButton = (studentId, status, icon, activeColor, label) => {
        const isActive = dayRecord[studentId] === status
        const colors = {
            P: isActive ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-110' : 'bg-bg-hover text-text-muted hover:bg-secondary/10 hover:text-secondary',
            A: isActive ? 'bg-error text-white shadow-lg shadow-error/30 scale-110' : 'bg-bg-hover text-text-muted hover:bg-error/10 hover:text-error',
            T: isActive ? 'bg-warning text-white shadow-lg shadow-warning/30 scale-110' : 'bg-bg-hover text-text-muted hover:bg-warning/10 hover:text-warning'
        }

        return (
            <button
                onClick={() => handleSetAttendance(studentId, status)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 cursor-pointer ${colors[status]} border border-transparent`}
                title={label}
            >
                {icon}
            </button>
        )
    }

    const currentCourse = courses.find(c => c.id === selectedCourse)

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Background Glow Decorations */}
            <div className="fixed top-40 right-10 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none" />
            <div className="fixed bottom-10 left-10 w-[300px] h-[300px] bg-secondary/5 blur-[80px] rounded-full -z-10 pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/10">
                <div className="relative">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-secondary rounded-full hidden md:block" />
                    <h1 className="text-4xl font-black text-text-primary tracking-tight">
                        Toma de <span className="text-secondary">Asistencia</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary font-medium uppercase tracking-wider">
                        <UserCheck className="w-4 h-4 text-secondary" />
                        <span>Registro Diario</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-border mx-1" />
                        <span>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    </div>
                </div>
                {students.length > 0 && (
                    <Button
                        icon={CheckCheck}
                        onClick={handleMarkAll}
                        variant="secondary"
                        className="shadow-xl shadow-secondary/20 hover:scale-105 transition-transform"
                    >
                        Todos Presentes
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="p-6 rounded-3xl bg-bg-card border border-border shadow-xl shadow-black/5 flex flex-wrap gap-6 items-end relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

                <div className="flex-1 min-w-[280px]">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Seleccionar Curso</label>
                    <Select
                        id="course" label="" value={selectedCourse}
                        options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}" — ${c.shift}` }))}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="!bg-bg-hover/50 !border-transparent focus:!border-secondary/30"
                    />
                </div>
                <div className="w-48">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Fecha de Registro</label>
                    <input
                        type="date" value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-transparent bg-bg-hover/50 text-text-primary outline-none focus:border-secondary/30 transition-all font-medium"
                    />
                </div>
                <div className="flex-none">
                    <Badge variant="neutral" className="!rounded-xl !px-4 !py-3 !bg-bg-hover/50">
                        {students.length} Alumnos
                    </Badge>
                </div>
            </div>

            {/* Summary Cards */}
            {students.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-bg-card to-secondary/10 border border-white/10 shadow-sm">
                        <div className="bg-bg-card/50 rounded-[22px] p-5">
                            <p className="text-3xl font-black text-text-primary tracking-tight leading-none">{students.length}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Users className="w-3.5 h-3.5 text-text-muted" />
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Alumnos</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-white/20 shadow-lg shadow-secondary/10">
                        <div className="bg-bg-card/40 rounded-[22px] p-5">
                            <p className="text-3xl font-black text-secondary tracking-tight leading-none">{presentCount}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <UserCheck className="w-3.5 h-3.5 text-secondary" />
                                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Presentes Today</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-error/20 to-error/5 border border-white/20 shadow-lg shadow-error/10">
                        <div className="bg-bg-card/40 rounded-[22px] p-5">
                            <p className="text-3xl font-black text-error tracking-tight leading-none">{absentCount}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <UserX className="w-3.5 h-3.5 text-error" />
                                <p className="text-[10px] font-bold text-error uppercase tracking-widest">Ausentes</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-warning/20 to-warning/5 border border-white/20 shadow-lg shadow-warning/10">
                        <div className="bg-bg-card/40 rounded-[22px] p-5">
                            <p className="text-3xl font-black text-warning tracking-tight leading-none">{lateCount}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <UserMinus className="w-3.5 h-3.5 text-warning" />
                                <p className="text-[10px] font-bold text-warning uppercase tracking-widest">Tardanzas</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Strike Alert */}
            {isStrikeDay && (
                <div className="bg-gradient-to-r from-purple-600/10 to-transparent border border-purple-500/20 rounded-3xl p-6 flex items-start gap-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
                    <div className="w-14 h-14 rounded-2xl bg-purple-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                        <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-purple-600 dark:text-purple-400 tracking-tight">Día de Paro Docente Detectado</h3>
                        <p className="text-sm text-text-secondary mt-1 leading-relaxed max-w-3xl">
                            Se ha identificado un evento de <span className="font-bold text-purple-600 dark:text-purple-400">Paro / Huelga</span> en la Agenda Oficial para la fecha seleccionada.
                            La inasistencia durante este periodo no computará negativamente para las alertas de umbral crítico.
                        </p>
                    </div>
                </div>
            )}

            {/* Attendance List */}
            {!selectedCourse ? (
                <EmptyState icon={GraduationCap} title="Seleccionar Curso" description="Elige una división para comenzar el pase de lista de hoy." />
            ) : students.length === 0 ? (
                <EmptyState icon={Users} title="Sin Alumnos" description="Este curso no tiene alumnos registrados en el sistema." />
            ) : (
                <Card className="border-none shadow-xl shadow-black/5 overflow-hidden !rounded-3xl">
                    <CardHeader
                        className="!border-none pt-6 bg-gradient-to-r from-bg-card to-bg-hover/30"
                        action={
                            allMarked && (
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 animate-fade-in text-xs font-black uppercase tracking-widest">
                                    <CheckCheck className="w-4 h-4" />
                                    Carga Finalizada
                                </div>
                            )
                        }
                    >
                        <h2 className="text-xl font-black text-text-primary tracking-tight">Pase de Lista</h2>
                    </CardHeader>
                    <div className="divide-y divide-border/30">
                        {students.map((student) => {
                            const summary = getStudentSummary(student.id)
                            const isAlert = summary.total > 0 && summary.percentage < (100 - threshold)
                            const currentStatus = dayRecord[student.id]

                            return (
                                <div key={student.id} className="flex items-center justify-between px-6 py-4 hover:bg-bg-hover/50 transition-all group">
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-sm font-black shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform`}>
                                                {student.lastName[0]}{student.name[0]}
                                            </div>
                                            {currentStatus && (
                                                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-bg-card flex items-center justify-center ${currentStatus === 'P' ? 'bg-secondary' : currentStatus === 'A' ? 'bg-error' : 'bg-warning'
                                                    }`}>
                                                    {currentStatus === 'P' ? <Check className="w-3 h-3 text-white" /> : currentStatus === 'A' ? <X className="w-3 h-3 text-white" /> : <Clock className="w-3 h-3 text-white" />}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3">
                                                <p className="text-base font-black text-text-primary tracking-tight truncate group-hover:text-primary transition-colors">
                                                    {student.lastName}, {student.name}
                                                </p>
                                                {isAlert && (
                                                    <Badge variant="warning" className="!px-1.5 !py-0.5 animate-pulse">
                                                        <AlertTriangle className="w-3 h-3" />
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs font-bold text-text-muted">
                                                <span className={`${isAlert ? 'text-warning' : 'text-secondary'} flex items-center gap-1`}>
                                                    <Info className="w-3 h-3" /> {summary.percentage}% Asistencia
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-border" />
                                                <span>{summary.absent} Faltas acumuladas</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {statusButton(student.id, 'P', <Check className="w-5 h-5" />, 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-110', 'Presente')}
                                        {statusButton(student.id, 'A', <X className="w-5 h-5" />, 'bg-error text-white shadow-lg shadow-error/30 scale-110', 'Ausente')}
                                        {statusButton(student.id, 'T', <Clock className="w-5 h-5" />, 'bg-warning text-white shadow-lg shadow-warning/30 scale-110', 'Tarde')}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {allMarked && (
                        <div className="px-6 py-4 bg-gradient-to-r from-secondary/10 to-transparent border-t border-secondary/20 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center shrink-0">
                                <CheckCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-secondary uppercase tracking-wider">Reporte de Asistencia Generado</p>
                                <p className="text-xs text-text-secondary font-medium">Sincronizado correctamente con la base de datos central de ADI.</p>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}
