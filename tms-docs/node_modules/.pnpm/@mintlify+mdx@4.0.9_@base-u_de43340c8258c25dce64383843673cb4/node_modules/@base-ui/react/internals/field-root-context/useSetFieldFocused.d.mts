import type * as React from 'react';
/**
 * Returns the field's `setFocused`, recording which control the focused state belongs to.
 *
 * Disabling or unmounting a focused control moves focus away without firing `blur`, so the focused
 * state would otherwise stay latched. A field can have several focus targets, so a control only
 * clears the shared state when focus last landed on itself. The stable callback doubles as that
 * identity.
 */
export declare function useSetFieldFocused(disabled: boolean | undefined, focusTargetRef: React.RefObject<Element | null>, onFocusedChange?: ((focused: boolean) => void) | undefined): (focused: boolean) => void;