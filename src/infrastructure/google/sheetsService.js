// Stub de servicio Google Sheets API v4
// En producción: ejecuta operaciones CRUD contra el Spreadsheet del docente
// Actualmente: log + noop para desarrollo local

import { SHEET_NAMES, isGoogleConfigured } from './googleConfig'

let spreadsheetId = null

// Encabezados por hoja (usado al crear hojas nuevas o completar las faltantes en una hoja existente)
const HEADERS_MAP = {
    [SHEET_NAMES.ALUMNOS]: ['ID', 'Nombre', 'Apellido', 'DNI', 'Fecha Nacimiento', 'Teléfono', 'Email Tutor', 'ID Curso', 'Estado'],
    [SHEET_NAMES.ASISTENCIA]: ['Fecha', 'ID Alumno', 'Estado', 'ID Curso'],
    [SHEET_NAMES.NOTAS]: ['ID Alumno', 'Materia', 'Nota 1', 'Nota 2', 'Nota 3', 'Nota 4', 'Nota 5'],
    [SHEET_NAMES.LIBRO_TEMAS]: ['Fecha', 'ID Curso', 'Materia', 'Eje/Tema', 'Actividades', 'Tarea'],
    [SHEET_NAMES.AGENDA]: ['ID Evento', 'Tipo', 'Título', 'Fecha', 'Hora', 'Lugar', 'Notas', 'Alumnos Involucrados']
}

// Arma las peticiones de formato (encabezados, bandas, filtro, fila congelada) para una hoja
function buildFormattingRequests(sheetId, sheetName) {
    const headers = HEADERS_MAP[sheetName] || ['ID', 'Dato 1', 'Dato 2']
    const requests = []

    // 1. Insertar encabezados
    requests.push({
        updateCells: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
            rows: [{
                values: headers.map(h => ({
                    userEnteredValue: { stringValue: h },
                    userEnteredFormat: {
                        backgroundColor: { red: 0.1, green: 0.22, blue: 0.41 },
                        textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                        horizontalAlignment: 'CENTER'
                    }
                }))
            }],
            fields: 'userEnteredValue,userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
    })

    // 2. Colores Alternados (Banding)
    requests.push({
        addBanding: {
            bandedRange: {
                range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
                rowProperties: {
                    headerColor: { red: 0.1, green: 0.22, blue: 0.41 },
                    firstBandColor: { red: 1, green: 1, blue: 1 },
                    secondBandColor: { red: 0.95, green: 0.96, blue: 0.98 }
                }
            }
        }
    })

    // 3. Activar Filtro Básico
    requests.push({
        setBasicFilter: {
            filter: { range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: headers.length } }
        }
    })

    // 4. Inmovilizar Fila 1
    requests.push({
        updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount'
        }
    })

    return requests
}

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

        const formattingRequests = []
        response.result.sheets.forEach((sheet) => {
            formattingRequests.push(...buildFormattingRequests(sheet.properties.sheetId, sheet.properties.title))
        })

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

// Extrae el ID de un link de Google Sheets, o devuelve el texto tal cual si ya es un ID
export function extractSpreadsheetId(urlOrId) {
    if (!urlOrId) return null
    const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : urlOrId.trim()
}

// Vincular un Spreadsheet EXISTENTE: completa las pestañas que falten sin tocar las que ya existen
export async function linkExistingSpreadsheet(urlOrId) {
    if (!isGoogleConfigured()) return null

    const id = extractSpreadsheetId(urlOrId)
    if (!id) throw new Error('No se pudo interpretar el link o ID de la hoja')

    try {
        // 1. Leer la estructura actual de la hoja pegada
        const info = await gapi.client.sheets.spreadsheets.get({ spreadsheetId: id })
        const existingTitles = info.result.sheets.map(s => s.properties.title)

        // 2. Detectar qué pestañas requeridas faltan
        const requiredTitles = Object.values(SHEET_NAMES)
        const missingTitles = requiredTitles.filter(t => !existingTitles.includes(t))

        if (missingTitles.length > 0) {
            // 3. Crear solo las pestañas faltantes (sin tocar las existentes)
            const addSheetResponse = await gapi.client.sheets.spreadsheets.batchUpdate({
                spreadsheetId: id,
                resource: {
                    requests: missingTitles.map(title => ({ addSheet: { properties: { title } } }))
                }
            })

            // 4. Formatear (encabezados, bandas, filtro, fila congelada) cada pestaña nueva
            const formattingRequests = []
            addSheetResponse.result.replies.forEach((reply) => {
                const props = reply.addSheet.properties
                formattingRequests.push(...buildFormattingRequests(props.sheetId, props.title))
            })

            if (formattingRequests.length > 0) {
                await gapi.client.sheets.spreadsheets.batchUpdate({
                    spreadsheetId: id,
                    resource: { requests: formattingRequests }
                })
            }
        }

        spreadsheetId = id
        console.log('[SheetsService] Hoja existente vinculada:', id, '— pestañas agregadas:', missingTitles)

        return {
            spreadsheetId: id,
            spreadsheetUrl: info.result.spreadsheetUrl,
            missingTitles
        }
    } catch (error) {
        console.error('[SheetsService] Error al vincular hoja existente:', error)
        throw error
    }
}

