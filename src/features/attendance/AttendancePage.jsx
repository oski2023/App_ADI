import { useState } from 'react'
import { Check, X, Clock, CheckCheck, AlertTriangle } from 'lucide-react'
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
        return (
            <button
                onClick={() => handleSetAttendance(studentId, status)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${isActive ? activeColor : 'bg-bg-hover text-text-muted hover:bg-bg-active'
                    }`}
                title={label}
            >
                {icon}
            </button>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Registro de Asistencia</h1>
                    <p className="text-sm text-text-secondary mt-1">Marcá la asistencia de tus alumnos</p>
                </div>
                {students.length > 0 && (
                    <Button icon={CheckCheck} onClick={handleMarkAll} variant="secondary">Todos Presentes</Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-end">
                <Select
                    id="course" label="Curso" value={selectedCourse}
                    options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}" — ${c.shift}` }))}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-64"
                />
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">Fecha</label>
                    <input
                        type="date" value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3.5 py-2.5 rounded-lg border border-border text-sm bg-bg-card text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                </div>
            </div>

            {/* Summary */}
            {students.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-xl bg-bg-card border border-border">
                        <p className="text-2xl font-bold text-text-primary">{students.length}</p>
                        <p className="text-xs text-text-secondary">Total</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-secondary/10 border border-secondary/20">
                        <p className="text-2xl font-bold text-secondary">{presentCount}</p>
                        <p className="text-xs text-text-secondary">Presentes</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-error/10 border border-error/20">
                        <p className="text-2xl font-bold text-error">{absentCount}</p>
                        <p className="text-xs text-text-secondary">Ausentes</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-warning/10 border border-warning/20">
                        <p className="text-2xl font-bold text-warning">{lateCount}</p>
                        <p className="text-xs text-text-secondary">Tardanzas</p>
                    </div>
                </div>
            )}

            {/* Alerta de Paro Docente */}
            {isStrikeDay && (
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300">Día de Paro Docente</h3>
                        <p className="text-sm text-purple-600/80 dark:text-purple-400/80 mt-0.5">
                            Se ha registrado un evento de Paro en la Agenda para el día de hoy.
                            La inasistencia no debería afectar el porcentaje global de los alumnos. Las alertas están deshabilitadas para esta fecha.
                        </p>
                    </div>
                </div>
            )}

            {/* Attendance List */}
            {!selectedCourse ? (
                <EmptyState icon={Check} title="Seleccioná un curso" description="Elegí un curso para registrar la asistencia del día." />
            ) : students.length === 0 ? (
                <EmptyState icon={Check} title="Sin alumnos" description="Este curso no tiene alumnos registrados." />
            ) : (
                <Card>
                    <div className="divide-y divide-border-light">
                        {students.map((student) => {
                            const summary = getStudentSummary(student.id)
                            const isAlert = summary.total > 0 && summary.percentage < (100 - threshold)
                            return (
                                <div key={student.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-hover transition-colors">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {student.name[0]}{student.lastName[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                                                {student.lastName}, {student.name}
                                                {isAlert && (
                                                    <span className="text-warning" title={`${summary.percentage}% asistencia`}>
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-text-muted">{summary.percentage}% asistencia · {summary.absent} faltas</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {statusButton(student.id, 'P', <Check className="w-4 h-4" />, 'bg-secondary text-white shadow-sm', 'Presente')}
                                        {statusButton(student.id, 'A', <X className="w-4 h-4" />, 'bg-error text-white shadow-sm', 'Ausente')}
                                        {statusButton(student.id, 'T', <Clock className="w-4 h-4" />, 'bg-warning text-white shadow-sm', 'Tarde')}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {allMarked && (
                        <div className="px-5 py-3 bg-secondary/5 border-t border-secondary/20 flex items-center gap-2">
                            <CheckCheck className="w-4 h-4 text-secondary" />
                            <span className="text-sm text-secondary font-medium">Asistencia completa — {presentCount}P · {absentCount}A · {lateCount}T</span>
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}
