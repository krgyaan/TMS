import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { clearAuthSession, getStoredUser } from './auth'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

export const axiosInstance: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
    withCredentials: true, // ✅ IMPORTANT: Send cookies with requests
})

// Flag to prevent multiple simultaneous redirects
let isRedirecting = false

// Endpoints that may be called without a logged-in session. These are the only
// requests allowed to reach the server once the local session is cleared
// (e.g. right after logout, when React Query observers refetch and would
// otherwise fire unauthenticated calls like GET /teams).
const PUBLIC_PATHS = [
    '/auth/login',
    '/auth/logout',
    '/auth/me',
    '/auth/forgot-password',
    '/auth/verify-otp',
    '/auth/reset-password',
    '/auth/change-password',
    '/auth/permissions',
    '/auth/google',
    '/auth/refresh',
    '/health',
];

const isPublicPath = (path: string): boolean =>
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

// Request interceptor - No need to add token manually (cookies are automatic)
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig> => {
        // Once the stored session is gone, block non-public requests client-side so
        // no auth-required call (e.g. /teams) ever reaches the server unauthenticated.
        if (!getStoredUser()) {
            const path = (config.url ?? '').split('?')[0];
            if (!isPublicPath(path)) {
                return Promise.reject(new axios.CanceledError('Session has been cleared'));
            }
        }
        return config
    },
    (error: AxiosError) => {
        return Promise.reject(error)
    }
)

// Response interceptor - Handle errors
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !(error.config as { skipAuthRedirect?: boolean })?.skipAuthRedirect) {
            // Prevent multiple simultaneous redirects
            if (isRedirecting) {
                return Promise.reject(error)
            }

            // Set flag to prevent multiple redirects
            isRedirecting = true

            // Clear user data (token is in httpOnly cookie, can't access it)
            // localStorage.removeItem('tms_auth_user')
            clearAuthSession()

            // Only redirect if not already on login page
            if (!window.location.pathname.startsWith('/login')) {
                // Store current URL for redirect after login
                const currentPath = window.location.pathname + window.location.search
                if (currentPath !== '/') {
                    sessionStorage.setItem('auth_redirect', currentPath)
                }
                // Use a small delay to ensure localStorage is cleared before redirect
                setTimeout(() => {
                    window.location.href = '/login'
                }, 0)
            } else {
                // Reset flag if already on login page
                isRedirecting = false
            }
        }

        // Handle other errors
        if (error.response?.status === 403) {
            console.error('Access forbidden')
        }

        if (error.response?.status === 500) {
            console.error('Internal server error')
        }

        return Promise.reject(error)
    }
)

export default axiosInstance
