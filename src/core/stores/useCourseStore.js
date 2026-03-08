import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_COURSES } from '../constants'

const useCourseStore = create(
    persist(
        (set, get) => ({
            courses: SEED_COURSES,

            addCourse: (course) => set((state) => ({
                courses: [...state.courses, { ...course, id: `c${Date.now()}` }],
            })),

            updateCourse: (id, data) => set((state) => ({
                courses: state.courses.map((c) => (c.id === id ? { ...c, ...data } : c)),
            })),

            deleteCourse: (id) => set((state) => ({
                courses: state.courses.filter((c) => c.id !== id),
            })),

            addSubjectToCourse: (courseId, subjectName) => set((state) => ({
                courses: state.courses.map((c) =>
                    c.id === courseId && !c.subjects.includes(subjectName)
                        ? { ...c, subjects: [...c.subjects, subjectName] }
                        : c
                ),
            })),
            getCourseById: (id) => get().courses.find((c) => c.id === id),
        }),
        {
            name: 'adi_courses',
            partialize: (state) => ({ courses: state.courses }),
        }
    )
)

export default useCourseStore
