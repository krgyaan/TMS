import * as React from 'react';
import type { FilterDropdownItemContext } from "../root/FilterDropdownRootContext.mjs";
export interface UseFilterDropdownItemParameters {
  /**
   * A text representation of the item used for filtering. Falls back to the rendered text.
   */
  label?: string | undefined;
  /**
   * Keeps the nearest group visible while this filtered-out item must remain mounted.
   */
  retainGroup?: boolean | undefined;
  /**
   * The item's children, watched so a changed label re-registers against the active query.
   */
  children?: React.ReactNode;
  /**
   * The item's `render` prop, watched like `children` since its element can carry the text.
   */
  render?: unknown;
  /**
   * The dropdown that owns this item, when it isn't the nearest one. A filterable submenu's
   * trigger sits inside its own submenu's root but belongs to the enclosing list.
   */
  context?: FilterDropdownItemContext | null | undefined;
}
export interface UseFilterDropdownItemReturnValue {
  /**
   * Whether the item matches the current query and should render.
   */
  visible: boolean;
  /**
   * Ref for the rendered element, used to read its text when no `label` is given.
   */
  ref: React.RefObject<HTMLElement | null>;
}