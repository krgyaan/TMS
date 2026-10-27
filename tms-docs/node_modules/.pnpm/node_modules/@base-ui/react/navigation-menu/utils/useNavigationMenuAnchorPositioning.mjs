'use client';

import { useBaseUIFloating } from "../../floating-ui-react/hooks/useFloating.mjs";
import { useFloatingRootContext } from "../../floating-ui-react/hooks/useFloatingRootContext.mjs";
import { useAnchorPositioningWithHook } from "../../internals/useAnchorPositioning.mjs";
function useFloatingWithFallbackStore(options) {
  const fallbackStore = useFloatingRootContext(options);
  return useBaseUIFloating({
    ...options,
    rootContext: options.rootContext || fallbackStore
  });
}

/**
 * Positioning path for the Navigation Menu, whose active trigger supplies its root store after the
 * positioner has already rendered.
 */
export function useNavigationMenuAnchorPositioning(params) {
  return useAnchorPositioningWithHook(params, useFloatingWithFallbackStore);
}