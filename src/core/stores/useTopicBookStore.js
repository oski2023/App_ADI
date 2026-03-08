import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useTopicBookStore = create(
    persist(
        (set, get) => ({
            entries: [],

            addEntry: (entry) => set((state) => ({
                entries: [...state.entries, { ...entry, id: `t${Date.now()}` }],
            })),

            updateEntry: (id, data) => set((state) => ({
                entries: state.entries.map((e) => (e.id === id ? { ...e, ...data } : e)),
            })),

            deleteEntry: (id) => set((state) => ({
                entries: state.entries.filter((e) => e.id !== id),
            })),

            getEntriesByCourse: (courseId) =>
                get().entries.filter((e) => e.courseId === courseId).sort((a, b) => b.date.localeCompare(a.date)),

            getEntryByDateAndCourse: (date, courseId, subject) =>
                get().entries.find((e) => e.date === date && e.courseId === courseId && e.subject === subject),
        }),
        {
            name: 'adi_topicbook',
            partialize: (state) => ({ entries: state.entries }),
        }
    )
)

export default useTopicBookStore
