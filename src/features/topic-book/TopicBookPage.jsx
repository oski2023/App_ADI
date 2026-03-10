import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { Plus, Edit2, Trash2, NotebookPen, FileText } from 'lucide-react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Modal from '../../shared/components/Modal'
import Badge from '../../shared/components/Badge'
import { Input, Select, Textarea } from '../../shared/components/Input'
import EmptyState from '../../shared/components/EmptyState'
import useTopicBookStore from '../../core/stores/useTopicBookStore'
import useCourseStore from '../../core/stores/useCourseStore'
import { DAYS_FULL_ES } from '../../core/constants'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

import ConfirmModal from '../../shared/components/ConfirmModal'
import { FileCheck, ShieldCheck } from 'lucide-react'

function EntryForm({ entry, courses, onSave, onCancel, defaultCourseId, defaultSubject }) {
    const [form, setForm] = useState(entry || {
        date: new Date().toISOString().split('T')[0],
        courseId: defaultCourseId || courses[0]?.id || '',
        subject: defaultSubject || '',
        topic: '',
        activity: '',
        homework: ''
    })

    const selectedCourse = courses.find((c) => c.id === form.courseId)

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Input id="topicDate" type="date" label="Fecha" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                <Select
                    id="topicCourse" label="Curso" value={form.courseId}
                    options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}"` }))}
                    onChange={(e) => setForm({ ...form, courseId: e.target.value, subject: '' })}
                />
            </div>
            <Select
                id="topicSubject" label="Materia" value={form.subject} placeholder="Seleccionar..."
                options={(selectedCourse?.subjects || []).map((s) => ({ value: s, label: s }))}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <Input id="topicTitle" label="Tema Desarrollado" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Ej: Números reales - Propiedades" />
            <Input id="topicActivity" label="Tipo de Actividad" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} placeholder="Ej: Clase teórica + ejercicios" />
            <Textarea id="topicHomework" label="Tareas Enviadas (opcional)" value={form.homework || ''} onChange={(e) => setForm({ ...form, homework: e.target.value })} placeholder="Ej: Ejercicios pág. 25-27" />
            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">{entry ? 'Guardar Cambios' : 'Registrar Tema'}</Button>
            </div>
        </form>
    )
}

