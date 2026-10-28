import type { FloatingRootStore } from "../components/FloatingRootStore.js";
import type { UseFloatingOptions, UseFloatingReturn } from "../types.js";
/**
 * Provides data to position a floating element and context to add interactions.
 * The caller supplies the root store, which owns the reference and floating elements.
 * @see https://floating-ui.com/docs/useFloating
 */
export declare function useBaseUIFloating(options: UseFloatingOptions & {
  rootContext: FloatingRootStore;
}): UseFloatingReturn;