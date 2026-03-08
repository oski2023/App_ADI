import {
    Users, ClipboardCheck, BookOpen, CalendarDays, AlertTriangle,
    TrendingUp, Clock, ChevronRight, Plus, Bell, BarChart3
} from 'lucide-react'
import { Card, CardBody } from '../../shared/components/Card'
import Badge from '../../shared/components/Badge'
import Button from '../../shared/components/Button'
import useStudentStore from '../../core/stores/useStudentStore'
import useCourseStore from '../../core/stores/useCourseStore'
import useCalendarStore from '../../core/stores/useCalendarStore'
import useAttendanceStore from '../../core/stores/useAttendanceStore'
import useSettingsStore from '../../core/stores/useSettingsStore'
import useAuthStore from '../../core/stores/useAuthStore'
import useGradeStore from '../../core/stores/useGradeStore'
import { Link } from 'react-router-dom'
import { EVENT_COLORS } from '../../core/constants'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'


function MetricCard({ icon: Icon, label, value, trend, color, to }) {
    const colorMap = {
        primary: 'from-primary to-primary-light',
        secondary: 'from-secondary to-secondary-light',
        warning: 'from-warning to-warning-light',
        info: 'from-info to-primary',
    }

    return (
        <Link to={to}>
            <Card hover className="group">
                <CardBody className="!p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-text-secondary mb-1">{label}</p>
                            <p className="text-3xl font-bold text-text-primary">{value}</p>
                            {trend && (
                                <p className="text-xs text-secondary mt-1.5 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> {trend}
                                </p>
                            )}
                        </div>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg shadow-primary/15 group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </CardBody>
            </Card>
        </Link>
    )
}

