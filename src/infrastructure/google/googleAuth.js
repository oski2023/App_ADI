// Stub de autenticación Google OAuth 2.0
// En producción: cargar gapi.client e inicializar OAuth
// Actualmente: simula el flujo completo para desarrollo local

import { GOOGLE_CONFIG, isGoogleConfigured } from './googleConfig'

let isInitialized = false
let currentUser = null
let tokenClient = null

// Cargar scripts de Google dinámicamente
const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
})

// Inicializar el cliente Google Real
export async function initGoogleAuth() {
    if (!isGoogleConfigured()) {
        console.warn('[GoogleAuth] Credenciales no detectadas en .env.local')
        return false
    }

    try {
        // 1. Cargar GAPI (para Sheets y Calendar) y GIS (para Auth)
        await Promise.all([
            loadScript('https://apis.google.com/js/api.js'),
            loadScript('https://accounts.google.com/gsi/client')
        ])

        // 2. Inicializar GAPI Client
        await new Promise((resolve) => gapi.load('client', resolve))
        await gapi.client.init({
            apiKey: GOOGLE_CONFIG.API_KEY,
            discoveryDocs: GOOGLE_CONFIG.DISCOVERY_DOCS,
        })

        // 3. Inicializar Token Client (GIS)
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.CLIENT_ID,
            scope: GOOGLE_CONFIG.SCOPES,
            callback: (response) => {
                if (response.error) throw response
                // El token se guarda automáticamente en gapi.client
            },
        })

        isInitialized = true
        console.log('[GoogleAuth] SDKs de Google inicializados correctamente')
        return true
    } catch (error) {
        console.error('[GoogleAuth] Error al inicializar:', error)
        return false
    }
}

// Iniciar sesión con Google (Real)
export async function signIn() {
    if (!isInitialized) await initGoogleAuth()

    return new Promise((resolve, reject) => {
        try {
            tokenClient.callback = async (response) => {
                if (response.error) return reject(response)

                // Una vez obtenido el token, podemos obtener la info básica del usuario
                // Usamos la API de People o simplemente un fetch ligero
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${response.access_token}` }
                })
                const data = await res.json()

                currentUser = {
                    id: data.sub,
                    name: data.name,
                    email: data.email,
                    imageUrl: data.picture,
                }

                console.log('[GoogleAuth] Sesión iniciada para:', currentUser.email)
                resolve(currentUser)
            }

            // Solicitar token (lanza el popup de Google)
            tokenClient.requestAccessToken({ prompt: 'consent' })
        } catch (error) {
            reject(error)
        }
    })
}

// Cerrar sesión (Real)
export async function signOut() {
    if (gapi.client.getToken() !== null) {
        google.accounts.oauth2.revoke(gapi.client.getToken().access_token, () => {
            console.log('[GoogleAuth] Token revocado correctamente')
        })
        gapi.client.setToken('')
    }
    currentUser = null
}

// Obtener usuario actual
export function getCurrentUser() {
    return currentUser
}

// Verificar si está autenticado
export function isSignedIn() {
    return currentUser !== null
}

// Obtener token de acceso (stub)
export function getAccessToken() {
    if (!isGoogleConfigured()) return null
    // En producción: gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token
    return null
}
