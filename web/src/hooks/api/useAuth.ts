import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/api'
import { handleQueryError } from '@/lib/react-query'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

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
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify(data.user))
            queryClient.setQueryData(authKeys.currentUser, data.user)
            toast.success('Login successful')
            navigate('/dashboard')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
        },
    })
}

export const useGoogleAuthUrl = () => {
    return useQuery({
        queryKey: authKeys.googleUrl,
        queryFn: () => authService.getGoogleAuthUrl(),
        enabled: false, // Only fetch when explicitly called
    })
}

export const useGoogleCallback = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (code: string) => authService.googleCallback(code),
        onSuccess: (data) => {
            localStorage.setItem('token', data.access_token)
            localStorage.setItem('user', JSON.stringify(data.user))
            queryClient.setQueryData(authKeys.currentUser, data.user)
            toast.success('Login successful')
            navigate('/dashboard')
        },
        onError: (error) => {
            toast.error(handleQueryError(error))
            navigate('/auth/login')
        },
    })
}

export const useLogout = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => authService.logout(),
        onSuccess: () => {
            queryClient.clear()
            toast.success('Logged out successfully')
            navigate('/auth/login')
        },
    })
}
