// Simple AG Grid setup - register modules once
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register all AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Export function for manual initialization
export function initializeAgGrid() {
  ModuleRegistry.registerModules([AllCommunityModule]);
}
