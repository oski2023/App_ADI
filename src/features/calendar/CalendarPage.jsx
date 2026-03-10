import { useState, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Modal from '../../shared/components/Modal'
import Badge from '../../shared/components/Badge'
import Tabs from '../../shared/components/Tabs'
import { Input, Select, Textarea } from '../../shared/components/Input'
import useCalendarStore from '../../core/stores/useCalendarStore'
import { MONTHS_ES, DAYS_ES, EVENT_COLORS, EVENT_TYPES, NATIONAL_HOLIDAYS } from '../../core/constants'
import toast from 'react-hot-toast'

import ConfirmModal from '../../shared/components/ConfirmModal'

function EventForm({ event, onSave, onCancel }) {
    const [form, setForm] = useState(event || {
        type: 'otro', title: '', date: new Date().toISOString().split('T')[0], time: '', place: '', notes: '', students: []
    })

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-4">
            <Select
                id="eventType" label="Tipo de Evento" value={form.type}
                options={[
                    { value: 'feriado', label: '🔴 Feriado (Manual)' },
                    { value: 'plenaria', label: '🔵 Reunión de Plenaria' },
                    { value: 'padres', label: '🟢 Reunión de Padres' },
                    { value: 'examen', label: '🟠 Examen' },
                    { value: 'paro', label: '🟣 Paro Docente' },
                    { value: 'otro', label: '⚪ Otro' },
                ]}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
            <Input id="eventTitle" label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nombre del evento" />
            <div className="grid grid-cols-2 gap-4">
                <Input id="eventDate" type="date" label="Fecha" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <Input id="eventTime" type="time" label="Hora (opcional)" value={form.time || ''} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
            <Input id="eventPlace" label="Lugar (opcional)" value={form.place || ''} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="Ej: Sala de profesores" />
            <Textarea id="eventNotes" label="Notas" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Detalles adicionales..." />
            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">{event ? 'Guardar Cambios' : 'Crear Evento'}</Button>
            </div>
        </form>
    )
}

