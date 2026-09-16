// Convierte un número entero de 0 a 100 a su forma escrita en español (mayúsculas)
// Ej: 85 -> "OCHENTA Y CINCO", 100 -> "CIEN"

const UNIDADES = ['CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
const ESPECIALES = {
    10: 'DIEZ', 11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
    16: 'DIECISÉIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE',
    20: 'VEINTE', 21: 'VEINTIUNO', 22: 'VEINTIDÓS', 23: 'VEINTITRÉS', 24: 'VEINTICUATRO',
    25: 'VEINTICINCO', 26: 'VEINTISÉIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE',
}
const DECENAS = { 30: 'TREINTA', 40: 'CUARENTA', 50: 'CINCUENTA', 60: 'SESENTA', 70: 'SETENTA', 80: 'OCHENTA', 90: 'NOVENTA' }

export function numberToWordsEs(num) {
    const n = Math.round(Number(num))
    if (isNaN(n) || n < 0 || n > 100) return ''
    if (n === 100) return 'CIEN'
    if (n < 10) return UNIDADES[n]
    if (n < 30) return ESPECIALES[n]

    const decena = Math.floor(n / 10) * 10
    const unidad = n % 10
    if (unidad === 0) return DECENAS[decena]
    return `${DECENAS[decena]} Y ${UNIDADES[unidad]}`
}
