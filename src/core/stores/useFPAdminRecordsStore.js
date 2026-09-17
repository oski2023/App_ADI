
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const emptyRecord = (data = {}) => ({
    id: crypto.randomUUID(),
    mes: '',
    documento: '',
    cohorte: 'Sin cohorte',
    cantidad: '',
    estado: 'Pendiente',
    link: '',
    ...data,
})

const useFPAdminRecordsStore = create(
    persist(
        (set, get) => ({
            records: [],

            addRecord: (data) => {
                const record = emptyRecord(data)
                set((state) => ({ records: [...state.records, record] }))
                return record.id
            },

            updateRecord: (id, data) => set((state) => ({
                records: state.records.map((r) => (r.id === id ? { ...r, ...data } : r)),
            })),

            deleteRecord: (id) => set((state) => ({
                records: state.records.filter((r) => r.id !== id),
            })),
        }),
        {
            name: 'adi_fp_admin_records',
        }
    )
)

export default useFPAdminRecordsStore