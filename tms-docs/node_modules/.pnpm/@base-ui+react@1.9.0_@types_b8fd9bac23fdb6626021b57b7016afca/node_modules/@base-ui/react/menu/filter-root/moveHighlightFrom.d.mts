import type * as React from 'react';
import type { MenuRoot } from "../root/MenuRoot.mjs";
import type { MenuStore } from "../store/MenuStore.mjs";
/**
 * Moves a menu's highlight from `item` one step in the direction of a main-orientation arrow key,
 * with the same step as the menu's own list navigation, and returns the newly highlighted item.
 * A step that would leave a menu whose navigation escapes to its input keeps the highlight.
 */
export declare function moveHighlightFrom(store: MenuStore<unknown>, item: HTMLElement, event: React.KeyboardEvent, options: MoveHighlightOptions): HTMLElement | undefined;
export interface MoveHighlightOptions {
  orientation: MenuRoot.Orientation;
  rtl: boolean;
  loopFocus: boolean;
  /** Whether the menu's navigation escapes to its input at either end instead of wrapping. */
  allowEscape: boolean;
}