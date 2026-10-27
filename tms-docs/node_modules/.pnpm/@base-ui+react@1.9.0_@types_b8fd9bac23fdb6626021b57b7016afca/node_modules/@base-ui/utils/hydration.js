"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useIsHydrated = void 0;
exports.useIsHydrating = useIsHydrating;
var React = _interopRequireWildcard(require("react"));
var _shim = require("use-sync-external-store/shim");
var _reactVersion = require("./reactVersion");
/* We need to import the shim because React 17 does not support the `useSyncExternalStore` API. */

const emptySubscribe = () => () => {};
const getTrue = () => true;
const getFalse = () => false;
function useIsHydratedModern() {
  // The server snapshot is what React renders with while hydrating, so this
  // distinguishes a hydration pass from a client-only mount, which reads the
  // client snapshot straight away.
  return (0, _shim.useSyncExternalStore)(emptySubscribe, getTrue, getFalse);
}

/**
 * React 17 path. The shim only forwards to React's own implementation when
 * there is one; its fallback takes `(subscribe, getSnapshot)` and drops
 * `getServerSnapshot`, so a shim-based hook would report `true` on the server —
 * the opposite of what this exists for.
 *
 * `useState` cannot tell hydration from a client-only mount, so both report
 * "not hydrated" for one render before settling.
 */
function useIsHydratedLegacy() {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

/** Returns `true` once React has taken over on the client. */
const useIsHydrated = exports.useIsHydrated = (0, _reactVersion.isReactVersionAtLeast)(18) ? useIsHydratedModern : useIsHydratedLegacy;

/**
 * Returns `true` while React is hydrating server-rendered markup and `false`
 * for fresh client-only mounts — the exact inverse of {@link useIsHydrated}.
 */
function useIsHydrating() {
  return !useIsHydrated();
}