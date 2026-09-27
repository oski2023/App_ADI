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
 * Verifica si un archivo existe y si está activo o en la papelera de Google Drive.
 * @param {string} fileId
 * @returns {Promise<{ exists: boolean, trashed: boolean, notFound?: boolean, mimeType?: string, name?: string }>}
 */
export async function checkDriveFileStatus(fileId) {
    if (!isGoogleConfigured() || !fileId) return { exists: false, trashed: false }
    try {
        await initGoogleAuth()
        const res = await gapi.client.drive.files.get({
            fileId,
            fields: 'id, name, trashed, explicitlyTrashed, mimeType',
        })
        const f = res?.result
        if (!f) return { exists: false, trashed: false }
        return {
            exists: true,
            trashed: Boolean(f.trashed || f.explicitlyTrashed),
            mimeType: f.mimeType,
            name: f.name,
        }
    } catch (err) {
        const status = err?.status || err?.result?.error?.code
        if (status === 404) {
            return { exists: false, trashed: false, notFound: true }
        }
        console.warn('[FPDriveDiscovery] Error verificando archivo en Drive:', err)
        return { exists: true, trashed: false }
    }
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
 *     course?: { spreadsheetId: string, spreadsheetUrl: string, name: string, mimeType?: string, isGoogleSheet?: boolean, isExcel?: boolean },
 *     topicAttendance?: { spreadsheetId: string, spreadsheetUrl: string, name: string, mimeType?: string, isGoogleSheet?: boolean, isExcel?: boolean },
 *     attendanceSheet?: { spreadsheetId: string, spreadsheetUrl: string, name: string, mimeType?: string, isGoogleSheet?: boolean, isExcel?: boolean },
 *     examAct?: { spreadsheetId: string, spreadsheetUrl: string, name: string, mimeType?: string, isGoogleSheet?: boolean, isExcel?: boolean }
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
        const cleanCurso = String(cursoNumero || '').trim()
        const cursoDigits = cleanCurso.match(/\d+/)?.[0] || cleanCurso

        // 1. Intentar obtener la carpeta madre (parent) desde el archivo de Ficha de Curso
        if (spreadsheetId) {
            try {
                const fileMeta = await gapi.client.drive.files.get({
                    fileId: spreadsheetId,
                    fields: 'id, name, parents, trashed',
                })
                // Si la ficha de curso vinculada está en la papelera, no usarla para parents
                if (!fileMeta?.result?.trashed) {
                    const parents = fileMeta?.result?.parents || []
                    if (parents.length > 0) {
                        folderId = parents[0]
                        try {
                            const folderMeta = await gapi.client.drive.files.get({
                                fileId: folderId,
                                fields: 'id, name, trashed',
                            })
                            if (folderMeta?.result?.trashed) {
                                folderId = null
                            } else {
                                folderName = folderMeta?.result?.name || ''
                            }
                        } catch (e) {
                            console.warn('[FPDriveDiscovery] No se pudo leer el nombre de la carpeta:', e)
                        }
                    }
                }
            } catch (err) {
                console.warn('[FPDriveDiscovery] Error obteniendo parents del archivo:', err)
            }
        }

        // 2. Si no obtuvimos folderId por parent, buscar la carpeta por el número de curso (ej. "396" en "396/26" o "Curso Nº 396")
        if (!folderId && cursoDigits) {
            try {
                const folderQuery = `mimeType = 'application/vnd.google-apps.folder' and (name contains '${cursoDigits}' or name contains '${cleanCurso}') and trashed = false`
                const folderRes = await gapi.client.drive.files.list({
                    q: folderQuery,
                    fields: 'files(id, name, modifiedTime)',
                    spaces: 'drive',
                })
                const foundFolders = folderRes?.result?.files || []
                if (foundFolders.length > 0) {
                    // Tomar la carpeta más relevante o más reciente
                    foundFolders.sort((a, b) => {
                        const aTime = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0
                        const bTime = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0
                        return bTime - aTime
                    })
                    folderId = foundFolders[0].id
                    folderName = foundFolders[0].name
                    console.log(`[FPDriveDiscovery] Carpeta encontrada por número de curso (${cursoDigits}):`, folderName)
                }
            } catch (err) {
                console.warn('[FPDriveDiscovery] Error buscando carpeta por número de curso:', err)
            }
        }

        let rawFiles = []

        // 3. Si encontramos la carpeta, listar todos los archivos que contiene (no en papelera)
        if (folderId) {
            try {
                const filesQuery = `'${folderId}' in parents and trashed = false`
                const filesRes = await gapi.client.drive.files.list({
                    q: filesQuery,
                    fields: 'files(id, name, mimeType, webViewLink, modifiedTime, createdTime)',
                    spaces: 'drive',
                })
                rawFiles = filesRes?.result?.files || []
                console.log(`[FPDriveDiscovery] Archivos encontrados en carpeta "${folderName}" (${rawFiles.length}):`, rawFiles.map((f) => f.name))
            } catch (err) {
                console.error('[FPDriveDiscovery] Error listando archivos de la carpeta:', err)
            }
        } else if (cursoDigits) {
            // Fallback: si no hay carpeta contenedora pero hay curso, buscar archivos directamente por nombre y curso
            try {
                const searchFilesQuery = `name contains '${cursoDigits}' and trashed = false`
                const searchRes = await gapi.client.drive.files.list({
                    q: searchFilesQuery,
                    fields: 'files(id, name, mimeType, webViewLink, modifiedTime, createdTime)',
                    spaces: 'drive',
                })
                rawFiles = searchRes?.result?.files || []
                console.log(`[FPDriveDiscovery] Archivos encontrados por búsqueda directa (${cursoDigits}):`, rawFiles.map((f) => f.name))
            } catch (err) {
                console.warn('[FPDriveDiscovery] Error buscando archivos directamente:', err)
            }
        }

        // Ordenar archivos para elegir el mejor candidato para cada tipo:
        // 1. Google Spreadsheets nativas (application/vnd.google-apps.spreadsheet) primero.
        // 2. Coincidencia con cursoDigits en el nombre del archivo.
        // 3. Modificado más recientemente primero.
        const sortedFiles = [...rawFiles].sort((a, b) => {
            const aIsSheet = a.mimeType === 'application/vnd.google-apps.spreadsheet' ? 1 : 0
            const bIsSheet = b.mimeType === 'application/vnd.google-apps.spreadsheet' ? 1 : 0
            if (aIsSheet !== bIsSheet) return bIsSheet - aIsSheet

            if (cursoDigits) {
                const aHasCurso = (a.name || '').toLowerCase().includes(cursoDigits.toLowerCase()) ? 1 : 0
                const bHasCurso = (b.name || '').toLowerCase().includes(cursoDigits.toLowerCase()) ? 1 : 0
                if (aHasCurso !== bHasCurso) return bHasCurso - aHasCurso
            }

            const aTime = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0
            const bTime = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0
            return bTime - aTime
        })

        sortedFiles.forEach((f) => {
            const detectedType = matchFPFileType(f.name)
            const isGoogleSheet = f.mimeType === 'application/vnd.google-apps.spreadsheet'
            const isExcel = (f.name || '').toLowerCase().endsWith('.xlsx') || (f.mimeType || '').includes('openxml') || (f.mimeType || '').includes('excel')
            const fileObj = {
                spreadsheetId: f.id,
                spreadsheetUrl: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
                name: f.name,
                mimeType: f.mimeType,
                isGoogleSheet,
                isExcel,
                modifiedTime: f.modifiedTime,
            }

            if (detectedType) {
                // Si aún no tenemos link para este tipo, asignarlo
                if (!links[detectedType]) {
                    links[detectedType] = fileObj
                } else if (!links[detectedType].isGoogleSheet && isGoogleSheet) {
                    // Si el anterior era un Excel y encontramos una Google Sheet nativa, sobrescribir con la Sheet
                    links[detectedType] = fileObj
                }
            } else {
                unmatchedFiles.push({ id: f.id, name: f.name })
            }
        })

        // Si se vinculó un spreadsheetId al inicio para la Ficha y no fue encontrado en la carpeta, asegurarlo
        if (spreadsheetId && !links.course) {
            links.course = {
                spreadsheetId,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
                name: 'Ficha de Curso',
                isGoogleSheet: true,
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