// Vincular un Spreadsheet existente (solo setea el ID en memoria, sin verificar estructura)
export function setSpreadsheetId(id) {
    spreadsheetId = id
}

// ============================================================
// FORMACIÓN PROFESIONAL — vinculación de archivos individuales
// ============================================================

// Extrae el gid (identificador de pestaña) de un link de Google Sheets, si lo tiene
export function extractSheetGid(urlOrId) {
    if (!urlOrId) return null
    const match = urlOrId.match(/[#&]gid=(\d+)/)
    return match ? parseInt(match[1], 10) : null
}

// Vincular un documento de FP: guarda spreadsheetId + la pestaña EXACTA indicada por el gid del link
// (si el link no trae gid, usa la primera pestaña del archivo)
export async function linkFPDocument(urlOrId) {
    if (!isGoogleConfigured()) return null

    const id = extractSpreadsheetId(urlOrId)
    if (!id) throw new Error('No se pudo interpretar el link o ID de la hoja')
    const gid = extractSheetGid(urlOrId)

    try {
        const info = await gapi.client.sheets.spreadsheets.get({ spreadsheetId: id })

        let sheet = info.result.sheets[0]
        if (gid !== null) {
            const match = info.result.sheets.find((s) => s.properties.sheetId === gid)
            if (match) sheet = match
        }

        return {
            spreadsheetId: id,
            sheetTitle: sheet.properties.title,
            spreadsheetUrl: `${info.result.spreadsheetUrl}#gid=${sheet.properties.sheetId}`,
        }
    } catch (error) {
        console.error('[SheetsService] Error al vincular documento FP:', error)
        throw error
    }
}

// Mapeo de celdas — Ficha de Curso
const FP_COURSE_CELL_MAP = {
    cfpNumero: 'O1',
    distrito: 'O2',
    anio: 'S1',
    cursoNumero: 'S2',
    especialidad: 'C4',
    fechaInicio: 'C5',
    fechaTerminacion: 'F5',
    duracion: 'I5',
    lugarDictado: 'C6',
    instructor: 'N6',
}
const FP_COURSE_HORARIO_CELLS = { lunes: 'M5', martes: 'N5', miercoles: 'O5', jueves: 'P5', viernes: 'Q5', sabado: 'R5' }
const FP_COURSE_MATRICULA_CELLS = { v: 'S6', m: 'T6', x: 'U6' }
const FP_COURSE_STUDENT_START_ROW = 9
const FP_COURSE_STUDENT_COLUMNS = {
    documentoTipo: 'B',
    documentoNumero: 'C',
    sexo: 'D',
    apellidosNombres: 'E',
    fechaNacimiento: 'H',
    nacionalidad: 'K',
    domicilio: 'M',
    localidad: 'P',
    contacto: 'S',
}

// Sincronizar Ficha de Curso hacia su archivo vinculado (mail merge celda por celda)
export async function syncFPCourseSheet(spreadsheetId, sheetTitle, course) {
    if (!isGoogleConfigured() || !spreadsheetId) return false

    try {
        const data = []
        const pushCell = (cell, value) => data.push({ range: `${sheetTitle}!${cell}`, values: [[value ?? '']] })

        Object.entries(FP_COURSE_CELL_MAP).forEach(([field, cell]) => pushCell(cell, course[field]))
        Object.entries(FP_COURSE_HORARIO_CELLS).forEach(([dia, cell]) => pushCell(cell, course.horarios[dia]))
        Object.entries(FP_COURSE_MATRICULA_CELLS).forEach(([campo, cell]) => pushCell(cell, course.matricula[campo]))

        course.students.forEach((s, idx) => {
            const row = FP_COURSE_STUDENT_START_ROW + idx
            pushCell(`A${row}`, idx + 1)
            Object.entries(FP_COURSE_STUDENT_COLUMNS).forEach(([field, col]) => pushCell(`${col}${row}`, s[field]))
        })

        // Limpiar filas sobrantes de alumnos si se eliminaron alumnos
        for (let idx = course.students.length; idx < 35; idx++) {
            const row = FP_COURSE_STUDENT_START_ROW + idx
            pushCell(`A${row}`, '')
            Object.values(FP_COURSE_STUDENT_COLUMNS).forEach((col) => pushCell(`${col}${row}`, ''))
        }

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: { valueInputOption: 'RAW', data },
        })

        return true
    } catch (error) {
        console.error('[SheetsService] Error al sincronizar Ficha de Curso:', error)
        throw error
    }
}

