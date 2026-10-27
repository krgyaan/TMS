import * as React from 'react';
export interface UseUnmountAfterCloseParameters {
  /**
   * Whether the popup is open.
   */
  open: boolean;
  /**
   * Ref to the element whose closing animations are awaited before unmounting.
   */
  ref: React.RefObject<HTMLElement | null>;
  /**
   * Whether the current close cycle asked to keep the popup mounted until the `unmount` action
   * is called. Ignored while `open`.
   */
  preventUnmountOnClose: boolean;
  /**
   * Writes `preventUnmountOnClose`. Opening starts a new close cycle, so the hook clears it
   * whenever `open` becomes `true`.
   */
  setPreventUnmountOnClose: (preventUnmountOnClose: boolean) => void;
  /**
   * Runs once per unmount, whether it completed automatically or through `forceUnmount`.
   */
  onUnmount: () => void;
  /**
   * Whether a popup that mounts already open should still play its enter transition.
   * See `useTransitionStatus`.
   */
  animateInitialOpen?: boolean | undefined;
}
/**
 * Keeps a popup mounted through its closing animation and unmounts it once the animation
 * finishes, unless the close cycle opted out through `preventUnmountOnClose`.
 * Store-agnostic: hosts sync `mounted` and `transitionStatus` wherever they need them.
 *
 * @returns `forceUnmount` unmounts the popup immediately. It is a no-op once the popup is already
 *   unmounted, so calling it after the automatic unmount doesn't repeat the completion callback,
 *   and a call while the popup is open only takes effect if a close commits in the same batch.
 */
export declare function useUnmountAfterClose(parameters: UseUnmountAfterCloseParameters): {
  mounted: boolean;
  transitionStatus: import("./useTransitionStatus.js").TransitionStatus;
  preventUnmountingOnClose: boolean;
  forceUnmount: () => void;
};