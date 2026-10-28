"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useUnmountAfterClose = useUnmountAfterClose;
var React = _interopRequireWildcard(require("react"));
var _useStableCallback = require("@base-ui/utils/useStableCallback");
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _useForcedRerendering = require("@base-ui/utils/useForcedRerendering");
var _useTransitionStatus = require("./useTransitionStatus");
var _useOpenChangeComplete = require("./useOpenChangeComplete");
/**
 * Keeps a popup mounted through its closing animation and unmounts it once the animation
 * finishes, unless the close cycle opted out through `preventUnmountOnClose`.
 * Store-agnostic: hosts sync `mounted` and `transitionStatus` wherever they need them.
 *
 * @returns `forceUnmount` unmounts the popup immediately. It is a no-op once the popup is already
 *   unmounted, so calling it after the automatic unmount doesn't repeat the completion callback,
 *   and a call while the popup is open only takes effect if a close commits in the same batch.
 */
function useUnmountAfterClose(parameters) {
  const {
    open,
    ref,
    preventUnmountOnClose,
    setPreventUnmountOnClose: setPreventUnmountOnCloseParam,
    onUnmount,
    animateInitialOpen
  } = parameters;
  const setPreventUnmountOnClose = (0, _useStableCallback.useStableCallback)(setPreventUnmountOnCloseParam);
  const {
    mounted,
    setMounted,
    transitionStatus
  } = (0, _useTransitionStatus.useTransitionStatus)(open, false, false, animateInitialOpen);

  // Opening starts a new close cycle. Derive during render so the close-completion hook below
  // reads the value on the same pass, and clear the stored value so it doesn't leak into the next
  // close. The effect only runs when `open` changes, so an opt-out recorded while a controlled
  // close is still pending (for example in a transition) is not cleared by the render that still
  // sees `open`.
  const preventUnmountingOnClose = open ? false : preventUnmountOnClose;
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    if (open) {
      setPreventUnmountOnClose(false);
    }
  }, [open, setPreventUnmountOnClose]);

  // Mirrors `mounted` synchronously so repeated `forceUnmount()` calls in one batch complete
  // closing once. Resynced on every commit: `setMounted(false)` while open re-mounts on the next
  // render without changing the committed `mounted`, so a `[mounted]` dependency would leave the
  // mirror stale and block every later unmount.
  const mountedRef = React.useRef(mounted);
  const pendingUnmountRef = React.useRef(false);
  const rerender = (0, _useForcedRerendering.useForcedRerendering)();
  const unmount = () => {
    mountedRef.current = false;
    setMounted(false);
    onUnmount();
  };
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    mountedRef.current = mounted;
    if (pendingUnmountRef.current) {
      pendingUnmountRef.current = false;
      if (!open && mounted) {
        unmount();
      }
    }
  });
  const forceUnmount = (0, _useStableCallback.useStableCallback)(() => {
    if (!mountedRef.current) {
      return;
    }
    if (open) {
      // The rendered `open` can't tell a stale exit-animation callback after a quick reopen from a
      // close batched with this call (`close(); unmount()`). Decide once the batch commits: unmount
      // if the popup closed, otherwise drop the call rather than run the host's unmount cleanup and
      // the close completion against a live popup.
      pendingUnmountRef.current = true;
      rerender();
      return;
    }
    unmount();
  });
  (0, _useOpenChangeComplete.useOpenChangeComplete)({
    enabled: mounted && !open && !preventUnmountingOnClose,
    open,
    ref,
    onComplete() {
      if (!open) {
        forceUnmount();
      }
    }
  });
  return {
    mounted,
    transitionStatus,
    preventUnmountingOnClose,
    forceUnmount
  };
}