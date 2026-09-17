import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Cada entrada: { spreadsheetId, sheetTitle, spreadsheetUrl } o null si no está vinculado
const useFPGoogleLinksStore = create(
    persist(
        (set, get) => ({
            links: {
                course: null,
                topicAttendance: null,
                attendanceSheet: null,
                examAct: null,
            },

            setLink: (key, data) => set((state) => ({
                links: { ...state.links, [key]: data },
            })),

            setAllLinks: (newLinks) => set((state) => ({
                links: { ...state.links, ...newLinks },
            })),

            clearLink: (key) => set((state) => ({
                links: { ...state.links, [key]: null },
            })),
        }),
        {
            name: 'adi_fp_google_links',
        }
    )
)

export default useFPGoogleLinksStore
