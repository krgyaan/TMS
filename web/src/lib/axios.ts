import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

export const axiosInstance: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
    withCredentials: true, // ✅ IMPORTANT: Send cookies with requests
})

// Request interceptor - No need to add token manually (cookies are automatic)
axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        // Cookies are sent automatically, no manual token handling needed
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
        if (error.response?.status === 401) {
            // Clear user data (token is in httpOnly cookie, can't access it)
            localStorage.removeItem('user')

            // Only redirect if not already on login page
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login'
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
