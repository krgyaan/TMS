import { ThemeProvider } from "@/components/theme-provider"
import Dashboard from "@/modules/dashboard"
import { DocumentTitle } from "@/components/document-title"

const App = () => {
    return (
        <>
            <DocumentTitle title="Dashboard — TMS" />
            <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                <Dashboard />
            </ThemeProvider>
        </>
    )
}

export default App
