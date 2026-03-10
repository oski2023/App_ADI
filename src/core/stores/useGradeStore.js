import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_SUBJECTS, DEFAULT_SETTINGS } from '../constants'

const useGradeStore = create(
    persist(
        (set, get) => ({
            subjects: SEED_SUBJECTS,
            // grades: { [studentId_subjectId]: [note1, note2, ...] }
            grades: {},

            addSubject: (subject) => {
                const newId = `sub${Date.now()}`
                set((state) => ({
                    subjects: [...state.subjects, { ...subject, id: newId }],
                }))
                return newId
            },

            updateSubject: (id, data) => set((state) => ({
                subjects: state.subjects.map((s) => (s.id === id ? { ...s, ...data } : s)),
            })),

            deleteSubject: (id) => set((state) => ({
                subjects: state.subjects.filter((s) => s.id !== id),
            })),

            setGrade: (studentId, subjectId, index, grade) => set((state) => {
                const key = `${studentId}_${subjectId}`
                const current = state.grades[key] || []
                const updated = [...current]
                updated[index] = grade
                return { grades: { ...state.grades, [key]: updated } }
            }),

            getGrades: (studentId, subjectId) => {
                const key = `${studentId}_${subjectId}`
                return get().grades[key] || []
            },

            calculateFinalGrade: (studentId, subjectId) => {
                const key = `${studentId}_${subjectId}`
                const grades = get().grades[key] || []
                const subject = get().subjects.find((s) => s.id === subjectId)
                if (!subject || grades.length === 0) return null

                const weights = subject.weights || []
                let weightedSum = 0
                let totalWeight = 0

                grades.forEach((grade, i) => {
                    if (grade !== null && grade !== undefined && grade !== '') {
                        const num = parseFloat(grade)
                        if (!isNaN(num)) {
                            const weight = weights[i] || (100 / weights.length)
                            weightedSum += num * weight
                            totalWeight += weight
                        }
                    }
                })

                if (totalWeight === 0) return null
                return Math.round((weightedSum / totalWeight) * 10) / 10
            },

            isApproved: (studentId, subjectId) => {
                const finalGrade = get().calculateFinalGrade(studentId, subjectId)
                if (finalGrade === null) return null
                return finalGrade >= DEFAULT_SETTINGS.passingGrade
            },

            getSubjectsByCourse: (courseId, courses) => {
                const course = courses.find((c) => c.id === courseId)
                if (!course) return []
                return get().subjects.filter((s) =>
                    course.subjects.includes(s.name) && s.year === course.year && s.section === course.division
                )
            },
        }),
        {
            name: 'adi_grades',
            partialize: (state) => ({ subjects: state.subjects, grades: state.grades }),
        }
    )
)

export default useGradeStore
