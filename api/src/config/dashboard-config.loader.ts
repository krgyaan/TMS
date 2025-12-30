import * as fs from 'fs';
import * as path from 'path';

export interface DashboardTabConfig {
    name: string;
    statusIds?: number[];
    category?: string;
    fieldConditions?: Record<string, string>;
    excludeStatusIds?: number[];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

export interface DashboardEntryCondition {
    statusIds: number[];
    requiresField?: string;
    fieldValue?: string;
    fieldCheck?: 'notEmpty' | 'equals';
    table?: string;
}

export interface DashboardConfig {
    entryCondition: DashboardEntryCondition;
    tabs: Record<string, DashboardTabConfig>;
}

export interface DashboardConfigFile {
    dashboards: Record<string, DashboardConfig>;
    categories: Record<string, number[]>;
}

let cachedConfig: DashboardConfigFile | null = null;

/**
 * Load dashboard configuration from JSON file
 */
export function loadDashboardConfig(): DashboardConfigFile {
    if (cachedConfig) {
        return cachedConfig;
    }

    // Resolve config path - works in both dev and production
    // Try multiple locations in order of likelihood
    const possiblePaths = [
        // 1. Relative to __dirname (works if file is copied to dist)
        path.join(__dirname, 'dashboard-config.json'),
        // 2. From project root src/config (works in dev with ts-node-dev)
        path.join(process.cwd(), 'src', 'config', 'dashboard-config.json'),
        // 3. From dist/src/config (if running from dist)
        path.join(process.cwd(), 'dist', 'src', 'config', 'dashboard-config.json'),
        // 4. Go up from dist/src/config to src/config
        path.resolve(__dirname, '..', '..', 'src', 'config', 'dashboard-config.json'),
    ];

    let configPath: string | null = null;
    for (const candidatePath of possiblePaths) {
        if (fs.existsSync(candidatePath)) {
            configPath = candidatePath;
            break;
        }
    }

    if (!configPath) {
        throw new Error(
            `dashboard-config.json not found. Tried:\n${possiblePaths.map(p => `  - ${p}`).join('\n')}`
        );
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    cachedConfig = JSON.parse(configContent) as DashboardConfigFile;

    return cachedConfig;
}

/**
 * Get dashboard configuration by name
 */
export function getDashboardConfig(dashboardName: string): DashboardConfig | null {
    const config = loadDashboardConfig();
    return config.dashboards[dashboardName] || null;
}

/**
 * Get tab configuration for a dashboard
 */
export function getTabConfig(
    dashboardName: string,
    tabKey: string
): DashboardTabConfig | null {
    const dashboardConfig = getDashboardConfig(dashboardName);
    if (!dashboardConfig) {
        return null;
    }
    return dashboardConfig.tabs[tabKey] || null;
}

/**
 * Get status IDs for a category
 */
export function getCategoryStatusIds(category: string): number[] {
    const config = loadDashboardConfig();
    return config.categories[category] || [];
}

/**
 * Clear cached config (useful for testing or hot-reload)
 */
export function clearConfigCache(): void {
    cachedConfig = null;
}
