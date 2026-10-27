'use client';

import * as React from 'react';
import { useControlled } from '@base-ui/utils/useControlled';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { warn } from '@base-ui/utils/warn';
import { EMPTY_ARRAY } from '@base-ui/utils/empty';
import { CompositeList } from "../../internals/composite/list/CompositeList.mjs";
import { AccordionRootContext } from "./AccordionRootContext.mjs";
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
const rootStateAttributesMapping = {
  value: () => null
};

/**
 * Groups all parts of the accordion.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export const AccordionRoot = /*#__PURE__*/React.forwardRef(function AccordionRoot(componentProps, forwardedRef) {
  const {
    render,
    className,
    disabled = false,
    hiddenUntilFound: hiddenUntilFoundProp,
    keepMounted: keepMountedProp,
    loopFocus,
    onValueChange,
    multiple = false,
    orientation = 'vertical',
    value: valueProp,
    defaultValue: defaultValueProp,
    style,
    ...elementProps
  } = componentProps;
  const defaultValue = defaultValueProp ?? EMPTY_ARRAY;

  /* istanbul ignore else -- `process.env.NODE_ENV` is a build-time constant under test */
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      if (hiddenUntilFoundProp && keepMountedProp === false) {
        warn('The `keepMounted={false}` prop on `Accordion.Root` is ignored when `hiddenUntilFound` is enabled, since panels must remain mounted while closed.');
      }
    }, [hiddenUntilFoundProp, keepMountedProp]);
  }
  const accordionItemRefs = React.useRef([]);
  const [value, setValue] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: 'Accordion',
    state: 'value'
  });
  const handleValueChange = useStableCallback((newValue, nextOpen, details) => {
    let nextValue;
    if (!multiple) {
      nextValue = value[0] === newValue ? [] : [newValue];
    } else if (nextOpen) {
      // Not `concat`: an item value can itself be an array, which `concat` would flatten.
      nextValue = [...value, newValue];
    } else {
      nextValue = value.filter(v => v !== newValue);
    }
    onValueChange?.(nextValue, details);
    if (details.isCanceled) {
      return;
    }
    setValue(nextValue);
  });
  const state = React.useMemo(() => ({
    value,
    disabled,
    orientation
  }), [value, disabled, orientation]);
  const contextValue = React.useMemo(() => ({
    disabled,
    handleValueChange,
    hiddenUntilFound: hiddenUntilFoundProp ?? false,
    keepMounted: keepMountedProp ?? false,
    state,
    value
  }), [disabled, handleValueChange, hiddenUntilFoundProp, keepMountedProp, state, value]);
  const element = useRenderElement('div', componentProps, {
    state,
    ref: forwardedRef,
    props: elementProps,
    stateAttributesMapping: rootStateAttributesMapping
  });
  return /*#__PURE__*/_jsx(AccordionRootContext.Provider, {
    value: contextValue,
    children: /*#__PURE__*/_jsx(CompositeList, {
      elementsRef: accordionItemRefs,
      children: element
    })
  });
});
if (process.env.NODE_ENV !== "production") AccordionRoot.displayName = "AccordionRoot";