// Limpiar Ficha de Curso en Google Sheets (cuando se elimina el curso)
export async function clearFPCourseSheet(spreadsheetId, sheetTitle) {
    if (!isGoogleConfigured() || !spreadsheetId) return false

    try {
        const data = []
        const pushCell = (cell, value) => data.push({ range: `${sheetTitle}!${cell}`, values: [[value ?? '']] })

        Object.values(FP_COURSE_CELL_MAP).forEach((cell) => pushCell(cell, ''))
        Object.values(FP_COURSE_HORARIO_CELLS).forEach((cell) => pushCell(cell, ''))
        Object.values(FP_COURSE_MATRICULA_CELLS).forEach((cell) => pushCell(cell, ''))

        for (let idx = 0; idx < 35; idx++) {
            const row = FP_COURSE_STUDENT_START_ROW + idx
            pushCell(`A${row}`, '')
            Object.values(FP_COURSE_STUDENT_COLUMNS).forEach((col) => pushCell(`${col}${row}`, ''))
        }

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: { valueInputOption: 'RAW', data },
        })

        return true
    } catch (error) {
        console.error('[SheetsService] Error al limpiar Ficha de Curso:', error)
        throw error
    }
}

// Mapeo de celdas — Planilla de Tema y Asistencia del Instructor
const FP_TOPIC_CELL_MAP = {
    region: 'B4',
    distrito: 'F4',
    cfpNumero: 'B5',
    cursoNumero: 'F5',
    especialidad: 'C7',
    sedeDictado: 'C9',
    mesDe: 'L5',
    instructor: 'N8',
}
const FP_TOPIC_HORARIO_CELLS = { lunes: 'G9', martes: 'H9', miercoles: 'I9', jueves: 'J9', viernes: 'K9', sabado: 'L9' }
const FP_TOPIC_START_ROW = 13
const FP_TOPIC_ENTRY_COLUMNS = {
    fecha: 'A',
    tema: 'C',
    tiempoEstimado: 'I',
    firmaInstructor: 'K',
    observaciones: 'M',
    firmaDirector: 'O',
}

// Sincronizar Tema y Asistencia del Instructor hacia su archivo vinculado
export async function syncFPTopicAttendanceSheet(spreadsheetId, sheetTitle, sheet) {
    if (!isGoogleConfigured() || !spreadsheetId) return false

    try {
        const data = []
        const pushCell = (cell, value) => data.push({ range: `${sheetTitle}!${cell}`, values: [[value ?? '']] })

        Object.entries(FP_TOPIC_CELL_MAP).forEach(([field, cell]) => pushCell(cell, sheet[field]))
        Object.entries(FP_TOPIC_HORARIO_CELLS).forEach(([dia, cell]) => pushCell(cell, sheet.horarios[dia]))

        sheet.entries.forEach((e, idx) => {
            const row = FP_TOPIC_START_ROW + idx
            Object.entries(FP_TOPIC_ENTRY_COLUMNS).forEach(([field, col]) => pushCell(`${col}${row}`, e[field]))
        })

        // Limpiar filas sobrantes de clases si se eliminaron entradas
        for (let idx = sheet.entries.length; idx < 30; idx++) {
            const row = FP_TOPIC_START_ROW + idx
            Object.values(FP_TOPIC_ENTRY_COLUMNS).forEach((col) => pushCell(`${col}${row}`, ''))
        }

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: { valueInputOption: 'RAW', data },
        })

        return true
    } catch (error) {
        console.error('[SheetsService] Error al sincronizar Tema y Asistencia:', error)
        throw error
    }
}

