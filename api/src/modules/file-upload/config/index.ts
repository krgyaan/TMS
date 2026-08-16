import { DEFAULT_STORAGE_DIR, DEFAULT_COMPRESSION, type FileConfig, type ResolvedFileConfig } from './common';
import { tenderingConfigs } from './tendering.config';
import { biDashboardConfigs } from './bi-dashboard.config';
import { operationsConfigs } from './operations.config';
import { servicesConfigs } from './services.config';
import { sharedConfigs } from './shared.config';
import { accountsConfigs } from './accounts.config';
import { insuranceConfigs } from './insurance.config';
import { crmConfigs } from './crm.config';
import { masterConfigs } from './master.config';
import { employeeImprestConfigs } from './employee-imprest.config';
import { courierConfigs } from './courier.config';
import { hrmsConfigs } from './hrms.config';

/**
 * Apply module-level storageDir + the default compression rules to every
 * context in the given map. Individual contexts can still override any of
 * these per-entry (entry wins over defaults).
 */
const applyModuleDefaults = (
    configs: Record<string, FileConfig>,
    storageDir: string,
): Record<string, ResolvedFileConfig> =>
    Object.fromEntries(
        Object.entries(configs).map(([context, config]) => [
            context,
            { storageDir, ...DEFAULT_COMPRESSION, ...config },
        ]),
    ) as Record<string, ResolvedFileConfig>;

/**
 * Single merged source of truth for every upload context.
 * Adding a new context = adding one entry to the right module config file —
 * FileContext (below) and the controller's zod enum are derived from the keys,
 * so no type registration is needed anywhere else.
 */
export const FILE_CONFIGS: Record<string, ResolvedFileConfig> = {
    ...applyModuleDefaults(tenderingConfigs, DEFAULT_STORAGE_DIR),
    ...applyModuleDefaults(biDashboardConfigs, 'bi-dashboard'),
    ...applyModuleDefaults(operationsConfigs, 'operations'),
    ...applyModuleDefaults(servicesConfigs, 'services'),
    ...applyModuleDefaults(sharedConfigs, 'shared'),
    ...applyModuleDefaults(accountsConfigs, 'accounts'),
    ...applyModuleDefaults(insuranceConfigs, 'insurance'),
    ...applyModuleDefaults(crmConfigs, 'crm'),
    ...applyModuleDefaults(masterConfigs, 'master'),
    ...applyModuleDefaults(employeeImprestConfigs, ''),
    ...applyModuleDefaults(courierConfigs, ''),
    ...applyModuleDefaults(hrmsConfigs, 'hrms'),
};

export type FileContext = keyof typeof FILE_CONFIGS;

export function getFileConfig(context: FileContext): ResolvedFileConfig {
    const config = FILE_CONFIGS[context];
    if (!config) {
        throw new Error(`Unknown file context: ${context}`);
    }
    return config;
}

export function getStorageDir(context: FileContext): string {
    return FILE_CONFIGS[context].storageDir ?? DEFAULT_STORAGE_DIR;
}

export * from './common';