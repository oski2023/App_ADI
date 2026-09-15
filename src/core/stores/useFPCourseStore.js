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
