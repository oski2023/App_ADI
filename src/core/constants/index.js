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
    OTHER: 'otro',
}

export const EVENT_COLORS = {
    feriado: '#C62828',
    plenaria: '#1A56A0',
    padres: '#2E7D32',
    examen: '#E65100',
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

export const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const DAYS_FULL_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
