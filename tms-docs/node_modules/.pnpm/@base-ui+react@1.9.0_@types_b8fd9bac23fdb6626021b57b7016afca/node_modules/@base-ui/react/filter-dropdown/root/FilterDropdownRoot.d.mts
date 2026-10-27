import * as React from 'react';
import type { FilterDropdownFilter, FilterDropdownRoot as FilterDropdownRootNamespace } from "./FilterDropdownRootContext.mjs";
export interface FilterDropdownRootProps {
  children?: React.ReactNode;
  /**
   * Whether the popup is currently open.
   */
  open: boolean;
  /** Whether the filter controls should be disabled. */
  disabled?: boolean | undefined;
  /** Whether the popup opened from the keyboard, so the input starts with its focus ring. */
  openedByKeyboard?: boolean | undefined;
  /**
   * Locale used for filtering comparisons.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The filter input value.
   */
  value: string;
  /**
   * Query used for filtering when it differs from the input value, such as while closing.
   */
  query?: string | undefined;
  /**
   * Event handler called when the filter input value changes.
   */
  onValueChange?: ((value: string, eventDetails: FilterDropdownRootNamespace.ChangeEventDetails) => void) | undefined;
  /**
   * Custom filter logic used when filtering items. Pass `null` to turn filtering off.
   */
  filter?: FilterDropdownFilter | null | undefined;
  /** Whether the first matching item should be highlighted automatically. */
  autoHighlight?: boolean | 'always' | undefined;
  /**
   * ID of a trigger rendered outside this root, which cannot register itself through the context.
   */
  triggerId?: string | null | undefined;
  /**
   * The host's DOM-ordered list of item elements.
   */
  listRef: React.RefObject<Array<HTMLElement | null>>;
  /**
   * Reads the host's highlighted index.
   */
  getActiveIndex: () => number | null;
  /**
   * Moves the host's highlight.
   */
  setActiveIndex: (index: number | null) => void;
  /**
   * The host's ref for the input, which holds real focus while the list is navigated virtually.
   */
  focusOwnerRef?: React.RefObject<HTMLElement | null> | undefined;
}
export declare namespace FilterDropdownRoot {
  type Props = FilterDropdownRootProps;
  type ChangeEventReason = FilterDropdownRootNamespace.ChangeEventReason;
  type ChangeEventDetails = FilterDropdownRootNamespace.ChangeEventDetails;
}