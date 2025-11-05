import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/api'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { setStoredUser, clearAuthSession } from '@/lib/auth'

export const authKeys = {
    currentUser: ['auth', 'currentUser'] as const,
    googleUrl: ['auth', 'googleUrl'] as const,
}

export const useCurrentUser = () => {
    return useQuery({
        queryKey: authKeys.currentUser,
        queryFn: () => authService.getCurrentUser(),
        retry: false,
        staleTime: Infinity,
    })
}

export const useLogin = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ email, password }: { email: string; password: string }) =>
            authService.login(email, password),
        onSuccess: (data) => {
            setStoredUser(data.user)
            queryClient.setQueryData(authKeys.currentUser, data.user)

            toast.success(`Welcome back, ${data.user.name}!`)

            console.log('✅ Login success, redirecting to /')
            navigate('/', { replace: true })
        },
        onError: (error) => {
            console.error('❌ Login failed:', error)
            toast.error(handleQueryError(error))
        },
    })
}

export const useGoogleAuthUrl = () => {
    return useQuery({
        queryKey: authKeys.googleUrl,
        queryFn: () => authService.getGoogleAuthUrl(),
        enabled: false,
    })
}

export const useGoogleCallback = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (code: string) => authService.googleCallback(code),
        onSuccess: (data) => {
            setStoredUser(data.user)
            queryClient.setQueryData(authKeys.currentUser, data.user)

            console.log('✅ Google login success, redirecting to /')
            navigate('/', { replace: true })
        },
        onError: (error) => {
            console.error('❌ Google callback failed:', error)
            toast.error(handleQueryError(error))

            navigate('/login', { replace: true })
        },
    })
}

export const useLogout = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => authService.logout(),
        onSuccess: () => {
            clearAuthSession()
            queryClient.clear()

            toast.success('Logged out successfully')

            console.log('✅ Logout success, redirecting to /login')
            navigate('/login', { replace: true })
        },
        onError: (error) => {
            console.error('❌ Logout failed:', error)
            clearAuthSession()
            queryClient.clear()
            navigate('/login', { replace: true })
        },
    })
}
