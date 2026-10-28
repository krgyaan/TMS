import type { FilterDropdownGroupContext } from "./FilterDropdownGroupContext.js";
export interface UseFilterDropdownGroupReturnValue {
  /**
   * Whether the query filtered out every item in the group, so its label doesn't linger over an
   * empty section.
   */
  hidden: boolean;
  /**
   * Provider value that collects the group's items.
   */
  context: FilterDropdownGroupContext;
}