import * as React from 'react';
import type { MenuFilterRootProps } from "./MenuFilterRoot.mjs";
/** Splits a filterable root's props between the menu root and the filter below it. */
export declare function useMenuFilterRoot<Payload>(props: MenuFilterRootProps<Payload>): {
  children: import("../../utils/popups/index.mjs").PayloadChildRenderFunction<Payload> | React.ReactNode;
  rootProps: {
    virtualFocus: boolean;
    virtualFocusRef: React.RefObject<HTMLElement | null>;
    allowEscape: boolean;
    resetOnPointerLeave: boolean;
    defaultOpen?: boolean | undefined;
    loopFocus?: boolean | undefined;
    highlightItemOnHover?: boolean | undefined;
    modal?: boolean | undefined;
    onOpenChange?: ((open: boolean, eventDetails: import("../index.mjs").MenuRoot.ChangeEventDetails) => void) | undefined;
    onOpenChangeComplete?: ((open: boolean) => void) | undefined;
    onItemHighlighted?: ((highlightedItem: HTMLElement | undefined, eventDetails: import("../index.mjs").MenuRoot.HighlightEventDetails) => void) | undefined;
    open?: boolean | undefined;
    orientation?: import("../index.mjs").MenuRoot.Orientation | undefined;
    disabled?: boolean | undefined;
    closeParentOnEsc?: boolean | undefined;
    actionsRef?: React.RefObject<import("../index.mjs").MenuRoot.Actions | null> | undefined;
    triggerId?: string | null | undefined;
    defaultTriggerId?: string | null | undefined;
    handle?: import("../index.parts.mjs").Handle<Payload> | undefined;
  };
  dropdownProps: {
    value: string | undefined;
    defaultValue: string | undefined;
    onValueChange: ((value: string, eventDetails: import("../index.mjs").MenuFilterProvider.ChangeEventDetails) => void) | undefined;
    filter: ((text: string, query: string) => boolean) | null | undefined;
    autoHighlight: "always" | boolean;
    locale: Intl.LocalesArgument;
  };
};