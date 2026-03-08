// Stub de servicio Google Calendar API v3
// En producción: sincroniza eventos del ciclo lectivo con Google Calendar
// Actualmente: log + noop para desarrollo local

import { isGoogleConfigured } from './googleConfig'

const CALENDAR_ID = 'primary'

// Crear evento en Google Calendar (Real)
export async function createCalendarEvent(event) {
    if (!isGoogleConfigured()) return null

    try {
        const calendarEvent = {
            summary: event.title,
            description: event.notes || '',
            location: event.place || '',
            start: { date: event.date }, // Evento de todo el día
            end: { date: event.date },
            reminders: { useDefault: true },
        }

        const response = await gapi.client.calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: calendarEvent
        })

        console.log('[CalendarService] Evento creado en GCal:', response.result.id)
        return { ...event, id: response.result.id }
    } catch (error) {
        console.error('[CalendarService] Error al crear evento:', error)
        throw error
    }
}

// Actualizar evento en Google Calendar (Real)
export async function updateCalendarEvent(eventId, event) {
    if (!isGoogleConfigured() || !eventId || eventId.startsWith('stub_')) return null

    try {
        const calendarEvent = {
            summary: event.title,
            description: event.notes || '',
            location: event.place || '',
            start: { date: event.date },
            end: { date: event.date },
        }

        const response = await gapi.client.calendar.events.update({
            calendarId: CALENDAR_ID,
            eventId: eventId,
            resource: calendarEvent
        })

        return response.result
    } catch (error) {
        console.error('[CalendarService] Error al actualizar evento:', error)
        throw error
    }
}

// Eliminar evento de Google Calendar (Real)
export async function deleteCalendarEvent(eventId) {
    if (!isGoogleConfigured() || !eventId || eventId.startsWith('stub_')) return true

    try {
        await gapi.client.calendar.events.delete({
            calendarId: CALENDAR_ID,
            eventId: eventId
        })
        return true
    } catch (error) {
        console.warn('[CalendarService] Error al eliminar (puede que ya no exista):', error)
        return true
    }
}

// Listar eventos desde Google Calendar (Real)
export async function listCalendarEvents(timeMin, timeMax) {
    if (!isGoogleConfigured()) return []

    try {
        const response = await gapi.client.calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: timeMin ? new Date(timeMin).toISOString() : undefined,
            timeMax: timeMax ? new Date(timeMax).toISOString() : undefined,
            singleEvents: true,
            orderBy: 'startTime',
        })
        return response.result.items || []
    } catch (error) {
        console.error('[CalendarService] Error al listar eventos:', error)
        return []
    }
}
