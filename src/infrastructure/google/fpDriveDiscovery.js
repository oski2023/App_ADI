// Servicio de Auto-Descubrimiento Inteligente de Carpetas y Archivos en Google Drive (Formación Profesional)
// Permite que al vincular un archivo o carpeta (ej. 395/26, 396/26, 397/26),
// la app descubra automáticamente los 4 archivos de trabajo:
// 1. Ficha de curso (ej: "Ficha de curso 397")
// 2. Tema y Asistencia (ej: "Planilla de tema y asistencia del instructor")
// 3. Asistencia de Alumnos (ej: "Asistencia de alumnos 397")
// 4. Actas de Examen (ej: "Acta de examen")

import { initGoogleAuth, getAccessToken } from './googleAuth'
import { isGoogleConfigured } from './googleConfig'
import { extractSpreadsheetId } from './sheetsService'

/**
 * Clasifica un archivo de Google Sheets según la nomenclatura oficial del usuario:
 * - "Ficha de curso xxx" -> 'course'
 * - "Planilla de tema y asistencia del instructor" -> 'topicAttendance'
 * - "Asistencia de alumnos xxx" -> 'attendanceSheet'
 * - "Acta de examen" -> 'examAct'
 * 
 * @param {string} fileName Nombre del archivo en Google Drive
 * @returns {'course' | 'topicAttendance' | 'attendanceSheet' | 'examAct' | null}
 */
export function matchFPFileType(fileName) {
    if (!fileName || typeof fileName !== 'string') return null
    const lower = fileName.toLowerCase().trim()

    // 1. Asistencia de Alumnos (comprobar primero para evitar solapamiento con "asistencia" de tema)
    if (
        lower.includes('asistencia de alumnos') ||
        lower.includes('asistencia de alumno') ||
        (lower.includes('asistencia') && lower.includes('alumno'))
    ) {
        return 'attendanceSheet'
    }

    // 2. Tema y Asistencia
    if (
        lower.includes('planilla de tema') ||
        lower.includes('tema y asistencia') ||
        lower.includes('libro de temas') ||
        lower.includes('libro de tema') ||
        lower.includes('instructor')
    ) {
        return 'topicAttendance'
    }

    // 3. Actas de Examen
    if (
        lower.includes('acta de examen') ||
        lower.includes('actas de examen') ||
        lower.includes('acta') ||
        lower.includes('examen')
    ) {
        return 'examAct'
    }

    // 4. Ficha de Curso
    if (
        lower.includes('ficha de curso') ||
        (lower.includes('ficha') && lower.includes('curso')) ||
        lower.startsWith('ficha')
    ) {
        return 'course'
    }

    return null
}

/**
 * Descubre la carpeta contenedora y clasifica los 4 archivos de un curso en Google Drive.
 * 
 * @param {string} [urlOrSpreadsheetId] Link o ID de la Ficha de Curso ya vinculada
 * @param {string} [cursoNumero] Número del curso (ej: "397") para buscar la carpeta si no hay parent directo
 * @returns {Promise<{
 *   success: boolean,
 *   folderId?: string,
 *   folderName?: string,
 *   links: {
 *     course?: { spreadsheetId: string, spreadsheetUrl: string, name: string },
 *     topicAttendance?: { spreadsheetId: string, spreadsheetUrl: string, name: string },
 *     attendanceSheet?: { spreadsheetId: string, spreadsheetUrl: string, name: string },
 *     examAct?: { spreadsheetId: string, spreadsheetUrl: string, name: string }
 *   },
 *   unmatchedFiles?: Array<{ id: string, name: string }>,
 *   error?: string
 * }>}
 */
