import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import useAuthStore from '../../core/stores/useAuthStore'
import toast from 'react-hot-toast'
import { CalendarDays, GraduationCap, ChevronRight, TrendingUp } from 'lucide-react'

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
    const navigate = useNavigate()
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
            setShowConfirm(false)
        }
    }

    const { user } = useAuthStore.getState()
    const totalStudents = allStudents.filter(s => s.status === 'active').length
    const avgStudents = courses.length ? (totalStudents / courses.length).toFixed(1) : 0

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Background Glow Decorations */}
            <div className="fixed top-40 right-10 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none" />
            <div className="fixed bottom-10 left-10 w-[300px] h-[300px] bg-secondary/5 blur-[80px] rounded-full -z-10 pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/10">
                <div className="relative">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-full hidden md:block" />
                    <h1 className="text-4xl font-black text-text-primary tracking-tight">
                        Gestión de <span className="text-primary">Cursos</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary font-medium uppercase tracking-wider">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        <span>{courses.length} Cursos Activos</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-border mx-1" />
                        <span>Ciclo Lectivo 2026</span>
                    </div>
                </div>
                {!viewingCourse && (
                    <Button
                        icon={Plus}
                        onClick={() => { setEditing(null); setShowModal(true) }}
                        className="shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                    >
                        Nuevo Curso
                    </Button>
                )}
            </div>

            {/* Stats Summary (Mini Metrics) */}
            {!viewingCourse && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-primary/10 to-transparent border border-white/10 shadow-sm backdrop-blur-sm">
                        <div className="bg-bg-card/50 rounded-[22px] p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-text-primary leading-none">{totalStudents}</p>
                                <p className="text-[10px] font-bold text-text-muted mt-1 uppercase tracking-widest">Total Alumnos</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-secondary/10 to-transparent border border-white/10 shadow-sm backdrop-blur-sm">
                        <div className="bg-bg-card/50 rounded-[22px] p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-secondary text-white flex items-center justify-center shadow-lg shadow-secondary/20">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-text-primary leading-none">{totalSubjects}</p>
                                <p className="text-[10px] font-bold text-text-muted mt-1 uppercase tracking-widest">Materias Totales</p>
                            </div>
                        </div>
                    </div>
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-warning/10 to-transparent border border-white/10 shadow-sm backdrop-blur-sm">
                        <div className="bg-bg-card/50 rounded-[22px] p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-warning text-white flex items-center justify-center shadow-lg shadow-warning/20">
                                <TrendingUp className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-text-primary leading-none">{avgStudents}</p>
                                <p className="text-[10px] font-bold text-text-muted mt-1 uppercase tracking-widest">Promedio Alumnos/Curso</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewingCourse ? (
                /* VISTA DETALLADA DEL CURSO */
                <div className="space-y-8 animate-slide-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-3xl bg-bg-card border border-border shadow-xl shadow-black/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -tr-1/4 group-hover:bg-primary/10 transition-colors duration-700 pointer-events-none" />

                        <div className="flex items-center gap-6 relative z-10">
                            <button
                                onClick={() => setViewingCourse(null)}
                                className="w-12 h-12 rounded-2xl bg-bg-hover flex items-center justify-center hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer shadow-sm border border-border group"
                            >
                                <X className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-3xl font-black text-text-primary tracking-tight">
                                        {viewingCourse.year} "{viewingCourse.division}"
                                    </h2>
                                    <Badge variant="primary" className="!px-3 !py-1 !text-xs !rounded-xl">{viewingCourse.shift}</Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary font-medium">
                                    <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> Ciclo {viewingCourse.cycle}</span>
                                    <span className="w-1 h-1 rounded-full bg-border" />
                                    <span>Sistema Educativo ADI</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 relative z-10">
                            <Button variant="outline" icon={Edit2} onClick={() => handleEdit(viewingCourse)} className="!rounded-2xl">
                                Editar Datos
                            </Button>
                            <Button variant="danger" icon={Trash2} onClick={() => { setDeletingId(viewingCourse.id); setShowConfirm(true) }} className="!rounded-2xl">
                                Eliminar
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Tabla de Alumnos */}
                        <Card className="border-none shadow-xl shadow-black/5 overflow-hidden !rounded-3xl">
                            <div className="p-6 border-b border-border/50 bg-gradient-to-r from-bg-card to-primary/5 flex items-center justify-between">
                                <h3 className="text-lg font-black text-text-primary flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    Inscripciones Activas
                                </h3>
                                <Badge variant="primary" className="!rounded-lg !px-3 font-black">
                                    {allStudents.filter(s => s.courseId === viewingCourse.id && s.status === 'active').length}
                                </Badge>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-separate border-spacing-0">
                                    <thead className="bg-bg-hover/30 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4 border-b border-border/50">Nombre Completo</th>
                                            <th className="px-6 py-4 border-b border-border/50 text-right">DNI / Identificación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {allStudents.filter(s => s.courseId === viewingCourse.id && s.status === 'active').length > 0 ? (
                                            allStudents.filter(s => s.courseId === viewingCourse.id && s.status === 'active').map(student => (
                                                <tr key={student.id} className="hover:bg-primary/5 transition-colors group">
                                                    <td className="px-6 py-4 font-bold text-text-primary flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] group-hover:bg-primary group-hover:text-white transition-all">
                                                            {student.lastName[0]}{student.name[0]}
                                                        </div>
                                                        {student.lastName}, {student.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-text-secondary text-right font-mono text-xs font-bold opacity-70">
                                                        {student.dni}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="2" className="px-6 py-12 text-center text-text-primary/40 font-medium italic">
                                                    <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                    No hay alumnos registrados en este curso
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Tabla de Materias */}
                        <Card className="border-none shadow-xl shadow-black/5 overflow-hidden !rounded-3xl">
                            <div className="p-6 border-b border-border/50 bg-gradient-to-r from-bg-card to-secondary/5 flex items-center justify-between">
                                <h3 className="text-lg font-black text-text-primary flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    Plan de Materias
                                </h3>
                                <Badge variant="secondary" className="!rounded-lg !px-3 font-black">
                                    {viewingCourse.subjects?.length || 0}
                                </Badge>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm border-separate border-spacing-0">
                                    <thead className="bg-bg-hover/30 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4 border-b border-border/50">Materia / Disciplina</th>
                                            <th className="px-6 py-4 border-b border-border/50 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {viewingCourse.subjects && viewingCourse.subjects.length > 0 ? (
                                            viewingCourse.subjects.map((sub, idx) => (
                                                <tr key={idx} className="hover:bg-secondary/5 transition-colors group">
                                                    <td className="px-6 py-4 font-bold text-text-primary flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-secondary group-hover:scale-150 transition-transform" />
                                                        {sub}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => navigate('/topic-book', {
                                                                state: {
                                                                    courseId: viewingCourse.id,
                                                                    subject: sub
                                                                }
                                                            })}
                                                            className="text-[10px] font-bold text-text-muted hover:text-primary tracking-widest uppercase cursor-pointer transition-colors"
                                                        >
                                                            Ver Detalles
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="2" className="px-6 py-12 text-center text-text-primary/40 font-medium italic">
                                                    <Info className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                    Sin materias asignadas para este ciclo
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((course) => {
                                const studentCount = allStudents.filter((s) => s.courseId === course.id && s.status === 'active').length
                                return (
                                    <Card
                                        key={course.id}
                                        hover
                                        className="cursor-pointer group relative overflow-hidden border-none bg-gradient-to-br from-bg-card to-primary/5 shadow-xl shadow-black/5 !rounded-3xl hover:-translate-y-2 !transition-all duration-500"
                                        onClick={() => setViewingCourse(course)}
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -tr-1/4 group-hover:scale-150 transition-transform duration-700" />
                                        <CardBody className="!p-6 relative z-10">
                                            <div className="flex items-start justify-between mb-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-6 transition-all duration-500 font-black text-xl">
                                                        {course.year}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-text-primary tracking-tight leading-none">División "{course.division}"</h3>
                                                        <p className="text-[10px] font-bold text-text-muted mt-2 uppercase tracking-widest">{course.shift} · Ciclo {course.cycle}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(course) }} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-bg-hover shadow-sm border border-border/50 hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer z-10">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setDeletingId(course.id); setShowConfirm(true) }} className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-bg-hover shadow-sm border border-border/50 hover:bg-error hover:text-white transition-all duration-300 cursor-pointer z-10">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between pb-3 border-b border-border-light">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-primary" />
                                                        <span className="text-sm font-bold text-text-primary">{studentCount}</span>
                                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Alumnos</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4 text-secondary" />
                                                        <span className="text-sm font-bold text-text-primary">{course.subjects.length}</span>
                                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Materias</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {course.subjects.slice(0, 3).map((s, i) => (
                                                        <Badge key={i} variant="neutral" className="!bg-bg-hover !text-[10px] !rounded-lg !px-2 font-bold opacity-80">{s}</Badge>
                                                    ))}
                                                    {course.subjects.length > 3 && (
                                                        <Badge variant="neutral" className="!bg-bg-hover !text-[10px] !rounded-lg !px-2 font-bold opacity-80">+{course.subjects.length - 3}</Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-6 flex items-center justify-center w-full py-2.5 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest gap-2 group-hover:gap-4 transition-all duration-500 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0">
                                                Ver Detalles <ChevronRight className="w-4 h-4" />
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

