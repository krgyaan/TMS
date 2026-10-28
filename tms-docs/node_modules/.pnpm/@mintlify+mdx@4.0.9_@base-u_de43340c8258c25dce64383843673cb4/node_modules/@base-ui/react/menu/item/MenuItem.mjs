'use client';

import * as React from 'react';
import { useMenuFilterItem } from "../filter-root/MenuFilterContext.mjs";
import { REGULAR_ITEM, useMenuItem } from "./useMenuItem.mjs";
import { useMenuRootContext } from "../root/MenuRootContext.mjs";
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { useBaseUiId } from "../../internals/useBaseUiId.mjs";
import { useCompositeListItem } from "../../internals/composite/list/useCompositeListItem.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
const MenuItemPlain = /*#__PURE__*/React.forwardRef(function MenuItemPlain(componentProps, forwardedRef) {
  const {
    render,
    className,
    id: idProp,
    label,
    nativeButton = false,
    disabled: disabledProp = false,
    closeOnClick = true,
    style,
    ...elementProps
  } = componentProps;
  const {
    store
  } = useMenuRootContext();
  const listItem = useCompositeListItem({
    guess: true,
    label
  });
  const id = useBaseUiId(idProp);
  const rootDisabled = store.useState('disabled');
  const highlighted = store.useState('isActive', listItem.index);
  const nodeId = store.useState('floatingNodeId');
  const itemProps = store.useState('itemProps');
  const disabled = disabledProp || rootDisabled;
  const {
    getItemProps,
    itemRef
  } = useMenuItem({
    closeOnClick,
    disabled,
    highlighted,
    id,
    store,
    nativeButton,
    nodeId,
    itemMetadata: REGULAR_ITEM
  });
  const state = {
    disabled,
    highlighted
  };
  return useRenderElement('div', componentProps, {
    state,
    props: [itemProps, elementProps, getItemProps],
    ref: [itemRef, forwardedRef, listItem.ref]
  });
});

/**
 * An individual interactive item in the menu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
if (process.env.NODE_ENV !== "production") MenuItemPlain.displayName = "MenuItemPlain";
export const MenuItem = /*#__PURE__*/React.forwardRef(function MenuItem(props, forwardedRef) {
  const filterItem = useMenuFilterItem(props, forwardedRef);
  if (!filterItem.visible) {
    return null;
  }
  return /*#__PURE__*/_jsx(MenuItemPlain, {
    ...props,
    ref: filterItem.ref
  });
});
if (process.env.NODE_ENV !== "production") MenuItem.displayName = "MenuItem";