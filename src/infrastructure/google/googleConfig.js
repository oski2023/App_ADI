// Configuración de Google APIs — Placeholder para credenciales reales
// Para activar la integración real con Google Workspace:
// 1. Crear proyecto en Google Cloud Console (https://console.cloud.google.com)
// 2. Habilitar: Google Sheets API v4, Google Drive API v3, Google Calendar API v3
// 3. Crear credenciales OAuth 2.0 para aplicación web
// 4. Reemplazar CLIENT_ID y API_KEY con los valores reales

export const GOOGLE_CONFIG = {
    CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    API_KEY: import.meta.env.VITE_GOOGLE_API_KEY || '',
    SCOPES: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/calendar',
    ].join(' '),
    DISCOVERY_DOCS: [
        'https://sheets.googleapis.com/$discovery/rest?version=v4',
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
        'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
    ],
}

// Estructura de hojas del Spreadsheet (SRS 6.2)
export const SHEET_NAMES = {
    DOCENTES: 'Docentes',
    CURSOS: 'Cursos',
    ALUMNOS: 'Alumnos',
    ASISTENCIA: 'Asistencia',
    RESUMEN_ASISTENCIA: 'Resumen_Asistencia',
    NOTAS: 'Notas',
    MATERIAS: 'Materias',
    LIBRO_TEMAS: 'LibroTemas',
    AGENDA: 'Agenda',
    REPORTES: 'Reportes',
}

// Verificar si las credenciales están configuradas
export const isGoogleConfigured = () =>
    GOOGLE_CONFIG.CLIENT_ID !== '' && GOOGLE_CONFIG.API_KEY !== ''
