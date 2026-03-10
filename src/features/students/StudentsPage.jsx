import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Plus, Edit2, Trash2, Upload, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Modal from '../../shared/components/Modal'
import Badge from '../../shared/components/Badge'
import { Input, Select } from '../../shared/components/Input'
import SearchBar from '../../shared/components/SearchBar'
import EmptyState from '../../shared/components/EmptyState'
import useStudentStore from '../../core/stores/useStudentStore'
import useCourseStore from '../../core/stores/useCourseStore'
import useAttendanceStore from '../../core/stores/useAttendanceStore'
import toast from 'react-hot-toast'

import ConfirmModal from '../../shared/components/ConfirmModal'
import { formatName, formatDNI, formatPhone } from '../../utils/stringUtils'

function StudentForm({ student, courses, onSave, onCancel }) {
    const [form, setForm] = useState(student || {
        name: '', lastName: '', dni: '', birthDate: '', phone: '', tutorEmail: '', courseId: '', photo: null
    })
    const [errors, setErrors] = useState({})

    const validate = () => {
        const errs = {}
        if (!form.name.trim()) errs.name = 'El nombre es obligatorio'
        if (!form.lastName.trim()) errs.lastName = 'El apellido es obligatorio'
        if (!form.dni.trim()) errs.dni = 'El DNI es obligatorio'
        else if (form.dni.length !== 8) errs.dni = 'El DNI debe tener 8 dígitos'
        if (!form.courseId) errs.courseId = 'Seleccione un curso'
        return errs
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }
        onSave(form)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="name" label="Nombre" value={form.name} error={errors.name} onChange={(e) => setForm({ ...form, name: formatName(e.target.value) })} placeholder="Nombre del alumno" />
                <Input id="lastName" label="Apellido" value={form.lastName} error={errors.lastName} onChange={(e) => setForm({ ...form, lastName: formatName(e.target.value) })} placeholder="Apellido del alumno" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="dni" label="DNI / ID" value={form.dni} error={errors.dni} onChange={(e) => setForm({ ...form, dni: formatDNI(e.target.value) })} placeholder="Nro. de documento" />
                <Input id="birthDate" type="date" label="Fecha de Nacimiento" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input id="phone" label="Teléfono de Contacto" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="Ej: 011-15-5588-6248" />
                <Input id="tutorEmail" label="Email del Tutor" type="email" value={form.tutorEmail} onChange={(e) => setForm({ ...form, tutorEmail: e.target.value.toLowerCase() })} placeholder="tutor@email.com" />
            </div>
            <Select
                id="courseId" label="Curso" value={form.courseId} error={errors.courseId} placeholder="Seleccionar curso..."
                options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}" — ${c.shift}` }))}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            />
            <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                <Button type="submit">{student ? 'Guardar Cambios' : 'Registrar Alumno'}</Button>
            </div>
        </form>
    )
}

