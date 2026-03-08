// Servicio de generación de PDFs para reportes y boletines
// Utiliza jsPDF + jspdf-autotable para generación client-side

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLORS = {
    primary: [26, 86, 160],     // #1A56A0
    secondary: [46, 125, 50],   // #2E7D32
    error: [198, 40, 40],       // #C62828
    warning: [230, 81, 0],      // #E65100
    text: [26, 26, 46],         // #1A1A2E
    muted: [100, 116, 139],     // #64748B
    bg: [248, 250, 253],        // #F8FAFD
    white: [255, 255, 255],
}

// Configuración de encabezado común
function addHeader(doc, title, subtitle, teacherName) {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Franja de color superior
    doc.setFillColor(...COLORS.primary)
    doc.rect(0, 0, pageWidth, 28, 'F')

    // Título
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...COLORS.white)
    doc.text('ADI — Agenda Docente Inteligente', 14, 12)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(title, 14, 20)

    // Fecha y docente (lado derecho)
    doc.setFontSize(8)
    doc.text(teacherName || '', pageWidth - 14, 12, { align: 'right' })
    doc.text(subtitle || '', pageWidth - 14, 20, { align: 'right' })

    doc.setTextColor(...COLORS.text)
    return 34 // Y position after header
}

// Pie de página
function addFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.muted)
        doc.text(
            `Página ${i} de ${pageCount} — Generado por ADI el ${new Date().toLocaleDateString('es-AR')}`,
            pageWidth / 2, pageHeight - 8, { align: 'center' }
        )
    }
}

// ─────────────────────────────────────────────
// REPORTE DIARIO DE ASISTENCIA
// ─────────────────────────────────────────────
export function generateDailyReport({ date, courseName, students, attendanceData, teacherName }) {
    const doc = new jsPDF()
    const startY = addHeader(doc, 'Reporte Diario de Asistencia', `Fecha: ${date} — ${courseName}`, teacherName)

    // Estadísticas resumen
    let present = 0, absent = 0, late = 0
    students.forEach((s) => {
        const status = attendanceData[s.id]
        if (status === 'P') present++
        else if (status === 'A') absent++
        else if (status === 'T') late++
    })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen:', 14, startY + 2)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.secondary)
    doc.text(`Presentes: ${present}`, 14, startY + 9)
    doc.setTextColor(...COLORS.error)
    doc.text(`Ausentes: ${absent}`, 60, startY + 9)
    doc.setTextColor(...COLORS.warning)
    doc.text(`Tardanzas: ${late}`, 106, startY + 9)
    doc.setTextColor(...COLORS.text)
    doc.text(`Total: ${students.length}`, 152, startY + 9)

    // Tabla de alumnos
    autoTable(doc, {
        startY: startY + 16,
        head: [['#', 'Apellido', 'Nombre', 'DNI', 'Estado']],
        body: students.map((s, i) => {
            const status = attendanceData[s.id] || '—'
            const label = status === 'P' ? 'Presente' : status === 'A' ? 'Ausente' : status === 'T' ? 'Tarde' : 'Sin registro'
            return [i + 1, s.lastName, s.name, s.dni, label]
        }),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            4: { halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
                const val = data.cell.raw
                if (val === 'Presente') data.cell.styles.textColor = COLORS.secondary
                else if (val === 'Ausente') data.cell.styles.textColor = COLORS.error
                else if (val === 'Tarde') data.cell.styles.textColor = COLORS.warning
            }
        },
    })

    addFooter(doc)
    doc.save(`ADI_Reporte_Diario_${date}.pdf`)
}

