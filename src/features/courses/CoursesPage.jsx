import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Plus, Edit2, Trash2, BookOpen, Users } from 'lucide-react'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Modal from '../../shared/components/Modal'
import { X } from 'lucide-react'
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
    const [subjectToRemove, setSubjectToRemove] = useState(null)

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
        if (course) {
            setSubjectToRemove(idx)
        } else {
            setForm({ ...form, subjects: form.subjects.filter((_, i) => i !== idx) })
        }
    }

    const confirmRemoveSubject = () => {
        if (subjectToRemove !== null) {
            setForm({ ...form, subjects: form.subjects.filter((_, i) => i !== subjectToRemove) })
            setSubjectToRemove(null)
        }
    }

    return (
        <>
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
            <ConfirmModal
                isOpen={subjectToRemove !== null}
                onClose={() => setSubjectToRemove(null)}
                onConfirm={confirmRemoveSubject}
                title="¿Eliminar materia del curso?"
                description={`¿Estás seguro de que querés eliminar la materia "${subjectToRemove !== null ? form.subjects[subjectToRemove] : ''}" de este curso? Si ya cargaste notas para esta materia en este curso, podrían dejar de verse o quedar huérfanas.`}
            />
        </>
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
    const [viewingCourse, setViewingCourse] = useState(null)

    const filtered = courses.filter((c) =>
        `${c.year} ${c.division} ${c.shift}`.toLowerCase().includes(search.toLowerCase())
    )

    const totalSubjects = courses.reduce((acc, course) => acc + (course.subjects?.length || 0), 0)

    const handleSave = (data) => {
        if (editing) {
            updateCourse(editing.id, data)
            if (viewingCourse && viewingCourse.id === editing.id) setViewingCourse({ ...data, id: editing.id })
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
                    <h1 className="text-2xl font-bold text-text-primary">Gestión de Cursos y Materias</h1>
                    <p className="text-sm text-text-secondary mt-1">
                        {courses.length} cursos activos · {totalSubjects} materias activas
                    </p>
                </div>
                <Button icon={Plus} onClick={() => { setEditing(null); setShowModal(true) }}>Nuevo Curso</Button>
            </div>

            {viewingCourse ? (
                /* VISTA DETALLADA DEL CURSO */
                <div className="space-y-6 animate-fade-in-up">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setViewingCourse(null)}
                                className="w-10 h-10 rounded-full bg-bg-hover flex items-center justify-center hover:bg-border transition-colors cursor-pointer group"
                            >
                                <X className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
                            </button>
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                                    {viewingCourse.year} "{viewingCourse.division}"
                                    <Badge variant="neutral">{viewingCourse.shift}</Badge>
                                </h2>
                                <p className="text-sm text-text-secondary mt-1">
                                    Ciclo Lectivo {viewingCourse.cycle}
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" icon={Edit2} onClick={() => handleEdit(viewingCourse)}>
                            Editar Curso
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Tabla de Alumnos */}
                        <Card>
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <Users className="w-5 h-5 text-primary" />
                                    Alumnos Inscritos
                                </h3>
                                <Badge variant="primary">{allStudents.filter(s => s.courseId === viewingCourse.id && s.status === 'active').length}</Badge>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-bg-hover/50 text-text-muted">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Nombre Completo</th>
                                            <th className="px-4 py-3 font-medium text-right">DNI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allStudents.filter(s => s.courseId === viewingCourse.id && s.status === 'active').length > 0 ? (
                                            allStudents.filter(s => s.courseId === viewingCourse.id && s.status === 'active').map(student => (
                                                <tr key={student.id} className="border-b border-border-light hover:bg-bg-hover/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-text-primary">
                                                        {student.lastName}, {student.name}
                                                    </td>
                                                    <td className="px-4 py-3 text-text-secondary text-right font-mono">
                                                        {student.dni}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="2" className="px-4 py-8 text-center text-text-muted">
                                                    Ningún alumno inscrito en este curso.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Tabla de Materias */}
                        <Card>
                            <div className="p-4 border-b border-border flex items-center justify-between">
                                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-secondary" />
                                    Materias del Curso
                                </h3>
                                <Badge variant="secondary">{viewingCourse.subjects?.length || 0}</Badge>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-bg-hover/50 text-text-muted">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Materia</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingCourse.subjects && viewingCourse.subjects.length > 0 ? (
                                            viewingCourse.subjects.map((sub, idx) => (
                                                <tr key={idx} className="border-b border-border-light hover:bg-bg-hover/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-text-primary">
                                                        {sub}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td className="px-4 py-8 text-center text-text-muted">
                                                    El curso aún no tiene materias base cargadas.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                /* VISTA DE GRILLA (CARDS) */
                <>
                    <SearchBar value={search} onChange={setSearch} placeholder="Buscar por año, división o turno..." />

                    {filtered.length === 0 ? (
                        <EmptyState icon={BookOpen} title="No hay cursos" description="Creá tu primer curso para comenzar." action={<Button icon={Plus} onClick={() => setShowModal(true)}>Crear Curso</Button>} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map((course) => {
                                const studentCount = allStudents.filter((s) => s.courseId === course.id && s.status === 'active').length
                                return (
                                    <Card
                                        key={course.id}
                                        hover
                                        className="cursor-pointer group relative overflow-hidden"
                                        onClick={() => setViewingCourse(course)}
                                    >
                                        <CardBody>
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h3 className="text-lg font-bold text-text-primary">{course.year} "{course.division}"</h3>
                                                    <p className="text-sm text-text-secondary">{course.shift} · Ciclo {course.cycle}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(course) }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer z-10">
                                                        <Edit2 className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingId(course.id); setShowConfirm(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-error/10 transition-colors cursor-pointer z-10">
                                                        <Trash2 className="w-4 h-4 text-text-muted hover:text-error transition-colors" />
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
                </>
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

