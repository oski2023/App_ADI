import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const emptyAct = () => ({
    id: crypto.randomUUID(),
    cursoId: '',
    cfpNumero: '',
    distrito: '',
    especialidad: '',
    cursoNumero: '',
    localidad: '',
    domicilioSede: '',
    diaSesion: '',
    mesSesion: '',
    anioSesion: '',
    students: [],
    vocal1: '',
    vocal2: '',
    presidente: '',
    directorRegente: '',
    inspector: '',
    resumen: {
        inscriptos: '',
        examinados: '',
        ausentes: '',
        desaprobados: '',
        aprobados: '',
    },
    googleSheetTitle: '',
    spreadsheetId: '',
})

const emptyStudent = () => ({
    id: crypto.randomUUID(),
    nroEgresados: '',
    nro: '',
    apellidosNombres: '',
    asistenciasNota: '',
    asistenciasLetras: '',
    practicasNota: '',
    practicasLetras: '',
    participacionNota: '',
    participacionLetras: '',
    examenFinalNota: '',
    examenFinalLetras: '',
    documentoTipo: 'DNI',
    documentoNumero: '',
})

const useFPExamActStore = create(
    persist(
        (set, get) => ({
            acts: [],

            addAct: (initialData = {}) => {
                const act = {
                    ...emptyAct(),
                    ...initialData,
                    id: crypto.randomUUID(),
                }
                set((state) => ({ acts: [...state.acts, act] }))
                return act.id
            },

            updateAct: (id, data) => set((state) => ({
                acts: state.acts.map((a) => (a.id === id ? { ...a, ...data } : a)),
            })),

            updateResumen: (id, campo, valor) => set((state) => ({
                acts: state.acts.map((a) =>
                    a.id === id ? { ...a, resumen: { ...a.resumen, [campo]: valor } } : a
                ),
            })),

            deleteAct: (id) => set((state) => ({
                acts: state.acts.filter((a) => a.id !== id),
            })),

            importOrUpdateAct: (actData, targetId = null) => {
                const currentActs = get().acts
                let updatedId = targetId

                if (targetId && currentActs.some((a) => a.id === targetId)) {
                    set((state) => ({
                        acts: state.acts.map((a) => (a.id === targetId ? { ...a, ...actData } : a)),
                    }))
                    return targetId
                }

                const existingIndex = currentActs.findIndex((a) => {
                    if (a.googleSheetTitle && actData.googleSheetTitle && a.googleSheetTitle === actData.googleSheetTitle) return true
                    const aCurso = (a.cursoNumero || '').trim().toLowerCase()
                    const dCurso = (actData.cursoNumero || '').trim().toLowerCase()
                    return aCurso && dCurso && aCurso === dCurso
                })

                if (existingIndex >= 0) {
                    updatedId = currentActs[existingIndex].id
                    set((state) => ({
                        acts: state.acts.map((a, idx) => (idx === existingIndex ? { ...a, ...actData } : a)),
                    }))
                } else {
                    const newAct = {
                        ...emptyAct(),
                        ...actData,
                        id: crypto.randomUUID(),
                    }
                    updatedId = newAct.id
                    set((state) => ({ acts: [...state.acts, newAct] }))
                }

                return updatedId
            },

            // Sincronización completa (Espejo de Google Sheets)
            // Permite actualizar todas las actas o solo las pertenecientes a un spreadsheet/curso específico,
            // preservando las actas de otros cursos para evitar borrados accidentales.
            syncAllFromCloud: (cloudActs, targetSpreadsheetId = null, targetCursoNumero = null) => {
                const currentActs = get().acts
                const matchedCloudActs = cloudActs.map((cAct) => {
                    const match = currentActs.find((a) => {
                        if (cAct.id && a.id === cAct.id) return true
                        if (a.googleSheetTitle && cAct.googleSheetTitle && a.googleSheetTitle.trim().toLowerCase() === cAct.googleSheetTitle.trim().toLowerCase()) return true
                        const aCurso = (a.cursoNumero || '').trim().toLowerCase()
                        const dCurso = (cAct.cursoNumero || '').trim().toLowerCase()
                        return aCurso && dCurso && aCurso === dCurso
                    })
                    return {
                        ...emptyAct(),
                        ...(match || {}),
                        ...cAct,
                        spreadsheetId: cAct.spreadsheetId || targetSpreadsheetId || match?.spreadsheetId || '',
                        id: match ? match.id : (cAct.id || crypto.randomUUID()),
                    }
                })

                let finalActs = []
                if (targetSpreadsheetId) {
                    const actsFromOtherSheets = currentActs.filter(
                        (a) => a.spreadsheetId && a.spreadsheetId !== targetSpreadsheetId
                    )
                    const otherCoursesActs = currentActs.filter(
                        (a) => !a.spreadsheetId && targetCursoNumero && a.cursoNumero && a.cursoNumero.trim().toLowerCase() !== targetCursoNumero.trim().toLowerCase()
                    )
                    finalActs = [...actsFromOtherSheets, ...otherCoursesActs, ...matchedCloudActs]
                } else if (targetCursoNumero) {
                    const otherActs = currentActs.filter(
                        (a) => (a.cursoNumero || '').trim().toLowerCase() !== targetCursoNumero.trim().toLowerCase()
                    )
                    finalActs = [...otherActs, ...matchedCloudActs]
                } else {
                    const incomingCursos = new Set(matchedCloudActs.map((a) => (a.cursoNumero || '').trim().toLowerCase()).filter(Boolean))
                    const incomingSpreadsheets = new Set(matchedCloudActs.map((a) => a.spreadsheetId).filter(Boolean))
                    const actsNotCovered = currentActs.filter((a) => {
                        const aCurso = (a.cursoNumero || '').trim().toLowerCase()
                        if (a.spreadsheetId && incomingSpreadsheets.has(a.spreadsheetId)) return false
                        if (aCurso && incomingCursos.has(aCurso)) return false
                        return true
                    })
                    finalActs = [...actsNotCovered, ...matchedCloudActs]
                }

                set({ acts: finalActs })
                return finalActs
            },

            addStudent: (actId) => set((state) => ({
                acts: state.acts.map((a) =>
                    a.id === actId ? { ...a, students: [...a.students, emptyStudent()] } : a
                ),
            })),

            updateStudent: (actId, studentId, data) => {
                set((state) => ({
                    acts: state.acts.map((a) =>
                        a.id === actId
                            ? { ...a, students: a.students.map((s) => (s.id === studentId ? { ...s, ...data } : s)) }
                            : a
                    ),
                }))
                if (data.examenFinalNota !== undefined) {
                    get().calculateResumen(actId)
                }
            },

            deleteStudent: (actId, studentId) => {
                set((state) => ({
                    acts: state.acts.map((a) =>
                        a.id === actId ? { ...a, students: a.students.filter((s) => s.id !== studentId) } : a
                    ),
                }))
                get().calculateResumen(actId)
            },

            syncStudentsFromCourse: (actId, courseStudents) => {
                set((state) => ({
                    acts: state.acts.map((a) => {
                        if (a.id !== actId) return a
                        const existing = [...a.students]
                        const updated = (courseStudents || []).map((cSt, idx) => {
                            const found = existing.find(
                                (es) => es.apellidosNombres && es.apellidosNombres.trim().toLowerCase() === (cSt.apellidosNombres || '').trim().toLowerCase()
                            )
                            if (found) {
                                return {
                                    ...found,
                                    documentoTipo: cSt.documentoTipo || found.documentoTipo,
                                    documentoNumero: cSt.documentoNumero || found.documentoNumero,
                                    apellidosNombres: cSt.apellidosNombres,
                                }
                            }
                            return {
                                ...emptyStudent(),
                                nro: String(idx + 1),
                                documentoTipo: cSt.documentoTipo || 'DNI',
                                documentoNumero: cSt.documentoNumero || '',
                                apellidosNombres: cSt.apellidosNombres || '',
                            }
                        })
                        return {
                            ...a,
                            students: updated,
                            resumen: {
                                ...a.resumen,
                                inscriptos: String(updated.length),
                            },
                        }
                    }),
                }))
            },

            calculateResumen: (actId) => {
                set((state) => ({
                    acts: state.acts.map((a) => {
                        if (a.id !== actId) return a
                        const inscriptos = a.students.length
                        let ausentes = 0
                        let desaprobados = 0
                        let aprobados = 0
                        a.students.forEach((st) => {
                            const raw = (st.examenFinalNota || '').trim()
                            if (!raw || raw.toLowerCase() === 'ausente' || raw.toUpperCase() === 'A') {
                                ausentes++
                            } else {
                                const val = Number(raw)
                                if (isNaN(val)) {
                                    ausentes++
                                } else if (val >= 70) {
                                    aprobados++
                                } else {
                                    desaprobados++
                                }
                            }
                        })
                        const examinados = inscriptos - ausentes
                        return {
                            ...a,
                            resumen: {
                                ...a.resumen,
                                inscriptos: String(inscriptos),
                                examinados: String(examinados),
                                ausentes: String(ausentes),
                                desaprobados: String(desaprobados),
                                aprobados: String(aprobados),
                            },
                        }
                    }),
                }))
            },
        }),
        {
            name: 'adi_fp_exam_acts',
        }
    )
)

export default useFPExamActStore
