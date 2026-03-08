import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_STUDENTS } from '../constants'

const useStudentStore = create(
    persist(
        (set, get) => ({
            students: SEED_STUDENTS,

            addStudent: (student) => set((state) => ({
                students: [...state.students, { ...student, id: `s${Date.now()}`, status: 'active' }],
            })),

            updateStudent: (id, data) => set((state) => ({
                students: state.students.map((s) => (s.id === id ? { ...s, ...data } : s)),
            })),

            deleteStudent: (id) => set((state) => ({
                students: state.students.map((s) => (s.id === id ? { ...s, status: 'inactive' } : s)),
            })),

            getStudentById: (id) => get().students.find((s) => s.id === id),

            getStudentsByCourse: (courseId) => get().students.filter((s) => s.courseId === courseId && s.status === 'active'),

            getActiveStudents: () => get().students.filter((s) => s.status === 'active'),

            importStudentsCSV: (students, courseId) => set((state) => ({
                students: [
                    ...state.students,
                    ...students.map((s, i) => ({ ...s, id: `s${Date.now()}_${i}`, courseId, status: 'active' })),
                ],
            })),
        }),
        {
            name: 'adi_students',
            partialize: (state) => ({ students: state.students }),
        }
    )
)

export default useStudentStore
