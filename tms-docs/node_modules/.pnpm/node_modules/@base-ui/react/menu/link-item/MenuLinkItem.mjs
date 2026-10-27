'use client';

import * as React from 'react';
import { useMenuFilterItem } from "../filter-root/MenuFilterContext.mjs";
import { useMenuRootContext } from "../root/MenuRootContext.mjs";
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { useBaseUiId } from "../../internals/useBaseUiId.mjs";
import { useCompositeListItem } from "../../internals/composite/list/useCompositeListItem.mjs";
import { useMenuItemCommonProps } from "../item/useMenuItemCommonProps.mjs";
import { REGULAR_ITEM } from "../item/useMenuItem.mjs";
import { useButton } from "../../internals/use-button/index.mjs";
import { mergeProps } from "../../merge-props/index.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
const MenuLinkItemPlain = /*#__PURE__*/React.forwardRef(function MenuLinkItemPlain(componentProps, forwardedRef) {
  const {
    render,
    className,
    id: idProp,
    label,
    closeOnClick = false,
    style,
    ...elementProps
  } = componentProps;
  const {
    store
  } = useMenuRootContext();
  const linkRef = React.useRef(null);
  const listItem = useCompositeListItem({
    guess: true,
    label
  });
  const id = useBaseUiId(idProp);
  const highlighted = store.useState('isActive', listItem.index);
  const nodeId = store.useState('floatingNodeId');
  const itemProps = store.useState('itemProps');
  const typingRef = store.context.typingRef;
  const {
    getButtonProps,
    buttonRef
  } = useButton({
    native: false,
    composite: true
  });
  const commonProps = useMenuItemCommonProps({
    closeOnClick,
    highlighted,
    id,
    nodeId,
    store,
    typingRef,
    itemRef: linkRef,
    itemMetadata: REGULAR_ITEM
  });
  function getItemProps(externalProps) {
    return mergeProps(commonProps, externalProps, getButtonProps);
  }
  const state = {
    highlighted
  };
  return useRenderElement('a', componentProps, {
    state,
    props: [itemProps, elementProps, getItemProps],
    ref: [linkRef, buttonRef, forwardedRef, listItem.ref]
  });
});

/**
 * A link in the menu that can be used to navigate to a different page or section.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
if (process.env.NODE_ENV !== "production") MenuLinkItemPlain.displayName = "MenuLinkItemPlain";
export const MenuLinkItem = /*#__PURE__*/React.forwardRef(function MenuLinkItem(props, forwardedRef) {
  // The public ref type stays `Element` as before; the rendered `<a>` is always an `HTMLElement`.
  const filterItem = useMenuFilterItem(props, forwardedRef);
  if (!filterItem.visible) {
    return null;
  }
  return /*#__PURE__*/_jsx(MenuLinkItemPlain, {
    ...props,
    ref: filterItem.ref
  });
});
if (process.env.NODE_ENV !== "production") MenuLinkItem.displayName = "MenuLinkItem";