// ─────────────────────────────────────────────
// REPORTE SEMANAL
// ─────────────────────────────────────────────
export function generateWeeklyReport({ dateFrom, dateTo, courseName, students, attendanceRecords, teacherName }) {
    const doc = new jsPDF('landscape')
    const startY = addHeader(doc, 'Reporte Semanal de Asistencia', `${dateFrom} al ${dateTo} — ${courseName}`, teacherName)

    // Calcular resumen por alumno
    const rows = students.map((s, i) => {
        let present = 0, absent = 0, late = 0
        Object.values(attendanceRecords).forEach((dr) => {
            if (dr[s.id] === 'P') present++
            else if (dr[s.id] === 'A') absent++
            else if (dr[s.id] === 'T') late++
        })
        const total = present + absent + late
        const pct = total > 0 ? Math.round((present / total) * 100) : 100
        return [i + 1, s.lastName, s.name, present, absent, late, `${pct}%`]
    })

    autoTable(doc, {
        startY: startY + 4,
        head: [['#', 'Apellido', 'Nombre', 'Presentes', 'Ausentes', 'Tardanzas', '% Asist.']],
        body: rows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center' },
            6: { halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 6) {
                const pct = parseInt(data.cell.raw)
                if (pct >= 75) data.cell.styles.textColor = COLORS.secondary
                else data.cell.styles.textColor = COLORS.error
            }
        },
    })

    addFooter(doc)
    doc.save(`ADI_Reporte_Semanal_${dateFrom}_${dateTo}.pdf`)
}

// ─────────────────────────────────────────────
// BOLETÍN INDIVIDUAL DE ALUMNO
// ─────────────────────────────────────────────
export function generateStudentBoletin({ student, courseName, subjects, grades, calculateFinalGrade, isApproved, attendanceSummary, teacherName }) {
    const doc = new jsPDF()
    const startY = addHeader(doc, 'Boletín de Calificaciones', `Alumno: ${student.lastName}, ${student.name}`, teacherName)

    // Datos del alumno
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    let y = startY + 2
    doc.text(`Curso: ${courseName}`, 14, y)
    doc.text(`DNI: ${student.dni}`, 100, y)
    y += 6
    doc.text(`Contacto tutor: ${student.tutorEmail}`, 14, y)
    y += 4

    // Tabla de notas
    const subjectRows = subjects.map((sub) => {
        const studentGrades = grades[`${student.id}_${sub.id}`] || []
        const final = calculateFinalGrade(student.id, sub.id)
        const approved = isApproved(student.id, sub.id)
        const parciales = sub.weights.map((_, i) => studentGrades[i] !== undefined ? String(studentGrades[i]) : '—')
        return [
            sub.name,
            ...parciales,
            final !== null ? final.toFixed(1) : '—',
            approved === true ? 'Aprobado' : approved === false ? 'Reprobado' : 'Pendiente',
        ]
    })

    const maxParciales = Math.max(...subjects.map((s) => s.weights.length), 1)
    const headers = ['Materia', ...Array.from({ length: maxParciales }, (_, i) => `P${i + 1}`), 'Final', 'Estado']

    autoTable(doc, {
        startY: y + 4,
        head: [headers],
        body: subjectRows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
            [headers.length - 1]: { halign: 'center', fontStyle: 'bold' },
            [headers.length - 2]: { halign: 'center', fontStyle: 'bold' },
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === headers.length - 1) {
                if (data.cell.raw === 'Aprobado') data.cell.styles.textColor = COLORS.secondary
                else if (data.cell.raw === 'Reprobado') data.cell.styles.textColor = COLORS.error
                else data.cell.styles.textColor = COLORS.muted
            }
        },
    })

    // Sección de asistencia
    const afterTable = doc.lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumen de Asistencia', 14, afterTable)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const ay = afterTable + 8
    doc.text(`Presentes: ${attendanceSummary.present}`, 14, ay)
    doc.text(`Ausentes: ${attendanceSummary.absent}`, 60, ay)
    doc.text(`Tardanzas: ${attendanceSummary.late}`, 106, ay)
    const pctColor = attendanceSummary.percentage >= 75 ? COLORS.secondary : COLORS.error
    doc.setTextColor(...pctColor)
    doc.setFont('helvetica', 'bold')
    doc.text(`Asistencia: ${attendanceSummary.percentage}%`, 152, ay)

    addFooter(doc)
    doc.save(`ADI_Boletin_${student.lastName}_${student.name}.pdf`)
}