export default function CalendarPage() {
    const { events, addEvent, updateEvent, deleteEvent } = useCalendarStore(useShallow((s) => ({ events: s.events, addEvent: s.addEvent, updateEvent: s.updateEvent, deleteEvent: s.deleteEvent })))
    const [currentDate, setCurrentDate] = useState(new Date())
    const [view, setView] = useState('monthly')
    const [showModal, setShowModal] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [editing, setEditing] = useState(null)
    const [selectedDate, setSelectedDate] = useState(null)
    const eventsRef = useRef(null)

    // Append static holidays to dynamic events
    const allEvents = [
        ...events,
        ...NATIONAL_HOLIDAYS.map((h, i) => ({
            id: `holiday-${h.date}-${i}`,
            title: h.title,
            date: h.date,
            type: EVENT_TYPES.HOLIDAY,
            isStatic: true
        }))
    ]

    const handleDateClick = (dateStr) => {
        setSelectedDate(dateStr)
        if (window.innerWidth < 1024 && eventsRef.current) {
            eventsRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }

    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const monthEvents = allEvents.filter((e) => e.date.startsWith(monthPrefix))

    // Calendar grid
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()

    const calendarDays = []
    for (let i = firstDay - 1; i >= 0; i--) calendarDays.push({ day: prevMonthDays - i, current: false })
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push({ day: i, current: true })
    const remaining = 42 - calendarDays.length
    for (let i = 1; i <= remaining; i++) calendarDays.push({ day: i, current: false })

    const getDateStr = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isToday = (day) => {
        const today = new Date()
        return day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
    }

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

    const handleSave = (data) => {
        if (editing) { updateEvent(editing.id, data) } else { addEvent(data) }
        setShowModal(false); setEditing(null)
    }

    const confirmDelete = () => {
        if (deletingId) {
            deleteEvent(deletingId)
            toast.success('Evento eliminado')
            setDeletingId(null)
        }
    }

    const dayEvents = selectedDate ? allEvents.filter((e) => e.date === selectedDate) : []

    // Lógica para vista semanal
    const getWeekDays = () => {
        const start = new Date(currentDate)
        const day = start.getDay()
        const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Lunes como inicio
        start.setDate(diff)

        const days = []
        for (let i = 0; i < 7; i++) {
            const d = new Date(start)
            d.setDate(start.getDate() + i)
            days.push(d)
        }
        return days
    }

    const weekDays = getWeekDays()

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Agenda Docente</h1>
                    <p className="text-sm text-text-secondary mt-1">Calendario de eventos, feriados y reuniones</p>
                </div>
                <Button icon={Plus} onClick={() => { setEditing(null); setShowModal(true) }}>Nuevo Evento</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card className="lg:col-span-2">
                    <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => {
                                const newDate = new Date(currentDate)
                                view === 'monthly' ? newDate.setMonth(month - 1) : newDate.setDate(newDate.getDate() - 7)
                                setCurrentDate(newDate)
                            }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer">
                                <ChevronLeft className="w-4 h-4 text-text-secondary" />
                            </button>
                            <h2 className="text-lg font-semibold text-text-primary min-w-[200px] text-center">
                                {view === 'monthly'
                                    ? `${MONTHS_ES[month]} ${year}`
                                    : `Semana ${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${MONTHS_ES[weekDays[6].getMonth()]}`}
                            </h2>
                            <button onClick={() => {
                                const newDate = new Date(currentDate)
                                view === 'monthly' ? newDate.setMonth(month + 1) : newDate.setDate(newDate.getDate() + 7)
                                setCurrentDate(newDate)
                            }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer">
                                <ChevronRight className="w-4 h-4 text-text-secondary" />
                            </button>
                        </div>
                        <Tabs tabs={[{ value: 'monthly', label: 'Mensual' }, { value: 'weekly', label: 'Semanal' }]} activeTab={view} onChange={setView} />
                    </div>
                    <CardBody className="!p-4">
                        <div className="grid grid-cols-7 gap-px">
                            {DAYS_ES.map((d) => (
                                <div key={d} className="text-center text-xs font-semibold text-text-muted py-2">{d}</div>
                            ))}

                            {view === 'monthly' ? (
                                calendarDays.map((d, i) => {
                                    const dateStr = d.current ? getDateStr(d.day) : null
                                    const dayEvts = dateStr ? monthEvents.filter((e) => e.date === dateStr) : []
                                    const isSelected = dateStr === selectedDate

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => d.current && handleDateClick(dateStr)}
                                            className={`relative aspect-square p-1 rounded-xl text-sm transition-all duration-200 cursor-pointer flex flex-col items-center ${!d.current ? 'text-text-muted/40' :
                                                isSelected ? 'bg-primary text-white shadow-md' :
                                                    isToday(d.day) ? 'bg-primary/10 text-primary font-bold' :
                                                        'text-text-primary hover:bg-bg-hover'
                                                }`}
                                        >
                                            <span className="text-sm font-medium">{d.day}</span>
                                            {dayEvts.length > 0 && (
                                                <div className="flex gap-0.5 mt-auto mb-1">
                                                    {dayEvts.slice(0, 3).map((evt, j) => (
                                                        <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isSelected ? '#fff' : EVENT_COLORS[evt.type] }} />
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                    )
                                })
                            ) : (
                                weekDays.map((date, i) => {
                                    const dateStr = date.toISOString().split('T')[0]
                                    const dayEvts = allEvents.filter((e) => e.date === dateStr)
                                    const isSelected = dateStr === selectedDate
                                    const isTdy = dateStr === new Date().toISOString().split('T')[0]

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleDateClick(dateStr)}
                                            className={`relative aspect-square p-1 rounded-xl text-sm transition-all duration-200 cursor-pointer flex flex-col items-center h-32 ${isSelected ? 'bg-primary text-white shadow-md' :
                                                isTdy ? 'bg-primary/10 text-primary font-bold' :
                                                    'text-text-primary hover:bg-bg-hover'
                                                }`}
                                        >
                                            <span className="text-sm font-medium">{date.getDate()}</span>
                                            <div className="space-y-1 w-full mt-2">
                                                {dayEvts.slice(0, 3).map((evt, j) => (
                                                    <div key={j} className="text-[10px] truncate px-1 rounded" style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${EVENT_COLORS[evt.type]}20`, color: isSelected ? '#fff' : EVENT_COLORS[evt.type] }}>
                                                        {evt.title}
                                                    </div>
                                                ))}
                                            </div>
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </CardBody>
                </Card>

                {/* Events Sidebar */}
                <Card ref={eventsRef}>
                    <div className="px-5 py-4 border-b border-border-light">
                        <h3 className="text-base font-semibold text-text-primary">
                            {selectedDate
                                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                                : 'Próximos Eventos'}
                        </h3>
                    </div>
                    <CardBody className="!p-3 space-y-2 max-h-[500px] overflow-y-auto">
                        {(selectedDate ? dayEvents : allEvents.filter((e) => e.date >= new Date().toISOString().split('T')[0]).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8)).map((event) => (
                            <div key={event.id} className="p-3 rounded-xl hover:bg-bg-hover transition-colors group">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="w-1 h-full min-h-[40px] rounded-full shrink-0 mt-0.5" style={{ backgroundColor: EVENT_COLORS[event.type] }} />
                                        <div>
                                            <p className="text-sm font-medium text-text-primary">{event.title}</p>
                                            <p className="text-xs text-text-secondary mt-0.5">
                                                {!selectedDate && new Date(event.date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                                {event.time && ` · ${event.time}`}
                                            </p>
                                            {event.place && <p className="text-xs text-text-muted mt-0.5">📍 {event.place}</p>}
                                        </div>
                                    </div>
                                    {!event.isStatic && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditing(event); setShowModal(true) }} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-bg-active cursor-pointer">
                                                <Edit2 className="w-3.5 h-3.5 text-text-muted" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeletingId(event.id); setShowConfirm(true) }} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-error/10 cursor-pointer">
                                                <Trash2 className="w-3.5 h-3.5 text-text-muted hover:text-error" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(selectedDate ? dayEvents : []).length === 0 && selectedDate && (
                            <p className="text-sm text-text-muted text-center py-8">Sin eventos para este día</p>
                        )}
                    </CardBody>
                </Card>
            </div>

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Editar Evento' : 'Nuevo Evento'} size="md">
                <EventForm event={editing} onSave={handleSave} onCancel={() => { setShowModal(false); setEditing(null) }} />
            </Modal>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => { setShowConfirm(false); setDeletingId(null) }}
                onConfirm={confirmDelete}
                title="¿Eliminar evento?"
                description="¿Estás seguro de que querés eliminar este evento de tu agenda?"
            />
        </div>
    )
}

