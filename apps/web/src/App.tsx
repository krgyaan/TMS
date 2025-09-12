import { ThemeProvider } from "@/components/theme-provider"
import { DocumentTitle } from "@/components/document-title"
import AppRoutes from "@/app/routes"
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

const App = () => {
    return (
        <>
            <DocumentTitle title="Dashboard | TMS" />
            <ThemeProvider defaultTheme="dark" storageKey="tms-ui-theme">
                <AppRoutes />
            </ThemeProvider>
        </>
    )
}

export default App
