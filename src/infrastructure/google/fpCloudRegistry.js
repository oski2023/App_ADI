// Registro en la Nube (Google Drive Cloud Registry) para Formación Profesional
// Permite que la PC y el Celular funcionen como un espejo automático sin pedir links.

import { initGoogleAuth, getAccessToken } from './googleAuth'
import { isGoogleConfigured } from './googleConfig'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import useFPCourseStore from '../../core/stores/useFPCourseStore'

const REGISTRY_FILE_NAME = 'App_ADI_FP_Registry.json'

/**
 * Busca si existe el archivo App_ADI_FP_Registry.json en el Google Drive del usuario.
 * @returns {Promise<{ fileId: string, data: object } | null>}
 */
export async function fetchFPCloudRegistry() {
    if (!isGoogleConfigured()) return null

    try {
        await initGoogleAuth()
        const token = getAccessToken()
        if (!token) {
            console.warn('[FPCloudRegistry] No hay token de acceso disponible para buscar el registro.')
            return null
        }

        if (typeof gapi === 'undefined' || !gapi.client?.drive) {
            console.warn('[FPCloudRegistry] Google Drive API no está lista en gapi.client.')
            return null
        }

        // Buscar el archivo por nombre
        const response = await gapi.client.drive.files.list({
            q: `name = '${REGISTRY_FILE_NAME}' and trashed = false`,
            fields: 'files(id, name, modifiedTime)',
            spaces: 'drive',
        })

        const files = response?.result?.files || []
        if (files.length === 0) {
            console.log('[FPCloudRegistry] No se encontró ningún registro previo en Google Drive.')
            return null
        }

        // Tomar el archivo más reciente
        const file = files[0]
        const fileId = file.id

        // Descargar el contenido JSON usando el Bearer token
        const fetchRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        if (!fetchRes.ok) {
            console.warn(`[FPCloudRegistry] Error ${fetchRes.status} al descargar el registro desde Drive.`)
            return null
        }

        const data = await fetchRes.json()
        console.log('[FPCloudRegistry] Registro encontrado y descargado desde Drive con éxito:', data)
        return { fileId, data }
    } catch (error) {
        console.error('[FPCloudRegistry] Error buscando o descargando el registro de Drive:', error)
        return null
    }
}

/**
 * Guarda o actualiza el archivo App_ADI_FP_Registry.json en Google Drive.
 * @param {object} [customPayload] Datos opcionales para sobrescribir o extender.
 * @returns {Promise<boolean>} true si se guardó correctamente.
 */
export async function saveFPCloudRegistry(customPayload = null) {
    if (!isGoogleConfigured()) return false

    try {
        await initGoogleAuth()
        const token = getAccessToken()
        if (!token) {
            console.warn('[FPCloudRegistry] No hay token de acceso activo para guardar en Drive.')
            return false
        }

        const currentLinks = useFPGoogleLinksStore.getState().links
        const currentCourses = useFPCourseStore.getState().courses

        const payload = {
            app: 'App_ADI',
            version: 1,
            lastUpdated: new Date().toISOString(),
            links: {
                course: currentLinks.course || null,
                topicAttendance: currentLinks.topicAttendance || null,
                attendanceSheet: currentLinks.attendanceSheet || null,
                examAct: currentLinks.examAct || null,
            },
            courses: currentCourses.map((c) => ({
                id: c.id,
                cursoNumero: c.cursoNumero || '',
                especialidad: c.especialidad || '',
                cfpNumero: c.cfpNumero || '',
                distrito: c.distrito || '',
                instructor: c.instructor || '',
                spreadsheetId: c.spreadsheetId || '',
                spreadsheetUrl: c.spreadsheetUrl || '',
                googleSheetTitle: c.googleSheetTitle || '',
            })),
            ...(customPayload || {}),
        }

        // 1. Verificar si ya existe en Drive
        const existing = await fetchFPCloudRegistry()

        if (existing?.fileId) {
            // Actualizar archivo existente (PATCH media)
            const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.fileId}?uploadType=media`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload, null, 2),
            })

            if (patchRes.ok) {
                console.log('[FPCloudRegistry] Registro actualizado en Google Drive.')
                return true
            } else {
                console.warn('[FPCloudRegistry] Falló el PATCH al actualizar en Drive:', patchRes.status)
                return false
            }
        } else {
            // Crear archivo nuevo (POST multipart)
            const boundary = '-------314159265358979323846'
            const delimiter = `\r\n--${boundary}\r\n`
            const closeDelimiter = `\r\n--${boundary}--`

            const metadata = {
                name: REGISTRY_FILE_NAME,
                mimeType: 'application/json',
                description: 'Registro de sincronización automática de Formación Profesional para App ADI',
            }

            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(payload, null, 2) +
                closeDelimiter

            const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body: multipartRequestBody,
            })

            if (createRes.ok) {
                console.log('[FPCloudRegistry] Registro creado exitosamente en Google Drive.')
                return true
            } else {
                console.warn('[FPCloudRegistry] Error al crear archivo en Drive:', createRes.status)
                return false
            }
        }
    } catch (error) {
        console.error('[FPCloudRegistry] Error guardando registro en Google Drive:', error)
        return false
    }
}

/**
 * Restaura los vínculos y cursos descargados de la nube en los stores de Zustand locales.
 * @param {object} cloudData Datos obtenidos de App_ADI_FP_Registry.json
 * @returns {{ linksRestored: number, coursesRestored: number }}
 */
export function restoreFPCloudRegistry(cloudData) {
    if (!cloudData) return { linksRestored: 0, coursesRestored: 0 }

    let linksRestored = 0
    let coursesRestored = 0

    // 1. Restaurar vínculos de las 4 solapas
    if (cloudData.links) {
        const { setLink, links: currentLinks } = useFPGoogleLinksStore.getState()
        const keys = ['course', 'topicAttendance', 'attendanceSheet', 'examAct']
        keys.forEach((k) => {
            const cloudLink = cloudData.links[k]
            if (cloudLink?.spreadsheetId) {
                setLink(k, cloudLink)
                linksRestored++
            }
        })
    }

    // 2. Restaurar cursos en la lista
    if (Array.isArray(cloudData.courses) && cloudData.courses.length > 0) {
        const importOrUpdateCourse = useFPCourseStore.getState().importOrUpdateCourse
        cloudData.courses.forEach((c) => {
            if (c.cursoNumero || c.spreadsheetId || c.especialidad) {
                importOrUpdateCourse(c)
                coursesRestored++
            }
        })
    }

    console.log(`[FPCloudRegistry] Restauración completada: ${linksRestored} vínculos, ${coursesRestored} cursos.`)
    return { linksRestored, coursesRestored }
}

/**
 * Función integral de auto-descubrimiento:
 * Busca en Drive, descarga el registro si existe y lo restaura localmente.
 * @returns {Promise<{ success: boolean, linksRestored: number, coursesRestored: number }>}
 */
export async function autoDiscoverAndSyncCloudRegistry() {
    const reg = await fetchFPCloudRegistry()
    if (!reg?.data) {
        return { success: false, linksRestored: 0, coursesRestored: 0 }
    }

    const { linksRestored, coursesRestored } = restoreFPCloudRegistry(reg.data)
    return {
        success: linksRestored > 0 || coursesRestored > 0,
        linksRestored,
        coursesRestored,
    }
}
