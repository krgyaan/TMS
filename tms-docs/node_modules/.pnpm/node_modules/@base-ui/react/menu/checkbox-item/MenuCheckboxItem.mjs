'use client';

import * as React from 'react';
import { useControlled } from '@base-ui/utils/useControlled';
import { NOOP } from '@base-ui/utils/empty';
import { useMenuFilterItem } from "../filter-root/MenuFilterContext.mjs";
import { MenuCheckboxItemContext } from "./MenuCheckboxItemContext.mjs";
import { REGULAR_ITEM, useMenuItem } from "../item/useMenuItem.mjs";
import { useCompositeListItem } from "../../internals/composite/list/useCompositeListItem.mjs";
import { useMenuRootContext } from "../root/MenuRootContext.mjs";
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { useBaseUiId } from "../../internals/useBaseUiId.mjs";
import { itemMapping } from "../utils/stateAttributesMapping.mjs";
import { createChangeEventDetails } from "../../internals/createBaseUIEventDetails.mjs";
import { REASONS } from "../../internals/reasons.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
const MenuCheckboxItemPlain = /*#__PURE__*/React.forwardRef(function MenuCheckboxItemPlain(componentProps, forwardedRef) {
  const {
    render,
    className,
    id: idProp,
    label,
    nativeButton = false,
    disabled: disabledProp = false,
    closeOnClick = false,
    checked = false,
    onCheckedChange,
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
  const state = React.useMemo(() => ({
    disabled,
    highlighted,
    checked
  }), [disabled, highlighted, checked]);
  function handleClick(event) {
    const details = createChangeEventDetails(REASONS.itemPress, event.nativeEvent, undefined, {
      preventUnmountOnClose: NOOP
    });
    onCheckedChange?.(!checked, details);
  }
  const element = useRenderElement('div', componentProps, {
    state,
    stateAttributesMapping: itemMapping,
    props: [itemProps, {
      role: 'menuitemcheckbox',
      'aria-checked': checked,
      onClick: handleClick
    }, elementProps, getItemProps],
    ref: [itemRef, forwardedRef, listItem.ref]
  });
  return /*#__PURE__*/_jsx(MenuCheckboxItemContext.Provider, {
    value: state,
    children: element
  });
});

/**
 * A menu item that toggles a setting on or off.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
if (process.env.NODE_ENV !== "production") MenuCheckboxItemPlain.displayName = "MenuCheckboxItemPlain";
export const MenuCheckboxItem = /*#__PURE__*/React.forwardRef(function MenuCheckboxItem(props, forwardedRef) {
  const {
    checked: checkedProp,
    defaultChecked,
    onCheckedChange,
    ...plainProps
  } = props;

  // Owned above the element so an uncontrolled item keeps its state while a filter hides it.
  const [checked, setChecked] = useControlled({
    controlled: checkedProp,
    default: defaultChecked ?? false,
    name: 'MenuCheckboxItem',
    state: 'checked'
  });
  const filterItem = useMenuFilterItem(props, forwardedRef);
  function handleCheckedChange(nextChecked, eventDetails) {
    onCheckedChange?.(nextChecked, eventDetails);
    if (!eventDetails.isCanceled) {
      setChecked(nextChecked);
    }
  }
  if (!filterItem.visible) {
    return null;
  }
  return /*#__PURE__*/_jsx(MenuCheckboxItemPlain, {
    ...plainProps,
    checked: checked,
    onCheckedChange: handleCheckedChange,
    ref: filterItem.ref
  });
});
if (process.env.NODE_ENV !== "production") MenuCheckboxItem.displayName = "MenuCheckboxItem";