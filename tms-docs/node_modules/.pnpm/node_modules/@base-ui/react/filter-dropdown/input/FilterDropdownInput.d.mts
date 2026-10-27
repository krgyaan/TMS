import type { BaseUIComponentProps } from "../../internals/types.mjs";
export interface FilterDropdownInputState {
  /**
   * Whether the input shows its focus ring.
   * Cleared when keyboard navigation highlights an item.
   */
  highlighted: boolean;
}
export interface FilterDropdownInputProps extends BaseUIComponentProps<'input', FilterDropdownInputState> {}
export declare namespace FilterDropdownInput {
  type Props = FilterDropdownInputProps;
  type State = FilterDropdownInputState;
}