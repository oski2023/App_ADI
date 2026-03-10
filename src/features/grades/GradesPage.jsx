import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Card, CardBody, CardHeader } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Badge from '../../shared/components/Badge'
import { Select, Input } from '../../shared/components/Input'
import Modal from '../../shared/components/Modal'
import EmptyState from '../../shared/components/EmptyState'
import { BookOpen, Plus, Edit2, Trash2, Save, GraduationCap, TrendingUp, CheckCircle2, AlertCircle, Info, ChevronRight, Calculator, Users, X } from 'lucide-react'
import useGradeStore from '../../core/stores/useGradeStore'
import useCourseStore from '../../core/stores/useCourseStore'
import useStudentStore from '../../core/stores/useStudentStore'
import useSettingsStore from '../../core/stores/useSettingsStore'
import { toTitleCase } from '../../utils/stringUtils'
import toast from 'react-hot-toast'

export default function GradesPage() {
    const { courses, addSubjectToCourse } = useCourseStore(useShallow((s) => ({ courses: s.courses, addSubjectToCourse: s.addSubjectToCourse })))
    const { subjects, grades, setGrade, getGrades, calculateFinalGrade, isApproved, addSubject, deleteSubject } = useGradeStore(useShallow((s) => ({ subjects: s.subjects, grades: s.grades, setGrade: s.setGrade, getGrades: s.getGrades, calculateFinalGrade: s.calculateFinalGrade, isApproved: s.isApproved, addSubject: s.addSubject, deleteSubject: s.deleteSubject })))
    const allStudents = useStudentStore((s) => s.students)
    const passingGrade = useSettingsStore((s) => s.settings.passingGrade)

    const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || '')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [showSubjectModal, setShowSubjectModal] = useState(false)
    const [newSubject, setNewSubject] = useState({ name: '', courseId: '', weights: [25, 25, 25, 25] })

    const normalize = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : '';

    const course = courses.find((c) => c.id === selectedCourse)

    // Improved matching: use course subjects as base and find corresponding GradeStore records
    const courseSubjects = course
        ? course.subjects.map(subjectName => {
            const normalizedName = normalize(subjectName);
            const found = subjects.find(s => normalize(s.name) === normalizedName && s.year === course.year);
            return found || { id: `temp_${subjectName}`, name: subjectName, weights: [25, 25, 25, 25], isTemp: true };
        })
        : []

    const students = selectedCourse ? allStudents.filter((s) => s.courseId === selectedCourse && s.status === 'active') : []

    // Find selected subject, considering temp ones too
    const subject = selectedSubject.startsWith('temp_')
        ? courseSubjects.find(s => s.id === selectedSubject)
        : subjects.find((s) => s.id === selectedSubject)

    const handleSubjectSelection = (subjectId) => {
        if (!subjectId) {
            setSelectedSubject('')
            return
        }

        if (subjectId.startsWith('temp_')) {
            const tempSub = courseSubjects.find(s => s.id === subjectId)
            const newId = addSubject({
                name: tempSub.name,
                year: course.year,
                section: course.division,
                weights: tempSub.weights
            })
            setSelectedSubject(newId)
        } else {
            setSelectedSubject(subjectId)
        }
    }

    const handleGradeChange = (studentId, index, value) => {
        if (!selectedSubject || selectedSubject.startsWith('temp_')) return

        const targetId = selectedSubject

        if (value === '') {
            setGrade(studentId, targetId, index, null)
        } else {
            const num = parseFloat(value)
            if (!isNaN(num) && num >= 0 && num <= 10) {
                setGrade(studentId, targetId, index, value)
            }
        }
    }

    const handleAddSubject = () => {
        let name = newSubject.name.trim()
        if (!name || !newSubject.courseId) return

        name = toTitleCase(name)

        const targetCourse = courses.find(c => c.id === newSubject.courseId)
        if (!targetCourse) return

        // Validación de duplicado
        if (targetCourse.subjects.some(sub => normalize(sub) === normalize(name))) {
            toast.error(`Ya existe una materia llamada "${name}" en este curso.`)
            return
        }

        const newId = addSubject({
            ...newSubject,
            name,
            year: targetCourse.year,
            section: targetCourse.division
        })

        addSubjectToCourse(targetCourse.id, name)

        if (selectedCourse === targetCourse.id) {
            setSelectedSubject(newId)
        }

        setShowSubjectModal(false)
        setNewSubject({ name: '', courseId: '', weights: [25, 25, 25, 25] })
    }

    const openCreateModal = () => {
        setNewSubject({ name: '', courseId: selectedCourse || '', weights: [25, 25, 25, 25] })
        setShowSubjectModal(true)
    }

    const totalGraded = students.filter(s => calculateFinalGrade(s.id, selectedSubject) !== null).length
    const approvedCount = students.filter(s => isApproved(s.id, selectedSubject, passingGrade) === true).length
    const approvalRate = students.length ? Math.round((approvedCount / students.length) * 100) : 0

    return (
        <div className="space-y-8 animate-fade-in relative">
            {/* Background Glow Decorations */}
            <div className="fixed top-20 right-20 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
            <div className="fixed bottom-20 left-20 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -z-10 pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/10">
                <div className="relative">
                    <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-full hidden md:block" />
                    <h1 className="text-4xl font-black text-text-primary tracking-tight">
                        Gestión de <span className="text-primary">Calificaciones</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary font-medium uppercase tracking-wider">
                        <Calculator className="w-4 h-4 text-primary" />
                        <span>Libreta Digital</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-border mx-1" />
                        <span>Ciclo Lectivo 2026</span>
                    </div>
                </div>
                <Button
                    icon={Plus}
                    onClick={openCreateModal}
                    className="shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                >
                    Nueva Materia
                </Button>
            </div>

            {/* Selection Filters */}
            <div className="p-6 rounded-3xl bg-bg-card border border-border shadow-xl shadow-black/5 flex flex-wrap gap-6 items-end relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

                <div className="flex-1 min-w-[280px]">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Seleccionar Curso</label>
                    <Select
                        id="gradeCourse" label="" value={selectedCourse}
                        options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}" — ${c.shift}` }))}
                        onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSubject('') }}
                        className="!bg-bg-hover/50 !border-transparent focus:!border-primary/30"
                    />
                </div>
                <div className="flex-1 min-w-[280px]">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest ml-1 mb-2 block">Materia / Asignatura</label>
                    <Select
                        id="subject" label="" value={selectedSubject}
                        options={courseSubjects.map((s) => ({ value: s.id, label: s.name }))}
                        onChange={(e) => handleSubjectSelection(e.target.value)}
                        placeholder="Seleccionar materia..."
                        className="!bg-bg-hover/50 !border-transparent focus:!border-primary/30"
                    />
                </div>
            </div>

            {/* Subject Context Stats */}
            {selectedSubject && students.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-in">
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-bg-card to-primary/10 border border-white/10 shadow-sm">
                        <div className="bg-bg-card/50 rounded-[22px] p-5">
                            <p className="text-3xl font-black text-text-primary leading-none">{students.length}</p>
                            <div className="flex items-center gap-2 mt-2 font-bold text-text-muted text-[10px] uppercase tracking-widest">
                                <Users className="w-3.5 h-3.5" /> Alumnos
                            </div>
                        </div>
                    </div>
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-bg-card to-secondary/10 border border-white/10 shadow-sm">
                        <div className="bg-bg-card/50 rounded-[22px] p-5">
                            <p className="text-3xl font-black text-secondary leading-none">{totalGraded}</p>
                            <div className="flex items-center gap-2 mt-2 font-bold text-secondary text-[10px] uppercase tracking-widest">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Calificados
                            </div>
                        </div>
                    </div>
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-bg-card to-warning/10 border border-white/10 shadow-sm">
                        <div className="bg-bg-card/50 rounded-[22px] p-5">
                            <p className="text-3xl font-black text-warning leading-none">{approvalRate}%</p>
                            <div className="flex items-center gap-2 mt-2 font-bold text-warning text-[10px] uppercase tracking-widest">
                                <TrendingUp className="w-3.5 h-3.5" /> Tasa Aprob.
                            </div>
                        </div>
                    </div>
                    <div className="p-1 rounded-3xl bg-gradient-to-br from-bg-card to-error/10 border border-white/10 shadow-sm">
                        <div className="bg-bg-card/50 rounded-[22px] p-5">
                            <p className="text-3xl font-black text-error leading-none">{students.length - approvedCount}</p>
                            <div className="flex items-center gap-2 mt-2 font-bold text-error text-[10px] uppercase tracking-widest">
                                <AlertCircle className="w-3.5 h-3.5" /> En Riesgo
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!selectedSubject ? (
                <EmptyState icon={GraduationCap} title="Panel de Notas" description="Selecciona un curso y materia para comenzar la carga de calificaciones." />
            ) : (
                <Card className="border-none shadow-xl shadow-black/5 overflow-hidden !rounded-3xl">
                    <CardHeader
                        className="!border-none pt-6 bg-gradient-to-r from-bg-card to-primary/5"
                        action={
                            <button
                                onClick={() => setSelectedSubject('')}
                                className="w-10 h-10 rounded-xl bg-bg-hover text-text-muted hover:bg-error/10 hover:text-error transition-all flex items-center justify-center border border-border/50 group/close"
                                title="Cerrar Planilla"
                            >
                                <X className="w-5 h-5 group-hover/close:rotate-90 transition-transform duration-300" />
                            </button>
                        }
                    >
                        <h2 className="text-xl font-black text-text-primary tracking-tight">Registro de Notas: {subject?.name}</h2>
                    </CardHeader>
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-bg-hover/30 text-[10px] text-text-muted font-bold uppercase tracking-widest">
                                    <th className="px-6 py-4 border-b border-border/50 sticky left-0 z-20 bg-bg-card backdrop-blur-md">Alumno</th>
                                    {(subject?.weights || []).map((w, i) => (
                                        <th key={i} className="px-4 py-4 border-b border-border/50 text-center whitespace-nowrap">
                                            {i + 1}° Parcial
                                            <span className="block text-[8px] opacity-60 mt-0.5">{w}% Peso</span>
                                        </th>
                                    ))}
                                    <th className="px-6 py-4 border-b border-border/50 text-center">Nota Final</th>
                                    <th className="px-6 py-4 border-b border-border/50 text-center">Estado Académico</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {students.map((student) => {
                                    const grades = getGrades(student.id, selectedSubject)
                                    const finalGrade = calculateFinalGrade(student.id, selectedSubject)
                                    const approved = isApproved(student.id, selectedSubject, passingGrade)

                                    return (
                                        <tr key={student.id} className="hover:bg-primary/5 transition-all group">
                                            <td className="px-6 py-4 sticky left-0 z-10 bg-bg-card border-r border-border/30 group-hover:bg-bg-hover/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white text-xs font-black shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                                        {student.lastName[0]}{student.name[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-text-primary tracking-tight group-hover:text-primary transition-colors">
                                                            {student.lastName}, {student.name}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">DNI {student.dni}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {(subject?.weights || []).map((_, i) => (
                                                <td key={i} className="px-4 py-4 text-center">
                                                    <div className="relative inline-block">
                                                        <input
                                                            type="number" min="0" max="10" step="0.5"
                                                            value={grades[i] ?? ''}
                                                            onChange={(e) => handleGradeChange(student.id, i, e.target.value)}
                                                            className={`w-14 text-center py-2 rounded-xl border border-transparent bg-bg-hover/50 text-sm font-black text-text-primary outline-none focus:bg-bg-card focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all ${grades[i] !== null ? 'opacity-100' : 'opacity-40'}`}
                                                            placeholder="—"
                                                        />
                                                    </div>
                                                </td>
                                            ))}
                                            <td className="px-6 py-4 text-center">
                                                <div className={`text-xl font-black tracking-tighter ${approved === true ? 'text-secondary' : approved === false ? 'text-error' : 'text-text-muted/40'}`}>
                                                    {finalGrade !== null ? finalGrade.toFixed(1) : '————'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {approved === true ? (
                                                    <Badge variant="success" className="!rounded-lg !px-3 font-black text-[10px]">Aprobado</Badge>
                                                ) : approved === false ? (
                                                    <Badge variant="error" className="!rounded-lg !px-3 font-black text-[10px]">Intensifica</Badge>
                                                ) : (
                                                    <Badge variant="neutral" className="!rounded-lg !px-3 font-black text-[10px] opacity-40">Sin Carga</Badge>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Modal isOpen={showSubjectModal} onClose={() => setShowSubjectModal(false)} title="Nueva Materia">
                <div className="space-y-4">
                    <Input id="subjectName" label="Nombre de la Materia" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: toTitleCase(e.target.value) })} placeholder="Ej: Matemática" />
                    <Select
                        id="targetCourse"
                        label="Curso Base"
                        value={newSubject.courseId}
                        options={[{ value: '', label: 'Seleccionar curso...' }, ...courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}" — ${c.shift}` }))]}
                        onChange={(e) => setNewSubject({ ...newSubject, courseId: e.target.value })}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setShowSubjectModal(false)}>Cancelar</Button>
                        <Button onClick={handleAddSubject} disabled={!newSubject.name || !newSubject.courseId}>
                            Crear Materia
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
