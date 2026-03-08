import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import useSettingsStore from './core/stores/useSettingsStore'
import ErrorBoundary from './shared/components/ErrorBoundary'

// Aplicar modo oscuro antes del primer render para evitar flash
// El middleware persist rehidrata sincrónicamente desde localStorage
useSettingsStore.getState().initDarkMode()

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </StrictMode>,
)
