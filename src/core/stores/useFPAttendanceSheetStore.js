import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const emptyDays = () => {
    const days = {}
    for (let i = 1; i <= 31; i++) days[i] = ''
    return days
}

const emptySheet = () => ({
    id: crypto.randomUUID(),
    centroNumero: '',
    distrito: '',
    tipo: '',
    fo: '',
    cursoNumero: '',
    especialidad: '',
    informeMes: '',
    informeAnio: '',
    lugarDictado: '',
    enLaCalle: '',
    localidad: '',
    horarios: { lunes: '', martes: '', miercoles: '', jueves: '', viernes: '', sabado: '' },
    students: [],
    bajas: [],
    movimiento: {
        totalInicioMes: '',
        altas: '',
        bajas: '',
        totalVarones: '',
        totalMujeres: '',
        totalAlumnos: '',
    },
    firma: '',
    instructor: '',
    entrego: '',
    recibio: '',
})

const emptyStudent = () => ({
    id: crypto.randomUUID(),
    sexo: '',
    apellidosNombres: '',
    days: emptyDays(),
    totalAus: '',
    totalPres: '',
    temasTratados: '',
})

const emptyBaja = () => ({
    id: crypto.randomUUID(),
    sexo: '',
    apellidosNombres: '',
})

const useFPAttendanceSheetStore = create(
    persist(
        (set, get) => ({
            sheets: [],

            addSheet: () => {
                const sheet = emptySheet()
                set((state) => ({ sheets: [...state.sheets, sheet] }))
                return sheet.id
            },

            updateSheet: (id, data) => set((state) => ({
                sheets: state.sheets.map((s) => (s.id === id ? { ...s, ...data } : s)),
            })),

            updateSheetHorario: (id, dia, valor) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === id ? { ...s, horarios: { ...s.horarios, [dia]: valor } } : s
                ),
            })),

            updateMovimiento: (id, campo, valor) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === id ? { ...s, movimiento: { ...s.movimiento, [campo]: valor } } : s
                ),
            })),

            deleteSheet: (id) => set((state) => ({
                sheets: state.sheets.filter((s) => s.id !== id),
            })),

            addStudent: (sheetId) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === sheetId ? { ...s, students: [...s.students, emptyStudent()] } : s
                ),
            })),

            updateStudent: (sheetId, studentId, data) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === sheetId
                        ? { ...s, students: s.students.map((st) => (st.id === studentId ? { ...st, ...data } : st)) }
                        : s
                ),
            })),

            updateStudentDay: (sheetId, studentId, day, valor) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === sheetId
                        ? {
                            ...s,
                            students: s.students.map((st) =>
                                st.id === studentId ? { ...st, days: { ...st.days, [day]: valor } } : st
                            ),
                        }
                        : s
                ),
            })),

            deleteStudent: (sheetId, studentId) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === sheetId ? { ...s, students: s.students.filter((st) => st.id !== studentId) } : s
                ),
            })),

            addBaja: (sheetId) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === sheetId ? { ...s, bajas: [...s.bajas, emptyBaja()] } : s
                ),
            })),

            updateBaja: (sheetId, bajaId, data) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === sheetId
                        ? { ...s, bajas: s.bajas.map((b) => (b.id === bajaId ? { ...b, ...data } : b)) }
                        : s
                ),
            })),

            deleteBaja: (sheetId, bajaId) => set((state) => ({
                sheets: state.sheets.map((s) =>
                    s.id === sheetId ? { ...s, bajas: s.bajas.filter((b) => b.id !== bajaId) } : s
                ),
            })),
        }),
        {
            name: 'adi_fp_attendance_sheet',
        }
    )
)

export default useFPAttendanceSheetStore
