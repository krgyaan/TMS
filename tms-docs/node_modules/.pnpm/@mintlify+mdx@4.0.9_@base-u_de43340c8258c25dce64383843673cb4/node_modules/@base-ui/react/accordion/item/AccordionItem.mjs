'use client';

import * as React from 'react';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useBaseUiId } from "../../internals/useBaseUiId.mjs";
import { useCollapsibleRoot } from "../../collapsible/root/useCollapsibleRoot.mjs";
import { CollapsibleRootContext } from "../../collapsible/root/CollapsibleRootContext.mjs";
import { useCompositeListItem } from "../../internals/composite/list/useCompositeListItem.mjs";
import { useAccordionRootContext } from "../root/AccordionRootContext.mjs";
import { AccordionItemContext } from "./AccordionItemContext.mjs";
import { accordionStateAttributesMapping } from "./stateAttributesMapping.mjs";
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Groups an accordion header with the corresponding panel.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Accordion](https://base-ui.com/react/components/accordion)
 */
export const AccordionItem = /*#__PURE__*/React.forwardRef(function AccordionItem(componentProps, forwardedRef) {
  const {
    className,
    disabled: disabledProp = false,
    onOpenChange: onOpenChangeProp,
    render,
    value: valueProp,
    style,
    ...elementProps
  } = componentProps;
  const {
    ref: listItemRef,
    index
  } = useCompositeListItem();
  const {
    disabled: contextDisabled,
    handleValueChange,
    state: rootState,
    value: openValues
  } = useAccordionRootContext();
  const fallbackValue = useBaseUiId();
  const value = valueProp ?? fallbackValue;
  const disabled = disabledProp || contextDisabled;
  const isOpen = openValues.includes(value);
  const onOpenChange = useStableCallback((nextOpen, eventDetails) => {
    onOpenChangeProp?.(nextOpen, eventDetails);
    if (eventDetails.isCanceled) {
      return;
    }
    handleValueChange(value, nextOpen, eventDetails);
  });
  const collapsible = useCollapsibleRoot({
    open: isOpen,
    onOpenChange,
    disabled
  });
  const collapsibleContext = React.useMemo(() => ({
    ...collapsible,
    onOpenChange,
    state: {
      open: collapsible.open,
      disabled: collapsible.disabled,
      transitionStatus: collapsible.transitionStatus
    }
  }), [collapsible, onOpenChange]);
  const state = React.useMemo(() => ({
    ...rootState,
    hidden: !isOpen && !collapsible.mounted,
    index,
    disabled,
    open: isOpen
  }), [collapsible.mounted, disabled, index, isOpen, rootState]);
  const defaultTriggerId = useBaseUiId();
  // `undefined` uses the initial generated fallback; `null` means the trigger unmounted.
  const [registeredTriggerId, setTriggerId] = React.useState();
  const triggerId = registeredTriggerId === null ? undefined : registeredTriggerId ?? defaultTriggerId;
  const accordionItemContext = React.useMemo(() => ({
    defaultTriggerId,
    open: isOpen,
    state,
    setTriggerId,
    triggerId
  }), [defaultTriggerId, isOpen, state, setTriggerId, triggerId]);
  const element = useRenderElement('div', componentProps, {
    state,
    ref: [forwardedRef, listItemRef],
    props: elementProps,
    stateAttributesMapping: accordionStateAttributesMapping
  });
  return /*#__PURE__*/_jsx(CollapsibleRootContext.Provider, {
    value: collapsibleContext,
    children: /*#__PURE__*/_jsx(AccordionItemContext.Provider, {
      value: accordionItemContext,
      children: element
    })
  });
});
if (process.env.NODE_ENV !== "production") AccordionItem.displayName = "AccordionItem";