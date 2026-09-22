import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    GraduationCap, Users, ClipboardCheck, FileText, NotebookPen,
    CalendarDays, AlertTriangle, TrendingUp, Clock, ChevronRight,
    Plus, Bell, BarChart3, X, Check, ShieldCheck, Cloud, CloudOff,
    FolderCheck, Sparkles, BookOpen, Layers, Award, ExternalLink
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '../../shared/components/Card'
import Badge from '../../shared/components/Badge'
import Button from '../../shared/components/Button'
import useFPCourseStore from '../../core/stores/useFPCourseStore'
import useFPTopicAttendanceStore from '../../core/stores/useFPTopicAttendanceStore'
import useFPAttendanceSheetStore from '../../core/stores/useFPAttendanceSheetStore'
import useFPExamActStore from '../../core/stores/useFPExamActStore'
import useFPUpdateAlertStore from '../../core/stores/useFPUpdateAlertStore'
import useAuthStore from '../../core/stores/useAuthStore'
import useSettingsStore from '../../core/stores/useSettingsStore'
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

function QuickAction({ icon: Icon, label, to, color = 'primary', badge = null }) {
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
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors tracking-tight truncate">{label}</p>
                    {badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-[10px] text-text-muted mt-0.5 uppercase font-bold tracking-widest opacity-60">Acceso Directo</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-bg-hover flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-all group-hover:translate-x-0.5" />
            </div>
        </Link>
    )
}

