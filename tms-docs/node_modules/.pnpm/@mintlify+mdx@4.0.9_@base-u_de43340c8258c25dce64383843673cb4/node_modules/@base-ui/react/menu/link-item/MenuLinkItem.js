"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuLinkItem = void 0;
var React = _interopRequireWildcard(require("react"));
var _MenuFilterContext = require("../filter-root/MenuFilterContext");
var _MenuRootContext = require("../root/MenuRootContext");
var _useRenderElement = require("../../internals/useRenderElement");
var _useBaseUiId = require("../../internals/useBaseUiId");
var _useCompositeListItem = require("../../internals/composite/list/useCompositeListItem");
var _useMenuItemCommonProps = require("../item/useMenuItemCommonProps");
var _useMenuItem = require("../item/useMenuItem");
var _useButton = require("../../internals/use-button");
var _mergeProps = require("../../merge-props");
var _jsxRuntime = require("react/jsx-runtime");
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
  } = (0, _MenuRootContext.useMenuRootContext)();
  const linkRef = React.useRef(null);
  const listItem = (0, _useCompositeListItem.useCompositeListItem)({
    guess: true,
    label
  });
  const id = (0, _useBaseUiId.useBaseUiId)(idProp);
  const highlighted = store.useState('isActive', listItem.index);
  const nodeId = store.useState('floatingNodeId');
  const itemProps = store.useState('itemProps');
  const typingRef = store.context.typingRef;
  const {
    getButtonProps,
    buttonRef
  } = (0, _useButton.useButton)({
    native: false,
    composite: true
  });
  const commonProps = (0, _useMenuItemCommonProps.useMenuItemCommonProps)({
    closeOnClick,
    highlighted,
    id,
    nodeId,
    store,
    typingRef,
    itemRef: linkRef,
    itemMetadata: _useMenuItem.REGULAR_ITEM
  });
  function getItemProps(externalProps) {
    return (0, _mergeProps.mergeProps)(commonProps, externalProps, getButtonProps);
  }
  const state = {
    highlighted
  };
  return (0, _useRenderElement.useRenderElement)('a', componentProps, {
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
const MenuLinkItem = exports.MenuLinkItem = /*#__PURE__*/React.forwardRef(function MenuLinkItem(props, forwardedRef) {
  // The public ref type stays `Element` as before; the rendered `<a>` is always an `HTMLElement`.
  const filterItem = (0, _MenuFilterContext.useMenuFilterItem)(props, forwardedRef);
  if (!filterItem.visible) {
    return null;
  }
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(MenuLinkItemPlain, {
    ...props,
    ref: filterItem.ref
  });
});
if (process.env.NODE_ENV !== "production") MenuLinkItem.displayName = "MenuLinkItem";