export async function discoverFolderAndFilesForCourse(urlOrSpreadsheetId = null, cursoNumero = '') {
    if (!isGoogleConfigured()) {
        return { success: false, error: 'Google no está configurado en esta aplicación.', links: {} }
    }

    try {
        await initGoogleAuth()
        const token = getAccessToken()
        if (!token) {
            return { success: false, error: 'No hay sesión activa de Google.', links: {} }
        }

        if (typeof gapi === 'undefined' || !gapi.client?.drive) {
            return { success: false, error: 'API de Google Drive no disponible.', links: {} }
        }

        let folderId = null
        let folderName = ''
        const links = {}
        const unmatchedFiles = []

        const spreadsheetId = urlOrSpreadsheetId ? extractSpreadsheetId(urlOrSpreadsheetId) : null

        // 1. Intentar obtener la carpeta madre (parent) desde el archivo de Ficha de Curso
        if (spreadsheetId) {
            try {
                const fileMeta = await gapi.client.drive.files.get({
                    fileId: spreadsheetId,
                    fields: 'id, name, parents',
                })
                const parents = fileMeta?.result?.parents || []
                if (parents.length > 0) {
                    folderId = parents[0]
                    try {
                        const folderMeta = await gapi.client.drive.files.get({
                            fileId: folderId,
                            fields: 'id, name',
                        })
                        folderName = folderMeta?.result?.name || ''
                    } catch (e) {
                        console.warn('[FPDriveDiscovery] No se pudo leer el nombre de la carpeta:', e)
                    }
                }
            } catch (err) {
                console.warn('[FPDriveDiscovery] Error obteniendo parents del archivo:', err)
            }
        }

        // 2. Si no obtuvimos folderId por parent, buscar la carpeta por el número de curso (ej. "397" en "397/26")
        if (!folderId && cursoNumero) {
            const cleanCurso = String(cursoNumero).trim()
            if (cleanCurso) {
                try {
                    const folderQuery = `mimeType = 'application/vnd.google-apps.folder' and name contains '${cleanCurso}' and trashed = false`
                    const folderRes = await gapi.client.drive.files.list({
                        q: folderQuery,
                        fields: 'files(id, name)',
                        spaces: 'drive',
                    })
                    const foundFolders = folderRes?.result?.files || []
                    if (foundFolders.length > 0) {
                        folderId = foundFolders[0].id
                        folderName = foundFolders[0].name
                        console.log(`[FPDriveDiscovery] Carpeta encontrada por número de curso (${cleanCurso}):`, folderName)
                    }
                } catch (err) {
                    console.warn('[FPDriveDiscovery] Error buscando carpeta por número de curso:', err)
                }
            }
        }

        // 3. Si encontramos la carpeta, listar todos los archivos de cálculo que contiene
        if (folderId) {
            try {
                const filesQuery = `'${folderId}' in parents and trashed = false`
                const filesRes = await gapi.client.drive.files.list({
                    q: filesQuery,
                    fields: 'files(id, name, mimeType, webViewLink)',
                    spaces: 'drive',
                })
                const files = filesRes?.result?.files || []
                console.log(`[FPDriveDiscovery] Archivos encontrados en carpeta "${folderName}" (${files.length}):`, files.map((f) => f.name))

                files.forEach((f) => {
                    const detectedType = matchFPFileType(f.name)
                    const fileObj = {
                        spreadsheetId: f.id,
                        spreadsheetUrl: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
                        name: f.name,
                    }

                    if (detectedType) {
                        // Si ya tenemos uno de ese tipo, priorizar el más específico
                        if (!links[detectedType]) {
                            links[detectedType] = fileObj
                        }
                    } else {
                        unmatchedFiles.push({ id: f.id, name: f.name })
                    }
                })
            } catch (err) {
                console.error('[FPDriveDiscovery] Error listando archivos de la carpeta:', err)
            }
        }

        // Si se vinculó un spreadsheetId al inicio para la Ficha y no fue encontrado en la carpeta, asegurarlo
        if (spreadsheetId && !links.course) {
            links.course = {
                spreadsheetId,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
                name: 'Ficha de Curso',
            }
        }

        const success = Boolean(folderId) || Object.keys(links).length > 0

        return {
            success,
            folderId,
            folderName,
            links,
            unmatchedFiles,
        }
    } catch (error) {
        console.error('[FPDriveDiscovery] Error general en descubrimiento:', error)
        return {
            success: false,
            error: error?.message || 'Error desconocido buscando en Drive',
            links: {},
        }
    }
}
