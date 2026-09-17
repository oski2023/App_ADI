// Gestor de sincronización — Cola de operaciones y estado
// Cuando se conecten las APIs reales, este módulo orquesta las sincronizaciones

import { create } from 'zustand'
import { setSpreadsheetId, syncStudents, syncAttendance, syncGrades, syncTopicBook, syncCalendarEvents } from './sheetsService'
import { initGoogleAuth, isSignedIn } from './googleAuth'
import useSettingsStore from '../../core/stores/useSettingsStore'
import useStudentStore from '../../core/stores/useStudentStore'
import useAttendanceStore from '../../core/stores/useAttendanceStore'
import useGradeStore from '../../core/stores/useGradeStore'
import useTopicBookStore from '../../core/stores/useTopicBookStore'
import useCalendarStore from '../../core/stores/useCalendarStore'

// Estados de sincronización
export const SYNC_STATUS = {
    IDLE: 'idle',
    SYNCING: 'syncing',
    SUCCESS: 'success',
    ERROR: 'error',
    OFFLINE: 'offline',
}

// Store de sincronización
export const useSyncStore = create((set, get) => ({
    status: SYNC_STATUS.IDLE,
    lastSync: null,
    queue: [],
    errors: [],
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,

    // Inicializar SDK y configuración
    init: async () => {
        const isConfigured = await initGoogleAuth()
        if (!isConfigured) return

        // Cargar spreadsheetId desde configuración si existe
        const { spreadsheetUrl } = useSettingsStore.getState()
        if (spreadsheetUrl) {
            const id = spreadsheetUrl.split('/d/')[1]?.split('/')[0]
            if (id) setSpreadsheetId(id)
        }
    },

    // Agregar operación a la cola
    enqueue: (operation) => set((state) => ({
        queue: [...state.queue, { ...operation, timestamp: Date.now(), retries: 0 }],
    })),

    // Procesar cola (Sincronización Real)
    processQueue: async () => {
        if (!get().online || get().status === SYNC_STATUS.SYNCING) return
        if (!isSignedIn()) {
            console.warn('[SyncManager] No se puede sincronizar: usuario no autenticado')
            return
        }

        set({ status: SYNC_STATUS.SYNCING })

        try {
            // Recolectar todos los datos actuales (Snapshot)
            const students = useStudentStore.getState().students
            const attendance = useAttendanceStore.getState().records
            const { grades, subjects } = useGradeStore.getState()
            const entries = useTopicBookStore.getState().entries
            const events = useCalendarStore.getState().events

            // Sincronizar módulos en paralelo
            await Promise.all([
                syncStudents(students),
                syncAttendance(attendance),
                syncGrades(grades, subjects),
                syncTopicBook(entries),
                syncCalendarEvents(events)
            ])

            set({
                status: SYNC_STATUS.SUCCESS,
                lastSync: new Date().toISOString(),
                queue: [],
                errors: [],
            })
            console.log('[SyncManager] Sincronización exitosa con Google Sheets')
        } catch (error) {
            console.error('[SyncManager] Error crítico de sincronización:', error)
            set({
                status: SYNC_STATUS.ERROR,
                errors: [{ message: error.message || 'Error desconocido', timestamp: Date.now() }]
            })
        }
    },

    setOnline: (online) => set({
        online,
        status: online ? SYNC_STATUS.IDLE : SYNC_STATUS.OFFLINE,
    }),

    clearQueue: () => set({ queue: [], errors: [] }),
}))

// Listener de conectividad
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        useSyncStore.getState().setOnline(true)
        // Auto-procesar cola al volver online
        useSyncStore.getState().processQueue()
    })
    window.addEventListener('offline', () => {
        useSyncStore.getState().setOnline(false)
    })
}

export default useSyncStore
