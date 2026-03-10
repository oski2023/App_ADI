import { HashRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './shared/components/AppLayout'
import DashboardPage from './features/dashboard/DashboardPage'
import CoursesPage from './features/courses/CoursesPage'
import StudentsPage from './features/students/StudentsPage'
import AttendancePage from './features/attendance/AttendancePage'
import GradesPage from './features/grades/GradesPage'
import TopicBookPage from './features/topic-book/TopicBookPage'
import PlanningPage from './features/planning/PlanningPage'
import CalendarPage from './features/calendar/CalendarPage'
import ReportsPage from './features/reports/ReportsPage'
import SettingsPage from './features/settings/SettingsPage'

import { useEffect, useCallback } from 'react'
import useSettingsStore from './core/stores/useSettingsStore'
import useSyncStore from './infrastructure/google/syncManager'
import useStudentStore from './core/stores/useStudentStore'
import useAttendanceStore from './core/stores/useAttendanceStore'
import useGradeStore from './core/stores/useGradeStore'
import useTopicBookStore from './core/stores/useTopicBookStore'
import useCalendarStore from './core/stores/useCalendarStore'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Toaster } from 'react-hot-toast'

export default function App() {
    const initSync = useSyncStore((s) => s.init)

    // Register PWA Service Worker
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r)
        },
        onRegisterError(error) {
            console.error('SW registration error', error)
        },
    })

    useEffect(() => {
        // Inicializar SDKs, Tema y verificar Auth
        useSettingsStore.getState().initDarkMode()
        initSync()

        let syncTimeout
        const triggerSync = () => {
            // Solo encolar si la aplicación ya pasó sus inicializaciones 
            // y AuthStore valida sesión en segundo plano.
            clearTimeout(syncTimeout)
            syncTimeout = setTimeout(() => {
                const { googleLinked } = useSettingsStore.getState()
                if (googleLinked) {
                    useSyncStore.getState().processQueue()
                }
            }, 5000) // Debounce de 5 segundos para consolidar guardados rápidos (ej. notas seguidas)
        }

        // Subscribirse a los cambios en los stores principales
        // zustand.subscribe se dispara en cada cambio de estado, es más eficiente que re-renderizar todo App
        const unsubs = [
            useStudentStore.subscribe(triggerSync),
            useAttendanceStore.subscribe(triggerSync),
            useGradeStore.subscribe(triggerSync),
            useTopicBookStore.subscribe(triggerSync),
            useCalendarStore.subscribe(triggerSync),
            useSettingsStore.subscribe((state, prevState) => {
                // Sincronizar solo si cambian configuraciones relevantes
                if (state.googleLinked && !prevState.googleLinked) triggerSync()
            })
        ]

        return () => {
            unsubs.forEach((unsub) => unsub())
            clearTimeout(syncTimeout)
        }
    }, [initSync])

    return (
        <HashRouter>
            <Routes>
                <Route element={<AppLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/courses" element={<CoursesPage />} />
                    <Route path="/students" element={<StudentsPage />} />
                    <Route path="/attendance" element={<AttendancePage />} />
                    <Route path="/grades" element={<GradesPage />} />
                    <Route path="/topic-book" element={<TopicBookPage />} />
                    <Route path="/planning" element={<PlanningPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>
            </Routes>
            <Toaster position="bottom-right" toastOptions={{ className: 'text-sm font-medium rounded-lg shadow-lg' }} />

            {/* PWA Update Notification */}
            {(offlineReady || needRefresh) && (
                <div className="fixed bottom-4 left-4 z-[100] animate-slide-in-up">
                    <div className="bg-bg-card border border-primary/20 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-text-primary">
                                {offlineReady ? 'App lista para uso offline' : 'Nueva versión disponible'}
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5">
                                {offlineReady ? 'Podés usar ADI sin conexión' : 'Actualizá para recibir las últimas mejoras'}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            {needRefresh && (
                                <button
                                    onClick={() => updateServiceWorker(true)}
                                    className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors"
                                >
                                    Actualizar
                                </button>
                            )}
                            <button
                                onClick={() => { setOfflineReady(false); setNeedRefresh(false) }}
                                className="px-3 py-1.5 bg-bg-hover text-text-secondary text-xs font-medium rounded-lg hover:bg-bg-hover/80 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </HashRouter>
    )
}
