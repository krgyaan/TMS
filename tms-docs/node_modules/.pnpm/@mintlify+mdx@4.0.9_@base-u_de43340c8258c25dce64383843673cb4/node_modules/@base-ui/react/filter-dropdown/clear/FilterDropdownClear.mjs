'use client';

import * as React from 'react';
import { useButton } from "../../internals/use-button/index.mjs";
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { createChangeEventDetails } from "../../internals/createBaseUIEventDetails.mjs";
import { REASONS } from "../../internals/reasons.mjs";
import { useFilterDropdownRootContext, useFilterDropdownValueContext } from "../root/FilterDropdownRootContext.mjs";

/**
 * @internal
 */
export const FilterDropdownClear = /*#__PURE__*/React.forwardRef(function FilterDropdownClear(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    disabled: disabledProp = false,
    nativeButton = true,
    ...elementProps
  } = componentProps;
  const context = useFilterDropdownRootContext();
  const value = useFilterDropdownValueContext();
  const disabled = context.disabled || disabledProp;
  const visible = value !== '';
  const {
    buttonRef,
    getButtonProps
  } = useButton({
    disabled,
    native: nativeButton
  });

  // `visible` is deliberately absent from the state: the component renders nothing when it is
  // false, so a `data-visible` attribute would be present on every rendered instance.
  const state = {
    disabled
  };
  return useRenderElement('button', componentProps, {
    enabled: visible,
    state,
    ref: [forwardedRef, buttonRef],
    props: [{
      tabIndex: -1,
      'aria-hidden': true,
      onMouseDown(event) {
        // Avoid stealing focus from the input on pointer interaction.
        event.preventDefault();
      },
      onClick(event) {
        const eventDetails = createChangeEventDetails(REASONS.clearPress, event.nativeEvent);
        context.onValueChange('', eventDetails);
        context.focusOwnerRef.current?.focus({
          preventScroll: true
        });
      }
    }, elementProps, getButtonProps]
  });
});
if (process.env.NODE_ENV !== "production") FilterDropdownClear.displayName = "FilterDropdownClear";