export default function FPDashboardPage() {
    const navigate = useNavigate()
    const user = useAuthStore((s) => s.user)
    const courses = useFPCourseStore((s) => s.courses)
    const topicSheets = useFPTopicAttendanceStore((s) => s.sheets)
    const attendanceSheets = useFPAttendanceSheetStore((s) => s.sheets)
    const examActs = useFPExamActStore((s) => s.acts)
    const pendingUpdates = useFPUpdateAlertStore((s) => s.pendingUpdates)
    const googleLinked = useSettingsStore((s) => s.googleLinked)

    const [showNotifications, setShowNotifications] = useState(false)

    // Saludo y Fecha
    const today = new Date()
    const greeting = today.getHours() < 12 ? 'Buenos días' : today.getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'
    const dateStr = today.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    // Métricas principales
    const totalStudents = courses.reduce((acc, c) => acc + (c.students?.length || 0), 0)
    const totalClases = topicSheets.reduce((acc, s) => acc + (s.entries?.length || 0), 0)

    // Evaluaciones y Aprobados
    let totalExaminados = 0
    let totalAprobados = 0
    examActs.forEach((act) => {
        const ex = parseInt(act.resumen?.examinados, 10)
        const ap = parseInt(act.resumen?.aprobados, 10)
        if (!isNaN(ex)) totalExaminados += ex
        else totalExaminados += (act.students?.length || 0)

        if (!isNaN(ap)) totalAprobados += ap
        else {
            const passed = (act.students || []).filter((st) => {
                const n = parseFloat(st.examenFinalNota)
                return !isNaN(n) && n >= 4
            }).length
            totalAprobados += passed
        }
    })
    const tasaAprobacion = totalExaminados > 0 ? Math.round((totalAprobados / totalExaminados) * 100) : 100

    // Alertas dinámicas de Formación Profesional
    const alerts = []

    // 1. Alertas de desincronización entre Ficha y Asistencia/Actas
    Object.entries(pendingUpdates || {}).forEach(([courseId, info]) => {
        if (info.attendance) {
            alerts.push({
                type: 'warning',
                title: `Asistencia desactualizada · Curso Nº ${info.cursoNumero || '—'}`,
                desc: `Hay nuevos alumnos cargados en la Ficha que aún no fueron sincronizados en Asistencia de Alumnos.`,
                icon: ClipboardCheck,
                to: '/fp/attendance-sheet',
            })
        }
        if (info.exam) {
            alerts.push({
                type: 'info',
                title: `Acta de Examen pendiente · Curso Nº ${info.cursoNumero || '—'}`,
                desc: `Hay alumnos incorporados en la Ficha que están pendientes de inclusión en el Acta de Examen.`,
                icon: FileText,
                to: '/fp/exam-act',
            })
        }
    })

    // 2. Alertas de vinculación a Google Drive
    if (!googleLinked) {
        alerts.push({
            type: 'warning',
            title: 'Google Drive no vinculado',
            desc: 'Conectá tu cuenta de Google en Configuración para respaldar y sincronizar tus cursos en la nube.',
            icon: CloudOff,
            to: '/settings',
        })
    } else {
        courses.forEach((c) => {
            const hasCourse = Boolean(c.spreadsheetId || c.links?.courseSheet?.spreadsheetId)
            const hasTopic = Boolean(c.links?.topicAttendance?.spreadsheetId)
            const hasAtt = Boolean(c.links?.attendanceSheet?.spreadsheetId)
            const missing = [hasCourse, hasTopic, hasAtt].filter((x) => !x).length
            if (missing > 0) {
                alerts.push({
                    type: 'info',
                    title: `Planillas pendientes en Drive · Curso Nº ${c.cursoNumero || '—'}`,
                    desc: `El curso tiene ${missing} archivo(s) de cálculo pendientes de vincular en su carpeta de Google Drive.`,
                    icon: Cloud,
                    to: '/fp/courses',
                })
            }
        })
    }

    // 3. Alertas por bajas registradas
    const coursesWithBajas = []
    attendanceSheets.forEach((sheet) => {
        if (sheet.bajas && sheet.bajas.length > 0) {
            const cNum = sheet.cursoNumero || '—'
            if (!coursesWithBajas.includes(cNum)) coursesWithBajas.push(cNum)
        }
    })
    if (coursesWithBajas.length > 0) {
        alerts.push({
            type: 'warning',
            title: `Bajas registradas en Asistencia`,
            desc: `Se registraron bajas de alumnos en los Cursos Nº: ${coursesWithBajas.join(', ')}.`,
            icon: AlertTriangle,
            to: '/fp/attendance-sheet',
        })
    }

    const displayAlerts = alerts.slice(0, 3)

    // --- Cálculos para Gráficos Recharts ---
    // 1. Gráfico de Asistencia Global de FP
    let totalPres = 0
    let totalAus = 0
    let totalBajasCount = 0
    attendanceSheets.forEach((sheet) => {
        totalBajasCount += (sheet.bajas?.length || 0)
        ;(sheet.students || []).forEach((st) => {
            totalPres += (parseInt(st.totalPres, 10) || 0)
            totalAus += (parseInt(st.totalAus, 10) || 0)
        })
    })

    const totalAsistencias = totalPres + totalAus
    const presentismoPct = totalAsistencias > 0 ? Math.round((totalPres / totalAsistencias) * 100) : 100

    const attendanceStats = [
        { name: 'Presentes', value: totalPres, color: '#2D6A4F' },
        { name: 'Ausentes', value: totalAus, color: '#E63946' },
        { name: 'Bajas', value: totalBajasCount, color: '#F59E0B' },
    ].filter((s) => s.value > 0)

    // 2. Gráfico de Matrícula por Curso FP
    const courseStats = courses.map((c) => {
        const label = c.cursoNumero ? `Cº ${c.cursoNumero}` : 'Sin Nº'
        return {
            name: c.especialidad ? `${label} - ${c.especialidad.slice(0, 15)}` : label,
            alumnos: c.students?.length || 0,
            cursoNumero: c.cursoNumero || '',
            especialidad: c.especialidad || 'Sin especialidad',
        }
    })

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Luces de Fondo / Background Glow Decorations */}
            <div className="fixed top-20 right-20 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none animate-pulse" />
            <div className="fixed bottom-20 left-20 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -z-10 pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

            {/* Cabecera Principal */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/10">
                <div className="relative">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-full hidden md:block" />
                    <h1 className="text-4xl font-black text-text-primary tracking-tight">
                        {greeting}, <span className="text-primary">{user?.name?.split(' ').pop() || 'Instructor'}</span> 👋
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-text-secondary font-medium lowercase">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        <span>{dateStr}</span>
                        <span className="w-1 h-1 rounded-full bg-text-muted mx-1" />
                        <span className="font-semibold text-text-primary">Formación Profesional</span>
                        <span className="w-1 h-1 rounded-full bg-text-muted mx-1" />
                        <span>Ciclo 2026</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Badge de Google Drive */}
                    <div className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border ${
                        googleLinked
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    }`}>
                        {googleLinked ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
                        <span>{googleLinked ? 'Drive Conectado' : 'Drive Sin Conectar'}</span>
                    </div>

                    {/* Botón Campana de Notificaciones */}
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative group w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-500 cursor-pointer overflow-hidden ${
                            showNotifications
                                ? 'bg-primary border-primary text-white shadow-xl shadow-primary/30 scale-105'
                                : 'bg-bg-card/50 backdrop-blur-xl border-border/50 text-text-secondary hover:bg-bg-hover hover:-translate-y-1'
                        }`}
                        title="Centro de Notificaciones y Alertas de FP"
                    >
                        <Bell className={`w-5 h-5 ${showNotifications ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'}`} />
                        {alerts.length > 0 && (
                            <span className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-bg-card animate-pulse ${showNotifications ? 'bg-white' : 'bg-error'}`} />
                        )}
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>
            </div>

            {/* Panel Flotante de Notificaciones */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 flex justify-end md:pr-6 md:pt-20 pointer-events-none">
                    <div className="w-full md:w-96 md:max-h-[600px] h-fit bg-bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-slide-in-right pointer-events-auto backdrop-blur-xl bg-bg-card/95">
                        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-gradient-to-r from-bg-hover/50 to-transparent">
                            <div>
                                <h3 className="font-bold text-text-primary flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-primary" />
                                    Centro de Notificaciones FP
                                </h3>
                                <p className="text-[10px] text-text-muted mt-0.5">Alertas inteligentes y sincronización</p>
                            </div>
                            <button
                                onClick={() => setShowNotifications(false)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-bg-hover rounded-full transition-all cursor-pointer"
                            >
                                <X className="w-4 h-4 text-text-muted" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-[500px] divide-y divide-border-light scrollbar-hide">
                            {alerts.length > 0 ? (
                                alerts.map((alert, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            navigate(alert.to)
                                            setShowNotifications(false)
                                        }}
                                        className="w-full text-left p-5 hover:bg-bg-hover transition-all flex items-start gap-4 group cursor-pointer relative"
                                    >
                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110 shrink-0 flex items-center justify-center mt-0.5 shadow-sm ${
                                            alert.type === 'error'
                                                ? 'from-error/20 to-error/5'
                                                : alert.type === 'warning'
                                                    ? 'from-warning/20 to-warning/5'
                                                    : 'from-info/20 to-info/5'
                                        }`}>
                                            <alert.icon className={`w-6 h-6 ${
                                                alert.type === 'error'
                                                    ? 'text-error'
                                                    : alert.type === 'warning'
                                                        ? 'text-warning'
                                                        : 'text-info'
                                            }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors truncate">{alert.title}</p>
                                                <span className="text-[10px] text-text-muted shrink-0">Alerta</span>
                                            </div>
                                            <p className="text-xs text-text-secondary mt-1 leading-relaxed line-clamp-2">{alert.desc}</p>
                                            <div className="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0 text-[10px] font-bold text-primary">
                                                <span>RESOLVER</span>
                                                <ChevronRight className="w-3 h-3 animate-pulse" />
                                            </div>
                                        </div>
                                        {i === 0 && <span className="absolute top-5 right-5 w-2 h-2 rounded-full bg-primary animate-ping" />}
                                    </button>
                                ))
                            ) : (
                                <div className="py-20 text-center px-6">
                                    <div className="w-20 h-20 rounded-full bg-bg-hover flex items-center justify-center mx-auto mb-4 border border-border border-dashed">
                                        <Check className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <h4 className="text-base font-bold text-text-primary">Todo al día en FP</h4>
                                    <p className="text-sm text-text-secondary mt-2 max-w-[200px] mx-auto">Tus cursos, asistencias y actas están sincronizados y al día.</p>
                                </div>
                            )}
                        </div>
                        {alerts.length > 0 && (
                            <div className="px-6 py-4 bg-bg-hover/30 border-t border-border flex items-center justify-between">
                                <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest">Alertas activas</p>
                                <Badge variant="primary" className="!px-2 !py-0.5">{alerts.length}</Badge>
                            </div>
                        )}
                    </div>
                    {/* Backdrop para mobile */}
                    <div className="fixed inset-0 bg-transparent md:hidden -z-10 pointer-events-auto" onClick={() => setShowNotifications(false)} />
                </div>
            )}

            {/* Métricas Principales (Metric Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    icon={GraduationCap}
                    label="Cursos FP Activos"
                    value={courses.length}
                    trend={courses.length > 0 ? `${courses.length} cursos` : null}
                    color="secondary"
                    to="/fp/courses"
                />
                <MetricCard
                    icon={Users}
                    label="Matrícula Total"
                    value={totalStudents}
                    trend={totalStudents > 0 ? `${totalStudents} alumnos` : null}
                    color="primary"
                    to="/fp/courses"
                />
                <MetricCard
                    icon={NotebookPen}
                    label="Clases Dictadas"
                    value={totalClases}
                    trend={topicSheets.length > 0 ? `${topicSheets.length} meses` : null}
                    color="warning"
                    to="/fp/topic-attendance"
                />
                <MetricCard
                    icon={Award}
                    label="Actas de Examen"
                    value={examActs.length}
                    trend={totalExaminados > 0 ? `${tasaAprobacion}% aprob.` : null}
                    color="info"
                    to="/fp/exam-act"
                />
            </div>

            {/* Fila Principal de Analíticas y Alertas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráficos de Analítica (Recharts) */}
                <Card className="lg:col-span-2">
                    <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            Rendimiento Global de Formación Profesional
                        </h2>
                    </div>
                    <CardBody className="!p-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[250px]">
                            {/* Gráfico 1: Asistencia Global y Regularidad */}
                            <div className="flex flex-col items-center justify-center relative w-full h-full">
                                <h3 className="text-sm font-medium text-text-secondary mb-2 absolute top-0 left-0">Regularidad de Asistencia</h3>
                                {attendanceStats.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={attendanceStats}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
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
                                                    padding: '12px',
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-bg-hover rounded-xl border border-dashed border-border-light">
                                        <ClipboardCheck className="w-8 h-8 text-text-muted mb-2" />
                                        <p className="text-sm text-text-secondary">Sin registros de asistencia aún</p>
                                        <p className="text-xs text-text-muted mt-1">Se alimentará al cargar planillas mensuales</p>
                                    </div>
                                )}
                                {attendanceStats.length > 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center mt-6 pointer-events-none">
                                        <div className="text-center">
                                            <p className="text-2xl font-bold text-text-primary">{presentismoPct}%</p>
                                            <p className="text-[10px] text-text-muted uppercase tracking-wider">Presentismo</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Gráfico 2: Estudiantes por Especialidad / Curso */}
                            <div className="flex flex-col items-center justify-center relative w-full h-full">
                                <h3 className="text-sm font-medium text-text-secondary mb-2 absolute top-0 left-0">Matrícula por Curso</h3>
                                {courseStats.length > 0 && totalStudents > 0 ? (
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
                                                    padding: '12px',
                                                }}
                                            />
                                            <Bar dataKey="alumnos" fill="#1A56A0" radius={[6, 6, 0, 0]} maxBarSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-bg-hover rounded-xl border border-dashed border-border-light">
                                        <Users className="w-8 h-8 text-text-muted mb-2" />
                                        <p className="text-sm text-text-secondary">Sin matrícula registrada</p>
                                        <p className="text-xs text-text-muted mt-1">Cargá alumnos en Fichas de Curso</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Tarjeta de Alertas Activas */}
                <Card className="lg:col-span-1 flex flex-col border-none bg-gradient-to-b from-bg-card to-bg-hover/30 shadow-xl shadow-black/5">
                    <CardHeader
                        className="!border-none pt-6"
                        action={
                            <Badge variant={displayAlerts.length > 0 ? 'warning' : 'success'} className="animate-pulse">
                                {displayAlerts.length} {displayAlerts.length === 1 ? 'Activa' : 'Activas'}
                            </Badge>
                        }
                    >
                        <h2 className="text-xl font-black text-text-primary tracking-tight">Alertas de FP</h2>
                    </CardHeader>
                    <CardBody className="space-y-4 !p-6 pt-2">
                        {displayAlerts.length > 0 ? (
                            displayAlerts.map((alert, i) => (
                                <div
                                    key={i}
                                    onClick={() => navigate(alert.to)}
                                    className="flex items-start gap-4 p-4 rounded-2xl bg-bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                                        alert.type === 'error'
                                            ? 'bg-error/10 border-error/20 text-error'
                                            : alert.type === 'warning'
                                                ? 'bg-warning/10 border-warning/20 text-warning'
                                                : 'bg-info/10 border-info/20 text-info'
                                    }`}>
                                        <alert.icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black text-text-primary group-hover:text-primary transition-colors truncate">{alert.title}</p>
                                        <p className="text-xs text-text-secondary mt-1 font-medium leading-relaxed line-clamp-2">{alert.desc}</p>
                                    </div>
                                    <div className="self-center p-1.5 rounded-full bg-bg-hover group-hover:bg-primary/10 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center grayscale opacity-60">
                                <ShieldCheck className="w-12 h-12 text-success mb-3" />
                                <p className="text-sm font-bold text-text-muted">¡Todo al día!</p>
                                <p className="text-xs text-text-muted/60 mt-1 text-center">Tus 4 planillas están sincronizadas y respaldadas</p>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* Accesos Rápidos y Estado de Cursos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda: Accesos Rápidos */}
                <Card className="border-none shadow-xl shadow-black/5 overflow-hidden">
                    <CardHeader className="!border-none pt-6">
                        <h2 className="text-xl font-black text-text-primary tracking-tight">Accesos Rápidos FP</h2>
                    </CardHeader>
                    <CardBody className="!p-4 space-y-2">
                        <QuickAction
                            icon={NotebookPen}
                            label="Libro de Temas y Asistencia"
                            to="/fp/topic-attendance"
                            color="primary"
                            badge={topicSheets.length > 0 ? `${topicSheets.length} meses` : null}
                        />
                        <QuickAction
                            icon={ClipboardCheck}
                            label="Asistencia de Alumnos"
                            to="/fp/attendance-sheet"
                            color="secondary"
                            badge={attendanceSheets.length > 0 ? `${attendanceSheets.length} planillas` : null}
                        />
                        <QuickAction
                            icon={GraduationCap}
                            label="Fichas de Curso y Matrícula"
                            to="/fp/courses"
                            color="primary"
                            badge={courses.length > 0 ? `${courses.length} cursos` : null}
                        />
                        <QuickAction
                            icon={FileText}
                            label="Actas de Examen Final"
                            to="/fp/exam-act"
                            color="info"
                            badge={examActs.length > 0 ? `${examActs.length} actas` : null}
                        />
                    </CardBody>
                </Card>

                {/* Columna Derecha: Monitor de Cursos y Vinculación con Google Drive */}
                <Card className="lg:col-span-2">
                    <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" />
                            Cursos de Formación Profesional y Estado en Google Drive
                        </h2>
                        <Link to="/fp/courses">
                            <Button variant="ghost" size="sm">
                                Gestionar Cursos <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                        </Link>
                    </div>
                    <CardBody className="!p-4">
                        {courses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {courses.map((c) => {
                                    const hasFolder = Boolean(c.folderName || c.folderId)
                                    const hasCourseSheet = Boolean(c.spreadsheetId || c.links?.courseSheet?.spreadsheetId)
                                    const hasTopic = Boolean(c.links?.topicAttendance?.spreadsheetId)
                                    const hasAtt = Boolean(c.links?.attendanceSheet?.spreadsheetId)
                                    const hasExam = Boolean(c.links?.examAct?.spreadsheetId)

                                    // Contar clases dadas en este curso
                                    const matchingTopicSheets = topicSheets.filter(
                                        (s) => (s.cursoId && s.cursoId === c.id) ||
                                            (s.cursoNumero && s.cursoNumero.trim().toLowerCase() === (c.cursoNumero || '').trim().toLowerCase())
                                    )
                                    const clasesCount = matchingTopicSheets.reduce((acc, s) => acc + (s.entries?.length || 0), 0)

                                    return (
                                        <div
                                            key={c.id}
                                            className="p-4 rounded-2xl bg-bg-main border border-border-light hover:border-primary/30 transition-all hover:shadow-md space-y-3"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-primary text-white">
                                                            Nº {c.cursoNumero || '—'}
                                                        </span>
                                                        <h3 className="font-bold text-sm text-text-primary truncate">
                                                            {c.especialidad || 'Sin especialidad'}
                                                        </h3>
                                                    </div>
                                                    <p className="text-xs text-text-secondary mt-1">
                                                        C.F.P. Nº {c.cfpNumero || '—'} · {c.distrito || 'Sin distrito'}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-bold text-text-muted shrink-0">
                                                    👥 {c.students?.length || 0}
                                                </span>
                                            </div>

                                            {/* Estado de sincronización en Google Drive */}
                                            <div className="pt-2 border-t border-border-light/60">
                                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">
                                                    Archivos en Google Drive:
                                                </p>
                                                <div className="flex flex-wrap gap-1.5 text-[11px]">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                                                        hasFolder
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                            : 'bg-bg-hover text-text-muted border-border-light'
                                                    }`} title={hasFolder ? `Carpeta: ${c.folderName || c.folderId}` : 'Carpeta no vinculada'}>
                                                        📁 {hasFolder ? (c.folderName || 'Carpeta') : 'Sin carpeta'}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                                                        hasCourseSheet
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                            : 'bg-bg-hover text-text-muted border-border-light'
                                                    }`} title="Ficha de Curso">
                                                        📄 Ficha
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                                                        hasTopic
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                            : 'bg-bg-hover text-text-muted border-border-light'
                                                    }`} title="Tema y Asistencia">
                                                        📑 Tema ({matchingTopicSheets.length} m.)
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                                                        hasAtt
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                            : 'bg-bg-hover text-text-muted border-border-light'
                                                    }`} title="Asistencia de Alumnos">
                                                        📋 Asistencia
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-medium ${
                                                        hasExam
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                            : 'bg-bg-hover text-text-muted border-border-light'
                                                    }`} title="Actas de Examen">
                                                        🎓 Actas
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Botones de navegación directa para este curso */}
                                            <div className="flex items-center justify-between pt-2">
                                                <span className="text-[11px] text-text-muted">
                                                    {clasesCount} clase{clasesCount !== 1 ? 's' : ''} registrada{clasesCount !== 1 ? 's' : ''}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <Link
                                                        to={`/fp/topic-attendance`}
                                                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-bg-surface hover:bg-bg-hover text-text-secondary hover:text-primary transition-colors border border-border-light"
                                                        title="Ver temas de este curso"
                                                    >
                                                        Temas
                                                    </Link>
                                                    <Link
                                                        to={`/fp/attendance-sheet`}
                                                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-bg-surface hover:bg-bg-hover text-text-secondary hover:text-primary transition-colors border border-border-light"
                                                        title="Ver asistencia de este curso"
                                                    >
                                                        Asistencia
                                                    </Link>
                                                    <Link
                                                        to={`/fp/courses`}
                                                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white transition-colors"
                                                        title="Ver ficha completa"
                                                    >
                                                        Ficha →
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-3">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-1">
                                    <GraduationCap className="w-7 h-7 text-primary" />
                                </div>
                                <h3 className="text-base font-bold text-text-primary">Todavía no creaste cursos de Formación Profesional</h3>
                                <p className="text-xs text-text-secondary max-w-sm">
                                    Para comenzar, cargá tu primer curso en Fichas de Curso o vinculá una hoja de cálculo existente desde Google Drive.
                                </p>
                                <Link to="/fp/courses" className="pt-2">
                                    <Button icon={Plus}>
                                        Crear Primer Curso FP
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    )
}
