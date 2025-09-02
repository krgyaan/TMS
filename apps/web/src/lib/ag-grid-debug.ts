// Debug utility for AG Grid setup issues
import { ModuleRegistry } from 'ag-grid-community';

export function debugAgGridSetup() {
  console.log('=== AG Grid Debug Information ===');

  // Check if ModuleRegistry exists
  console.log('ModuleRegistry exists:', typeof ModuleRegistry !== 'undefined');

  // Check if registerModules method exists
  console.log('registerModules method exists:', typeof ModuleRegistry.registerModules === 'function');

  // Check if isRegistered method exists
  console.log('isRegistered method exists:', typeof ModuleRegistry.isRegistered === 'function');

  // List available methods on ModuleRegistry
  console.log('ModuleRegistry methods:', Object.getOwnPropertyNames(ModuleRegistry));

  // Check AG Grid version
  try {
    const agGridVersion = require('ag-grid-community/package.json').version;
    console.log('AG Grid Community version:', agGridVersion);
  } catch (error) {
    console.log('Could not determine AG Grid version:', error);
  }

  console.log('=== End Debug Information ===');
}

// Auto-run debug when imported
debugAgGridSetup();
