import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Plus, Edit2, Trash2, BookOpen, Users } from 'lucide-react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Modal from '../../shared/components/Modal'
import Badge from '../../shared/components/Badge'
import { Input, Select } from '../../shared/components/Input'
import SearchBar from '../../shared/components/SearchBar'
import EmptyState from '../../shared/components/EmptyState'
import useCourseStore from '../../core/stores/useCourseStore'
import useStudentStore from '../../core/stores/useStudentStore'
import toast from 'react-hot-toast'

import ConfirmModal from '../../shared/components/ConfirmModal'

function CourseForm({ course, onSave, onCancel }) {
    const [form, setForm] = useState(course || {
        year: '', division: '', shift: '', cycle: '2026', subjects: [], teachers: ['Prof. García']
    })
    const [subjectInput, setSubjectInput] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave(form)
    }

    const addSubject = () => {
        if (subjectInput.trim()) {
            setForm({ ...form, subjects: [...form.subjects, subjectInput.trim()] })
            setSubjectInput('')
        }
    }

    const removeSubject = (idx) => {
        setForm({ ...form, subjects: form.subjects.filter((_, i) => i !== idx) })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    id="year" label="Año" value={form.year} placeholder="Seleccionar..."
                    options={[{ value: '1°', label: '1°' }, { value: '2°', label: '2°' }, { value: '3°', label: '3°' }, { value: '4°', label: '4°' }, { value: '5°', label: '5°' }, { value: '6°', label: '6°' }]}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
                <Input id="division" label="División" value={form.division} placeholder="Ej: A" onChange={(e) => setForm({ ...form, division: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    id="shift" label="Turno" value={form.shift} placeholder="Seleccionar..."
                    options={[{ value: 'Mañana', label: 'Mañana' }, { value: 'Tarde', label: 'Tarde' }, { value: 'Noche', label: 'Noche' }]}
                    onChange={(e) => setForm({ ...form, shift: e.target.value })}
                />
                <Input id="cycle" label="Ciclo Lectivo" value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })} />
            </div>
            {/* Subjects */}
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Materias</label>
                <div className="flex gap-2">
                    <input
                        value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)}
                        placeholder="Agregar materia..."
                        className="flex-1 px-3.5 py-2 rounded-lg border border-border text-sm bg-bg-card text-text-primary outline-none focus:border-primary"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubject() } }}
                    />
                    <Button type="button" variant="outline" size="md" onClick={addSubject}>+</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                    {form.subjects.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">
                            {s}
                            <button type="button" onClick={() => removeSubject(i)} className="hover:text-error cursor-pointer">×</button>
                        </span>
                    ))}
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">Guardar Curso</Button>
            </div>
        </form>
    )
}

export default function CoursesPage() {
    const { courses, addCourse, updateCourse, deleteCourse } = useCourseStore(useShallow((s) => ({ courses: s.courses, addCourse: s.addCourse, updateCourse: s.updateCourse, deleteCourse: s.deleteCourse })))
    const allStudents = useStudentStore((s) => s.students)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [editing, setEditing] = useState(null)

    const filtered = courses.filter((c) =>
        `${c.year} ${c.division} ${c.shift}`.toLowerCase().includes(search.toLowerCase())
    )

    const handleSave = (data) => {
        if (editing) {
            updateCourse(editing.id, data)
            toast.success('Curso actualizado')
        } else {
            addCourse(data)
            toast.success('Curso creado exitosamente')
        }
        setShowModal(false)
        setEditing(null)
    }

    const handleEdit = (course) => {
        setEditing(course)
        setShowModal(true)
    }

    const confirmDelete = () => {
        if (deletingId) {
            deleteCourse(deletingId)
            toast.success('Curso eliminado')
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Gestión de Cursos</h1>
                    <p className="text-sm text-text-secondary mt-1">{courses.length} cursos activos</p>
                </div>
                <Button icon={Plus} onClick={() => { setEditing(null); setShowModal(true) }}>Nuevo Curso</Button>
            </div>

            <SearchBar value={search} onChange={setSearch} placeholder="Buscar por año, división o turno..." />

            {filtered.length === 0 ? (
                <EmptyState icon={BookOpen} title="No hay cursos" description="Creá tu primer curso para comenzar." action={<Button icon={Plus} onClick={() => setShowModal(true)}>Crear Curso</Button>} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((course) => {
                        const studentCount = allStudents.filter((s) => s.courseId === course.id && s.status === 'active').length
                        return (
                            <Card key={course.id} hover>
                                <CardBody>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-text-primary">{course.year} "{course.division}"</h3>
                                            <p className="text-sm text-text-secondary">{course.shift} · Ciclo {course.cycle}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleEdit(course)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer">
                                                <Edit2 className="w-4 h-4 text-text-muted" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setDeletingId(course.id); setShowConfirm(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-error/10 transition-colors cursor-pointer">
                                                <Trash2 className="w-4 h-4 text-text-muted hover:text-error" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Users className="w-4 h-4 text-text-muted" />
                                        <span className="text-sm text-text-secondary">{studentCount} alumnos</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {course.subjects.map((s, i) => (
                                            <Badge key={i} variant="primary">{s}</Badge>
                                        ))}
                                    </div>
                                </CardBody>
                            </Card>
                        )
                    })}
                </div>
            )}

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Editar Curso' : 'Nuevo Curso'}>
                <CourseForm course={editing} onSave={handleSave} onCancel={() => { setShowModal(false); setEditing(null) }} />
            </Modal>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => { setShowConfirm(false); setDeletingId(null) }}
                onConfirm={confirmDelete}
                title="¿Eliminar curso?"
                description="¿Estás seguro de que querés eliminar este curso? Se perderá la vinculación con los alumnos asignados."
            />
        </div>
    )
}

