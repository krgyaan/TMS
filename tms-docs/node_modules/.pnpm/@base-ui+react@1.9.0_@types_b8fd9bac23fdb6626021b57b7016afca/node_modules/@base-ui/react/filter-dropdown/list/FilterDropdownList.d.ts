import type { BaseUIComponentProps } from "../../internals/types.js";
export interface FilterDropdownListState {}
export interface FilterDropdownListProps extends BaseUIComponentProps<'div', FilterDropdownListState> {
  id?: string | undefined;
}
export declare namespace FilterDropdownList {
  type Props = FilterDropdownListProps;
  type State = FilterDropdownListState;
}