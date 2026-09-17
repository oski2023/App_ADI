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

            // Sincronización bidireccional (PC ↔ Celular):
            // Importa una planilla leída desde Google Sheets. Si ya existe en este dispositivo
            // (mismo CFP y Curso), actualiza sus datos; si el dispositivo inicia limpio, la agrega a la lista.
            importOrUpdateSheet: (sheetData, targetId = null) => {
                const currentSheets = get().sheets
                let updatedId = targetId

                if (targetId && currentSheets.some((s) => s.id === targetId)) {
                    set((state) => ({
                        sheets: state.sheets.map((s) => (s.id === targetId ? { ...s, ...sheetData } : s)),
                    }))
                    return targetId
                }

                const existingIndex = currentSheets.findIndex(
                    (s) => s.cfpNumero && s.cursoNumero && s.cfpNumero === sheetData.cfpNumero && s.cursoNumero === sheetData.cursoNumero
                )

                if (existingIndex >= 0) {
                    updatedId = currentSheets[existingIndex].id
                    set((state) => ({
                        sheets: state.sheets.map((s, idx) => (idx === existingIndex ? { ...s, ...sheetData } : s)),
                    }))
                } else {
                    const newSheet = {
                        ...emptySheet(),
                        ...sheetData,
                        id: crypto.randomUUID(),
                    }
                    updatedId = newSheet.id
                    set((state) => ({ sheets: [...state.sheets, newSheet] }))
                }

                return updatedId
            },

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
