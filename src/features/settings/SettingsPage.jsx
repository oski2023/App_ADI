import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Card, CardBody } from '../../shared/components/Card'
import Button from '../../shared/components/Button'
import Badge from '../../shared/components/Badge'
import { Input, Select } from '../../shared/components/Input'
import { Settings, Link2, Shield, Bell, Palette, Save, ExternalLink, Check, Sun, Moon, Monitor, AlertTriangle } from 'lucide-react'
import useSettingsStore from '../../core/stores/useSettingsStore'
import useAuthStore from '../../core/stores/useAuthStore'
import toast from 'react-hot-toast'
import { signIn, signOut } from '../../infrastructure/google/googleAuth'
import { createSpreadsheet } from '../../infrastructure/google/sheetsService'
import useSyncStore from '../../infrastructure/google/syncManager'

export default function SettingsPage() {
    const { settings, updateSettings, googleLinked, setGoogleLinked, darkMode, toggleDarkMode } = useSettingsStore(useShallow((s) => ({ settings: s.settings, updateSettings: s.updateSettings, googleLinked: s.googleLinked, setGoogleLinked: s.setGoogleLinked, darkMode: s.darkMode, toggleDarkMode: s.toggleDarkMode })))
    const { user, setUser } = useAuthStore(useShallow((s) => ({ user: s.user, setUser: s.setUser })))

    const [localSettings, setLocalSettings] = useState({
        ...settings,
        userName: user?.name || '',
        userRole: user?.role || '',
        userEmail: user?.email || ''
    })
    const [isLinking, setIsLinking] = useState(false)

    const handleSave = () => {
        updateSettings(localSettings)

        if (localSettings.userName !== undefined || localSettings.userRole !== undefined || localSettings.userEmail !== undefined) {
            useAuthStore.getState().updateProfile({
                name: (localSettings.userName || '').trim() || 'Mi Perfil',
                role: localSettings.userRole || 'Docente',
                email: (localSettings.userEmail || '').trim() || ''
            })
        }

        toast.success('Configuración y perfil guardados exitosamente')
    }

    const handleGoogleConnection = async () => {
        setIsLinking(true)
        try {
            if (googleLinked) {
                await signOut()
                setGoogleLinked(false, null)
                toast.success('Cuenta desvinculada exitosamente')
            } else {
                const googleUser = await signIn()

                // Actualizar info de usuario con datos de Google
                setUser({
                    ...googleUser,
                    role: 'Docente'
                })

                // Crear Spreadsheet si no existe
                toast.loading('Creando base de datos en Google Sheets...', { id: 'g-sync' })
                const sheet = await createSpreadsheet()

                setGoogleLinked(true, sheet.spreadsheetUrl)
                toast.success('¡App vinculada y base de datos creada!', { id: 'g-sync' })

                // Forzar carga inicial de datos preexistentes a Google Sheets
                setTimeout(() => {
                    useSyncStore.getState().processQueue()
                }, 500)
            }
        } catch (error) {
            console.error('Auth Error:', error)
            toast.error(error.error === 'popup_closed_by_user'
                ? 'Se cerró la ventana antes de completar'
                : 'Error al vincular con Google', { id: 'g-sync' })
        } finally {
            setIsLinking(false)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Configuración</h1>
                    <p className="text-sm text-text-secondary mt-1">Personalizá la aplicación según tus necesidades</p>
                </div>
                <Button icon={Save} variant="primary" onClick={handleSave}>
                    Guardar Cambios
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-semibold text-text-primary">Perfil del Docente</h2>
                    </div>
                    <CardBody className="space-y-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-xl font-bold">
                                {localSettings.userName?.charAt(0) || 'D'}
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-text-primary">{localSettings.userName || 'Mi Perfil'}</p>
                                <p className="text-sm text-text-secondary">{localSettings.userEmail || user?.email}</p>
                                <Badge variant="primary" className="mt-1">{localSettings.userRole || 'Docente'}</Badge>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Nombre Mostrar</label>
                                <Input
                                    value={localSettings.userName}
                                    onChange={(e) => setLocalSettings({ ...localSettings, userName: e.target.value })}
                                    placeholder="Ej. Prof. García"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Cargo / Especialidad</label>
                                <Select
                                    value={localSettings.userRole}
                                    onChange={(e) => setLocalSettings({ ...localSettings, userRole: e.target.value })}
                                    options={[
                                        { value: 'Maestro/a', label: 'Maestro/a' },
                                        { value: 'Profesor/a', label: 'Profesor/a' },
                                        { value: 'Instructor/a', label: 'Instructor/a' },
                                        { value: 'Preceptor/a', label: 'Preceptor/a' },
                                        { value: 'Director/a', label: 'Director/a' },
                                        { value: 'Docente', label: 'Docente' },
                                        { value: 'Otro', label: 'Otro' },
                                    ]}
                                    placeholder="Seleccionar cargo..."
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-text-secondary mb-1">Correo Electrónico</label>
                                <Input
                                    type="email"
                                    value={localSettings.userEmail}
                                    onChange={(e) => setLocalSettings({ ...localSettings, userEmail: e.target.value })}
                                    placeholder="ejemplo@escuela.com"
                                />
                            </div>
                        </div>
                    </CardBody>
                </Card>

                {/* Appearance / Dark Mode */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                        <Palette className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-semibold text-text-primary">Apariencia</h2>
                    </div>
                    <CardBody className="space-y-4">
                        <p className="text-sm text-text-secondary">Seleccioná el tema de la interfaz</p>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { value: false, icon: Sun, label: 'Claro', colors: 'bg-amber-50 border-amber-200 text-amber-600' },
                                { value: true, icon: Moon, label: 'Oscuro', colors: 'bg-indigo-950 border-indigo-700 text-indigo-300' },
                            ].map(({ value, icon: Icon, label, colors }) => {
                                const isActive = darkMode === value
                                return (
                                    <button
                                        key={label}
                                        onClick={() => { if (darkMode !== value) toggleDarkMode() }}
                                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${isActive
                                            ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/20'
                                            : 'border-border hover:border-primary/40 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-text-secondary'}`}>{label}</span>
                                        {isActive && (
                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                            <button
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-border opacity-50 cursor-not-allowed"
                                disabled
                            >
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-bg-hover">
                                    <Monitor className="w-5 h-5 text-text-muted" />
                                </div>
                                <span className="text-sm font-medium text-text-muted">Sistema</span>
                                <span className="text-[10px] text-text-muted">Próximamente</span>
                            </button>
                        </div>
                    </CardBody>
                </Card>

                {/* Google Integration */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-semibold text-text-primary">Integración Google Workspace</h2>
                    </div>
                    <CardBody className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-hover">
                            <div>
                                <p className="text-sm font-medium text-text-primary">Google Sheets</p>
                                <p className="text-xs text-text-secondary">Sincronización de datos</p>
                            </div>
                            <Badge variant={googleLinked ? 'success' : 'neutral'} dot>{googleLinked ? 'Conectado' : 'Desconectado'}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-hover">
                            <div>
                                <p className="text-sm font-medium text-text-primary">Google Drive</p>
                                <p className="text-xs text-text-secondary">Almacenamiento y backup</p>
                            </div>
                            <Badge variant={googleLinked ? 'success' : 'neutral'} dot>{googleLinked ? 'Conectado' : 'Desconectado'}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-bg-hover">
                            <div>
                                <p className="text-sm font-medium text-text-primary">Google Calendar</p>
                                <p className="text-xs text-text-secondary">Sincronización de eventos</p>
                            </div>
                            <Badge variant={googleLinked ? 'success' : 'neutral'} dot>{googleLinked ? 'Conectado' : 'Desconectado'}</Badge>
                        </div>
                        {googleLinked ? (
                            <div className="flex gap-2">
                                <Button
                                    variant="primary"
                                    onClick={() => window.open(localSettings.spreadsheetUrl, '_blank')}
                                    className="flex-1 justify-center bg-success hover:bg-success/90 border-0"
                                >
                                    Ver en Drive
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleGoogleConnection}
                                    loading={isLinking}
                                    disabled={isLinking}
                                    className="flex-1 justify-center !border-error text-error hover:!bg-error hover:text-white"
                                >
                                    Desvincular
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="primary"
                                icon={ExternalLink}
                                onClick={handleGoogleConnection}
                                loading={isLinking}
                                disabled={isLinking}
                                className="w-full justify-center"
                            >
                                Vincular con Google
                            </Button>
                        )}
                    </CardBody>
                </Card>

                {/* Academic Settings */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-semibold text-text-primary">Configuración Académica</h2>
                    </div>
                    <CardBody className="space-y-4">
                        <Input
                            id="threshold" type="number" label="Umbral de Inasistencia (%)"
                            value={localSettings.absenceThreshold}
                            onChange={(e) => setLocalSettings({ ...localSettings, absenceThreshold: parseInt(e.target.value) || 0 })}
                        />
                        <Input
                            id="passingGrade" type="number" label="Nota de Aprobación"
                            value={localSettings.passingGrade}
                            onChange={(e) => setLocalSettings({ ...localSettings, passingGrade: parseInt(e.target.value) || 0 })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                id="gradeMin" type="number" label="Nota Mínima"
                                value={localSettings.gradeMin}
                                onChange={(e) => setLocalSettings({ ...localSettings, gradeMin: parseInt(e.target.value) || 0 })}
                            />
                            <Input
                                id="gradeMax" type="number" label="Nota Máxima"
                                value={localSettings.gradeMax}
                                onChange={(e) => setLocalSettings({ ...localSettings, gradeMax: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <Input
                            id="maxPartials" type="number" label="Máx. Notas Parciales"
                            value={localSettings.maxPartialGrades}
                            onChange={(e) => setLocalSettings({ ...localSettings, maxPartialGrades: parseInt(e.target.value) || 0 })}
                        />
                    </CardBody>
                </Card>

                {/* Notifications */}
                <Card>
                    <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        <h2 className="text-base font-semibold text-text-primary">Notificaciones</h2>
                    </div>
                    <CardBody className="space-y-3">
                        {[
                            { label: 'Alertas de inasistencia', desc: 'Cuando un alumno supera el umbral configurado', enabled: true },
                            { label: 'Recordatorio de eventos', desc: '24 hs antes de cada evento en la agenda', enabled: true },
                            { label: 'Notas pendientes', desc: 'Recordatorio de notas faltantes por cargar', enabled: false },
                            { label: 'Reportes automáticos', desc: 'Generación automática de reporte semanal', enabled: false },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-hover transition-colors">
                                <div>
                                    <p className="text-sm font-medium text-text-primary">{item.label}</p>
                                    <p className="text-xs text-text-secondary">{item.desc}</p>
                                </div>
                                <button
                                    className={`w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer relative ${item.enabled ? 'bg-primary' : 'bg-border'}`}
                                    onClick={() => { }}
                                >
                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${item.enabled ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        ))}
                    </CardBody>
                </Card>

                {/* Danger Zone */}
                <Card className="border-error/20 bg-error/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-error" />
                    <div className="px-5 py-4 border-b border-error/10 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-error" />
                        <h2 className="text-base font-semibold text-error">Zona de Peligro</h2>
                    </div>
                    <CardBody className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-text-primary">Restaurar de Fábrica</p>
                                <p className="text-xs text-text-secondary pr-4">Esta acción eliminará de forma irreversible todos los datos locales, notas y configuraciones guardadas en este dispositivo.</p>
                            </div>
                            <Button
                                variant="outline"
                                className="!border-error !text-error hover:!bg-error hover:!text-white shrink-0"
                                onClick={() => {
                                    if (window.confirm('🚨 ¿ELIMINAR TODOS LOS DATOS?\Esta acción NO se puede deshacer. Vas a perder alumnos, notas y configuraciones locales.')) {
                                        localStorage.clear()
                                        sessionStorage.clear()
                                        window.location.href = '/'
                                    }
                                }}
                            >
                                Borrar Datos y Reiniciar
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>

        </div>
    )
}
