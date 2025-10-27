import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from './lib/react-query'
import './index.css'
import App from './App.tsx'
import { Toaster } from 'sonner'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <App />
                <Toaster position="top-right" richColors />
                <ReactQueryDevtools initialIsOpen={false} />
            </BrowserRouter>
        </QueryClientProvider>
    </StrictMode>,
)
