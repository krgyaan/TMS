import type { BaseUIComponentProps, NativeButtonProps } from "../../internals/types.js";
export interface FilterDropdownClearState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}
export interface FilterDropdownClearProps extends NativeButtonProps, BaseUIComponentProps<'button', FilterDropdownClearState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}
export declare namespace FilterDropdownClear {
  type Props = FilterDropdownClearProps;
  type State = FilterDropdownClearState;
}