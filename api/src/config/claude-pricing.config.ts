/**
 * Centralized Anthropic Claude Model Pricing Configuration
 * Rates per 1 Million Tokens ($ USD)
 * Reference: https://docs.claude.com/en/docs/about-claude/pricing
 */

export interface ModelPricing {
    modelId: string;
    displayName: string;
    inputPricePerMillion: number;
    outputPricePerMillion: number;
    cacheWritePricePerMillion: number;
    cacheReadPricePerMillion: number;
}

export const CLAUDE_PRICING: Record<string, ModelPricing> = {
    'claude-haiku-4-5-20251001': {
        modelId: 'claude-haiku-4-5-20251001',
        displayName: 'Claude Haiku 4.5',
        inputPricePerMillion: 1.00,
        outputPricePerMillion: 5.00,
        cacheWritePricePerMillion: 1.25,
        cacheReadPricePerMillion: 0.10,
    },
    'claude-sonnet-5': {
        modelId: 'claude-sonnet-5',
        displayName: 'Claude Sonnet 5',
        inputPricePerMillion: 3.00,
        outputPricePerMillion: 15.00,
        cacheWritePricePerMillion: 3.75,
        cacheReadPricePerMillion: 0.30,
    },
};

// Aliases and fallback defaults
export const DEFAULT_ROLE1_MODEL = 'claude-haiku-4-5-20251001';
export const DEFAULT_ROLE2_MODEL = 'claude-sonnet-5';

export function getModelPricing(modelId?: string): ModelPricing {
    if (modelId && CLAUDE_PRICING[modelId]) {
        return CLAUDE_PRICING[modelId];
    }
    if (modelId && modelId.toLowerCase().includes('sonnet')) {
        return CLAUDE_PRICING['claude-sonnet-5'];
    }
    return CLAUDE_PRICING['claude-haiku-4-5-20251001'];
}

export function calculateClaudeCostUsd(params: {
    model?: string;
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
}): number {
    const pricing = getModelPricing(params.model);
    const inTokens = Math.max(0, params.inputTokens || 0);
    const outTokens = Math.max(0, params.outputTokens || 0);
    const cacheWriteTokens = Math.max(0, params.cacheCreationTokens || 0);
    const cacheReadTokens = Math.max(0, params.cacheReadTokens || 0);

    const cost =
        (inTokens / 1_000_000) * pricing.inputPricePerMillion +
        (outTokens / 1_000_000) * pricing.outputPricePerMillion +
        (cacheWriteTokens / 1_000_000) * pricing.cacheWritePricePerMillion +
        (cacheReadTokens / 1_000_000) * pricing.cacheReadPricePerMillion;

    return Number(cost.toFixed(6));
}
