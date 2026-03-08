import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard, GraduationCap, Users, ClipboardCheck,
    BookOpen, FileText, CalendarDays, BarChart3, Settings,
    NotebookPen, ChevronLeft, ChevronRight, Wifi, WifiOff, X, RefreshCw
} from 'lucide-react'
import { useState } from 'react'
import useAuthStore from '../../core/stores/useAuthStore'
import { useSyncStore, SYNC_STATUS } from '../../infrastructure/google/syncManager'

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/courses', label: 'Cursos', icon: GraduationCap },
    { path: '/students', label: 'Alumnos', icon: Users },
    { path: '/attendance', label: 'Asistencia', icon: ClipboardCheck },
    { path: '/grades', label: 'Notas', icon: BookOpen },
    { path: '/topic-book', label: 'Libro de Temas', icon: NotebookPen },
    { path: '/planning', label: 'Planificación', icon: FileText },
    { path: '/calendar', label: 'Agenda', icon: CalendarDays },
    { path: '/reports', label: 'Reportes', icon: BarChart3 },
    { path: '/settings', label: 'Configuración', icon: Settings },
]

export default function Sidebar({ collapsed, onToggle, isMobileOpen, onMobileClose }) {
    const user = useAuthStore((s) => s.user)
    const location = useLocation()
    const syncStatus = useSyncStore((s) => s.status)
    const online = useSyncStore((s) => s.online)
    const lastSync = useSyncStore((s) => s.lastSync)

    const isExpanded = !collapsed || isMobileOpen

    // Configuración del indicador de estado
    const statusConfig = {
        [SYNC_STATUS.SYNCING]: { color: 'bg-amber-400 animate-pulse', label: 'Sincronizando...' },
        [SYNC_STATUS.ERROR]: { color: 'bg-red-500', label: 'Error de conexión' },
        [SYNC_STATUS.OFFLINE]: { color: 'bg-gray-400', label: 'Modo Offline' },
        default: { color: 'bg-emerald-500', label: lastSync ? 'Sincronizado' : 'Conectado' }
    }

    const currentStatus = !online ? statusConfig[SYNC_STATUS.OFFLINE] : (statusConfig[syncStatus] || statusConfig.default)

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
                    onClick={onMobileClose}
                />
            )}
            <aside
                className={`fixed left-0 top-0 h-screen bg-bg-sidebar border-r border-border z-50 flex flex-col transition-all duration-300 ${collapsed ? 'md:w-[72px]' : 'md:w-[260px]'
                    } ${isMobileOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0'}`}
            >
                {/* Logo Section */}
                <div className="flex items-center justify-between px-6 h-20 border-b border-border shrink-0 bg-bg-sidebar">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        {isExpanded && (
                            <div className="overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                                <h1 className="text-lg font-bold text-text-primary leading-tight tracking-tight">ADI</h1>
                                <button
                                    onClick={() => useSyncStore.getState().processQueue()}
                                    className="text-[11px] leading-tight flex items-center gap-1.5 font-medium focus:outline-none bg-bg-hover hover:bg-border-light text-text-muted hover:text-text-primary px-2 py-0.5 rounded-full transition-all border border-border-light mt-0.5 group"
                                    title={`Click para forzar sincronización. Estado: ${currentStatus.label}`}
                                >
                                    <RefreshCw className={`w-3 h-3 group-hover:text-primary transition-transform ${syncStatus === SYNC_STATUS.SYNCING ? 'animate-spin text-amber-500' : ''}`} />
                                    <span>Sync</span>
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${currentStatus.color} ${syncStatus === SYNC_STATUS.SYNCING ? 'animate-pulse' : ''}`} />
                                </button>
                            </div>
                        )}
                    </div>
                    {isMobileOpen && (
                        <button onClick={onMobileClose} className="p-2 -mr-2 rounded-lg text-text-muted hover:bg-bg-hover transition-colors md:hidden">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-0.5">
                    {navItems.map(({ path, label, icon: Icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive
                                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                                } ${collapsed ? 'md:justify-center' : ''}`
                            }
                            onClick={onMobileClose}
                            title={collapsed && !isMobileOpen ? label : undefined}
                        >
                            <Icon className="w-5 h-5 shrink-0" />
                            {isExpanded && <span className="truncate">{label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* User */}
                <div className="border-t border-border p-4 bg-bg-sidebar/50 shrink-0 mt-auto">
                    <div className={`flex items-center gap-3 ${collapsed && !isMobileOpen ? 'md:justify-center' : ''}`}>
                        <div className="w-10 h-10 rounded-full border-2 border-primary bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md">
                            {user?.name?.charAt(0) || 'D'}
                        </div>
                        {isExpanded && (
                            <div className="flex-1 overflow-hidden animate-in fade-in duration-500">
                                <p className="text-sm font-bold text-text-primary truncate">{user?.name}</p>
                                <p className="text-xs text-text-muted truncate font-medium">{user?.email}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Toggle (Desktop Only) */}
                <button
                    onClick={onToggle}
                    className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-bg-card border border-border shadow-sm items-center justify-center hover:bg-bg-hover transition-colors cursor-pointer"
                >
                    {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-text-secondary" /> : <ChevronLeft className="w-3.5 h-3.5 text-text-secondary" />}
                </button>
            </aside>
        </>
    )
}
