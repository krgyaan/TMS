import type * as React from 'react';
import type { BaseUIChangeEventDetails } from "../../internals/createBaseUIEventDetails.mjs";
import { REASONS } from "../../internals/reasons.mjs";
/**
 * Minimal store interface required by the focus guard hook.
 * Both PopoverStore and MenuStore satisfy this interface.
 */
interface TriggerFocusGuardStore {
  setOpen(open: boolean, eventDetails: BaseUIChangeEventDetails<typeof REASONS.focusOut>): void;
  select(key: 'positionerElement'): HTMLElement | null;
  context: {
    /**
     * Shared with the focus manager through `getInsideElements` so that blurring the trigger
     * onto this guard does not close the popup before the guard's own focus handler runs.
     */
    readonly beforeTriggerFocusGuardRef: React.RefObject<HTMLElement | null>;
    readonly beforeContentFocusGuardRef: React.RefObject<HTMLElement | null>;
    readonly triggerFocusTargetRef: React.RefObject<HTMLElement | null>;
  };
}
/**
 * Provides focus guard handlers for popup triggers (Popover, Menu).
 *
 * When the popup is open, invisible focus guard elements are placed before and after
 * the trigger. These handlers close the popup and move focus to the appropriate
 * tabbable element when the guards receive focus (i.e. when the user tabs out).
 */
export declare function useTriggerFocusGuards(store: TriggerFocusGuardStore, triggerElementRef: React.RefObject<HTMLElement | null>): {
  handlePreFocusGuardFocus: (event: React.FocusEvent<HTMLElement>) => void;
  handleFocusTargetFocus: (event: React.FocusEvent<HTMLElement>) => void;
};
export {};