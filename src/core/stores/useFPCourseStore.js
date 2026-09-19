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
                        courses: state.courses.map((c) => (c.id === targetId ? { ...c, ...courseData } : c)),
                    }))
                    return targetId
                }

                const existingIndex = currentCourses.findIndex((c) => {
                    if (c.googleSheetTitle && courseData.googleSheetTitle && c.googleSheetTitle === courseData.googleSheetTitle) {
                        return true
                    }
                    const cCurso = (c.cursoNumero || '').trim().toLowerCase()
                    const dCurso = (courseData.cursoNumero || '').trim().toLowerCase()
                    const cEsp = (c.especialidad || '').trim().toLowerCase()
                    const dEsp = (courseData.especialidad || '').trim().toLowerCase()

                    if (cCurso && dCurso && cCurso === dCurso) return true
                    if (cEsp && dEsp && cEsp === dEsp) return true
                    if (c.cfpNumero && courseData.cfpNumero && c.cfpNumero === courseData.cfpNumero && cCurso && dCurso && cCurso === dCurso) {
                        return true
                    }
                    return false
                })

                if (existingIndex >= 0) {
                    updatedId = currentCourses[existingIndex].id
                    set((state) => ({
                        courses: state.courses.map((c, idx) => (idx === existingIndex ? { ...c, ...courseData } : c)),
                    }))
                } else {
                    const newCourse = {
                        ...emptyCourse(),
                        ...courseData,
                        id: crypto.randomUUID(),
                    }
                    updatedId = newCourse.id
                    set((state) => ({ courses: [...state.courses, newCourse] }))
                }

                return updatedId
            },

            // Sincronización completa (Espejo de Google Sheets)
            syncAllFromCloud: (cloudCourses) => {
                const currentCourses = get().courses
                const updatedList = cloudCourses.map((cCourse) => {
                    const match = currentCourses.find((c) => {
                        if (c.googleSheetTitle && cCourse.googleSheetTitle && c.googleSheetTitle === cCourse.googleSheetTitle) return true
                        const sCurso = (c.cursoNumero || '').trim().toLowerCase()
                        const dCurso = (cCourse.cursoNumero || '').trim().toLowerCase()
                        if (sCurso && dCurso && sCurso === dCurso) return true
                        return false
                    })
                    return {
                        ...emptyCourse(),
                        ...cCourse,
                        id: match ? match.id : crypto.randomUUID(),
                    }
                })
                set({ courses: updatedList })
                return updatedList
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
