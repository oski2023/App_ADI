import { useState, useMemo } from 'react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Badge from '../../shared/components/Badge'
import { Select } from '../../shared/components/Input'
import Tabs from '../../shared/components/Tabs'
import Modal from '../../shared/components/Modal'
import EmptyState from '../../shared/components/EmptyState'
import { Input } from '../../shared/components/Input'
import { FileText, Plus, Edit2, Trash2, Calendar, Clock, BookOpen } from 'lucide-react'
import useCourseStore from '../../core/stores/useCourseStore'
import usePlanningStore from '../../core/stores/usePlanningStore'
import { DAYS_FULL_ES } from '../../core/constants'
import toast from 'react-hot-toast'

const HOURS = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

export default function PlanningPage() {
    const courses = useCourseStore((s) => s.courses)
    const { planning, setPlanEntry } = usePlanningStore()

    const [view, setView] = useState('weekly')
    const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || '')
    const [editingCell, setEditingCell] = useState(null)
    const [cellContent, setCellContent] = useState('')

    const course = useMemo(() => courses.find((c) => c.id === selectedCourse), [courses, selectedCourse])
    const currentCoursePlan = planning[selectedCourse] || {}

    const handleCellClick = (day, hour) => {
        if (!course) return
        const key = `${day}_${hour}`
        const current = currentCoursePlan[key]
        setEditingCell({ day, hour })
        setCellContent(current || '')
    }

    const saveCell = () => {
        if (editingCell) {
            setPlanEntry(selectedCourse, editingCell.day, editingCell.hour, cellContent)
            setEditingCell(null)
            setCellContent('')
            toast.success('Planificación guardada')
        }
    }

    const deleteCell = () => {
        if (editingCell) {
            setPlanEntry(selectedCourse, editingCell.day, editingCell.hour, null)
            setEditingCell(null)
            setCellContent('')
            toast.success('Entrada eliminada')
        }
    }

    const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
    const [isEditingMode, setIsEditingMode] = useState(false)

    const planningList = useMemo(() => {
        const list = []
        WEEK_DAYS.forEach(day => {
            HOURS.forEach(hour => {
                const content = currentCoursePlan[`${day}_${hour}`]
                if (content) {
                    list.push({ day, hour, content })
                }
            })
        })
        return list
    }, [currentCoursePlan])

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Planificación</h1>
                    <p className="text-sm text-text-secondary mt-1">Organizá tus clases semanalmente o mensualmente</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Tabs
                        tabs={[{ value: 'grid', label: 'Grilla' }, { value: 'list', label: 'Lista' }]}
                        activeTab={viewMode} onChange={setViewMode}
                    />
                    <Tabs
                        tabs={[{ value: 'weekly', label: 'Semanal' }, { value: 'monthly', label: 'Mensual' }]}
                        activeTab={view} onChange={setView}
                    />
                    <Button
                        variant={isEditingMode ? 'primary' : 'outline'}
                        icon={Edit2}
                        onClick={() => setIsEditingMode(!isEditingMode)}
                    >
                        {isEditingMode ? 'Modo Lectura' : 'Modificar'}
                    </Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-text-muted">CURSO</label>
                    <Select
                        value={selectedCourse}
                        options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}" — ${c.shift}` }))}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="w-72"
                    />
                </div>
                {course && (
                    <div className="flex items-center gap-2 mt-5">
                        <Badge variant="neutral">{course.subjects.join(', ')}</Badge>
                    </div>
                )}
            </div>

            {view === 'weekly' ? (
                viewMode === 'grid' ? (
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-bg-hover/50">
                                        <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 w-20 sticky left-0 bg-bg-card z-10 border-r border-border-light">Hora</th>
                                        {WEEK_DAYS.map((day) => (
                                            <th key={day} className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 min-w-[160px]">{day}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {HOURS.map((hour) => (
                                        <tr key={hour} className="border-b border-border-light group">
                                            <td className="px-4 py-3 text-xs font-medium text-text-muted sticky left-0 bg-bg-card z-10 border-r border-border-light">{hour}</td>
                                            {WEEK_DAYS.map((day) => {
                                                const key = `${day}_${hour}`
                                                const content = currentCoursePlan[key]
                                                return (
                                                    <td
                                                        key={day}
                                                        onClick={() => isEditingMode && handleCellClick(day, hour)}
                                                        className={`px-3 py-2 text-center transition-colors border-l border-border-light relative
                                                            ${isEditingMode ? 'cursor-pointer hover:bg-primary/5' : 'cursor-default'}
                                                            ${content ? 'bg-primary/5' : ''}
                                                        `}
                                                    >
                                                        {content ? (
                                                            <div className="bg-primary/10 text-primary text-xs font-medium px-3 py-2 rounded-xl shadow-sm border border-primary/20 animate-scale-in">
                                                                {content}
                                                            </div>
                                                        ) : (
                                                            isEditingMode && <div className="text-text-muted/20 text-xs py-2 opacity-0 group-hover:opacity-100 transition-opacity">+</div>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {planningList.length === 0 ? (
                            <EmptyState icon={Search} title="Sin planificación detallada" description="No hay clases planificadas para este curso." />
                        ) : (
                            planningList.map((item, idx) => (
                                <Card key={item.day + item.hour + idx} className="hover:shadow-sm">
                                    <CardBody className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-text-primary capitalize">{item.day} - {item.hour}</p>
                                                <p className="text-sm text-text-secondary">{item.content}</p>
                                            </div>
                                        </div>
                                        {isEditingMode && (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" icon={Edit2} onClick={() => handleCellClick(item.day, item.hour)} />
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            ))
                        )}
                    </div>
                )
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((mes) => {
                        const hasPlanning = Object.keys(currentCoursePlan).length > 0
                        return (
                            <Card key={mes} className="hover:shadow-md transition-all group overflow-hidden border-t-4 border-t-primary">
                                <CardBody className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-bold text-lg text-text-primary">{mes}</h3>
                                        <Calendar className="w-5 h-5 text-primary/40" />
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                                            <BookOpen className="w-4 h-4" />
                                            {course?.subjects[0] || 'Sin materia'}
                                        </div>
                                        <div className="min-h-[60px]">
                                            {hasPlanning ? (
                                                <div className="text-xs text-text-muted bg-bg-hover p-2 rounded-lg italic">
                                                    Contenidos planificados para este período...
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-text-muted/50 py-4">
                                                    <p className="text-xs">Sin planificación registrada</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <Badge variant={hasPlanning ? 'success' : 'neutral'}>
                                                {hasPlanning ? 'Con Plan' : 'Pendiente'}
                                            </Badge>
                                            <Button size="sm" variant="ghost" icon={Plus} onClick={() => setView('weekly')}>Ver Semanal</Button>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        )
                    })}
                </div>
            )}

            <Modal
                isOpen={!!editingCell}
                onClose={() => setEditingCell(null)}
                title={`Planificación: ${editingCell?.day} ${editingCell?.hour}`}
            >
                <div className="space-y-5 p-1">
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted font-medium uppercase tracking-wider">Horario Seleccionado</p>
                            <p className="text-sm font-bold text-primary">{editingCell?.day} a las {editingCell?.hour}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Contenido / Actividad
                        </label>
                        <Input
                            value={cellContent}
                            onChange={(e) => setCellContent(e.target.value)}
                            placeholder="Describa el tema o actividad a tratar..."
                            autoFocus
                            className="bg-bg-hover focus:bg-bg-card"
                        />
                        <p className="text-xs text-text-muted">
                            Materia(s): {course?.subjects.join(', ')}
                        </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
                        <Button
                            variant="danger"
                            icon={Trash2}
                            onClick={deleteCell}
                            disabled={!currentCoursePlan[`${editingCell?.day}_${editingCell?.hour}`]}
                        >
                            Cancelar Planificación
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setEditingCell(null)}>Cerrar</Button>
                            <Button onClick={saveCell} icon={Plus}>Guardar</Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

