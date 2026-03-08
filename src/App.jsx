import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

import { Toaster } from 'react-hot-toast'

import { useEffect } from 'react'
import useSettingsStore from './core/stores/useSettingsStore'
import useSyncStore from './infrastructure/google/syncManager'
import useStudentStore from './core/stores/useStudentStore'
import useAttendanceStore from './core/stores/useAttendanceStore'
import useGradeStore from './core/stores/useGradeStore'
import useTopicBookStore from './core/stores/useTopicBookStore'
import useCalendarStore from './core/stores/useCalendarStore'

export default function App() {
    const initSync = useSyncStore((s) => s.init)

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
        <BrowserRouter>
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
        </BrowserRouter>
    )
}