// Limpiar Tema y Asistencia en Google Sheets (cuando se elimina la planilla)
export async function clearFPTopicAttendanceSheet(spreadsheetId, sheetTitle) {
    if (!isGoogleConfigured() || !spreadsheetId) return false

    try {
        const data = []
        const pushCell = (cell, value) => data.push({ range: `${sheetTitle}!${cell}`, values: [[value ?? '']] })

        Object.values(FP_TOPIC_CELL_MAP).forEach((cell) => pushCell(cell, ''))
        Object.values(FP_TOPIC_HORARIO_CELLS).forEach((cell) => pushCell(cell, ''))

        for (let idx = 0; idx < 30; idx++) {
            const row = FP_TOPIC_START_ROW + idx
            Object.values(FP_TOPIC_ENTRY_COLUMNS).forEach((col) => pushCell(`${col}${row}`, ''))
        }

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: { valueInputOption: 'RAW', data },
        })

        return true
    } catch (error) {
        console.error('[SheetsService] Error al limpiar Tema y Asistencia:', error)
        throw error
    }
}

// Convierte un número de columna (1 = A, 2 = B, ...) a su letra de columna en Sheets
function numberToColumnLetter(num) {
    let col = ''
    while (num > 0) {
        const rem = (num - 1) % 26
        col = String.fromCharCode(65 + rem) + col
        num = Math.floor((num - 1) / 26)
    }
    return col
}

// Obtiene el valor formateado de una celda (ej: 'B4', 'AJ3') desde una matriz bidimensional de filas
function getCellFromGrid(rows, cellRef) {
    if (!rows || !rows.length || !cellRef) return ''
    const match = cellRef.match(/^([A-Z]+)(\d+)$/)
    if (!match) return ''
    const colLetters = match[1]
    const rowNum = parseInt(match[2], 10)

    let colIndex = 0
    for (let i = 0; i < colLetters.length; i++) {
        colIndex = colIndex * 26 + (colLetters.charCodeAt(i) - 64)
    }
    colIndex -= 1
    const rowIndex = rowNum - 1

    if (rowIndex < 0 || rowIndex >= rows.length) return ''
    const row = rows[rowIndex]
    if (!row || colIndex < 0 || colIndex >= row.length) return ''
    const val = row[colIndex]
    return val !== undefined && val !== null ? String(val) : ''
}

