import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const DIAS_MES = Array.from({ length: 31 }, (_, i) => i + 1)

const emptyDays = () => {
    const days = {}
    for (let i = 1; i <= 31; i++) days[i] = ''
    return days
}

const emptySheet = () => ({
    id: crypto.randomUUID(),
    cursoId: '',
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
    googleSheetTitle: '',
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

            addSheet: (initialData = {}) => {
                const sheet = {
                    ...emptySheet(),
                    ...initialData,
                    id: crypto.randomUUID(),
                }
                set((state) => ({ sheets: [...state.sheets, sheet] }))
                return sheet.id
            },

            updateSheet: (id, data) => set((state) => ({
                sheets: state.sheets.map((s) => (s.id === id ? { ...s, ...data } : s)),
            })),

            syncStudentsFromCourse: (sheetId, courseStudents) => {
                set((state) => ({
                    sheets: state.sheets.map((s) => {
                        if (s.id !== sheetId) return s
                        const existingStudents = [...s.students]
                        const updatedStudents = (courseStudents || []).map((cSt) => {
                            const found = existingStudents.find(
                                (es) => es.apellidosNombres && es.apellidosNombres.trim().toLowerCase() === (cSt.apellidosNombres || '').trim().toLowerCase()
                            )
                            if (found) {
                                return {
                                    ...found,
                                    sexo: cSt.sexo || found.sexo,
                                    apellidosNombres: cSt.apellidosNombres,
                                }
                            }
                            return {
                                id: crypto.randomUUID(),
                                sexo: cSt.sexo || '',
                                apellidosNombres: cSt.apellidosNombres || '',
                                days: emptyDays(),
                                totalAus: '',
                                totalPres: '',
                                temasTratados: '',
                            }
                        })
                        return { ...s, students: updatedStudents }
                    }),
                }))
            },

            // Sincronización bidireccional (PC ↔ Celular):
            // Importa un informe mensual leído desde Google Sheets. Si ya existe en este dispositivo,
            // actualiza sus alumnos y días; si no existe, lo agrega a la lista.
            importOrUpdateSheet: (sheetData, targetId = null) => {
                const currentSheets = get().sheets
                let updatedId = targetId

                if (targetId && currentSheets.some((s) => s.id === targetId)) {
                    set((state) => ({
                        sheets: state.sheets.map((s) => (s.id === targetId ? { ...s, ...sheetData } : s)),
                    }))
                    return targetId
                }

                // Coincidencia inteligente por pestaña, curso, especialidad o centro
                const existingIndex = currentSheets.findIndex((s) => {
                    if (s.googleSheetTitle && sheetData.googleSheetTitle && s.googleSheetTitle === sheetData.googleSheetTitle) {
                        return true
                    }
                    const sCurso = (s.cursoNumero || '').trim().toLowerCase()
                    const dCurso = (sheetData.cursoNumero || '').trim().toLowerCase()
                    const sMes = (s.informeMes || '').trim().toLowerCase()
                    const dMes = (sheetData.informeMes || '').trim().toLowerCase()
                    const sEsp = (s.especialidad || '').trim().toLowerCase()
                    const dEsp = (sheetData.especialidad || '').trim().toLowerCase()

                    if (sCurso && dCurso && sCurso === dCurso) {
                        if (!sMes || !dMes || sMes === dMes) return true
                    }
                    if (sEsp && dEsp && sEsp === dEsp) {
                        if (!sMes || !dMes || sMes === dMes) return true
                    }
                    if (s.centroNumero && sheetData.centroNumero && s.centroNumero === sheetData.centroNumero && sCurso && dCurso && sCurso === dCurso) {
                        return true
                    }
                    return false
                })

                if (existingIndex >= 0) {
                    updatedId = currentSheets[existingIndex].id
                    set((state) => ({
                        sheets: state.sheets.map((s, idx) => (idx === existingIndex ? { ...s, ...sheetData } : s)),
                    }))
                } else {
                    const newSheet = {
                        ...emptySheet(),
                        ...sheetData,
                        id: crypto.randomUUID(),
                    }
                    updatedId = newSheet.id
                    set((state) => ({ sheets: [...state.sheets, newSheet] }))
                }

                return updatedId
            },

            // Sincronización completa (Espejo de Google Sheets):
            // Reemplaza la lista local con todas las planillas leídas de la nube.
            // Preserva los IDs locales de los cursos que coincidan, y descarta los eliminados de la nube.
            syncAllFromCloud: (cloudSheets) => {
                const currentSheets = get().sheets
                const updatedList = cloudSheets.map((cSheet) => {
                    const match = currentSheets.find((s) => {
                        if (s.googleSheetTitle && cSheet.googleSheetTitle && s.googleSheetTitle === cSheet.googleSheetTitle) return true
                        const sCurso = (s.cursoNumero || '').trim().toLowerCase()
                        const dCurso = (cSheet.cursoNumero || '').trim().toLowerCase()
                        if (sCurso && dCurso && sCurso === dCurso) return true
                        return false
                    })
                    return {
                        ...emptySheet(),
                        ...cSheet,
                        id: match ? match.id : crypto.randomUUID(),
                    }
                })
                set({ sheets: updatedList })
                return updatedList
            },

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

            updateStudentDay: (sheetId, studentId, day, valor) => {
                const upper = (valor || '').toUpperCase()
                set((state) => ({
                    sheets: state.sheets.map((s) => {
                        if (s.id !== sheetId) return s
                        const updatedStudents = s.students.map((st) => {
                            if (st.id !== studentId) return st
                            const newDays = { ...st.days, [day]: upper }
                            const presCount = DIAS_MES.filter((d) => (newDays[d] || '').trim().toUpperCase() === 'P').length
                            const ausCount = DIAS_MES.filter((d) => (newDays[d] || '').trim().toUpperCase() === 'A').length
                            return {
                                ...st,
                                days: newDays,
                                totalPres: String(presCount),
                                totalAus: String(ausCount),
                            }
                        })
                        return { ...s, students: updatedStudents }
                    }),
                }))
                get().calculateMovimiento(sheetId)
            },

            deleteStudent: (sheetId, studentId) => {
                set((state) => ({
                    sheets: state.sheets.map((s) =>
                        s.id === sheetId ? { ...s, students: s.students.filter((st) => st.id !== studentId) } : s
                    ),
                }))
                get().calculateMovimiento(sheetId)
            },

            addBaja: (sheetId, initialData = {}) => {
                set((state) => ({
                    sheets: state.sheets.map((s) =>
                        s.id === sheetId ? { ...s, bajas: [...s.bajas, { ...emptyBaja(), ...initialData }] } : s
                    ),
                }))
                get().calculateMovimiento(sheetId)
            },

            updateBaja: (sheetId, bajaId, data) => {
                set((state) => ({
                    sheets: state.sheets.map((s) =>
                        s.id === sheetId
                            ? { ...s, bajas: s.bajas.map((b) => (b.id === bajaId ? { ...b, ...data } : b)) }
                            : s
                    ),
                }))
                get().calculateMovimiento(sheetId)
            },

            deleteBaja: (sheetId, bajaId) => {
                set((state) => ({
                    sheets: state.sheets.map((s) =>
                        s.id === sheetId ? { ...s, bajas: s.bajas.filter((b) => b.id !== bajaId) } : s
                    ),
                }))
                get().calculateMovimiento(sheetId)
            },

            calculateMovimiento: (sheetId) => {
                set((state) => ({
                    sheets: state.sheets.map((s) => {
                        if (s.id !== sheetId) return s
                        const students = s.students || []
                        const activeDays = DIAS_MES.filter((d) =>
                            students.some((st) => {
                                const v = (st.days?.[d] || '').trim().toUpperCase()
                                return v === 'P' || v === 'A'
                            })
                        )

                        let totalInicioMes = s.movimiento?.totalInicioMes || ''
                        let totalVarones = ''
                        let totalMujeres = ''
                        let totalAlumnos = ''

                        if (activeDays.length > 0) {
                            const firstDay = activeDays[0]
                            const lastDay = activeDays[activeDays.length - 1]

                            // Total al iniciar el mes: alumnos con P o A en columna inicial
                            const inicioCount = students.filter((st) => {
                                const v = (st.days?.[firstDay] || '').trim().toUpperCase()
                                return v === 'P' || v === 'A'
                            }).length
                            totalInicioMes = String(inicioCount)

                            // Alumnos activos en la última columna completada con P o A
                            const endStudents = students.filter((st) => {
                                const v = (st.days?.[lastDay] || '').trim().toUpperCase()
                                return v === 'P' || v === 'A'
                            })

                            const varonesCount = endStudents.filter((st) => {
                                const sx = (st.sexo || '').trim().toUpperCase()
                                return sx === 'M' || sx === 'V'
                            }).length

                            const mujeresCount = endStudents.filter((st) => {
                                const sx = (st.sexo || '').trim().toUpperCase()
                                return sx === 'F'
                            }).length

                            totalVarones = String(varonesCount)
                            totalMujeres = String(mujeresCount)
                            totalAlumnos = String(endStudents.length)
                        } else if (students.length > 0) {
                            totalInicioMes = String(students.length)
                        }

                        const bajasCount = String((s.bajas || []).length)

                        return {
                            ...s,
                            movimiento: {
                                ...s.movimiento,
                                totalInicioMes: totalInicioMes || s.movimiento?.totalInicioMes || '',
                                bajas: bajasCount,
                                totalVarones,
                                totalMujeres,
                                totalAlumnos,
                            },
                        }
                    }),
                }))
            },
        }),
        {
            name: 'adi_fp_attendance_sheet',
        }
    )
)

export default useFPAttendanceSheetStore
