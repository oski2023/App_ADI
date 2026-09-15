import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const emptyAct = () => ({
    id: crypto.randomUUID(),
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
    documentoTipo: '',
    documentoNumero: '',
})

const useFPExamActStore = create(
    persist(
        (set, get) => ({
            acts: [],

            addAct: () => {
                const act = emptyAct()
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

            addStudent: (actId) => set((state) => ({
                acts: state.acts.map((a) =>
                    a.id === actId ? { ...a, students: [...a.students, emptyStudent()] } : a
                ),
            })),

            updateStudent: (actId, studentId, data) => set((state) => ({
                acts: state.acts.map((a) =>
                    a.id === actId
                        ? { ...a, students: a.students.map((s) => (s.id === studentId ? { ...s, ...data } : s)) }
                        : a
                ),
            })),

            deleteStudent: (actId, studentId) => set((state) => ({
                acts: state.acts.map((a) =>
                    a.id === actId ? { ...a, students: a.students.filter((s) => s.id !== studentId) } : a
                ),
            })),
        }),
        {
            name: 'adi_fp_exam_acts',
        }
    )
)

export default useFPExamActStore
