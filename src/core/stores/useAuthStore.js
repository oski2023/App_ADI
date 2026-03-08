import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
    persist(
        (set) => ({
            user: {
                id: 'doc1',
                name: 'Mi Perfil',
                email: 'docente@escuela.edu',
                avatar: null,
                role: 'Docente',
            },
            isAuthenticated: true,
            isLoading: false,

            login: () => set({ isAuthenticated: true }),
            logout: () => set({ isAuthenticated: false, user: null }),
            setUser: (user) => set({ user }),
            updateProfile: (data) => set((state) => ({ user: { ...state.user, ...data } })),
        }),
        {
            name: 'adi_auth',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
)

export default useAuthStore
