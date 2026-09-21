import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const emptyCourse = () => ({
    id: crypto.randomUUID(),
    cfpNumero: '',
    distrito: '',
    anio: '',
    cursoNumero: '',
    especialidad: '',
    fechaInicio: '',
    fechaTerminacion: '',
    duracion: '',
    lugarDictado: '',
    tipo: '',
    fo: '',
    horarios: { lunes: '', martes: '', miercoles: '', jueves: '', viernes: '', sabado: '' },
    instructor: '',
    matricula: { v: '', m: '', x: '' },
    students: [],
    googleSheetTitle: '',
    spreadsheetId: '',
    spreadsheetUrl: '',
})

const emptyStudent = () => ({
    id: crypto.randomUUID(),
    documentoTipo: '',
    documentoNumero: '',
    sexo: '',
    apellidosNombres: '',
    fechaNacimiento: '',
    nacionalidad: '',
    domicilio: '',
    localidad: '',
    edad: '',
    contacto: '',
})

const useFPCourseStore = create(
    persist(
        (set, get) => ({
            courses: [],

            addCourse: () => {
                const course = emptyCourse()
                set((state) => ({ courses: [...state.courses, course] }))
                return course.id
            },

            updateCourse: (id, data) => set((state) => ({
                courses: state.courses.map((c) => (c.id === id ? { ...c, ...data } : c)),
            })),

            // Sincronización bidireccional (PC ↔ Celular) para Ficha de Curso:
            importOrUpdateCourse: (courseData, targetId = null) => {
                const currentCourses = get().courses
                let updatedId = targetId

                if (targetId && currentCourses.some((c) => c.id === targetId)) {
                    set((state) => ({
                        courses: state.courses.map((c) => (c.id === targetId ? { ...c, ...courseData, id: targetId } : c)),
                    }))
                    return targetId
                }

                const existingIndex = currentCourses.findIndex((c) => {
                    // 1. Coincidencia por id exacto
                    if (courseData.id && c.id === courseData.id) return true

                    const cCurso = (c.cursoNumero || '').trim().toLowerCase()
                    const dCurso = (courseData.cursoNumero || '').trim().toLowerCase()

                    // Si ambos tienen número de curso y son diferentes, definitivamente NO son el mismo curso
                    if (cCurso && dCurso && cCurso !== dCurso) return false

                    // 2. Misma hoja y misma pestaña de Google Sheets
                    if (c.spreadsheetId && courseData.spreadsheetId && c.spreadsheetId === courseData.spreadsheetId) {
                        if (c.googleSheetTitle && courseData.googleSheetTitle && c.googleSheetTitle === courseData.googleSheetTitle) {
                            return true
                        }
                    }

                    // 3. Mismo número de curso
                    if (cCurso && dCurso && cCurso === dCurso) {
                        const cCfp = (c.cfpNumero || '').trim().toLowerCase()
                        const dCfp = (courseData.cfpNumero || '').trim().toLowerCase()
                        if (cCfp && dCfp && cCfp !== dCfp) return false
                        return true
                    }

                    // 4. Misma pestaña si coincide en la misma hoja (o sin spreadsheetId definido aún)
                    if (c.googleSheetTitle && courseData.googleSheetTitle && c.googleSheetTitle === courseData.googleSheetTitle) {
                        if (!c.spreadsheetId || !courseData.spreadsheetId || c.spreadsheetId === courseData.spreadsheetId) {
                            return true
                        }
                    }

                    return false
                })

                if (existingIndex >= 0) {
                    updatedId = currentCourses[existingIndex].id
                    set((state) => ({
                        courses: state.courses.map((c, idx) => (idx === existingIndex ? { ...c, ...courseData, id: updatedId } : c)),
                    }))
                } else {
                    const newCourse = {
                        ...emptyCourse(),
                        ...courseData,
                        id: courseData.id || crypto.randomUUID(),
                    }
                    updatedId = newCourse.id
                    set((state) => ({ courses: [...state.courses, newCourse] }))
                }

                return updatedId
            },

            // Sincronización completa (Espejo de Google Sheets)
            // Permite actualizar todos los cursos o solo los pertenecientes a un spreadsheet específico
            syncAllFromCloud: (cloudCourses, targetSpreadsheetId = null) => {
                const currentCourses = get().courses

                // Encontrar o emparejar cada curso de la nube con un curso existente
                const matchedCloudCourses = cloudCourses.map((cCourse) => {
                    const match = currentCourses.find((c) => {
                        if (cCourse.id && c.id === cCourse.id) return true
                        const sCurso = (c.cursoNumero || '').trim().toLowerCase()
                        const dCurso = (cCourse.cursoNumero || '').trim().toLowerCase()
                        if (sCurso && dCurso && sCurso !== dCurso) return false

                        if (c.spreadsheetId && cCourse.spreadsheetId && c.spreadsheetId === cCourse.spreadsheetId) {
                            if (c.googleSheetTitle && cCourse.googleSheetTitle && c.googleSheetTitle === cCourse.googleSheetTitle) {
                                return true
                            }
                        }

                        if (sCurso && dCurso && sCurso === dCurso) return true

                        if (c.googleSheetTitle && cCourse.googleSheetTitle && c.googleSheetTitle === cCourse.googleSheetTitle) {
                            if (!c.spreadsheetId || !cCourse.spreadsheetId || c.spreadsheetId === cCourse.spreadsheetId) {
                                return true
                            }
                        }
                        return false
                    })

                    return {
                        ...emptyCourse(),
                        ...(match || {}),
                        ...cCourse,
                        id: match ? match.id : (cCourse.id || crypto.randomUUID()),
                    }
                })

                let finalCourses = []
                if (targetSpreadsheetId) {
                    // Si se especifica targetSpreadsheetId, preservamos los cursos que pertenecen a OTRAS hojas
                    const coursesFromOtherSheets = currentCourses.filter(
                        (c) => c.spreadsheetId && c.spreadsheetId !== targetSpreadsheetId
                    )
                    finalCourses = [...coursesFromOtherSheets, ...matchedCloudCourses]
                } else {
                    // Si cloudCourses incluye cursos de varias hojas (o todas), preservamos aquellos cursos locales
                    // que pertenecen a planillas que NO vinieron en cloudCourses (para evitar borrados accidentales)
                    const cloudSpreadsheetIds = new Set(matchedCloudCourses.map((c) => c.spreadsheetId).filter(Boolean))
                    const coursesNotCovered = currentCourses.filter(
                        (c) => c.spreadsheetId && !cloudSpreadsheetIds.has(c.spreadsheetId)
                    )
                    finalCourses = [...coursesNotCovered, ...matchedCloudCourses]
                }

                set({ courses: finalCourses })
                return finalCourses
            },

            updateCourseHorario: (id, dia, valor) => set((state) => ({
                courses: state.courses.map((c) =>
                    c.id === id ? { ...c, horarios: { ...c.horarios, [dia]: valor } } : c
                ),
            })),

            updateCourseMatricula: (id, campo, valor) => set((state) => ({
                courses: state.courses.map((c) =>
                    c.id === id ? { ...c, matricula: { ...c.matricula, [campo]: valor } } : c
                ),
            })),

            deleteCourse: (id) => set((state) => ({
                courses: state.courses.filter((c) => c.id !== id),
            })),

            addStudent: (courseId) => set((state) => ({
                courses: state.courses.map((c) =>
                    c.id === courseId ? { ...c, students: [...c.students, emptyStudent()] } : c
                ),
            })),

            updateStudent: (courseId, studentId, data) => set((state) => ({
                courses: state.courses.map((c) =>
                    c.id === courseId
                        ? {
                            ...c,
                            students: c.students.map((s) => (s.id === studentId ? { ...s, ...data } : s)),
                        }
                        : c
                ),
            })),

            deleteStudent: (courseId, studentId) => set((state) => ({
                courses: state.courses.map((c) =>
                    c.id === courseId
                        ? { ...c, students: c.students.filter((s) => s.id !== studentId) }
                        : c
                ),
            })),
        }),
        {
            name: 'adi_fp_courses',
        }
    )
)

export default useFPCourseStore