// Leer Tema y Asistencia desde su archivo vinculado en Google Sheets
export async function readFPTopicAttendanceSheet(spreadsheetId, sheetTitle) {
    if (!isGoogleConfigured() || !spreadsheetId) return null

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetTitle}!A1:P60`,
            valueRenderOption: 'FORMATTED_VALUE',
        })
        const rows = response.result.values || []

        const headerData = {}
        Object.entries(FP_TOPIC_CELL_MAP).forEach(([field, cell]) => {
            headerData[field] = getCellFromGrid(rows, cell)
        })

        const horarios = {}
        Object.entries(FP_TOPIC_HORARIO_CELLS).forEach(([dia, cell]) => {
            horarios[dia] = getCellFromGrid(rows, cell)
        })

        const entries = []
        for (let r = FP_TOPIC_START_ROW; r <= Math.max(rows.length, FP_TOPIC_START_ROW + 30); r++) {
            const fecha = getCellFromGrid(rows, `A${r}`)
            const tema = getCellFromGrid(rows, `C${r}`)
            const tiempoEstimado = getCellFromGrid(rows, `I${r}`)
            const firmaInstructor = getCellFromGrid(rows, `K${r}`)
            const observaciones = getCellFromGrid(rows, `M${r}`)
            const firmaDirector = getCellFromGrid(rows, `O${r}`)

            if (fecha || tema || tiempoEstimado || observaciones) {
                entries.push({
                    id: crypto.randomUUID(),
                    fecha,
                    tema,
                    tiempoEstimado,
                    firmaInstructor,
                    observaciones,
                    firmaDirector,
                })
            }
        }

        return {
            ...headerData,
            horarios,
            entries,
        }
    } catch (error) {
        console.error('[SheetsService] Error al leer Tema y Asistencia:', error)
        throw error
    }
}

// Mapeo de celdas — Asistencia de Alumnos (grilla mensual)
const FP_ATTENDANCE_CELL_MAP = {
    centroNumero: 'Y3',
    distrito: 'Y4',
    cursoNumero: 'AJ3',
    especialidad: 'C6',
    informeMes: 'T6',
    informeAnio: 'X6',
    lugarDictado: 'C7',
    enLaCalle: 'K7',
    localidad: 'X7',
}
const FP_ATTENDANCE_HORARIO_CELLS = { lunes: 'AC7', martes: 'AF7', miercoles: 'AI7', jueves: 'AM7', viernes: 'AN7', sabado: 'AO7' }
const FP_ATTENDANCE_STUDENT_START_ROW = 11
const FP_ATTENDANCE_DAY_START_COL = 6 // columna F
const FP_ATTENDANCE_BAJA_START_ROW = 21
const FP_ATTENDANCE_MOVIMIENTO_CELLS = {
    totalInicioMes: 'AM28',
    altas: 'AM29',
    bajas: 'AO29',
    totalVarones: 'AM30',
    totalMujeres: 'AM31',
    totalAlumnos: 'AM32',
}

// Sincronizar Asistencia de Alumnos hacia su archivo vinculado
export async function syncFPAttendanceSheet(spreadsheetId, sheetTitle, sheet) {
    if (!isGoogleConfigured() || !spreadsheetId) return false

    try {
        const data = []
        const pushCell = (cell, value) => data.push({ range: `${sheetTitle}!${cell}`, values: [[value ?? '']] })

        Object.entries(FP_ATTENDANCE_CELL_MAP).forEach(([field, cell]) => pushCell(cell, sheet[field]))
        Object.entries(FP_ATTENDANCE_HORARIO_CELLS).forEach(([dia, cell]) => pushCell(cell, sheet.horarios[dia]))

        sheet.students.forEach((st, idx) => {
            const row = FP_ATTENDANCE_STUDENT_START_ROW + idx
            pushCell(`B${row}`, st.sexo)
            pushCell(`C${row}`, st.apellidosNombres)
            for (let d = 1; d <= 31; d++) {
                const colLetter = numberToColumnLetter(FP_ATTENDANCE_DAY_START_COL + (d - 1))
                pushCell(`${colLetter}${row}`, st.days[d])
            }
            pushCell(`AK${row}`, st.totalAus)
            pushCell(`AL${row}`, st.totalPres)
            pushCell(`AM${row}`, st.temasTratados)
        })

        // Limpiar filas sobrantes de alumnos (hasta fila 20) si se eliminaron alumnos
        for (let idx = sheet.students.length; idx < 10; idx++) {
            const row = FP_ATTENDANCE_STUDENT_START_ROW + idx
            pushCell(`B${row}`, '')
            pushCell(`C${row}`, '')
            for (let d = 1; d <= 31; d++) {
                const colLetter = numberToColumnLetter(FP_ATTENDANCE_DAY_START_COL + (d - 1))
                pushCell(`${colLetter}${row}`, '')
            }
            pushCell(`AK${row}`, '')
            pushCell(`AL${row}`, '')
            pushCell(`AM${row}`, '')
        }

        sheet.bajas.forEach((b, idx) => {
            const row = FP_ATTENDANCE_BAJA_START_ROW + idx
            pushCell(`AM${row}`, b.sexo)
            pushCell(`AN${row}`, b.apellidosNombres)
        })

        // Limpiar filas sobrantes de bajas (filas 21 a 27) si se eliminaron bajas
        for (let idx = sheet.bajas.length; idx < 7; idx++) {
            const row = FP_ATTENDANCE_BAJA_START_ROW + idx
            pushCell(`AM${row}`, '')
            pushCell(`AN${row}`, '')
        }

        Object.entries(FP_ATTENDANCE_MOVIMIENTO_CELLS).forEach(([campo, cell]) => pushCell(cell, sheet.movimiento[campo]))

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: { valueInputOption: 'RAW', data },
        })

        return true
    } catch (error) {
        console.error('[SheetsService] Error al sincronizar Asistencia de Alumnos:', error)
        throw error
    }
}

// Limpiar Asistencia de Alumnos en Google Sheets (cuando se elimina la planilla)
export async function clearFPAttendanceSheet(spreadsheetId, sheetTitle) {
    if (!isGoogleConfigured() || !spreadsheetId) return false

    try {
        const data = []
        const pushCell = (cell, value) => data.push({ range: `${sheetTitle}!${cell}`, values: [[value ?? '']] })

        Object.values(FP_ATTENDANCE_CELL_MAP).forEach((cell) => pushCell(cell, ''))
        Object.values(FP_ATTENDANCE_HORARIO_CELLS).forEach((cell) => pushCell(cell, ''))
        Object.values(FP_ATTENDANCE_MOVIMIENTO_CELLS).forEach((cell) => pushCell(cell, ''))

        for (let row = FP_ATTENDANCE_STUDENT_START_ROW; row < FP_ATTENDANCE_BAJA_START_ROW; row++) {
            pushCell(`B${row}`, '')
            pushCell(`C${row}`, '')
            for (let d = 1; d <= 31; d++) {
                const colLetter = numberToColumnLetter(FP_ATTENDANCE_DAY_START_COL + (d - 1))
                pushCell(`${colLetter}${row}`, '')
            }
            pushCell(`AK${row}`, '')
            pushCell(`AL${row}`, '')
            pushCell(`AM${row}`, '')
        }

        for (let row = FP_ATTENDANCE_BAJA_START_ROW; row <= 27; row++) {
            pushCell(`AM${row}`, '')
            pushCell(`AN${row}`, '')
        }

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: { valueInputOption: 'RAW', data },
        })

        return true
    } catch (error) {
        console.error('[SheetsService] Error al limpiar Asistencia de Alumnos:', error)
        throw error
    }
}

// Leer Asistencia de Alumnos desde su archivo vinculado en Google Sheets
export async function readFPAttendanceSheet(spreadsheetId, sheetTitle) {
    if (!isGoogleConfigured() || !spreadsheetId) return null

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetTitle}!A1:AO50`,
            valueRenderOption: 'FORMATTED_VALUE',
        })
        const rows = response.result.values || []

        const headerData = {}
        Object.entries(FP_ATTENDANCE_CELL_MAP).forEach(([field, cell]) => {
            headerData[field] = getCellFromGrid(rows, cell)
        })

        const horarios = {}
        Object.entries(FP_ATTENDANCE_HORARIO_CELLS).forEach(([dia, cell]) => {
            horarios[dia] = getCellFromGrid(rows, cell)
        })

        const movimiento = {}
        Object.entries(FP_ATTENDANCE_MOVIMIENTO_CELLS).forEach(([campo, cell]) => {
            movimiento[campo] = getCellFromGrid(rows, cell)
        })

        const students = []
        for (let r = FP_ATTENDANCE_STUDENT_START_ROW; r < FP_ATTENDANCE_BAJA_START_ROW; r++) {
            const sexo = getCellFromGrid(rows, `B${r}`)
            const apellidosNombres = getCellFromGrid(rows, `C${r}`)
            if (!apellidosNombres && !sexo) continue

            const days = {}
            for (let d = 1; d <= 31; d++) {
                const colLetter = numberToColumnLetter(FP_ATTENDANCE_DAY_START_COL + (d - 1))
                days[d] = getCellFromGrid(rows, `${colLetter}${r}`)
            }
            const totalAus = getCellFromGrid(rows, `AK${r}`)
            const totalPres = getCellFromGrid(rows, `AL${r}`)
            const temasTratados = getCellFromGrid(rows, `AM${r}`)

            students.push({
                id: crypto.randomUUID(),
                sexo,
                apellidosNombres,
                days,
                totalAus,
                totalPres,
                temasTratados,
            })
        }

        const bajas = []
        for (let r = FP_ATTENDANCE_BAJA_START_ROW; r <= 27; r++) {
            const sexo = getCellFromGrid(rows, `AM${r}`)
            const apellidosNombres = getCellFromGrid(rows, `AN${r}`)
            if (apellidosNombres || sexo) {
                bajas.push({
                    id: crypto.randomUUID(),
                    sexo,
                    apellidosNombres,
                })
            }
        }

        return {
            ...headerData,
            horarios,
            movimiento,
            students,
            bajas,
        }
    } catch (error) {
        console.error('[SheetsService] Error al leer Asistencia de Alumnos:', error)
        throw error
    }
}

