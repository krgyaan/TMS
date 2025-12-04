import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/react-query'
import { ThemeProvider } from './app/providers/ThemeProvider'
import { AuthProvider } from './app/providers/AuthProvider'
import { Toaster } from 'sonner'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="system" storageKey="tms-theme">
                <BrowserRouter>
                    <AuthProvider>
                        <App />
                    </AuthProvider>
                    <Toaster position="top-right" richColors />
                    <ReactQueryDevtools initialIsOpen={false} />
                </BrowserRouter>
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>,
)
