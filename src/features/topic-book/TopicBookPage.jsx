import { useState } from 'react'
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
import toast from 'react-hot-toast'

import ConfirmModal from '../../shared/components/ConfirmModal'

function EntryForm({ entry, courses, onSave, onCancel }) {
    const course = courses.find((c) => c.id === (entry?.courseId || ''))
    const [form, setForm] = useState(entry || {
        date: new Date().toISOString().split('T')[0], courseId: courses[0]?.id || '', subject: '', topic: '', activity: '', homework: ''
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
    const [selectedCourse, setSelectedCourse] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [editing, setEditing] = useState(null)

    const filtered = selectedCourse
        ? entries.filter((e) => e.courseId === selectedCourse).sort((a, b) => b.date.localeCompare(a.date))
        : entries.sort((a, b) => b.date.localeCompare(a.date))

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
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Libro de Temas</h1>
                    <p className="text-sm text-text-secondary mt-1">Registro de temas y actividades por clase</p>
                </div>
                <Button icon={Plus} onClick={() => { setEditing(null); setShowModal(true) }}>Registrar Tema</Button>
            </div>

            <Select
                value={selectedCourse} placeholder="Todos los cursos"
                options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}" — ${c.shift}` }))}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-64"
            />

            {filtered.length === 0 ? (
                <EmptyState icon={NotebookPen} title="Sin registros" description="Registrá el primer tema del libro." action={<Button icon={Plus} onClick={() => setShowModal(true)}>Registrar Tema</Button>} />
            ) : (
                <div className="space-y-3">
                    {filtered.map((entry) => (
                        <Card key={entry.id} hover>
                            <CardBody className="!p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4 items-start">
                                        <div className="text-center bg-primary/10 rounded-xl px-3 py-2 shrink-0">
                                            <p className="text-xs text-primary font-semibold">
                                                {new Date(entry.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase()}
                                            </p>
                                            <p className="text-xl font-bold text-primary">{new Date(entry.date + 'T12:00:00').getDate()}</p>
                                            <p className="text-[10px] text-primary">
                                                {new Date(entry.date + 'T12:00:00').toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()}
                                            </p>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-semibold text-text-primary">{entry.topic}</h3>
                                            <p className="text-sm text-text-secondary mt-0.5">{entry.activity}</p>
                                            <div className="flex gap-2 mt-2">
                                                <Badge variant="primary">{entry.subject}</Badge>
                                                <Badge variant="neutral">{getCourseLabel(entry.courseId)}</Badge>
                                            </div>
                                            {entry.homework && (
                                                <div className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary">
                                                    <FileText className="w-3.5 h-3.5" />
                                                    Tarea: {entry.homework}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => { setEditing(entry); setShowModal(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer">
                                            <Edit2 className="w-4 h-4 text-text-muted" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeletingId(entry.id); setShowConfirm(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-error/10 transition-colors cursor-pointer">
                                            <Trash2 className="w-4 h-4 text-text-muted hover:text-error" />
                                        </button>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Editar Registro' : 'Registrar Tema'} size="lg">
                <EntryForm entry={editing} courses={courses} onSave={handleSave} onCancel={() => { setShowModal(false); setEditing(null) }} />
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

