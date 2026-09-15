import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const emptySheet = () => ({
    id: crypto.randomUUID(),
    region: '',
    distrito: '',
    cfpNumero: '',
    cursoNumero: '',
    especialidad: '',
    sedeDictado: '',
    mesDe: '',
    horarios: { lunes: '', martes: '', miercoles: '', jueves: '', viernes: '', sabado: '' },
    instructor: '',
    entries: [],
})

const emptyEntry = () => ({
    id: crypto.randomUUID(),
    fecha: '',
    tema: '',
    tiempoEstimado: '',
    firmaInstructor: '',
    observaciones: '',
    firmaDirector: '',
})

const useFPTopicAttendanceStore = create(
    persist(
        (set, get) => ({
            sheets: [],

            addSheet: () => {
                const sheet = emptySheet()
                set((state) => ({ sheets: [...state.sheets, sheet] }))
                return sheet.id
            },

            updateSheet: (id, data) => set((state) => ({
                sheets: state.sheets.map((s) => (s.id === id ? { ...s, ...data } : s)),
            })),

            updateSheetHorario: (id, dia, valor) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === id ? { ...s, horarios: { ...s.horarios, [dia]: valor } } : s
                ),
            })),

            deleteSheet: (id) => set((state) => ({
                sheets: state.sheets.filter((s) => s.id !== id),
            })),

            addEntry: (sheetId) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === sheetId ? { ...s, entries: [...s.entries, emptyEntry()] } : s
                ),
            })),

            updateEntry: (sheetId, entryId, data) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === sheetId
                        ? {
                            ...s,
                            entries: s.entries.map((e) => (e.id === entryId ? { ...e, ...data } : e)),
                        }
                        : s
                ),
            })),

            deleteEntry: (sheetId, entryId) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === sheetId
                        ? { ...s, entries: s.entries.filter((e) => e.id !== entryId) }
                        : s
                ),
            })),
        }),
        {
            name: 'adi_fp_topic_attendance',
        }
    )
)

export default useFPTopicAttendanceStore
