import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const usePlanningStore = create(
    persist(
        (set, get) => ({
            planning: {}, // courseId -> { key(day_hour): content }

            setPlanEntry: (courseId, day, hour, content) => set((state) => {
                const coursePlan = { ...state.planning[courseId] || {} }
                const key = `${day}_${hour}`
                if (content === null || content === '') {
                    delete coursePlan[key]
                } else {
                    coursePlan[key] = content
                }
                return {
                    planning: {
                        ...state.planning,
                        [courseId]: coursePlan
                    }
                }
            }),

            clearCoursePlan: (courseId) => set((state) => {
                const newPlanning = { ...state.planning }
                delete newPlanning[courseId]
                return { planning: newPlanning }
            }),

            getCoursePlan: (courseId) => get().planning[courseId] || {},
        }),
        {
            name: 'adi_planning',
            partialize: (state) => ({ planning: state.planning }),
        }
    )
)

export default usePlanningStore
