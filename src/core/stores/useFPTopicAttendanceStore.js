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
    googleSheetTitle: '',
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
            // Importa una planilla leída desde Google Sheets. Si ya existe en este dispositivo,
            // actualiza sus datos; si no existe, la agrega a la lista.
            importOrUpdateSheet: (sheetData, targetId = null) => {
                const currentSheets = get().sheets
                let updatedId = targetId

                if (targetId && currentSheets.some((s) => s.id === targetId)) {
                    set((state) => ({
                        sheets: state.sheets.map((s) => (s.id === targetId ? { ...s, ...sheetData } : s)),
                    }))
                    return targetId
                }

                const existingIndex = currentSheets.findIndex((s) => {
                    if (s.googleSheetTitle && sheetData.googleSheetTitle && s.googleSheetTitle === sheetData.googleSheetTitle) {
                        return true
                    }
                    const sCurso = (s.cursoNumero || '').trim().toLowerCase()
                    const dCurso = (sheetData.cursoNumero || '').trim().toLowerCase()
                    const sMes = (s.mesDe || '').trim().toLowerCase()
                    const dMes = (sheetData.mesDe || '').trim().toLowerCase()
                    const sEsp = (s.especialidad || '').trim().toLowerCase()
                    const dEsp = (sheetData.especialidad || '').trim().toLowerCase()

                    if (sCurso && dCurso && sCurso === dCurso) {
                        if (!sMes || !dMes || sMes === dMes) return true
                    }
                    if (sEsp && dEsp && sEsp === dEsp) {
                        if (!sMes || !dMes || sMes === dMes) return true
                    }
                    if (s.cfpNumero && sheetData.cfpNumero && s.cfpNumero === sheetData.cfpNumero && sCurso && dCurso && sCurso === dCurso) {
                        return true
                    }
                    return false
                })

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

            // Sincronización completa (Espejo de Google Sheets)
            syncAllFromCloud: (cloudSheets) => {
                const currentSheets = get().sheets
                const updatedList = cloudSheets.map((cSheet) => {
                    const match = currentSheets.find((s) => {
                        if (s.googleSheetTitle && cSheet.googleSheetTitle && s.googleSheetTitle === cSheet.googleSheetTitle) return true
                        const sCurso = (s.cursoNumero || '').trim().toLowerCase()
                        const dCurso = (cSheet.cursoNumero || '').trim().toLowerCase()
                        if (sCurso && dCurso && sCurso === dCurso) return true
                        return false
                    })
                    return {
                        ...emptySheet(),
                        ...cSheet,
                        id: match ? match.id : crypto.randomUUID(),
                    }
                })
                set({ sheets: updatedList })
                return updatedList
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
