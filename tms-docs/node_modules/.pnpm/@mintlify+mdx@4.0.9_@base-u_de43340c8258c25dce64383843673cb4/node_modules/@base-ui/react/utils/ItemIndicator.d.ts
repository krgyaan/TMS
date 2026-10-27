import * as React from 'react';
import type { BaseUIComponentProps } from "../internals/types.js";
import type { TransitionStatus } from "../internals/useTransitionStatus.js";
export declare const ItemIndicator: React.NamedExoticComponent<Omit<ItemIndicatorProps, "ref"> & React.RefAttributes<HTMLSpanElement>>;
interface ItemIndicatorState {
  selected: boolean;
  transitionStatus: TransitionStatus;
}
interface ItemIndicatorProps extends BaseUIComponentProps<'span', ItemIndicatorState> {
  keepMounted?: boolean | undefined;
  selected: boolean;
}
export {};