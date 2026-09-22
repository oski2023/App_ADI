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
                                const days = found.days || emptyDays()
                                const presCount = DIAS_MES.filter((d) => (days[d] || '').trim().toUpperCase() === 'P').length
                                const ausCount = DIAS_MES.filter((d) => (days[d] || '').trim().toUpperCase() === 'A').length
                                return {
                                    ...found,
                                    sexo: (cSt.sexo || found.sexo || '').toUpperCase(),
                                    apellidosNombres: cSt.apellidosNombres,
                                    totalPres: String(presCount),
                                    totalAus: String(ausCount),
                                }
                            }
                            return {
                                id: crypto.randomUUID(),
                                sexo: (cSt.sexo || '').toUpperCase(),
                                apellidosNombres: cSt.apellidosNombres || '',
                                days: emptyDays(),
                                totalAus: '0',
                                totalPres: '0',
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
            // Permite actualizar todas las planillas o solo las pertenecientes a un spreadsheet/curso específico,
            // preservando las planillas de otros cursos para evitar borrados accidentales.
            syncAllFromCloud: (cloudSheets, targetSpreadsheetId = null, targetCursoNumero = null, targetCursoId = null) => {
                const currentSheets = get().sheets
                const matchedCloudSheets = cloudSheets.map((cSheet) => {
                    const match = currentSheets.find((s) => {
                        if (cSheet.id && s.id === cSheet.id) return true
                        if (s.googleSheetTitle && cSheet.googleSheetTitle && s.googleSheetTitle.trim().toLowerCase() === cSheet.googleSheetTitle.trim().toLowerCase()) {
                            if (targetSpreadsheetId && s.spreadsheetId && s.spreadsheetId === targetSpreadsheetId) return true
                            if (targetCursoId && s.cursoId && s.cursoId === targetCursoId) return true
                            const sDigits = (s.cursoNumero || '').match(/\d+/)?.[0]
                            const dDigits = (cSheet.cursoNumero || targetCursoNumero || '').match(/\d+/)?.[0]
                            if (sDigits && dDigits && sDigits === dDigits) return true
                            return true
                        }
                        const sCurso = (s.cursoNumero || '').trim().toLowerCase()
                        const dCurso = (cSheet.cursoNumero || targetCursoNumero || '').trim().toLowerCase()
                        const sMes = (s.informeMes || '').trim().toLowerCase()
                        const dMes = (cSheet.informeMes || '').trim().toLowerCase()
                        if (sCurso && dCurso && sCurso === dCurso) {
                            if (sMes && dMes && sMes === dMes) return true
                        }
                        return false
                    })
                    return {
                        ...emptySheet(),
                        ...(match || {}),
                        ...cSheet,
                        cursoId: cSheet.cursoId || targetCursoId || match?.cursoId || '',
                        cursoNumero: cSheet.cursoNumero || targetCursoNumero || match?.cursoNumero || '',
                        spreadsheetId: cSheet.spreadsheetId || targetSpreadsheetId || match?.spreadsheetId || '',
                        id: match ? match.id : (cSheet.id || crypto.randomUUID()),
                    }
                })

                let finalSheets = []
                if (targetSpreadsheetId) {
                    const sheetsFromOtherSheets = currentSheets.filter((s) => {
                        if (s.spreadsheetId && s.spreadsheetId === targetSpreadsheetId) return false
                        if (targetCursoId && s.cursoId && s.cursoId === targetCursoId) return false
                        if (targetCursoNumero) {
                            const sDigits = (s.cursoNumero || '').match(/\d+/)?.[0]
                            const tDigits = targetCursoNumero.match(/\d+/)?.[0]
                            if (sDigits && tDigits && sDigits === tDigits) return false
                            if ((s.cursoNumero || '').trim().toLowerCase() === targetCursoNumero.trim().toLowerCase()) return false
                        }
                        return true
                    })
                    finalSheets = [...sheetsFromOtherSheets, ...matchedCloudSheets]
                } else if (targetCursoId || targetCursoNumero) {
                    const otherSheets = currentSheets.filter((s) => {
                        if (targetCursoId && s.cursoId && s.cursoId === targetCursoId) return false
                        if (targetCursoNumero) {
                            const sDigits = (s.cursoNumero || '').match(/\d+/)?.[0]
                            const tDigits = targetCursoNumero.match(/\d+/)?.[0]
                            if (sDigits && tDigits && sDigits === tDigits) return false
                            if ((s.cursoNumero || '').trim().toLowerCase() === targetCursoNumero.trim().toLowerCase()) return false
                        }
                        return true
                    })
                    finalSheets = [...otherSheets, ...matchedCloudSheets]
                } else {
                    const incomingCursos = new Set(matchedCloudSheets.map((s) => (s.cursoNumero || '').trim().toLowerCase()).filter(Boolean))
                    const incomingSpreadsheets = new Set(matchedCloudSheets.map((s) => s.spreadsheetId).filter(Boolean))
                    const incomingCursoIds = new Set(matchedCloudSheets.map((s) => s.cursoId).filter(Boolean))
                    const sheetsNotCovered = currentSheets.filter((s) => {
                        const sCurso = (s.cursoNumero || '').trim().toLowerCase()
                        if (s.spreadsheetId && incomingSpreadsheets.has(s.spreadsheetId)) return false
                        if (s.cursoId && incomingCursoIds.has(s.cursoId)) return false
                        if (sCurso && incomingCursos.has(sCurso)) return false
                        return true
                    })
                    finalSheets = [...sheetsNotCovered, ...matchedCloudSheets]
                }

                set({ sheets: finalSheets })
                return finalSheets
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

            recalculateAttendanceTotals: (sheetId) => {
                set((state) => ({
                    sheets: state.sheets.map((s) => {
                        if (s.id !== sheetId) return s
                        const updatedStudents = (s.students || []).map((st) => {
                            const days = st.days || {}
                            const presCount = DIAS_MES.filter((d) => (days[d] || '').trim().toUpperCase() === 'P').length
                            const ausCount = DIAS_MES.filter((d) => (days[d] || '').trim().toUpperCase() === 'A').length
                            return {
                                ...st,
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
