import { Construction } from 'lucide-react'

export default function FPDashboardPage() {
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Construction className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-text-primary mb-2">Formación Profesional</h1>
            <p className="text-text-secondary max-w-md">
                Este módulo está en construcción. Pronto vas a poder gestionar tus cursos de
                Formación Profesional (fichas de curso, estudiantes, temas y asistencia,
                actas de examen) vinculando tus hojas de Google Sheets existentes.
            </p>
        </div>
    )
}