function QuickAction({ icon: Icon, label, to, color = 'primary' }) {
    return (
        <Link
            to={to}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-hover transition-all duration-200 group"
        >
            <div className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}`} />
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">{label}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
        </Link>
    )
}

export default function DashboardPage() {
    const user = useAuthStore((s) => s.user)
    const allStudents = useStudentStore((s) => s.students)
    const courses = useCourseStore((s) => s.courses)
    const events = useCalendarStore((s) => s.events)

    const students = allStudents.filter((s) => s.status === 'active')
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const upcomingEvents = events
        .filter((e) => e.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5)

    const greeting = today.getHours() < 12 ? 'Buenos días' : today.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'
    const dateStr = today.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const attendanceRecords = useAttendanceStore((s) => s.records)
    const threshold = useSettingsStore((s) => s.settings.absenceThreshold)

    // Alertas dinámicas
    const alerts = []

    // 1. Alerta de asistencia baja
    students.forEach(s => {
        let present = 0, total = 0
        Object.values(attendanceRecords).forEach(dr => {
            if (dr[s.id] === 'P' || dr[s.id] === 'T') { present++; total++ }
            else if (dr[s.id] === 'A') { total++ }
        })
        const percentage = total > 0 ? (present / total) * 100 : 100
        if (total > 5 && percentage < (100 - threshold)) {
            alerts.push({
                type: 'warning',
                title: `${s.lastName}, ${s.name} — Inasistencias críticas`,
                desc: `${students.find(st => st.id === s.id)?.courseId || 'Curso'} · ${Math.round(100 - percentage)}% de inasistencias acumuladas`,
                icon: AlertTriangle
            })
        }
    })

    // 2. Alerta de registros faltantes
    const todayKeySuffix = todayStr
    const recordedCourses = new Set(Object.keys(attendanceRecords).filter(k => k.startsWith(todayStr)).map(k => k.split('_')[1]))
    courses.forEach(c => {
        if (!recordedCourses.has(c.id)) {
            alerts.push({
                type: 'error',
                title: `Asistencia pendiente — ${c.year} "${c.division}"`,
                desc: `Aún no se ha registrado la asistencia del día de hoy para este curso`,
                icon: ClipboardCheck
            })
        }
    })

    // 3. Próximo evento
    if (upcomingEvents.length > 0) {
        alerts.push({
            type: 'info',
            title: `Evento próximo: ${upcomingEvents[0].title}`,
            desc: `${upcomingEvents[0].place || 'Sin lugar'} · ${new Date(upcomingEvents[0].date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`,
            icon: CalendarDays
        })
    }

    const displayAlerts = alerts.slice(0, 3)

    // --- Cálculos para Gráficos ---
    // Gráfico de Asistencia Global
    const todayRecords = Object.entries(attendanceRecords).filter(([key]) => key.startsWith(todayStr))
    let presentesHoy = 0
    let ausentesHoy = 0
    let tardeHoy = 0
    let sinRegistroHoy = students.length

    todayRecords.forEach(([_, record]) => {
        Object.values(record).forEach(status => {
            if (status === 'P') presentesHoy++
            else if (status === 'A') ausentesHoy++
            else if (status === 'T') tardeHoy++
        })
    })

    sinRegistroHoy -= (presentesHoy + ausentesHoy + tardeHoy)
    sinRegistroHoy = Math.max(0, sinRegistroHoy) // Prevenir negativos si hay bajas de alumnos

    const attendanceStats = [
        { name: 'Presentes', value: presentesHoy, color: '#2D6A4F' },
        { name: 'Ausentes', value: ausentesHoy, color: '#E63946' },
        { name: 'Tarde', value: tardeHoy, color: '#F59E0B' },
        { name: 'Sin registro', value: sinRegistroHoy, color: '#64748B' },
    ].filter(s => s.value > 0) // Solo mostrar porciones $> 0

    // Gráfico de Cursos
    const courseStats = courses.map(c => ({
        name: `${c.year} ${c.division}`,
        alumnos: students.filter(s => s.courseId === c.id).length
    }))

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">
                        {greeting}, {user?.name?.split(' ').pop()} 👋
                    </h1>
                    <p className="text-sm text-text-secondary mt-1 capitalize">{dateStr}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="relative w-10 h-10 rounded-xl bg-bg-card border border-border flex items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer">
                        <Bell className="w-5 h-5 text-text-secondary" />
                        {displayAlerts.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                                {displayAlerts.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard icon={Users} label="Total Alumnos" value={students.length} trend={students.length > 0 ? "+1 reciente" : null} color="primary" to="/students" />
                <MetricCard icon={ClipboardCheck} label="Cursos Activos" value={courses.length} color="secondary" to="/courses" />
                <MetricCard icon={BookOpen} label="Notas Cargadas" value={Object.values(useGradeStore.getState().grades).flat().filter(g => g !== null).length} color="warning" to="/grades" />
                <MetricCard icon={CalendarDays} label="Próximos Eventos" value={upcomingEvents.length} color="info" to="/calendar" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Analytics Charts */}
                <Card className="lg:col-span-2">
                    <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            Rendimiento Global
                        </h2>
                    </div>
                    <CardBody className="!p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[250px]">
                            {/* Gráfico 1: Asistencia */}
                            <div className="flex flex-col items-center justify-center relative w-full h-full">
                                <h3 className="text-sm font-medium text-text-secondary mb-2 absolute top-0 left-0">Asistencia Hoy</h3>
                                {students.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={attendanceStats}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {attendanceStats.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-bg-hover rounded-xl border border-dashed border-border-light">
                                        <ClipboardCheck className="w-8 h-8 text-text-muted mb-2" />
                                        <p className="text-sm text-text-secondary">Sin datos de asistencia</p>
                                    </div>
                                )}
                                {students.length > 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center mt-6 pointer-events-none">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-text-primary">
                                                {attendanceStats.find(s => s.name === 'Presentes')?.value > 0
                                                    ? Math.round((attendanceStats.find(s => s.name === 'Presentes').value / students.length) * 100)
                                                    : 0}%
                                            </p>
                                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Presentismo</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Gráfico 2: Alumnos por Curso */}
                            <div className="flex flex-col items-center justify-center relative w-full h-full">
                                <h3 className="text-sm font-medium text-text-secondary mb-2 absolute top-0 left-0">Alumnos por Curso</h3>
                                {courses.length > 0 && students.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="90%" className="mt-8">
                                        <BarChart data={courseStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                            <Tooltip cursor={{ fill: '#334155', opacity: 0.1 }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Bar dataKey="alumnos" fill="#2E86AB" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-bg-hover rounded-xl border border-dashed border-border-light">
                                        <Users className="w-8 h-8 text-text-muted mb-2" />
                                        <p className="text-sm text-text-secondary">Sin alumnos registrados</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Alerts */}
                <Card className="lg:col-span-1 flex flex-col">
                    <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                            Alertas y Recordatorios
                        </h2>
                        <Badge variant={displayAlerts.length > 0 ? 'warning' : 'success'}>
                            {displayAlerts.length} {displayAlerts.length === 1 ? 'activa' : 'activas'}
                        </Badge>
                    </div>
                    <CardBody className="space-y-3 !p-4">
                        {displayAlerts.length > 0 ? displayAlerts.map((alert, i) => (
                            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl bg-${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}/5 border border-${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}/10`}>
                                <div className={`w-8 h-8 rounded-lg bg-${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}/10 flex items-center justify-center shrink-0 mt-0.5`}>
                                    <alert.icon className={`w-4 h-4 text-${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}`} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-text-primary">{alert.title}</p>
                                    <p className="text-xs text-text-secondary mt-0.5">{alert.desc}</p>
                                </div>
                            </div>
                        )) : (
                            <div className="py-8 text-center">
                                <p className="text-sm text-text-muted">No hay alertas pendientes por hoy ✨</p>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light">
                        <h2 className="text-base font-semibold text-text-primary">Accesos Rápidos</h2>
                    </div>
                    <CardBody className="!p-3 space-y-1">
                        <QuickAction icon={ClipboardCheck} label="Tomar asistencia" to="/attendance" color="primary" />
                        <QuickAction icon={BookOpen} label="Cargar notas" to="/grades" color="secondary" />
                        <QuickAction icon={Users} label="Nuevo alumno" to="/students" color="primary" />
                        <QuickAction icon={CalendarDays} label="Crear evento" to="/calendar" color="info" />
                        <QuickAction icon={TrendingUp} label="Ver reportes" to="/reports" color="warning" />
                    </CardBody>
                </Card>
            </div>

            {/* Upcoming Events */}
            <Card>
                <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                    <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        Próximos Eventos
                    </h2>
                    <Link to="/calendar">
                        <Button variant="ghost" size="sm">Ver todos <ChevronRight className="w-3.5 h-3.5" /></Button>
                    </Link>
                </div>
                <CardBody className="!p-4">
                    <div className="space-y-3">
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.map((event) => (
                                <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-bg-hover transition-colors">
                                    <div
                                        className="w-1 h-10 rounded-full shrink-0"
                                        style={{ backgroundColor: EVENT_COLORS[event.type] }}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-text-primary">{event.title}</p>
                                        <p className="text-xs text-text-secondary">
                                            {new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            {event.time && ` · ${event.time}`}
                                            {event.place && ` · ${event.place}`}
                                        </p>
                                    </div>
                                    <Badge variant={event.type === 'feriado' ? 'error' : event.type === 'examen' ? 'warning' : 'primary'}>
                                        {event.type === 'feriado' ? 'Feriado' : event.type === 'plenaria' ? 'Plenaria' : event.type === 'padres' ? 'Padres' : event.type === 'examen' ? 'Examen' : 'Otro'}
                                    </Badge>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center py-6">
                                <CalendarDays className="w-10 h-10 text-text-muted mb-3 opacity-50" />
                                <p className="text-sm font-medium text-text-primary">Tu agenda está libre</p>
                                <p className="text-sm text-text-muted mt-1 max-w-sm">No tienes eventos programados para los próximos días.</p>
                                <Link to="/calendar" className="mt-4">
                                    <Button variant="outline" size="sm" icon={Plus}>Programar evento</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </CardBody>
            </Card>
        </div>
    )
}
