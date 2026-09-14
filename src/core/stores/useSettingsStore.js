import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_SETTINGS } from '../constants'

const useSettingsStore = create(
    persist(
        (set, get) => ({
            settings: { ...DEFAULT_SETTINGS },
            googleLinked: false,
            spreadsheetUrl: null,
            darkMode: false,
            profileType: 'escuela', // 'escuela' (Maestro/Profesor) | 'fp' (Formación Profesional)

            updateSettings: (newSettings) => set((state) => ({
                settings: { ...state.settings, ...newSettings },
            })),

            setProfileType: (type) => set({ profileType: type }),

            setGoogleLinked: (linked, url) => set({
                googleLinked: linked,
                spreadsheetUrl: url,
            }),

            toggleDarkMode: () => {
                const next = !get().darkMode
                document.documentElement.classList.toggle('dark', next)
                set({ darkMode: next })
            },

            initDarkMode: () => {
                const dm = get().darkMode
                document.documentElement.classList.toggle('dark', dm)
            },
        }),
        {
            name: 'adi_settings',
            partialize: (state) => ({
                settings: state.settings,
                googleLinked: state.googleLinked,
                spreadsheetUrl: state.spreadsheetUrl,
                darkMode: state.darkMode,
                profileType: state.profileType,
            }),
        }
    )
)

export default useSettingsStore