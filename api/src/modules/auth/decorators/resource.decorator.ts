import { SetMetadata } from '@nestjs/common';
import { RESOURCE_CONFIG_KEY, type ResourceConfig } from '../guards/resource-access.guard';

/**
 * Configure resource access checking for data scope
 */
export const ResourceAccess = (config: ResourceConfig) =>
    SetMetadata(RESOURCE_CONFIG_KEY, config);
