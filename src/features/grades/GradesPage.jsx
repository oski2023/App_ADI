import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Badge from '../../shared/components/Badge'
import { Select, Input } from '../../shared/components/Input'
import Modal from '../../shared/components/Modal'
import EmptyState from '../../shared/components/EmptyState'
import { BookOpen, Plus, Edit2, Trash2, Save } from 'lucide-react'
import useGradeStore from '../../core/stores/useGradeStore'
import useCourseStore from '../../core/stores/useCourseStore'
import useStudentStore from '../../core/stores/useStudentStore'
import useSettingsStore from '../../core/stores/useSettingsStore'

export default function GradesPage() {
    const { courses, addSubjectToCourse } = useCourseStore(useShallow((s) => ({ courses: s.courses, addSubjectToCourse: s.addSubjectToCourse })))
    const { subjects, setGrade, getGrades, calculateFinalGrade, isApproved, addSubject, deleteSubject } = useGradeStore(useShallow((s) => ({ subjects: s.subjects, setGrade: s.setGrade, getGrades: s.getGrades, calculateFinalGrade: s.calculateFinalGrade, isApproved: s.isApproved, addSubject: s.addSubject, deleteSubject: s.deleteSubject })))
    const allStudents = useStudentStore((s) => s.students)
    const passingGrade = useSettingsStore((s) => s.settings.passingGrade)

    const [selectedCourse, setSelectedCourse] = useState(courses[0]?.id || '')
    const [selectedSubject, setSelectedSubject] = useState('')
    const [showSubjectModal, setShowSubjectModal] = useState(false)
    const [newSubject, setNewSubject] = useState({ name: '', year: '', section: '', weights: [25, 25, 25, 25] })

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

    const handleGradeChange = (studentId, index, value) => {
        if (!selectedSubject) return

        let targetId = selectedSubject

        // If it's a temp subject, create it in the store before saving the grade
        if (selectedSubject.startsWith('temp_')) {
            const tempSub = courseSubjects.find(s => s.id === selectedSubject)
            const newId = addSubject({
                name: tempSub.name,
                year: course.year,
                section: course.division,
                weights: tempSub.weights
            })
            targetId = newId
            setSelectedSubject(newId)
        }

        const num = parseFloat(value)
        if (value === '' || (!isNaN(num) && num >= 0 && num <= 10)) {
            setGrade(studentId, targetId, index, value === '' ? null : num)
        }
    }

    const handleAddSubject = () => {
        const name = newSubject.name.trim()
        if (!name) return
        const newId = addSubject({ ...newSubject, name })
        if (selectedCourse) {
            addSubjectToCourse(selectedCourse, name)
            setSelectedSubject(newId)
        }
        setShowSubjectModal(false)
        setNewSubject({ name: '', year: course?.year || '', section: course?.division || '', weights: [25, 25, 25, 25] })
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Materias y Notas</h1>
                    <p className="text-sm text-text-secondary mt-1">Cargá y gestioná las notas de tus alumnos</p>
                </div>
                <Button icon={Plus} variant="outline" onClick={() => setShowSubjectModal(true)}>Nueva Materia</Button>
            </div>

            <div className="flex gap-4 items-end">
                <Select
                    id="gradeCourse" label="Curso" value={selectedCourse}
                    options={courses.map((c) => ({ value: c.id, label: `${c.year} "${c.division}" — ${c.shift}` }))}
                    onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSubject('') }}
                    className="w-64"
                />
                <Select
                    id="subject" label="Materia" value={selectedSubject}
                    options={courseSubjects.map((s) => ({ value: s.id, label: s.name }))}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    placeholder="Seleccionar materia..."
                    className="w-64"
                />
            </div>

            {!selectedSubject ? (
                <EmptyState icon={BookOpen} title="Seleccioná una materia" description="Elegí un curso y materia para ver y cargar las notas." />
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto w-full pb-2">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-border bg-bg-hover/50">
                                    <th className="text-left text-xs font-semibold text-text-muted uppercase tracking-wider px-5 py-3 sticky left-0 z-10 bg-bg-card whitespace-nowrap">Alumno</th>
                                    {(subject?.weights || []).map((w, i) => (
                                        <th key={i} className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                                            Parcial {i + 1}
                                            <span className="block text-[10px] font-normal">({w}%)</span>
                                        </th>
                                    ))}
                                    <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 whitespace-nowrap">Nota Final</th>
                                    <th className="text-center text-xs font-semibold text-text-muted uppercase tracking-wider px-4 py-3 whitespace-nowrap">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((student) => {
                                    const grades = getGrades(student.id, selectedSubject)
                                    const finalGrade = calculateFinalGrade(student.id, selectedSubject)
                                    const approved = isApproved(student.id, selectedSubject)

                                    return (
                                        <tr key={student.id} className="border-b border-border-light hover:bg-bg-hover transition-colors">
                                            <td className="px-5 py-3 sticky left-0 z-10 bg-bg-card border-r border-border-light/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                        {student.name[0]}{student.lastName[0]}
                                                    </div>
                                                    <span className="text-sm font-medium text-text-primary whitespace-nowrap">{student.lastName}, {student.name}</span>
                                                </div>
                                            </td>
                                            {(subject?.weights || []).map((_, i) => (
                                                <td key={i} className="px-4 py-3 text-center">
                                                    <input
                                                        type="number" min="0" max="10" step="0.5"
                                                        value={grades[i] ?? ''}
                                                        onChange={(e) => handleGradeChange(student.id, i, e.target.value)}
                                                        className="w-16 text-center px-2 py-1.5 rounded-lg border border-border text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 bg-bg-card"
                                                        placeholder="—"
                                                    />
                                                </td>
                                            ))}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-lg font-bold ${approved === true ? 'text-secondary' : approved === false ? 'text-error' : 'text-text-muted'}`}>
                                                    {finalGrade !== null ? finalGrade.toFixed(1) : '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {approved === true ? (
                                                    <Badge variant="success">Aprobado</Badge>
                                                ) : approved === false ? (
                                                    <Badge variant="error">Reprobado</Badge>
                                                ) : (
                                                    <Badge variant="neutral">Pendiente</Badge>
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
                    <Input id="subjectName" label="Nombre de la Materia" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} placeholder="Ej: Matemática" />
                    <div className="grid grid-cols-2 gap-4">
                        <Input id="subjectYear" label="Año" value={newSubject.year} onChange={(e) => setNewSubject({ ...newSubject, year: e.target.value })} placeholder="Ej: 3°" />
                        <Input id="subjectSection" label="Sección" value={newSubject.section} onChange={(e) => setNewSubject({ ...newSubject, section: e.target.value })} placeholder="Ej: A" />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setShowSubjectModal(false)}>Cancelar</Button>
                        <Button onClick={handleAddSubject}>Crear Materia</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
