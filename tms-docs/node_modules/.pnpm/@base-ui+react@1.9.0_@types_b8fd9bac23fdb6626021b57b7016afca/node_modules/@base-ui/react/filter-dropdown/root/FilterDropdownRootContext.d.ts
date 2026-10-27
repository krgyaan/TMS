import * as React from 'react';
import type { BaseUIChangeEventDetails } from "../../internals/createBaseUIEventDetails.js";
import type { REASONS } from "../../internals/reasons.js";
import type { FilterDropdownStore } from "../store.js";
export interface FilterDropdownItemRegistration {
  getText: () => string | undefined;
}
export type FilterDropdownFilter = (text: string, query: string) => boolean;
export interface FilterDropdownRootContext {
  open: boolean;
  disabled: boolean;
  inputFocusVisible: boolean;
  setInputFocusVisible: (visible: boolean) => void;
  keyboardModality: boolean;
  setKeyboardModality: (keyboardModality: boolean) => void;
  autoHighlight: boolean | 'always';
  triggerId: string | undefined;
  defaultListId: string | undefined;
  listId: string | undefined;
  /** Records the id the list rendered with, when it differs from `defaultListId`. */
  setRenderedListId: React.Dispatch<React.SetStateAction<string | undefined>>;
  /** The input, which owns real focus while the host uses virtual list navigation. */
  focusOwnerRef: React.RefObject<HTMLElement | null>;
  /** Moves the host's highlight. */
  setActiveIndex: (index: number | null) => void;
  /** Called with the previous items when the host's list changes after it first registered. */
  onItemsChange: (previousItems: readonly (HTMLElement | null)[]) => void;
  /** Reports a query edit and resets the highlight it invalidates. */
  onValueChange: (value: string, eventDetails: FilterDropdownRoot.ChangeEventDetails) => void;
}
export interface FilterDropdownItemContext {
  /** The enclosing dropdown when this root is nested. */
  parent: FilterDropdownItemContext | null;
  store: FilterDropdownStore;
  registerItem: (id: symbol, registration: FilterDropdownItemRegistration) => () => void;
  listRef: React.RefObject<Array<HTMLElement | null>>;
}
export declare const FilterDropdownItemContext: React.Context<FilterDropdownItemContext | null>;
export declare function useFilterDropdownItemContext(optional?: false): FilterDropdownItemContext;
export declare function useFilterDropdownItemContext(optional: true): FilterDropdownItemContext | null;
export declare function useFilterDropdownItemContext(optional: boolean): FilterDropdownItemContext | null;
export declare const FilterDropdownRootContext: React.Context<FilterDropdownRootContext | null>;
export declare function useFilterDropdownRootContext(optional?: false): FilterDropdownRootContext;
export declare function useFilterDropdownRootContext(optional: true): FilterDropdownRootContext | null;
export declare function useFilterDropdownRootContext(optional: boolean): FilterDropdownRootContext | null;
/**
 * Finds the dropdown that owns the given item list, walking out through nested roots.
 */
export declare function useFilterContextForList(listRef: React.RefObject<Array<HTMLElement | null>> | null): FilterDropdownItemContext | null;
export declare const FilterDropdownValueContext: React.Context<string>;
export declare function useFilterDropdownValueContext(): string;
export type FilterDropdownRootChangeEventReason = typeof REASONS.inputChange | typeof REASONS.inputClear | typeof REASONS.clearPress | typeof REASONS.popupClose;
export type FilterDropdownRootChangeEventDetails = BaseUIChangeEventDetails<FilterDropdownRootChangeEventReason>;
export declare namespace FilterDropdownRoot {
  type ChangeEventReason = FilterDropdownRootChangeEventReason;
  type ChangeEventDetails = FilterDropdownRootChangeEventDetails;
}