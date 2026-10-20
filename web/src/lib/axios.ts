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

// JWT Refresh Token State
let isRefreshing = false
const failedQueue: Array<{
    resolve: (value: void) => void
    reject: (reason?: unknown) => void
}> = []

/**
 * Process queued requests after token refresh completes
 * @param error - Error if refresh failed, null if successful
 */
const processQueue = (error?: AxiosError | null): void => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve()
        }
    })
    failedQueue.length = 0
}

// Endpoints that may be called without a logged-in session
const PUBLIC_PATHS = [
    '/auth/login',
    '/auth/logout',
    '/auth/me',
    '/auth/refresh',
    '/auth/forgot-password',
    '/auth/verify-otp',
    '/auth/reset-password',
    '/auth/change-password',
    '/auth/permissions',
    '/auth/google',
    '/health',
    '/public-notifications',
    '/url-shortener',
];

const isPublicPath = (path: string): boolean =>
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

// Request interceptor - Block non-public requests if session cleared
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig> => {
        if (!getStoredUser()) {
            const path = (config.url ?? '').split('?')[0]
            if (!isPublicPath(path)) {
                return Promise.reject(new axios.CanceledError('Session has been cleared'))
            }
        }
        return config
    },
    (error: AxiosError) => {
        return Promise.reject(error)
    }
)

// Response interceptor - Handle 401 with automatic refresh + request queuing
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean
            skipAuthRedirect?: boolean
        }

        // Handle 401 Unauthorized - attempt token refresh
        if (error.response?.status === 401 && !originalRequest?.skipAuthRedirect) {
            // If we've already retried this request once, don't try again
            if (originalRequest._retry) {
                clearAuthSession()
                if (!window.location.pathname.startsWith('/login')) {
                    const currentPath = window.location.pathname + window.location.search
                    if (currentPath !== '/') {
                        sessionStorage.setItem('auth_redirect', currentPath)
                    }
                    window.location.href = '/login'
                }
                return Promise.reject(error)
            }

            // If refresh is already in progress, queue this request
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve: () => resolve(undefined), reject })
                }).then(() => {
                    // Retry original request after refresh completes
                    return axiosInstance(originalRequest)
                }).catch((err) => {
                    return Promise.reject(err)
                })
            }

            // Mark that we're refreshing to prevent concurrent refresh calls
            isRefreshing = true
            originalRequest._retry = true

            try {
                // Call refresh endpoint (refresh token cookie sent automatically)
                const response = await axiosInstance.post(
                    '/auth/refresh',
                    {},
                    { skipAuthRedirect: true } as any
                )

                // Refresh successful - resolve all queued requests
                processQueue()
                isRefreshing = false

                // Update stored user data with new permissions
                if (response.data?.user) {
                    const { setStoredUser } = await import('./auth')
                    setStoredUser(response.data.user)

                    // Invalidate React Query cache for currentUser
                    const { queryClient } = await import('@/lib/react-query')
                    queryClient.invalidateQueries({ queryKey: ['auth', 'currentUser'] })
                }

                // Retry original request with new access token
                return axiosInstance(originalRequest)
            } catch (refreshError) {
                // Refresh failed - reject all queued requests and redirect to login
                isRefreshing = false
                processQueue(refreshError as AxiosError)

                clearAuthSession()
                if (!window.location.pathname.startsWith('/login')) {
                    const currentPath = window.location.pathname + window.location.search
                    if (currentPath !== '/') {
                        sessionStorage.setItem('auth_redirect', currentPath)
                    }
                    window.location.href = '/login'
                }

                return Promise.reject(refreshError)
            }
        }

        // Handle other HTTP errors
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
