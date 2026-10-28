'use client';

import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useValueAsRef } from '@base-ui/utils/useValueAsRef';
import { useStore } from '@base-ui/utils/store';
import { useFilterDropdownItemContext } from "../root/FilterDropdownRootContext.mjs";
import { useFilterDropdownGroupContext } from "../group/FilterDropdownGroupContext.mjs";
import { DETACHED_OWNER, selectors } from "../store.mjs";
import { unwrapLazyRenderProp } from "../../internals/useRenderElement.mjs";

/** Text of the rendered children, for when the element is filtered out and has no DOM node. */
function childrenText(children) {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(childrenText).join('');
  }
  if (/*#__PURE__*/React.isValidElement(children)) {
    return childrenText(children.props.children);
  }
  return '';
}
/**
 * Registers an item with the enclosing filter root and reports whether the query keeps it.
 *
 * The item renders once before it is registered so its rendered text can be read and cached: a
 * popup can open with a query that already excludes the item, and a hidden item has no text left
 * to match against.
 *
 * @internal
 */
export function useFilterDropdownItem(params) {
  const {
    label,
    retainGroup = false,
    children,
    render,
    context
  } = params;
  const nearestContext = useFilterDropdownItemContext(context !== undefined);
  const groupContext = useFilterDropdownGroupContext();
  const owner = context === undefined ? nearestContext : context;
  const {
    registerItem,
    store
  } = owner ?? DETACHED_OWNER;
  const registerGroupItem = groupContext?.registerItem;
  const itemId = useRefWithInit(() => Symbol('filter-dropdown-item')).current;
  const ref = React.useRef(null);
  const registeredTextRef = React.useRef(undefined);
  const matched = useStore(store, selectors.isItemVisible, itemId);

  // An initial item is visible before registration (`visibleItemIds` is null), so start
  // registered and skip the mount re-render. A late item under an active filter starts
  // unregistered and renders once so its DOM text can be captured.
  const [registered, setRegistered] = React.useState(matched);

  // Read through refs so `register` stays stable while the children change identity.
  const childrenRef = useValueAsRef(children);
  const renderRef = useValueAsRef(render);

  // What the children last read as, to tell whether they changed while the item rendered no text.
  const childrenTextRef = React.useRef(undefined);
  const resolveText = React.useCallback(() => {
    if (label != null) {
      return label;
    }
    // An item without children can carry its text in its `render` element instead.
    const fromChildren = childrenText(childrenRef.current ?? unwrapLazyRenderProp(renderRef.current));
    const previousChildrenText = childrenTextRef.current;
    childrenTextRef.current = fromChildren;
    if (ref.current !== null) {
      return ref.current.textContent ?? '';
    }
    // A filtered-out item has no DOM node left. Its children are only a stand-in for the text it
    // renders, which can differ (a translation component, for example), so the cached text wins
    // unless the children changed.
    if (registeredTextRef.current !== undefined && fromChildren === previousChildrenText) {
      return registeredTextRef.current;
    }
    return fromChildren;
  }, [label, childrenRef, renderRef]);
  const register = React.useCallback(resolvedText => {
    const text = resolvedText ?? resolveText();
    if (text) {
      registeredTextRef.current = text;
    }
    return registerItem(itemId, {
      getText() {
        // A mounted item reports what it renders now, even nothing, since a descendant can change
        // its text without the item re-rendering. A filtered-out item falls back to the cached
        // text.
        if (label == null && ref.current) {
          registeredTextRef.current = ref.current.textContent ?? '';
        }
        return registeredTextRef.current;
      }
    });
  }, [itemId, label, registerItem, resolveText]);
  useIsoLayoutEffect(() => {
    const unregister = register();
    setRegistered(true);
    return unregister;
  }, [register]);
  useIsoLayoutEffect(() => registerGroupItem?.(itemId, retainGroup), [registerGroupItem, itemId, retainGroup]);

  // Re-register when the item's text changes, so the active query runs again.
  useIsoLayoutEffect(() => {
    const text = resolveText();
    if (text !== registeredTextRef.current) {
      registeredTextRef.current = text;
      void register(text);
    }
  }, [register, resolveText, children, render, label]);
  return {
    visible: !registered || matched,
    ref
  };
}