// Autenticación Google OAuth 2.0 (Google Identity Services + GAPI Client)
import { GOOGLE_CONFIG, isGoogleConfigured } from './googleConfig'
import useSettingsStore from '../../core/stores/useSettingsStore'
import useAuthStore from '../../core/stores/useAuthStore'

let isInitialized = false
let currentUser = null
let tokenClient = null
let refreshTimerId = null

// Cargar scripts de Google dinámicamente
const loadScript = (src) => new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
        return resolve()
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
})

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

// Inyectar el token recibido de GIS directamente en gapi.client y poblar datos de usuario
async function applyToken(response) {
    if (!response || response.error) return

    // 1. Inyectar el token en GAPI Client para que Sheets y Drive queden autenticados
    if (typeof gapi !== 'undefined' && gapi.client && response.access_token) {
        gapi.client.setToken({
            access_token: response.access_token,
        })
    }

    // 2. Programar renovación
    if (response.expires_in) {
        scheduleAutoRefresh(response.expires_in)
    }

    // 3. Poblar info del usuario si aún no está en memoria
    if (!currentUser && response.access_token) {
        try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
            })
            if (res.ok) {
                const data = await res.json()
                currentUser = {
                    id: data.sub,
                    name: data.name,
                    email: data.email,
                    imageUrl: data.picture,
                }
                // Sincronizar con AuthStore para mantener coherencia en la UI
                useAuthStore.getState().setUser({
                    name: data.name,
                    email: data.email,
                    imageUrl: data.picture,
                    role: 'Docente',
                })
            }
        } catch (e) {
            console.warn('[GoogleAuth] No se pudo cargar userinfo:', e)
        }
    }
}

// Pedir un token nuevo SIN mostrar popup (funciona si la sesión de Google sigue activa en el navegador)
export function silentRefresh() {
    if (!tokenClient) return Promise.reject(new Error('Google Auth no inicializado'))

    return new Promise((resolve, reject) => {
        tokenClient.callback = async (response) => {
            if (response.error) return reject(response)
            await applyToken(response)
            console.log('[GoogleAuth] Token renovado en segundo plano con éxito')
            resolve(response)
        }
        tokenClient.requestAccessToken({ prompt: '' })
    })
}

// Inicializar los clientes GAPI y GIS
export async function initGoogleAuth() {
    if (!isGoogleConfigured()) {
        console.warn('[GoogleAuth] Credenciales no detectadas en .env.local')
        return false
    }

    if (isInitialized) return true

    try {
        // 1. Cargar GAPI (para Sheets y Drive) y GIS (para OAuth)
        await Promise.all([
            loadScript('https://apis.google.com/js/api.js'),
            loadScript('https://accounts.google.com/gsi/client'),
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
                applyToken(response)
            },
        })

        isInitialized = true
        console.log('[GoogleAuth] SDKs de Google inicializados correctamente')
        return true
    } catch (error) {
        console.error('[GoogleAuth] Error al inicializar SDKs:', error)
        return false
    }
}

// Reconectar con un clic real del usuario: intenta silencioso primero, y si Google lo pide, muestra el popup de consentimiento
export function reconnectGoogle() {
    if (!tokenClient) return Promise.reject(new Error('Google Auth no inicializado'))

    return new Promise((resolve, reject) => {
        tokenClient.callback = async (response) => {
            if (!response.error) {
                await applyToken(response)
                console.log('[GoogleAuth] Reconectado correctamente')
                return resolve(response)
            }
            // El intento silencioso falló, reintentar mostrando el consentimiento
            tokenClient.callback = async (response2) => {
                if (response2.error) return reject(response2)
                await applyToken(response2)
                console.log('[GoogleAuth] Reconectado correctamente (con consentimiento)')
                resolve(response2)
            }
            tokenClient.requestAccessToken({ prompt: 'consent' })
        }
        tokenClient.requestAccessToken({ prompt: '' })
    })
}

// Iniciar sesión interactiva con Google
export async function signIn() {
    if (!isInitialized) await initGoogleAuth()

    return new Promise((resolve, reject) => {
        try {
            tokenClient.callback = async (response) => {
                if (response.error) return reject(response)
                await applyToken(response)
                console.log('[GoogleAuth] Sesión iniciada para:', currentUser?.email)
                resolve(currentUser)
            }

            // Solicitar token (lanza el popup de Google)
            tokenClient.requestAccessToken({ prompt: 'consent' })
        } catch (error) {
            reject(error)
        }
    })
}

// Cerrar sesión
export async function signOut() {
    if (refreshTimerId) {
        clearTimeout(refreshTimerId)
        refreshTimerId = null
    }
    if (typeof gapi !== 'undefined' && gapi.client && gapi.client.getToken() !== null) {
        try {
            const token = gapi.client.getToken()
            if (token && token.access_token && typeof google !== 'undefined' && google.accounts?.oauth2) {
                google.accounts.oauth2.revoke(token.access_token, () => {
                    console.log('[GoogleAuth] Token revocado correctamente')
                })
            }
        } catch (e) {
            console.warn('[GoogleAuth] Error al revocar token:', e)
        }
        gapi.client.setToken('')
    }
    currentUser = null
}

// Verificar si existe un token de acceso activo y no vacío en GAPI
export function hasActiveToken() {
    if (typeof gapi === 'undefined' || !gapi.client) return false
    const token = gapi.client.getToken()
    return !!(token && token.access_token)
}

// Garantizar que haya una sesión activa: si no hay token pero el usuario estaba vinculado, restaura silenciosamente
export async function ensureActiveSession() {
    if (!isGoogleConfigured()) return false
    if (!isInitialized) {
        const ok = await initGoogleAuth()
        if (!ok) return false
    }

    if (hasActiveToken()) return true

    const wasLinked = useSettingsStore.getState().googleLinked || !!useAuthStore.getState().user?.email
    if (!wasLinked) return false

    try {
        await silentRefresh()
        return hasActiveToken()
    } catch (err) {
        console.warn('[GoogleAuth] No se pudo renovar silenciosamente la sesión:', err)
        return false
    }
}

// Obtener usuario actual
export function getCurrentUser() {
    return currentUser
}

// Verificar si está autenticado
export function isSignedIn() {
    return hasActiveToken() || currentUser !== null
}

// Obtener token de acceso
export function getAccessToken() {
    if (typeof gapi !== 'undefined' && gapi.client) {
        return gapi.client.getToken()?.access_token || null
    }
    return null
}
