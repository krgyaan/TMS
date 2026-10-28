import * as React from 'react';
import type { SelectStore } from "../store.js";
export declare const SelectRootContext: React.Context<SelectStore | undefined>;
export declare const SelectFloatingContext: React.Context<import("../../floating-ui-react/components/FloatingRootStore.js").FloatingRootStore | undefined>;
export declare function useSelectRootContext(): SelectStore;
export declare function useSelectFloatingContext(): import("../../floating-ui-react/components/FloatingRootStore.js").FloatingRootStore;