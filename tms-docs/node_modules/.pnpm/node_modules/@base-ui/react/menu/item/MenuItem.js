"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuItem = void 0;
var React = _interopRequireWildcard(require("react"));
var _MenuFilterContext = require("../filter-root/MenuFilterContext");
var _useMenuItem = require("./useMenuItem");
var _MenuRootContext = require("../root/MenuRootContext");
var _useRenderElement = require("../../internals/useRenderElement");
var _useBaseUiId = require("../../internals/useBaseUiId");
var _useCompositeListItem = require("../../internals/composite/list/useCompositeListItem");
var _jsxRuntime = require("react/jsx-runtime");
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
  } = (0, _MenuRootContext.useMenuRootContext)();
  const listItem = (0, _useCompositeListItem.useCompositeListItem)({
    guess: true,
    label
  });
  const id = (0, _useBaseUiId.useBaseUiId)(idProp);
  const rootDisabled = store.useState('disabled');
  const highlighted = store.useState('isActive', listItem.index);
  const nodeId = store.useState('floatingNodeId');
  const itemProps = store.useState('itemProps');
  const disabled = disabledProp || rootDisabled;
  const {
    getItemProps,
    itemRef
  } = (0, _useMenuItem.useMenuItem)({
    closeOnClick,
    disabled,
    highlighted,
    id,
    store,
    nativeButton,
    nodeId,
    itemMetadata: _useMenuItem.REGULAR_ITEM
  });
  const state = {
    disabled,
    highlighted
  };
  return (0, _useRenderElement.useRenderElement)('div', componentProps, {
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
const MenuItem = exports.MenuItem = /*#__PURE__*/React.forwardRef(function MenuItem(props, forwardedRef) {
  const filterItem = (0, _MenuFilterContext.useMenuFilterItem)(props, forwardedRef);
  if (!filterItem.visible) {
    return null;
  }
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(MenuItemPlain, {
    ...props,
    ref: filterItem.ref
  });
});
if (process.env.NODE_ENV !== "production") MenuItem.displayName = "MenuItem";