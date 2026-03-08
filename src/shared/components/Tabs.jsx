import { useState } from 'react'

export default function Tabs({ tabs, activeTab, onChange, className = '' }) {
    return (
        <div className={`flex items-center gap-1 bg-bg-hover rounded-lg p-1 ${className}`}>
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onChange(tab.value)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${activeTab === tab.value
                            ? 'bg-bg-card text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
