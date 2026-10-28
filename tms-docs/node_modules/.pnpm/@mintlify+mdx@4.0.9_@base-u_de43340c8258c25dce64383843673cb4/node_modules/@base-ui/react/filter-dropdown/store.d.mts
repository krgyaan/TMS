import { ReactStore } from '@base-ui/utils/store';
import { NOOP } from '@base-ui/utils/empty';
export type State = {
  visibleItemIds: ReadonlySet<symbol> | null;
  registeredItemCount: number;
};
export declare const selectors: {
  isEmpty: (state: State) => boolean;
  isItemVisible: (state: State, id: symbol) => boolean;
};
export declare class FilterDropdownStore extends ReactStore<Readonly<State>, object, typeof selectors> {
  constructor();
}
/**
 * Stand-in for an item whose owning dropdown is absent, such as a filterable submenu's trigger
 * inside a plain parent menu. Nothing registers and every item stays visible.
 */
export declare const DETACHED_OWNER: {
  registerItem: () => typeof NOOP;
  store: FilterDropdownStore;
};