import * as React from 'react';
export interface ComboboxChipsContext {
  chipsRef: React.RefObject<Array<HTMLButtonElement | null>>;
}
export declare const ComboboxChipsContext: React.Context<ComboboxChipsContext | undefined>;
export declare function useComboboxChipsContext(): ComboboxChipsContext | undefined;