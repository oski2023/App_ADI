/**
 * Utilidades para manejo de fechas y cálculo de edad
 */

/**
 * Parsea y extrae año, mes y día de diversos formatos de fecha comunes:
 * - AAAA-MM-DD (estándar HTML5 date picker e ISO)
 * - DD/MM/AAAA o DD-MM-AAAA (estándar común en Argentina / hojas de cálculo de Sheets)
 * - Objetos Date
 * 
 * @param {string|Date} dateVal 
 * @returns {{ year: number, month: number, day: number, iso: string } | null}
 */
export function parseDateComponents(dateVal) {
    if (!dateVal) return null

    if (dateVal instanceof Date) {
        if (isNaN(dateVal.getTime())) return null
        const year = dateVal.getFullYear()
        const month = dateVal.getMonth() + 1
        const day = dateVal.getDate()
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return { year, month, day, iso }
    }

    if (typeof dateVal !== 'string') return null
    const trimmed = dateVal.trim()
    if (!trimmed) return null

    // Formato AAAA-MM-DD (o AAAA/MM/DD)
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
    if (isoMatch) {
        const year = parseInt(isoMatch[1], 10)
        const month = parseInt(isoMatch[2], 10)
        const day = parseInt(isoMatch[3], 10)
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return { year, month, day, iso }
    }

    // Formato DD/MM/AAAA o DD-MM-AAAA
    const latamMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
    if (latamMatch) {
        const day = parseInt(latamMatch[1], 10)
        const month = parseInt(latamMatch[2], 10)
        const year = parseInt(latamMatch[3], 10)
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return { year, month, day, iso }
    }

    // Intento con Date nativo (ej: ISO timestamp)
    const fallbackDate = new Date(trimmed)
    if (!isNaN(fallbackDate.getTime())) {
        const year = fallbackDate.getFullYear()
        const month = fallbackDate.getMonth() + 1
        const day = fallbackDate.getDate()
        const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return { year, month, day, iso }
    }

    return null
}

/**
 * Normaliza cualquier formato de fecha a AAAA-MM-DD para <input type="date">
 * @param {string|Date} dateVal 
 * @returns {string} Fecha en formato YYYY-MM-DD o string vacío si es inválida
 */
export function formatDateForInput(dateVal) {
    const comp = parseDateComponents(dateVal)
    return comp ? comp.iso : ''
}

/**
 * Calcula la edad en años a partir de la fecha de nacimiento.
 * Evalúa si ya cumplió años en el año actual respecto de la fecha de referencia.
 * 
 * @param {string|Date} birthDateVal 
 * @param {Date} [referenceDate=new Date()] 
 * @returns {number|string} Número de años cumplidos (0 a 130), o '' si no es calculable
 */
export function calculateAge(birthDateVal, referenceDate = new Date()) {
    const comp = parseDateComponents(birthDateVal)
    if (!comp) return ''

    const refYear = referenceDate.getFullYear()
    const refMonth = referenceDate.getMonth() + 1
    const refDay = referenceDate.getDate()

    let age = refYear - comp.year
    // Si aún no llegó el mes de cumpleaños, o es el mismo mes pero el día no llegó:
    if (refMonth < comp.month || (refMonth === comp.month && refDay < comp.day)) {
        age--
    }

    return (age >= 0 && age <= 130) ? age : ''
}
