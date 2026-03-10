import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Plus, Edit2, Trash2, Upload, Eye, Search, ChevronLeft, ChevronRight, GraduationCap, Users, UserPlus, FileSpreadsheet, Mail, Phone, Calendar, Hash, Info, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react'
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
import useGradeStore from '../../core/stores/useGradeStore'
import useSettingsStore from '../../core/stores/useSettingsStore'
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
    const passingGrade = useSettingsStore((s) => s.settings.passingGrade)

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
        <div className="space-y-8 pb-4">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-primary/20 group-hover:scale-105 transition-transform duration-500">
                        {student.name[0]}{student.lastName[0]}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-bg-card border-2 border-primary flex items-center justify-center shadow-lg">
                        <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                </div>
                <div className="text-center sm:text-left">
                    <h3 className="text-3xl font-black text-text-primary tracking-tight leading-tight">{student.lastName}, {student.name}</h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                        <Badge variant="primary" className="!rounded-lg !px-3 !py-1 font-bold uppercase tracking-widest text-[10px]">
                            {course ? `${course.year} "${course.division}"` : 'Sin asignar'}
                        </Badge>
                        <Badge variant="success" className="!rounded-lg !px-3 font-bold uppercase tracking-widest text-[10px]">Activo</Badge>
                        <span className="text-xs font-bold text-text-muted flex items-center gap-1.5 ml-1">
                            <Hash className="w-3.5 h-3.5" /> DNI {student.dni}
                        </span>
                    </div>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-bg-hover/50 border border-border/50 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors" />
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Nacimiento</p>
                    </div>
                    <p className="text-sm font-black text-text-primary pl-6">{student.birthDate || '—'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-bg-hover/50 border border-border/50 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3 mb-1">
                        <Phone className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors" />
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Teléfono</p>
                    </div>
                    <p className="text-sm font-black text-text-primary pl-6">{student.phone || '—'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-bg-hover/50 border border-border/50 col-span-1 sm:col-span-2 group hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-3 mb-1">
                        <Mail className="w-3.5 h-3.5 text-text-muted group-hover:text-primary transition-colors" />
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Email Tutor</p>
                    </div>
                    <p className="text-sm font-black text-text-primary pl-6 truncate">{student.tutorEmail || '—'}</p>
                </div>
            </div>

            {/* Stats Dashboard */}
            <Card className="!rounded-3xl border-none shadow-xl shadow-black/5 bg-gradient-to-br from-bg-card to-bg-hover overflow-hidden">
                <CardHeader className="!border-none pb-0">
                    <h4 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-secondary" /> Rendimiento General
                    </h4>
                </CardHeader>
                <CardBody className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="relative pl-4 border-l-2 border-secondary/30">
                        <p className="text-2xl font-black text-secondary leading-none">{attendance.percentage}%</p>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Asistencia</p>
                    </div>
                    <div className="relative pl-4 border-l-2 border-primary/30">
                        <p className="text-2xl font-black text-primary leading-none">{attendance.present}</p>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Presentes</p>
                    </div>
                    <div className="relative pl-4 border-l-2 border-error/30">
                        <p className="text-2xl font-black text-error leading-none">{attendance.absent}</p>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Faltas</p>
                    </div>
                    <div className="relative pl-4 border-l-2 border-warning/30">
                        <p className="text-2xl font-black text-warning leading-none">{attendance.late}</p>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">Retrasos</p>
                    </div>
                </CardBody>
            </Card>

            {/* Academic Detail */}
            <div>
                <Card className="!rounded-3xl border border-border/50 overflow-hidden shadow-sm">
                    <CardHeader className="bg-bg-hover/30 !py-4">
                        <h4 className="text-sm font-black text-text-primary tracking-tight flex items-center gap-2">
                            <Info className="w-4 h-4 text-primary" /> Desglose por Materias
                        </h4>
                    </CardHeader>
                    {course ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-separate border-spacing-0">
                                <thead className="bg-bg-hover/10 text-[10px] font-black text-text-muted uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-3 border-b border-border/30">Materia</th>
                                        <th className="px-6 py-3 border-b border-border/30 text-center">Promedio</th>
                                        <th className="px-6 py-3 border-b border-border/30 text-right">Situación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {course.subjects.map((subName, i) => {
                                        const gradeStore = useGradeStore.getState()
                                        const subObj = gradeStore.subjects.find(s => s.name === subName && s.year === course.year)
                                        if (!subObj) {
                                            return (
                                                <tr key={i} className="hover:bg-bg-hover/20 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-text-secondary">{subName}</td>
                                                    <td className="px-6 py-4 text-center text-text-muted font-black">—</td>
                                                    <td className="px-6 py-4 text-right"><Badge variant="neutral" className="!rounded-lg text-[9px]">PENDIENTE</Badge></td>
                                                </tr>
                                            )
                                        }
                                        const finalGrade = gradeStore.calculateFinalGrade(student.id, subObj.id)
                                        const approved = gradeStore.isApproved(student.id, subObj.id, passingGrade)

                                        return (
                                            <tr key={subObj.id} className="hover:bg-bg-hover/20 transition-colors group">
                                                <td className="px-6 py-4 font-black text-text-primary group-hover:text-primary transition-colors">{subName}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className={`text-lg font-black tracking-tighter ${approved === true ? 'text-secondary' : approved === false ? 'text-error' : 'text-text-muted/40'}`}>
                                                        {finalGrade !== null ? finalGrade.toFixed(1) : '——'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {approved === true ? (
                                                        <Badge variant="success" className="!rounded-lg !px-3 font-black text-[10px]">APROBADO</Badge>
                                                    ) : approved === false ? (
                                                        <Badge variant="error" className="!rounded-lg !px-3 font-black text-[10px]">INTENSIFICA</Badge>
                                                    ) : (
                                                        <Badge variant="neutral" className="!rounded-lg !px-3 font-black text-[10px] opacity-40">CURSANDO</Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <CardBody className="py-12 flex flex-col items-center justify-center bg-bg-card">
                            <div className="w-16 h-16 rounded-3xl bg-bg-hover flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-text-muted opacity-20" />
                            </div>
                            <p className="text-sm text-text-muted font-bold tracking-tight">El alumno no está asignado a ningún curso</p>
                        </CardBody>
                    )}
                </Card>
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
        <div className="space-y-8 animate-fade-in relative">
            {/* Background Glow Decorations */}
            <div className="fixed top-40 left-10 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none" />
            <div className="fixed bottom-10 right-10 w-[300px] h-[300px] bg-secondary/5 blur-[80px] rounded-full -z-10 pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/10">
                <div className="relative">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-full hidden md:block" />
                    <h1 className="text-4xl font-black text-text-primary tracking-tight">
                        Gestión de <span className="text-primary">Alumnos</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary font-medium uppercase tracking-wider">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        <span>Matrícula Ciclo 2026</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-border mx-1" />
                        <span>{activeStudents.length} Activos</span>
                    </div>
                </div>
                <div className="flex gap-4">
                    <label className="relative group">
                        <input type="file" accept=".csv" onChange={handleCSVImport} className="hidden" />
                        <Button
                            variant="outline"
                            icon={FileSpreadsheet}
                            onClick={() => { }}
                            className="shadow-lg hover:shadow-primary/5 border-border/50 transition-all"
                            as="span"
                        >
                            Importar CSV
                        </Button>
                    </label>
                    <Button
                        icon={UserPlus}
                        onClick={() => { setEditing(null); setShowModal(true) }}
                        className="shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                    >
                        Registrar Nuevo
                    </Button>
                </div>
            </div>

            {/* Advanced Filters */}
            <div className="p-6 rounded-3xl bg-bg-card border border-border shadow-xl shadow-black/5 flex flex-wrap gap-6 items-end relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

                <div className="flex-1 min-w-[280px]">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Búsqueda Inteligente</label>
                    <SearchBar value={search} onChange={setSearch} placeholder="Nombre, apellido o DNI..." className="!bg-bg-hover/50 !border-transparent focus-within:!border-primary/30" />
                </div>
                <div className="w-64">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Filtrar por Curso</label>
                    <Select
                        value={filterCourse} placeholder="Todos los cursos"
                        options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}"` }))}
                        onChange={(e) => { setFilterCourse(e.target.value); setPage(1) }}
                        className="!bg-bg-hover/50 !border-transparent focus:!border-primary/30"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <EmptyState icon={Users} title="Sin Coincidencias" description={search ? 'No encontramos ningún alumno que coincida con tu búsqueda.' : 'Todavía no hay alumnos registrados en este curso.'} />
            ) : (
                <Card className="border-none shadow-xl shadow-black/5 overflow-hidden !rounded-3xl">
                    <div className="overflow-x-auto w-full pb-2">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-bg-hover/30 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                    <th className="px-6 py-4 border-b border-border/50">Alumno</th>
                                    <th className="px-6 py-4 border-b border-border/50">DNI / Documento</th>
                                    <th className="px-6 py-4 border-b border-border/50">Membresía Curso</th>
                                    <th className="px-6 py-4 border-b border-border/50">Canal de Contacto</th>
                                    <th className="px-6 py-4 border-b border-border/50 text-right">Acciones Directas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {paginated.map((student) => (
                                    <tr key={student.id} className="hover:bg-primary/5 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-xs font-black shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                                    {student.name[0]}{student.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-text-primary tracking-tight group-hover:text-primary transition-colors">
                                                        {student.lastName}, {student.name}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Estudiante Regular</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-text-secondary/80 tracking-tight">{student.dni}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="primary" className="!rounded-lg !px-3 !py-1 font-black text-[9px] uppercase tracking-wider">
                                                {getCourseLabel(student.courseId)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <p className="text-sm font-medium text-text-secondary truncate max-w-[180px]">{student.tutorEmail || 'Sin email'}</p>
                                                <p className="text-[10px] text-text-muted font-bold">{student.phone || 'Sin teléfono'}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => setShowProfile(student)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card hover:bg-bg-hover text-text-muted hover:text-primary transition-all border border-border shadow-sm group/btn" title="Ver perfil">
                                                    <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                                <button onClick={() => { setEditing(student); setShowModal(true) }} className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card hover:bg-bg-hover text-text-muted hover:text-secondary transition-all border border-border shadow-sm group/btn" title="Editar">
                                                    <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setDeletingId(student.id); setShowConfirm(true) }} className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card hover:bg-error/10 text-text-muted hover:text-error transition-all border border-border shadow-sm group/btn" title="Dar de baja">
                                                    <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 bg-bg-hover/10 border-t border-border/50">
                            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Página {page} de {totalPages}</p>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card hover:bg-bg-hover border border-border disabled:opacity-30 cursor-pointer shadow-sm transition-all active:scale-95">
                                    <ChevronLeft className="w-5 h-5 text-text-primary" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all border shadow-sm ${p === page ? 'bg-primary border-primary text-white scale-110 shadow-primary/30' : 'bg-bg-card border-border text-text-secondary hover:bg-bg-hover'}`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card hover:bg-bg-hover border border-border disabled:opacity-30 cursor-pointer shadow-sm transition-all active:scale-95">
                                    <ChevronRight className="w-5 h-5 text-text-primary" />
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

