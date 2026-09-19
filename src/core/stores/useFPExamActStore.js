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

            syncAllFromCloud: (cloudActs) => {
                const currentActs = get().acts
                const updatedList = cloudActs.map((cAct) => {
                    const match = currentActs.find((a) => {
                        if (a.googleSheetTitle && cAct.googleSheetTitle && a.googleSheetTitle === cAct.googleSheetTitle) return true
                        const aCurso = (a.cursoNumero || '').trim().toLowerCase()
                        const dCurso = (cAct.cursoNumero || '').trim().toLowerCase()
                        return aCurso && dCurso && aCurso === dCurso
                    })
                    return {
                        ...emptyAct(),
                        ...cAct,
                        id: match ? match.id : crypto.randomUUID(),
                    }
                })
                set({ acts: updatedList })
                return updatedList
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
