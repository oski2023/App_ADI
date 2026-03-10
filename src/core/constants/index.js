// Constantes y datos semilla para la aplicación

export const ATTENDANCE_STATES = {
    PRESENT: 'P',
    ABSENT: 'A',
    LATE: 'T',
}

export const ATTENDANCE_LABELS = {
    P: 'Presente',
    A: 'Ausente',
    T: 'Tarde',
}

export const ATTENDANCE_COLORS = {
    P: 'text-secondary',
    A: 'text-error',
    T: 'text-warning',
}

export const EVENT_TYPES = {
    HOLIDAY: 'feriado',
    PLENARY: 'plenaria',
    PARENTS: 'padres',
    EXAM: 'examen',
    STRIKE: 'paro',
    OTHER: 'otro',
}

export const EVENT_COLORS = {
    feriado: '#C62828',
    plenaria: '#1A56A0',
    padres: '#2E7D32',
    examen: '#E65100',
    paro: '#8E24AA', // Purple for strikes
    otro: '#64748B',
}

export const GRADE_STATUS = {
    APPROVED: 'aprobado',
    FAILED: 'reprobado',
    PENDING: 'pendiente',
}

export const DEFAULT_SETTINGS = {
    absenceThreshold: 25,
    gradeMin: 1,
    gradeMax: 10,
    passingGrade: 6,
    maxPartialGrades: 4,
}

export const SEED_COURSES = []
export const SEED_STUDENTS = []
export const SEED_SUBJECTS = []
export const SEED_EVENTS = []

export const NATIONAL_HOLIDAYS = [
    { date: '2026-01-01', title: 'Año Nuevo' },
    { date: '2026-02-16', title: 'Carnaval' },
    { date: '2026-02-17', title: 'Carnaval' },
    { date: '2026-03-24', title: 'Día de la Memoria' },
    { date: '2026-04-02', title: 'Día del Veterano y los Caídos en Malvinas' },
    { date: '2026-04-03', title: 'Viernes Santo' },
    { date: '2026-05-01', title: 'Día del Trabajador' },
    { date: '2026-05-25', title: 'Día de la Revolución de Mayo' },
    { date: '2026-06-20', title: 'Día de la Bandera' },
    { date: '2026-07-09', title: 'Día de la Independencia' },
    { date: '2026-08-17', title: 'Paso a la Inmortalidad San Martín' },
    { date: '2026-09-11', title: 'Día del Maestro' },
    { date: '2026-10-12', title: 'Día del Respeto a la Diversidad Cultural' },
    { date: '2026-11-20', title: 'Día de la Soberanía Nacional' },
    { date: '2026-12-08', title: 'Inmaculada Concepción de María' },
    { date: '2026-12-25', title: 'Navidad' }
]

export const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const DAYS_FULL_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
