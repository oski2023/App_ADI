import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

export default function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)

    return (
        <div className="relative min-h-screen bg-bg flex flex-col md:flex-row w-full overflow-x-hidden">
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                isMobileOpen={isMobileOpen}
                onMobileClose={() => setIsMobileOpen(false)}
            />
            <main
                className={`flex-1 w-full min-w-0 transition-all duration-300 min-h-screen overflow-x-hidden ${sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
                    } ml-0 pt-16 md:pt-0`}
            >
                {/* Mobile Topbar */}
                <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-bg-card border-b border-border z-30 flex items-center px-4">
                    <button
                        onClick={() => setIsMobileOpen((prev) => !prev)}
                        className="p-2 -ml-2 rounded-lg hover:bg-bg-hover text-text-secondary cursor-pointer"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="ml-3 font-bold text-text-primary">App ADI</span>
                </div>

                <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
