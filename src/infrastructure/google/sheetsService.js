// Stub de servicio Google Sheets API v4
// En producción: ejecuta operaciones CRUD contra el Spreadsheet del docente
// Actualmente: log + noop para desarrollo local

import { SHEET_NAMES, isGoogleConfigured } from './googleConfig'

let spreadsheetId = null

// Crear el Spreadsheet con todas las hojas del SRS 6.2 (Real)
export async function createSpreadsheet(title = 'ADI — Agenda Docente Inteligente') {
    if (!isGoogleConfigured()) return null

    const sheetTitles = Object.values(SHEET_NAMES)

    try {
        const response = await gapi.client.sheets.spreadsheets.create({
            resource: {
                properties: { title },
                sheets: sheetTitles.map(name => ({
                    properties: { title: name }
                }))
            }
        })

        spreadsheetId = response.result.spreadsheetId
        console.log('[SheetsService] Spreadsheet creado:', spreadsheetId)

        // Definir encabezados por hoja
        const HEADERS_MAP = {
            [SHEET_NAMES.ALUMNOS]: ['ID', 'Nombre', 'Apellido', 'DNI', 'Fecha Nacimiento', 'Teléfono', 'Email Tutor', 'ID Curso', 'Estado'],
            [SHEET_NAMES.ASISTENCIA]: ['Fecha', 'ID Alumno', 'Estado', 'ID Curso'],
            [SHEET_NAMES.NOTAS]: ['ID Alumno', 'Materia', 'Nota 1', 'Nota 2', 'Nota 3', 'Nota 4', 'Nota 5'],
            [SHEET_NAMES.LIBRO_TEMAS]: ['Fecha', 'ID Curso', 'Materia', 'Eje/Tema', 'Actividades', 'Tarea'],
            [SHEET_NAMES.AGENDA]: ['ID Evento', 'Tipo', 'Título', 'Fecha', 'Hora', 'Lugar', 'Notas', 'Alumnos Involucrados']
        }

        // Preparar peticiones de formato para cada hoja creada
        const formattingRequests = []

        response.result.sheets.forEach((sheet, idx) => {
            const sheetId = sheet.properties.sheetId
            const sheetName = sheet.properties.title
            const headers = HEADERS_MAP[sheetName] || ['ID', 'Dato 1', 'Dato 2']

            // 1. Insertar encabezados
            formattingRequests.push({
                updateCells: {
                    range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
                    rows: [{
                        values: headers.map(h => ({
                            userEnteredValue: { stringValue: h },
                            userEnteredFormat: {
                                backgroundColor: { red: 0.1, green: 0.22, blue: 0.41 }, // "#1B3A6B" (Primary)
                                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                                horizontalAlignment: 'CENTER'
                            }
                        }))
                    }],
                    fields: 'userEnteredValue,userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
                }
            })

            // 2. Colores Alternados (Banding)
            formattingRequests.push({
                addBanding: {
                    bandedRange: {
                        range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
                        rowProperties: {
                            headerColor: { red: 0.1, green: 0.22, blue: 0.41 },
                            firstBandColor: { red: 1, green: 1, blue: 1 },
                            secondBandColor: { red: 0.95, green: 0.96, blue: 0.98 } // Gris muy claro
                        }
                    }
                }
            })

            // 3. Activar Filtro Básico
            formattingRequests.push({
                setBasicFilter: {
                    filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: headers.length } }
                }
            })

            // 4. Inmovilizar Fila 1
            formattingRequests.push({
                updateSheetProperties: {
                    properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                    fields: 'gridProperties.frozenRowCount'
                }
            })
        })

        // Ejecutar las mejoras visuales
        if (formattingRequests.length > 0) {
            await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: { requests: formattingRequests }
            })
        }

        return {
            spreadsheetId,
            spreadsheetUrl: response.result.spreadsheetUrl
        }
    } catch (error) {
        console.error('[SheetsService] Error al crear spreadsheet:', error)
        throw error
    }
}

