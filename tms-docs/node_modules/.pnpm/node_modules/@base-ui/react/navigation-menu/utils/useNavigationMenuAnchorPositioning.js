"use strict";
'use client';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useNavigationMenuAnchorPositioning = useNavigationMenuAnchorPositioning;
var _useFloating = require("../../floating-ui-react/hooks/useFloating");
var _useFloatingRootContext = require("../../floating-ui-react/hooks/useFloatingRootContext");
var _useAnchorPositioning = require("../../internals/useAnchorPositioning");
function useFloatingWithFallbackStore(options) {
  const fallbackStore = (0, _useFloatingRootContext.useFloatingRootContext)(options);
  return (0, _useFloating.useBaseUIFloating)({
    ...options,
    rootContext: options.rootContext || fallbackStore
  });
}

/**
 * Positioning path for the Navigation Menu, whose active trigger supplies its root store after the
 * positioner has already rendered.
 */
function useNavigationMenuAnchorPositioning(params) {
  return (0, _useAnchorPositioning.useAnchorPositioningWithHook)(params, useFloatingWithFallbackStore);
}