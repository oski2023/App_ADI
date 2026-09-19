// Stub de autenticación Google OAuth 2.0
// En producción: cargar gapi.client e inicializar OAuth
// Actualmente: simula el flujo completo para desarrollo local

import { GOOGLE_CONFIG, isGoogleConfigured } from './googleConfig'

let isInitialized = false
let currentUser = null
let tokenClient = null
let refreshTimerId = null

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

let currentAccessToken = null

// Inyectar el token de acceso recibido de GIS directamente en gapi.client
function setGapiToken(response) {
    if (!response || response.error) return
    if (response.access_token) {
        currentAccessToken = response.access_token
    }
    if (typeof gapi !== 'undefined' && gapi.client && response.access_token) {
        gapi.client.setToken({
            access_token: response.access_token,
        })
        console.log('[GoogleAuth] Token inyectado en gapi.client correctamente')
    }
}

// Programar una renovación silenciosa del token antes de que venza
function scheduleAutoRefresh(expiresInSeconds) {
    if (refreshTimerId) clearTimeout(refreshTimerId)
    // Renovar 5 minutos antes de que venza (los tokens suelen durar 3600s)
    const delayMs = Math.max((expiresInSeconds - 300) * 1000, 30000)
    refreshTimerId = setTimeout(() => {
        silentRefresh().catch(() => {
            console.warn('[GoogleAuth] No se pudo renovar el token en segundo plano; se pedirá login la próxima vez que haga falta.')
        })
    }, delayMs)
}

// Pedir un token nuevo SIN mostrar popup (funciona si la sesión de Google sigue activa)
export function silentRefresh() {
    if (!tokenClient) return Promise.reject(new Error('Google Auth no inicializado'))

    return new Promise((resolve, reject) => {
        tokenClient.callback = (response) => {
            if (response.error) return reject(response)
            setGapiToken(response)
            console.log('[GoogleAuth] Token renovado en segundo plano')
            scheduleAutoRefresh(response.expires_in || 3600)
            resolve(response)
        }
        tokenClient.requestAccessToken({ prompt: '' })
    })
}

// Si ya estuviste vinculado antes, intenta renovar la sesión solo, sin pedir nada al usuario
export async function autoInitIfLinked(wasLinked) {
    if (!wasLinked || !isGoogleConfigured()) return false
    try {
        if (!isInitialized) await initGoogleAuth()
        await silentRefresh()
        return true
    } catch (error) {
        console.warn('[GoogleAuth] No se pudo renovar la sesión automáticamente, hará falta volver a vincular manualmente.')
        return false
    }
}

// Inicializar el cliente Google Real
export async function initGoogleAuth() {
    if (isInitialized) return true
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
                setGapiToken(response)
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

// Reconectar con un clic real del usuario: intenta silencioso primero, y si Google lo pide, muestra el consentimiento
export function reconnectGoogle() {
    if (!tokenClient) return Promise.reject(new Error('Google Auth no inicializado'))

    return new Promise((resolve, reject) => {
        tokenClient.callback = (response) => {
            if (!response.error) {
                setGapiToken(response)
                console.log('[GoogleAuth] Reconectado correctamente')
                scheduleAutoRefresh(response.expires_in || 3600)
                return resolve(response)
            }
            // El intento silencioso falló, reintentar mostrando el consentimiento
            tokenClient.callback = (response2) => {
                if (response2.error) return reject(response2)
                setGapiToken(response2)
                console.log('[GoogleAuth] Reconectado correctamente (con consentimiento)')
                scheduleAutoRefresh(response2.expires_in || 3600)
                resolve(response2)
            }
            tokenClient.requestAccessToken({ prompt: 'consent' })
        }
        tokenClient.requestAccessToken({ prompt: '' })
    })
}

// Iniciar sesión con Google (Real)
export async function signIn() {
    if (!isInitialized) await initGoogleAuth()

    return new Promise((resolve, reject) => {
        try {
            tokenClient.callback = async (response) => {
                if (response.error) return reject(response)
                setGapiToken(response)

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
                scheduleAutoRefresh(response.expires_in || 3600)
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
    if (refreshTimerId) {
        clearTimeout(refreshTimerId)
        refreshTimerId = null
    }
    if (typeof gapi !== 'undefined' && gapi?.client?.getToken() !== null) {
        google.accounts.oauth2.revoke(gapi.client.getToken().access_token, () => {
            console.log('[GoogleAuth] Token revocado correctamente')
        })
        gapi.client.setToken('')
    }
    currentUser = null
    currentAccessToken = null
}

// Obtener usuario actual
export function getCurrentUser() {
    return currentUser
}

// Verificar si está autenticado
export function isSignedIn() {
    return currentUser !== null
}

// Obtener token de acceso activo
export function getAccessToken() {
    if (!isGoogleConfigured()) return null
    if (typeof gapi !== 'undefined' && gapi?.client?.getToken()) {
        const token = gapi.client.getToken()
        if (token?.access_token) return token.access_token
    }
    return currentAccessToken
}
