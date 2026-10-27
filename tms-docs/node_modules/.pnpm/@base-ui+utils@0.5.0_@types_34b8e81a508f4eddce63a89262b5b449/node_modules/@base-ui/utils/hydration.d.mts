declare function useIsHydratedModern(): boolean;
/** Returns `true` once React has taken over on the client. */
export declare const useIsHydrated: typeof useIsHydratedModern;
/**
 * Returns `true` while React is hydrating server-rendered markup and `false`
 * for fresh client-only mounts — the exact inverse of {@link useIsHydrated}.
 */
export declare function useIsHydrating(): boolean;
export {};