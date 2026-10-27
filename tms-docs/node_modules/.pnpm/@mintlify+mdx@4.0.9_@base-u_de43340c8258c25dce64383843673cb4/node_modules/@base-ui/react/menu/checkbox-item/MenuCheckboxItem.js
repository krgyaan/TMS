"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuCheckboxItem = void 0;
var React = _interopRequireWildcard(require("react"));
var _useControlled = require("@base-ui/utils/useControlled");
var _empty = require("@base-ui/utils/empty");
var _MenuFilterContext = require("../filter-root/MenuFilterContext");
var _MenuCheckboxItemContext = require("./MenuCheckboxItemContext");
var _useMenuItem = require("../item/useMenuItem");
var _useCompositeListItem = require("../../internals/composite/list/useCompositeListItem");
var _MenuRootContext = require("../root/MenuRootContext");
var _useRenderElement = require("../../internals/useRenderElement");
var _useBaseUiId = require("../../internals/useBaseUiId");
var _stateAttributesMapping = require("../utils/stateAttributesMapping");
var _createBaseUIEventDetails = require("../../internals/createBaseUIEventDetails");
var _reasons = require("../../internals/reasons");
var _jsxRuntime = require("react/jsx-runtime");
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
  const state = React.useMemo(() => ({
    disabled,
    highlighted,
    checked
  }), [disabled, highlighted, checked]);
  function handleClick(event) {
    const details = (0, _createBaseUIEventDetails.createChangeEventDetails)(_reasons.REASONS.itemPress, event.nativeEvent, undefined, {
      preventUnmountOnClose: _empty.NOOP
    });
    onCheckedChange?.(!checked, details);
  }
  const element = (0, _useRenderElement.useRenderElement)('div', componentProps, {
    state,
    stateAttributesMapping: _stateAttributesMapping.itemMapping,
    props: [itemProps, {
      role: 'menuitemcheckbox',
      'aria-checked': checked,
      onClick: handleClick
    }, elementProps, getItemProps],
    ref: [itemRef, forwardedRef, listItem.ref]
  });
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuCheckboxItemContext.MenuCheckboxItemContext.Provider, {
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
const MenuCheckboxItem = exports.MenuCheckboxItem = /*#__PURE__*/React.forwardRef(function MenuCheckboxItem(props, forwardedRef) {
  const {
    checked: checkedProp,
    defaultChecked,
    onCheckedChange,
    ...plainProps
  } = props;

  // Owned above the element so an uncontrolled item keeps its state while a filter hides it.
  const [checked, setChecked] = (0, _useControlled.useControlled)({
    controlled: checkedProp,
    default: defaultChecked ?? false,
    name: 'MenuCheckboxItem',
    state: 'checked'
  });
  const filterItem = (0, _MenuFilterContext.useMenuFilterItem)(props, forwardedRef);
  function handleCheckedChange(nextChecked, eventDetails) {
    onCheckedChange?.(nextChecked, eventDetails);
    if (!eventDetails.isCanceled) {
      setChecked(nextChecked);
    }
  }
  if (!filterItem.visible) {
    return null;
  }
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(MenuCheckboxItemPlain, {
    ...plainProps,
    checked: checked,
    onCheckedChange: handleCheckedChange,
    ref: filterItem.ref
  });
});
if (process.env.NODE_ENV !== "production") MenuCheckboxItem.displayName = "MenuCheckboxItem";