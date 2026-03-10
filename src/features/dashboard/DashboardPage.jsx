import {
    Users, ClipboardCheck, BookOpen, CalendarDays, AlertTriangle,
    TrendingUp, Clock, ChevronRight, Plus, Bell, BarChart3, X, Check, Info, ShieldCheck
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '../../shared/components/Card'
import Badge from '../../shared/components/Badge'
import Button from '../../shared/components/Button'
import useStudentStore from '../../core/stores/useStudentStore'
import useCourseStore from '../../core/stores/useCourseStore'
import useCalendarStore from '../../core/stores/useCalendarStore'
import useAttendanceStore from '../../core/stores/useAttendanceStore'
import useSettingsStore from '../../core/stores/useSettingsStore'
import useAuthStore from '../../core/stores/useAuthStore'
import useGradeStore from '../../core/stores/useGradeStore'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { EVENT_COLORS } from '../../core/constants'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'



function MetricCard({ icon: Icon, label, value, trend, color, to }) {
    const colorVariants = {
        primary: 'from-primary/20 to-primary/5 text-primary border-primary/10 shadow-primary/5',
        secondary: 'from-secondary/20 to-secondary/5 text-secondary border-secondary/10 shadow-secondary/5',
        warning: 'from-warning/20 to-warning/5 text-warning border-warning/10 shadow-warning/5',
        info: 'from-info/20 to-info/5 text-info border-info/10 shadow-info/5',
    }

    const iconBgVariants = {
        primary: 'bg-primary text-white shadow-primary/20',
        secondary: 'bg-secondary text-white shadow-secondary/20',
        warning: 'bg-warning text-white shadow-warning/20',
        info: 'bg-info text-white shadow-info/20',
    }

    return (
        <Link to={to} className="block group">
            <Card hover className={`overflow-hidden border-none bg-gradient-to-br ${colorVariants[color]} relative group-hover:scale-[1.02] transition-all duration-500`}>
                <div className="absolute top-0 right-0 -tr-1/4 w-32 h-32 bg-white/10 dark:bg-black/5 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-700" />
                <CardBody className="!p-6 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-2xl ${iconBgVariants[color]} flex items-center justify-center shadow-xl group-hover:rotate-6 transition-all duration-500`}>
                            <Icon className="w-6 h-6" />
                        </div>
                        {trend && (
                            <Badge variant="primary" className="!bg-white/20 !text-current backdrop-blur-sm border-none">
                                {trend}
                            </Badge>
                        )}
                    </div>
                    <div>
                        <p className="text-2xl font-black text-text-primary tracking-tight leading-none group-hover:translate-x-1 transition-transform duration-500">{value}</p>
                        <p className="text-xs font-bold text-text-secondary mt-2 uppercase tracking-widest opacity-80">{label}</p>
                    </div>
                </CardBody>
            </Card>
        </Link>
    )
}

function QuickAction({ icon: Icon, label, to, color = 'primary' }) {
    const colorVariants = {
        primary: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white',
        secondary: 'bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white',
        warning: 'bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white',
        info: 'bg-info/10 text-info group-hover:bg-info group-hover:text-white',
    }

    return (
        <Link
            to={to}
            className="flex items-center gap-4 p-4 rounded-2xl hover:bg-bg-hover transition-all duration-300 group border border-transparent hover:border-border-light hover:shadow-sm"
        >
            <div className={`w-11 h-11 rounded-xl ${colorVariants[color]} flex items-center justify-center transition-all duration-500 shadow-sm`}>
                <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors tracking-tight">{label}</p>
                <p className="text-[10px] text-text-muted mt-0.5 uppercase font-bold tracking-widest opacity-60">Acceso Directo</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-bg-hover flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-all group-hover:translate-x-0.5" />
            </div>
        </Link>
    )
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const user = useAuthStore((s) => s.user)
    const allStudents = useStudentStore((s) => s.students)
    const courses = useCourseStore((s) => s.courses)
    const events = useCalendarStore((s) => s.events)

    const [showNotifications, setShowNotifications] = useState(false)

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
            const studentCourse = courses.find(c => c.id === s.courseId)
            const courseLabel = studentCourse ? `${studentCourse.year} "${studentCourse.division}"` : 'Curso'
            alerts.push({
                type: 'warning',
                title: `${s.lastName}, ${s.name} — Inasistencias críticas`,
                desc: `${courseLabel} · ${Math.round(100 - percentage)}% de inasistencias acumuladas`,
                icon: AlertTriangle,
                to: `/attendance?course=${s.courseId}`
            })
        }
    })

    // 2. Alerta de registros faltantes
    const isStrikeDay = events.some((e) => e.date === todayStr && e.type === 'paro');
    if (!isStrikeDay) {
        const recordedCourses = new Set(Object.keys(attendanceRecords).filter(k => k.startsWith(todayStr)).map(k => k.split('_')[1]))
        courses.forEach(c => {
            if (!recordedCourses.has(c.id)) {
                alerts.push({
                    type: 'error',
                    title: `Asistencia pendiente — ${c.year} "${c.division}"`,
                    desc: `Aún no se ha registrado la asistencia del día de hoy para este curso`,
                    icon: ClipboardCheck,
                    to: `/attendance?course=${c.id}`
                })
            }
        })
    }

    // 3. Próximo evento
    if (upcomingEvents.length > 0) {
        alerts.push({
            type: 'info',
            title: `Evento próximo: ${upcomingEvents[0].title}`,
            desc: `${upcomingEvents[0].place || 'Sin lugar'} · ${new Date(upcomingEvents[0].date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`,
            icon: CalendarDays,
            to: '/calendar'
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
        <div className="space-y-8 animate-fade-in relative">
            {/* Background Glow Decorations */}
            <div className="fixed top-20 right-20 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none animate-pulse" />
            <div className="fixed bottom-20 left-20 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -z-10 pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/10">
                <div className="relative">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-full hidden md:block" />
                    <h1 className="text-4xl font-black text-text-primary tracking-tight">
                        {greeting}, <span className="text-primary">{user?.name?.split(' ').pop()}</span> 👋
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary font-medium lowercase">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        <span>{dateStr}</span>
                        <span className="w-1 h-1 rounded-full bg-text-muted mx-1" />
                        <span>Ciclo Lectivo 2026</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative group w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-500 cursor-pointer overflow-hidden ${showNotifications ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30 scale-105' : 'bg-bg-card/50 backdrop-blur-xl border-border/50 text-text-secondary hover:bg-bg-hover hover:-translate-y-1'}`}
                    >
                        <Bell className={`w-5 h-5 ${showNotifications ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'}`} />
                        {alerts.length > 0 && (
                            <span className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-bg-card animate-pulse ${showNotifications ? 'bg-white' : 'bg-error'}`} />
                        )}
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </div>

            {/* Notifications Panel (Window) */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 flex justify-end md:pr-6 md:pt-20 pointer-events-none">
                    <div className="w-full md:w-96 md:max-h-[600px] h-fit bg-bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-slide-in-right pointer-events-auto backdrop-blur-xl bg-bg-card/90">
                        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-gradient-to-r from-bg-hover/50 to-transparent">
                            <div>
                                <h3 className="font-bold text-text-primary flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-primary" />
                                    Centro de Notificaciones
                                </h3>
                                <p className="text-[10px] text-text-muted mt-0.5">Alertas inteligentes y recordatorios</p>
                            </div>
                            <button onClick={() => setShowNotifications(false)} className="w-8 h-8 flex items-center justify-center hover:bg-bg-hover rounded-full transition-all cursor-pointer">
                                <X className="w-4 h-4 text-text-muted" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[500px] divide-y divide-border-light scrollbar-hide">
                            {alerts.length > 0 ? alerts.map((alert, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        navigate(alert.to)
                                        setShowNotifications(false)
                                    }}
                                    className="w-full text-left p-5 hover:bg-bg-hover transition-all flex items-start gap-4 group cursor-pointer relative"
                                >
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110 shrink-0 flex items-center justify-center mt-0.5 shadow-sm ${alert.type === 'error' ? 'from-error/20 to-error/5' :
                                        alert.type === 'warning' ? 'from-warning/20 to-warning/5' :
                                            'from-info/20 to-info/5'
                                        }`}>
                                        <alert.icon className={`w-6 h-6 ${alert.type === 'error' ? 'text-error' :
                                            alert.type === 'warning' ? 'text-warning' :
                                                'text-info'
                                            }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors truncate">{alert.title}</p>
                                            <span className="text-[10px] text-text-muted shrink-0">Ahora</span>
                                        </div>
                                        <p className="text-xs text-text-secondary mt-1 leading-relaxed line-clamp-2">{alert.desc}</p>
                                        <div className="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 text-[10px] font-bold text-primary">
                                            <span>SOLUCIONAR</span>
                                            <ChevronRight className="w-3 h-3 animate-pulse" />
                                        </div>
                                    </div>
                                    {i === 0 && <span className="absolute top-5 right-5 w-2 h-2 rounded-full bg-primary animate-ping" />}
                                </button>
                            )) : (
                                <div className="py-20 text-center px-6">
                                    <div className="w-20 h-20 rounded-full bg-bg-hover flex items-center justify-center mx-auto mb-4 border border-border border-dashed">
                                        <Check className="w-10 h-10 text-text-muted/30" />
                                    </div>
                                    <h4 className="text-base font-bold text-text-primary">Todo bajo control</h4>
                                    <p className="text-sm text-text-secondary mt-2 max-w-[200px] mx-auto">No hay alertas ni tareas pendientes por el momento.</p>
                                </div>
                            )}
                        </div>
                        {alerts.length > 0 && (
                            <div className="px-6 py-4 bg-bg-hover/30 border-t border-border flex items-center justify-between">
                                <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">Resumen de alertas</p>
                                <Badge variant="primary" className="!px-2 !py-0.5">{alerts.length}</Badge>
                            </div>
                        )}
                    </div>
                    {/* Backdrop for mobile */}
                    <div className="fixed inset-0 bg-transparent md:hidden -z-10 pointer-events-auto" onClick={() => setShowNotifications(false)} />
                </div>
            )}

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
                                            <RechartsTooltip
                                                contentStyle={{
                                                    borderRadius: '16px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                    backgroundColor: 'var(--color-bg-card)',
                                                    padding: '12px'
                                                }}
                                            />
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
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                            <RechartsTooltip
                                                cursor={{ fill: 'currentColor', opacity: 0.05 }}
                                                contentStyle={{
                                                    borderRadius: '16px',
                                                    border: 'none',
                                                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                    backgroundColor: 'var(--color-bg-card)',
                                                    padding: '12px'
                                                }}
                                            />
                                            <Bar dataKey="alumnos" fill="#1A56A0" radius={[6, 6, 0, 0]} maxBarSize={32} />
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

                <Card className="lg:col-span-1 flex flex-col border-none bg-gradient-to-b from-bg-card to-bg-hover/30 shadow-xl shadow-black/5">
                    <CardHeader
                        className="!border-none pt-6"
                        action={
                            <Badge variant={displayAlerts.length > 0 ? 'warning' : 'success'} className="animate-pulse">
                                {displayAlerts.length} {displayAlerts.length === 1 ? 'Activa' : 'Activas'}
                            </Badge>
                        }
                    >
                        <h2 className="text-xl font-black text-text-primary tracking-tight">Alertas</h2>
                    </CardHeader>
                    <CardBody className="space-y-4 !p-6 pt-2">
                        {displayAlerts.length > 0 ? displayAlerts.map((alert, i) => (
                            <div
                                key={i}
                                onClick={() => navigate(alert.to)}
                                className={`flex items-start gap-4 p-4 rounded-2xl bg-bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group`}
                            >
                                <div className={`w-12 h-12 rounded-2xl bg-${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}/10 flex items-center justify-center shrink-0 shadow-sm border border-${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}/10`}>
                                    <alert.icon className={`w-5 h-5 text-${alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-text-primary group-hover:text-primary transition-colors truncate">{alert.title}</p>
                                    <p className="text-xs text-text-secondary mt-1 font-medium leading-relaxed">{alert.desc}</p>
                                </div>
                                <div className="self-center p-1.5 rounded-full bg-bg-hover group-hover:bg-primary/10 transition-colors">
                                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary" />
                                </div>
                            </div>
                        )) : (
                            <div className="py-12 flex flex-col items-center justify-center grayscale opacity-60">
                                <ShieldCheck className="w-12 h-12 text-success mb-3" />
                                <p className="text-sm font-bold text-text-muted">¡Todo al día!</p>
                                <p className="text-xs text-text-muted/60 mt-1">No hay alertas pendientes</p>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Quick Actions */}
                <Card className="border-none shadow-xl shadow-black/5 overflow-hidden">
                    <CardHeader className="!border-none pt-6">
                        <h2 className="text-xl font-black text-text-primary tracking-tight">Accesos Rápidos</h2>
                    </CardHeader>
                    <CardBody className="!p-4 space-y-2">
                        <QuickAction icon={ClipboardCheck} label="Tomar Asistencia" to="/attendance" color="primary" />
                        <QuickAction icon={BookOpen} label="Cargar Notas" to="/grades" color="secondary" />
                        <QuickAction icon={Users} label="Nuevo Alumno" to="/students" color="primary" />
                        <QuickAction icon={CalendarDays} label="Agendar Evento" to="/calendar" color="info" />
                        <QuickAction icon={TrendingUp} label="Ver Reportes" to="/reports" color="warning" />
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
