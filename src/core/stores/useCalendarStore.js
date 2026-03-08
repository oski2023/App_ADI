import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SEED_EVENTS } from '../constants'

const useCalendarStore = create(
    persist(
        (set, get) => ({
            events: SEED_EVENTS,

            addEvent: (event) => set((state) => ({
                events: [...state.events, { ...event, id: `e${Date.now()}` }],
            })),

            updateEvent: (id, data) => set((state) => ({
                events: state.events.map((e) => (e.id === id ? { ...e, ...data } : e)),
            })),

            deleteEvent: (id) => set((state) => ({
                events: state.events.filter((e) => e.id !== id),
            })),

            getEventsByDate: (date) => get().events.filter((e) => e.date === date),

            getEventsByMonth: (year, month) => {
                const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
                return get().events.filter((e) => e.date.startsWith(prefix))
            },

            getUpcomingEvents: (limit = 5) => {
                const today = new Date().toISOString().split('T')[0]
                return get().events
                    .filter((e) => e.date >= today)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, limit)
            },

            getHolidays: () => get().events.filter((e) => e.type === 'feriado'),
        }),
        {
            name: 'adi_calendar',
            partialize: (state) => ({ events: state.events }),
        }
    )
)

export default useCalendarStore
