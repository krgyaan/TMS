import { ThemeProvider } from "@/components/theme-provider"
import { DocumentTitle } from "@/components/document-title"
import AppRoutes from "@/app/routes"

const App = () => {
    return (
        <>
            <DocumentTitle title="Dashboard | TMS" />
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <AppRoutes />
            </ThemeProvider>
        </>
    )
}

export default App