export default function TopicBookPage() {
    const { entries, addEntry, updateEntry, deleteEntry } = useTopicBookStore(useShallow((s) => ({ entries: s.entries, addEntry: s.addEntry, updateEntry: s.updateEntry, deleteEntry: s.deleteEntry })))
    const courses = useCourseStore((s) => s.courses)
    const location = useLocation()

    const [selectedCourse, setSelectedCourse] = useState('')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [editing, setEditing] = useState(null)

    // Deep Linking: Capturar estado de navegación
    useEffect(() => {
        if (location.state?.courseId) {
            setSelectedCourse(location.state.courseId)
        }
        if (location.state?.subject) {
            setSelectedSubject(location.state.subject)
        }
    }, [location.state])

    const currentCourse = courses.find(c => c.id === selectedCourse)

    const filtered = entries
        .filter((e) => !selectedCourse || e.courseId === selectedCourse)
        .filter((e) => !selectedSubject || e.subject === selectedSubject)
        .filter((e) => !filterDate || e.date === filterDate)
        .sort((a, b) => b.date.localeCompare(a.date))

    const getCourseLabel = (id) => {
        const c = courses.find((c) => c.id === id)
        return c ? `${c.year} "${c.division}"` : '—'
    }

    const handleSave = (data) => {
        if (editing) { updateEntry(editing.id, data) } else { addEntry(data) }
        setShowModal(false); setEditing(null)
    }

    const confirmDelete = () => {
        if (deletingId) {
            deleteEntry(deletingId)
            toast.success('Registro eliminado')
            setDeletingId(null)
            setShowConfirm(false)
        }
    }

    const toggleSigned = (id) => {
        const entry = entries.find(e => e.id === id)
        if (entry) {
            updateEntry(id, { ...entry, signed: !entry.signed })
            toast.success(entry.signed ? 'Firma removida' : 'Tema firmado digitalmente')
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Libro de Temas</h1>
                    <p className="text-sm text-text-secondary mt-1 tracking-tight">Registro oficial de contenidos y actividades escolares</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" icon={FileText}>Reporte PDF</Button>
                    <Button icon={Plus} onClick={() => { setEditing(null); setShowModal(true) }}>Registrar Tema</Button>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center bg-bg-card p-4 rounded-2xl border border-border shadow-sm">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">CURSO</label>
                    <Select
                        value={selectedCourse} placeholder="Todos los cursos"
                        options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}" — ${c.shift}` }))}
                        onChange={(e) => {
                            setSelectedCourse(e.target.value)
                            setSelectedSubject('') // Reset subject when course changes
                        }}
                        className="w-64 !bg-bg-hover/50 !border-transparent focus:!border-primary/30"
                    />
                </div>
                {selectedCourse && (
                    <div className="flex flex-col gap-1 animate-fade-in-right">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">MATERIA</label>
                        <Select
                            value={selectedSubject} placeholder="Todas las materias"
                            options={(currentCourse?.subjects || []).map((s) => ({ value: s, label: s }))}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-64 !bg-bg-hover/50 !border-transparent focus:!border-primary/30"
                        />
                    </div>
                )}
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">FECHA ESPECÍFICA</label>
                    <Input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-48 !bg-bg-hover/50 !border-transparent focus:!border-primary/30"
                    />
                </div>
                {(selectedCourse || filterDate || selectedSubject) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-5 text-text-muted hover:text-primary"
                        onClick={() => {
                            setSelectedCourse('')
                            setFilterDate('')
                            setSelectedSubject('')
                        }}
                    >
                        Limpiar Filtros
                    </Button>
                )}
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    icon={NotebookPen}
                    title={selectedSubject ? `No hay clases de ${selectedSubject}` : "Sin registros"}
                    description={selectedSubject
                        ? `Aún no has registrado ningún tema desarrollado para ${selectedSubject} en ${getCourseLabel(selectedCourse)}.`
                        : "Todavía no hay temas registrados para los filtros seleccionados."}
                    action={<Button icon={Plus} onClick={() => setShowModal(true)}>Registrar Primera Clase</Button>}
                />
            ) : (
                <div className="space-y-4">
                    {filtered.map((entry) => (
                        <Card key={entry.id} hover className={`border-l-4 transition-all ${entry.signed ? 'border-l-success' : 'border-l-warning'}`}>
                            <CardBody className="!p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex gap-6 items-start flex-1 min-w-0">
                                        <div className="text-center bg-bg-hover rounded-2xl px-4 py-3 shrink-0 border border-border-light shadow-sm">
                                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-tighter">
                                                {new Date(entry.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' })}
                                            </p>
                                            <p className="text-2xl font-black text-text-primary leading-none my-1">{new Date(entry.date + 'T12:00:00').getDate()}</p>
                                            <p className="text-[10px] text-primary font-bold uppercase">
                                                {new Date(entry.date + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short' })}
                                            </p>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-text-primary truncate">{entry.topic}</h3>
                                                {entry.signed && (
                                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold border border-success/20">
                                                        <ShieldCheck className="w-3 h-3" />
                                                        FIRMADO
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm text-text-secondary leading-relaxed">{entry.activity}</p>
                                            <div className="flex flex-wrap gap-2 mt-4">
                                                <Badge variant="primary" className="!rounded-lg">{entry.subject}</Badge>
                                                <Badge variant="neutral" className="!rounded-lg">{getCourseLabel(entry.courseId)}</Badge>
                                            </div>
                                            {entry.homework && (
                                                <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                                                    <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Tarea Encomendada</p>
                                                        <p className="text-sm text-text-primary italic opacity-80">"{entry.homework}"</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <div className="flex gap-1 justify-end">
                                            <button onClick={() => { setEditing(entry); setShowModal(true) }} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer border border-border">
                                                <Edit2 className="w-4 h-4 text-text-muted" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeletingId(entry.id); setShowConfirm(true) }} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-error/10 transition-colors cursor-pointer border border-border">
                                                <Trash2 className="w-4 h-4 text-text-muted hover:text-error" />
                                            </button>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant={entry.signed ? 'outline' : 'primary'}
                                            icon={entry.signed ? ShieldCheck : FileCheck}
                                            onClick={() => toggleSigned(entry.id)}
                                            className="w-full !text-[10px] !py-1.5"
                                        >
                                            {entry.signed ? 'Remover Firma' : 'Firmar Registro'}
                                        </Button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Editar Registro' : 'Registrar Tema'} size="lg">
                <EntryForm
                    entry={editing}
                    courses={courses}
                    onSave={handleSave}
                    onCancel={() => { setShowModal(false); setEditing(null) }}
                    defaultCourseId={selectedCourse}
                    defaultSubject={selectedSubject}
                />
            </Modal>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => { setShowConfirm(false); setDeletingId(null) }}
                onConfirm={confirmDelete}
                title="¿Eliminar registro?"
                description="¿Estás seguro de que querés eliminar este tema del libro? Esta acción no se puede deshacer."
            />
        </div>
    )
}

