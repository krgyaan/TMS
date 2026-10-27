import type { FilterDropdownRoot } from "./FilterDropdownRootContext.js";
interface UseFilterDropdownCloseQueryParameters {
  open: boolean;
  mounted: boolean;
  value: string;
  onValueChange: (value: string, details: FilterDropdownRoot.ChangeEventDetails) => void;
}
/**
 * Clears the committed value when a filter popup closes while retaining the displayed query and
 * filtered items until the exit transition completes.
 */
export declare function useFilterDropdownCloseQuery(parameters: UseFilterDropdownCloseQueryParameters): string;
export {};