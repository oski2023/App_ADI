import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// links: { [tipoDeDocumento]: { spreadsheetId, sheetTitle, spreadsheetUrl } }
const useFPAdminLinksStore = create(
    persist(
        (set, get) => ({
            links: {},

            setLink: (tipo, data) => set((state) => ({
                links: { ...state.links, [tipo]: data },
            })),

            setAllLinks: (newLinks) => set((state) => ({
                links: { ...state.links, ...newLinks },
            })),

            clearLink: (tipo) => set((state) => {
                const links = { ...state.links }
                delete links[tipo]
                return { links }
            }),
        }),
        {
            name: 'adi_fp_admin_links',
        }
    )
)

export default useFPAdminLinksStore