// Vincular un Spreadsheet existente
export function setSpreadsheetId(id) {
    spreadsheetId = id
}

// Leer datos de una hoja (Real)
export async function readSheet(sheetName, range = 'A:Z') {
    if (!isGoogleConfigured() || !spreadsheetId) return []

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!${range}`,
        })
        return response.result.values || []
    } catch (error) {
        console.error(`[SheetsService] Error al leer ${sheetName}:`, error)
        return []
    }
}

// Agregar filas a una hoja (Real)
export async function appendRows(sheetName, values) {
    if (!isGoogleConfigured() || !spreadsheetId || !values.length) return null

    try {
        const response = await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'RAW',
            resource: { values },
        })
        return response.result
    } catch (error) {
        console.error(`[SheetsService] Error al agregar filas en ${sheetName}:`, error)
        throw error
    }
}

// Actualizar filas en una hoja (Real)
export async function updateRows(sheetName, range, values) {
    if (!isGoogleConfigured() || !spreadsheetId) return null

    try {
        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!${range}`,
            valueInputOption: 'RAW',
            resource: { values },
        })
        return response.result
    } catch (error) {
        console.error(`[SheetsService] Error al actualizar ${sheetName}:`, error)
        throw error
    }
}

// Limpiar una hoja (Útil para re-sincronizar)
export async function clearSheet(sheetName) {
    if (!isGoogleConfigured() || !spreadsheetId) return null
    try {
        await gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `${sheetName}!A2:Z`, // Preserva los encabezados de la fila 1
        })
    } catch (error) {
        console.error(`[SheetsService] Error al limpiar ${sheetName}:`, error)
    }
}

// Sincronizar un módulo completo (Real - Snapshot approach)
export async function syncModule(sheetName, data, formatFn) {
    if (!isGoogleConfigured() || !spreadsheetId) return false

    try {
        // 1. Limpiar hoja actual
        await clearSheet(sheetName)

        // 2. Formatear y subir nuevos datos
        const rows = data.map(formatFn)
        if (rows.length > 0) {
            await appendRows(sheetName, rows)
        }

        return true
    } catch (error) {
        console.error(`[SheetsService] Fallo en sincronización de ${sheetName}:`, error)
        throw error
    }
}

// Funciones de sincronización específicas por módulo

export async function syncStudents(students) {
    return syncModule(SHEET_NAMES.ALUMNOS, students, (s) => [
        s.id, s.name, s.lastName, s.dni, s.birthDate, s.phone, s.tutorEmail, s.courseId, s.status,
    ])
}

export async function syncAttendance(records) {
    const rows = []
    Object.entries(records).forEach(([key, dayRecord]) => {
        const [date, courseId] = key.split('_')
        Object.entries(dayRecord).forEach(([studentId, status]) => {
            rows.push([date, studentId, status, courseId])
        })
    })
    return syncModule(SHEET_NAMES.ASISTENCIA, rows, (r) => r)
}

export async function syncGrades(grades, subjects) {
    const rows = []
    Object.entries(grades).forEach(([key, noteArray]) => {
        const [studentId, subjectId] = key.split('_')
        const subject = subjects.find((s) => s.id === subjectId)
        rows.push([studentId, subject?.name || subjectId, ...noteArray])
    })
    return syncModule(SHEET_NAMES.NOTAS, rows, (r) => r)
}

export async function syncTopicBook(entries) {
    return syncModule(SHEET_NAMES.LIBRO_TEMAS, entries, (e) => [
        e.date, e.courseId, e.subject, e.topic, e.activity, e.homework || '',
    ])
}

export async function syncCalendarEvents(events) {
    return syncModule(SHEET_NAMES.AGENDA, events, (e) => [
        e.id, e.type, e.title, e.date, e.time || '', e.place || '', e.notes || '', (e.students || []).join(','),
    ])
}
