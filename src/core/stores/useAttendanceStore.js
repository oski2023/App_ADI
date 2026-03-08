import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAttendanceStore = create(
    persist(
        (set, get) => ({
            // Records: { [date_courseId]: { studentId: 'P'|'A'|'T', ... } }
            records: {},

            setAttendance: (date, courseId, studentId, status) => set((state) => {
                const key = `${date}_${courseId}`
                const dayRecord = state.records[key] || {}
                return {
                    records: {
                        ...state.records,
                        [key]: { ...dayRecord, [studentId]: status },
                    },
                }
            }),

            setAllPresent: (date, courseId, studentIds) => set((state) => {
                const key = `${date}_${courseId}`
                const dayRecord = {}
                studentIds.forEach((id) => { dayRecord[id] = 'P' })
                return {
                    records: {
                        ...state.records,
                        [key]: { ...state.records[key], ...dayRecord },
                    },
                }
            }),

            getAttendanceForDay: (date, courseId) => {
                const key = `${date}_${courseId}`
                return get().records[key] || {}
            },

            getStudentAttendanceSummary: (studentId) => {
                const records = get().records
                let present = 0, absent = 0, late = 0
                Object.values(records).forEach((dayRecord) => {
                    if (dayRecord[studentId] === 'P') present++
                    else if (dayRecord[studentId] === 'A') absent++
                    else if (dayRecord[studentId] === 'T') late++
                })
                const total = present + absent + late
                const percentage = total > 0 ? Math.round((present / total) * 100) : 100
                return { present, absent, late, total, percentage }
            },

            getAttendanceHistory: (studentId, startDate, endDate) => {
                const records = get().records
                const history = []
                Object.entries(records).forEach(([key, dayRecord]) => {
                    const [date] = key.split('_')
                    if (dayRecord[studentId] && date >= startDate && date <= endDate) {
                        history.push({ date, status: dayRecord[studentId] })
                    }
                })
                return history.sort((a, b) => a.date.localeCompare(b.date))
            },
        }),
        {
            name: 'adi_attendance',
            partialize: (state) => ({ records: state.records }),
        }
    )
)

export default useAttendanceStore
