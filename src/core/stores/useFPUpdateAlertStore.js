import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store para gestionar recordatorios de actualización pendientes entre
 * Ficha de Curso, Asistencia de Alumnos y Actas de Examen.
 */
const useFPUpdateAlertStore = create(
    persist(
        (set, get) => ({
            // pendingUpdates: { [courseId]: { attendance: true, exam: true, courseName: '...', cursoNumero: '...' } }
            pendingUpdates: {},

            setPendingUpdate: (courseId, courseName = '', cursoNumero = '') => {
                if (!courseId) return
                set((state) => ({
                    pendingUpdates: {
                        ...state.pendingUpdates,
                        [courseId]: {
                            attendance: true,
                            exam: true,
                            courseName: courseName || 'Curso',
                            cursoNumero: cursoNumero || '',
                            timestamp: Date.now(),
                        },
                    },
                }))
            },

            clearAttendanceAlert: (courseId, cursoNumero = '') => {
                set((state) => {
                    const updates = { ...state.pendingUpdates }
                    let modified = false

                    // Limpieza directa por courseId
                    if (courseId && updates[courseId]) {
                        updates[courseId] = { ...updates[courseId], attendance: false }
                        if (!updates[courseId].attendance && !updates[courseId].exam) {
                            delete updates[courseId]
                        }
                        modified = true
                    }

                    // Limpieza por coincidencia de cursoNumero
                    if (cursoNumero) {
                        const targetNum = cursoNumero.trim().toLowerCase()
                        Object.keys(updates).forEach((id) => {
                            if (updates[id]?.cursoNumero && updates[id].cursoNumero.trim().toLowerCase() === targetNum) {
                                updates[id] = { ...updates[id], attendance: false }
                                if (!updates[id].attendance && !updates[id].exam) {
                                    delete updates[id]
                                }
                                modified = true
                            }
                        })
                    }

                    return modified ? { pendingUpdates: updates } : state
                })
            },

            clearExamAlert: (courseId, cursoNumero = '') => {
                set((state) => {
                    const updates = { ...state.pendingUpdates }
                    let modified = false

                    // Limpieza directa por courseId
                    if (courseId && updates[courseId]) {
                        updates[courseId] = { ...updates[courseId], exam: false }
                        if (!updates[courseId].attendance && !updates[courseId].exam) {
                            delete updates[courseId]
                        }
                        modified = true
                    }

                    // Limpieza por coincidencia de cursoNumero
                    if (cursoNumero) {
                        const targetNum = cursoNumero.trim().toLowerCase()
                        Object.keys(updates).forEach((id) => {
                            if (updates[id]?.cursoNumero && updates[id].cursoNumero.trim().toLowerCase() === targetNum) {
                                updates[id] = { ...updates[id], exam: false }
                                if (!updates[id].attendance && !updates[id].exam) {
                                    delete updates[id]
                                }
                                modified = true
                            }
                        })
                    }

                    return modified ? { pendingUpdates: updates } : state
                })
            },

            hasAttendanceAlert: (courseId, cursoNumero = '') => {
                const updates = get().pendingUpdates
                if (courseId && updates[courseId]?.attendance) return true
                if (cursoNumero) {
                    const targetNum = cursoNumero.trim().toLowerCase()
                    const found = Object.values(updates).find(
                        (u) => u.attendance && u.cursoNumero && u.cursoNumero.trim().toLowerCase() === targetNum
                    )
                    if (found) return true
                }
                return false
            },

            hasExamAlert: (courseId, cursoNumero = '') => {
                const updates = get().pendingUpdates
                if (courseId && updates[courseId]?.exam) return true
                if (cursoNumero) {
                    const targetNum = cursoNumero.trim().toLowerCase()
                    const found = Object.values(updates).find(
                        (u) => u.exam && u.cursoNumero && u.cursoNumero.trim().toLowerCase() === targetNum
                    )
                    if (found) return true
                }
                return false
            },
        }),
        {
            name: 'adi_fp_update_alerts',
        }
    )
)

export default useFPUpdateAlertStore