// Mapeo de celdas — Acta de Examen
const FP_EXAM_ACT_CELL_MAP = {
    cfpNumero: 'C3',
    distrito: 'G3',
    especialidad: 'M7',
    cursoNumero: 'S7',
}
const FP_EXAM_ACT_STUDENT_START_ROW = 11
const FP_EXAM_ACT_STUDENT_COLUMNS = {
    nroEgresados: 'A',
    nro: 'C',
    apellidosNombres: 'D',
    asistenciasNota: 'G',
    asistenciasLetras: 'H',
    practicasNota: 'J',
    practicasLetras: 'K',
    participacionNota: 'M',
    participacionLetras: 'N',
    examenFinalNota: 'P',
    examenFinalLetras: 'Q',
    documentoTipo: 'S',
    documentoNumero: 'T',
}
const FP_EXAM_ACT_RESUMEN_CELLS = {
    inscriptos: 'T21',
    examinados: 'T22',
    ausentes: 'T23',
    desaprobados: 'T24',
    aprobados: 'T25',
}

// Sincronizar Acta de Examen hacia su archivo vinculado
export async function syncFPExamActSheet(spreadsheetId, sheetTitle, act) {
    if (!isGoogleConfigured() || !spreadsheetId) return false

    try {
        const data = []
        const pushCell = (cell, value) => data.push({ range: `${sheetTitle}!${cell}`, values: [[value ?? '']] })

        Object.entries(FP_EXAM_ACT_CELL_MAP).forEach(([field, cell]) => pushCell(cell, act[field]))
        Object.entries(FP_EXAM_ACT_RESUMEN_CELLS).forEach(([campo, cell]) => pushCell(cell, act.resumen[campo]))

        act.students.forEach((s, idx) => {
            const row = FP_EXAM_ACT_STUDENT_START_ROW + idx
            Object.entries(FP_EXAM_ACT_STUDENT_COLUMNS).forEach(([field, col]) => pushCell(`${col}${row}`, s[field]))
        })

        await gapi.client.sheets.spreadsheets.values.batchUpdate({
            spreadsheetId,
            resource: { valueInputOption: 'RAW', data },
        })

        return true
    } catch (error) {
        console.error('[SheetsService] Error al sincronizar Acta de Examen:', error)
        throw error
    }
}