function StudentProfile({ student, courses, onClose }) {
    const records = useAttendanceStore((s) => s.records)
    const computeSummary = (sid) => {
        let present = 0, absent = 0, late = 0
        Object.values(records).forEach((dr) => {
            if (dr[sid] === 'P') present++; else if (dr[sid] === 'A') absent++; else if (dr[sid] === 'T') late++
        })
        const total = present + absent + late
        return { present, absent, late, total, percentage: total > 0 ? Math.round((present / total) * 100) : 100 }
    }
    const attendance = computeSummary(student.id)
    const course = courses.find((c) => c.id === student.courseId)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-xl font-bold">
                    {student.name[0]}{student.lastName[0]}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-text-primary">{student.lastName}, {student.name}</h3>
                    <p className="text-sm text-text-secondary">{course ? `${course.year} "${course.division}" · ${course.shift}` : 'Sin curso'}</p>
                    <Badge variant="success" className="mt-1">Activo</Badge>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-bg-hover">
                    <p className="text-xs text-text-muted">DNI</p>
                    <p className="text-sm font-medium text-text-primary">{student.dni}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-hover">
                    <p className="text-xs text-text-muted">Fecha de Nacimiento</p>
                    <p className="text-sm font-medium text-text-primary">{student.birthDate || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-hover">
                    <p className="text-xs text-text-muted">Teléfono</p>
                    <p className="text-sm font-medium text-text-primary">{student.phone || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-bg-hover">
                    <p className="text-xs text-text-muted">Email Tutor</p>
                    <p className="text-sm font-medium text-text-primary">{student.tutorEmail || '—'}</p>
                </div>
            </div>
            <div>
                <h4 className="text-sm font-semibold text-text-primary mb-3">Resumen de Asistencia</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg bg-secondary/10">
                        <p className="text-2xl font-bold text-secondary">{attendance.present}</p>
                        <p className="text-xs text-text-secondary">Presentes</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-error/10">
                        <p className="text-2xl font-bold text-error">{attendance.absent}</p>
                        <p className="text-xs text-text-secondary">Ausentes</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-warning/10">
                        <p className="text-2xl font-bold text-warning">{attendance.late}</p>
                        <p className="text-xs text-text-secondary">Tardanzas</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                        <p className="text-2xl font-bold text-primary">{attendance.percentage}%</p>
                        <p className="text-xs text-text-secondary">Asistencia</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function StudentsPage() {
    const { students, addStudent, updateStudent, deleteStudent, importStudentsCSV } = useStudentStore(useShallow((s) => ({ students: s.students, addStudent: s.addStudent, updateStudent: s.updateStudent, deleteStudent: s.deleteStudent, importStudentsCSV: s.importStudentsCSV })))
    const courses = useCourseStore((s) => s.courses)
    const [search, setSearch] = useState('')
    const [filterCourse, setFilterCourse] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showProfile, setShowProfile] = useState(null)
    const [showConfirm, setShowConfirm] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [editing, setEditing] = useState(null)
    const [page, setPage] = useState(1)
    const perPage = 10

    const activeStudents = students.filter((s) => s.status === 'active')
    const filtered = activeStudents.filter((s) => {
        const matchSearch = `${s.name} ${s.lastName} ${s.dni}`.toLowerCase().includes(search.toLowerCase())
        const matchCourse = !filterCourse || s.courseId === filterCourse
        return matchSearch && matchCourse
    })

    const totalPages = Math.ceil(filtered.length / perPage)
    const paginated = filtered.slice((page - 1) * perPage, page * perPage)

    const handleSave = (data) => {
        // Validación de DNI Único
        const isDuplicate = activeStudents.some(s => s.dni === data.dni && (!editing || s.id !== editing.id))

        if (isDuplicate) {
            toast.error(`Ya existe un alumno activo con el DNI ${data.dni}`)
            return
        }

        if (editing) {
            updateStudent(editing.id, data)
            toast.success('Alumno actualizado exitosamente')
        } else {
            addStudent(data)
            toast.success('Alumno registrado con éxito')
        }
        setShowModal(false); setEditing(null)
    }

    const confirmDelete = () => {
        if (deletingId) {
            deleteStudent(deletingId)
            toast.success('Alumno dado de baja')
            setDeletingId(null)
        }
    }

    const handleCSVImport = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const lines = ev.target.result.split('\n').filter(Boolean)
            const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
            const imported = lines.slice(1).map((line) => {
                const values = line.split(',')
                const obj = {}
                header.forEach((h, i) => { obj[h] = values[i]?.trim() || '' })
                return { name: obj.nombre || obj.name, lastName: obj.apellido || obj.lastname, dni: obj.dni || obj.id, birthDate: obj.fechanacimiento || '', phone: obj.telefono || '', tutorEmail: obj.emailtutor || '' }
            }).filter((s) => s.name && s.lastName)

            // Validación de DNI Único en importación masiva
            const existingDnis = new Set(activeStudents.map(s => s.dni))
            const uniqueImported = []
            let duplicatesCount = 0

            for (const s of imported) {
                if (s.dni && existingDnis.has(s.dni)) {
                    duplicatesCount++
                } else {
                    uniqueImported.push(s)
                    if (s.dni) existingDnis.add(s.dni)
                }
            }

            if (uniqueImported.length > 0) {
                importStudentsCSV(uniqueImported, filterCourse || courses[0]?.id || '')
                toast.success(`Se importaron ${uniqueImported.length} alumnos correctamente`)
            }
            if (duplicatesCount > 0) {
                toast.error(`Se omitieron ${duplicatesCount} alumnos por DNI duplicado`)
            }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    const getCourseLabel = (id) => {
        const c = courses.find((c) => c.id === id)
        return c ? `${c.year} "${c.division}"` : '—'
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Gestión de Alumnos</h1>
                    <p className="text-sm text-text-secondary mt-1">{activeStudents.length} alumnos activos</p>
                </div>
                <div className="flex gap-3">
                    <label>
                        <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
                        <Button variant="outline" icon={Upload} onClick={() => { }} className="cursor-pointer" as="span">Importar CSV</Button>
                    </label>
                    <Button icon={Plus} onClick={() => { setEditing(null); setShowModal(true) }}>Nuevo Alumno</Button>
                </div>
            </div>

            <div className="flex gap-4 items-center">
                <SearchBar value={search} onChange={setSearch} placeholder="Buscar por nombre, apellido o DNI..." className="flex-1" />
                <Select
                    value={filterCourse} placeholder="Todos los cursos"
                    options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}"` }))}
                    onChange={(e) => { setFilterCourse(e.target.value); setPage(1) }}
                    className="w-48"
                />
            </div>

            {filtered.length === 0 ? (
                <EmptyState icon={Search} title="No se encontraron alumnos" description={search ? 'Intentá con otros términos de búsqueda.' : 'Registrá tu primer alumno o importá desde CSV.'} />
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto w-full pb-2">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="border-b border-border bg-bg-hover/50">
                                    <th className="text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-3 whitespace-nowrap">Alumno</th>
                                    <th className="text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-3 whitespace-nowrap">DNI</th>
                                    <th className="text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-3 whitespace-nowrap">Curso</th>
                                    <th className="text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-3 whitespace-nowrap">Contacto</th>
                                    <th className="text-right text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-3 whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((student) => (
                                    <tr key={student.id} className="border-b border-border-light hover:bg-bg-hover transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                    {student.name[0]}{student.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-text-primary">{student.lastName}, {student.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-sm text-text-secondary">{student.dni}</td>
                                        <td className="px-5 py-3">
                                            <Badge variant="neutral">{getCourseLabel(student.courseId)}</Badge>
                                        </td>
                                        <td className="px-5 py-3 text-sm text-text-secondary">{student.tutorEmail || '—'}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => setShowProfile(student)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer" title="Ver perfil">
                                                    <Eye className="w-4 h-4 text-text-muted" />
                                                </button>
                                                <button onClick={() => { setEditing(student); setShowModal(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer" title="Editar">
                                                    <Edit2 className="w-4 h-4 text-text-muted" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setDeletingId(student.id); setShowConfirm(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-error/10 transition-colors cursor-pointer" title="Dar de baja">
                                                    <Trash2 className="w-4 h-4 text-text-muted hover:text-error" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                            <p className="text-sm text-text-secondary">Mostrando {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} de {filtered.length}</p>
                            <div className="flex gap-1">
                                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-medium cursor-pointer ${p === page ? 'bg-primary text-white' : 'hover:bg-bg-hover text-text-secondary'}`}>{p}</button>
                                ))}
                                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditing(null) }} title={editing ? 'Editar Alumno' : 'Registrar Alumno'} size="lg">
                <StudentForm student={editing} courses={courses} onSave={handleSave} onCancel={() => { setShowModal(false); setEditing(null) }} />
            </Modal>

            <Modal isOpen={!!showProfile} onClose={() => setShowProfile(null)} title="Perfil del Alumno" size="lg">
                {showProfile && <StudentProfile student={showProfile} courses={courses} onClose={() => setShowProfile(null)} />}
            </Modal>

            <ConfirmModal
                isOpen={showConfirm}
                onClose={() => { setShowConfirm(false); setDeletingId(null) }}
                onConfirm={confirmDelete}
                title="¿Dar de baja alumno?"
                description="¿Estás seguro de que querés dar de baja a este alumno? Sus datos históricos se mantendrán pero ya no aparecerá en las listas activas."
                confirmLabel="Confirmar Baja"
            />
        </div>
    )
}

