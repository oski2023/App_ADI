// Servicio para almacenar y sincronizar la configuración y enlaces de planillas
// en el Google Drive del usuario (hoja 'ADI_Configuracion')
// Permite que el celular reconozca automáticamente los enlaces configurados en la PC

import { isGoogleConfigured } from './googleConfig'
import useFPGoogleLinksStore from '../../core/stores/useFPGoogleLinksStore'
import useFPAdminLinksStore from '../../core/stores/useFPAdminLinksStore'
import useSettingsStore from '../../core/stores/useSettingsStore'
import { setSpreadsheetId } from './sheetsService'

const CONFIG_SPREADSHEET_NAME = 'ADI_Configuracion'
let cachedConfigSpreadsheetId = null

// Buscar o crear la hoja de cálculo de configuración en el Google Drive del usuario
export async function findOrCreateConfigSpreadsheet() {
    if (!isGoogleConfigured()) return null
    if (cachedConfigSpreadsheetId) return cachedConfigSpreadsheetId

    try {
        // 1. Buscar si ya existe la hoja en Drive
        const response = await gapi.client.drive.files.list({
            q: `name = '${CONFIG_SPREADSHEET_NAME}' and mimeType = 'application/vnd.google.apps.spreadsheet' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        })

        const files = response.result.files || []
        if (files.length > 0) {
            cachedConfigSpreadsheetId = files[0].id
            return cachedConfigSpreadsheetId
        }

        // 2. Si no existe, crear la hoja de configuración
        const createRes = await gapi.client.sheets.spreadsheets.create({
            resource: {
                properties: { title: CONFIG_SPREADSHEET_NAME },
                sheets: [
                    {
                        properties: {
                            title: 'Config',
                            gridProperties: { frozenRowCount: 1 },
                        },
                    },
                ],
            },
        })

        cachedConfigSpreadsheetId = createRes.result.spreadsheetId

        // Inicializar encabezados
        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: cachedConfigSpreadsheetId,
            range: 'Config!A1:C1',
            valueInputOption: 'RAW',
            resource: {
                values: [['KEY', 'VALUE', 'UPDATED_AT']],
            },
        })

        return cachedConfigSpreadsheetId
    } catch (error) {
        console.error('[CloudConfigService] Error al buscar o crear ADI_Configuracion:', error)
        return null
    }
}

// Guardar los enlaces y configuración actual en Google Drive
export async function pushConfigToCloud() {
    if (!isGoogleConfigured()) return false

    try {
        const spreadsheetId = await findOrCreateConfigSpreadsheet()
        if (!spreadsheetId) return false

        const fpLinks = useFPGoogleLinksStore.getState().links || {}
        const fpAdminLinks = useFPAdminLinksStore.getState().links || {}
        const mainSpreadsheetUrl = useSettingsStore.getState().spreadsheetUrl || ''

        const now = new Date().toISOString()
        const rows = [
            ['fp_links', JSON.stringify(fpLinks), now],
            ['fp_admin_links', JSON.stringify(fpAdminLinks), now],
            ['main_spreadsheet_url', mainSpreadsheetUrl, now],
        ]

        await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Config!A2:C4',
            valueInputOption: 'RAW',
            resource: { values: rows },
        })

        console.log('[CloudConfigService] Configuración guardada en Google Drive exitosamente')
        return true
    } catch (error) {
        console.error('[CloudConfigService] Error al guardar configuración en Google Drive:', error)
        return false
    }
}

// Descargar la configuración desde Google Drive e hidratar los almacenes locales
export async function pullConfigFromCloud() {
    if (!isGoogleConfigured()) return null

    try {
        const spreadsheetId = await findOrCreateConfigSpreadsheet()
        if (!spreadsheetId) return null

        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Config!A2:C10',
        })

        const rows = response.result.values || []
        const parsed = {}

        rows.forEach(([key, val]) => {
            if (!key || val === undefined) return
            try {
                parsed[key] = JSON.parse(val)
            } catch {
                parsed[key] = val
            }
        })

        // Hidratar stores locales si se encontraron datos
        if (parsed.fp_links && typeof parsed.fp_links === 'object') {
            useFPGoogleLinksStore.getState().setAllLinks(parsed.fp_links)
        }

        if (parsed.fp_admin_links && typeof parsed.fp_admin_links === 'object') {
            useFPAdminLinksStore.getState().setAllLinks(parsed.fp_admin_links)
        }

        if (parsed.main_spreadsheet_url && typeof parsed.main_spreadsheet_url === 'string' && parsed.main_spreadsheet_url.trim()) {
            useSettingsStore.getState().setGoogleLinked(true, parsed.main_spreadsheet_url.trim())
            const idMatch = parsed.main_spreadsheet_url.match(/\/d\/([a-zA-Z0-9-_]+)/)
            if (idMatch) {
                setSpreadsheetId(idMatch[1])
            }
        }

        console.log('[CloudConfigService] Configuración descargada desde Google Drive e hidratada')
        return parsed
    } catch (error) {
        console.error('[CloudConfigService] Error al traer configuración de Google Drive:', error)
        return null
    }
}