// Leer filas crudas de un documento FP vinculado (para traer datos de vuelta hacia la app)
export async function readFPRows(spreadsheetId, sheetTitle, range = 'A2:Z') {
    if (!isGoogleConfigured() || !spreadsheetId) return []

    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetTitle}!${range}`,
        })
        return response.result.values || []
    } catch (error) {
        console.error('[SheetsService] Error al leer filas de documento FP:', error)
        return []
    }
}

// Sincronizar el Registro Administrativo (papeles entregados) — limpia y vuelve a cargar todas las filas
export async function syncFPAdminRecords(spreadsheetId, sheetTitle, records) {
    if (!isGoogleConfigured() || !spreadsheetId) return false

    try {
        // Limpiar filas de datos existentes (conserva la fila 1 de encabezados)
        await gapi.client.sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `${sheetTitle}!A2:Z`,
        })

        if (records.length > 0) {
            const rows = records.map((r) => [r.id, r.mes, r.documento, r.cohorte, r.cantidad, r.estado, r.link || ''])
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: `${sheetTitle}!A1`,
                valueInputOption: 'RAW',
                resource: { values: rows },
            })
        }

        return true
    } catch (error) {
        console.error('[SheetsService] Error al sincronizar Registro Administrativo:', error)
        throw error
    }
}

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

// Leer registros de asistencia desde la hoja de Google Sheets
export async function readAttendanceRecords() {
    const rows = await readSheet(SHEET_NAMES.ASISTENCIA, 'A2:D')
    const records = {}
    rows.forEach(([date, studentId, status, courseId]) => {
        if (!date || !studentId || !status) return
        const key = courseId ? `${date}_${courseId}` : date
        if (!records[key]) records[key] = {}
        records[key][studentId] = status
    })
    return records
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