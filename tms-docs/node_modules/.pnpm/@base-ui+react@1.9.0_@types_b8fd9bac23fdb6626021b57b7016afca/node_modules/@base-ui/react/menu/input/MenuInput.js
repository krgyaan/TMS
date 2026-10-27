"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuInput = void 0;
var React = _interopRequireWildcard(require("react"));
var _owner = require("@base-ui/utils/owner");
var _useMergedRefs = require("@base-ui/utils/useMergedRefs");
var _FilterDropdownInput = require("../../filter-dropdown/input/FilterDropdownInput");
var _FilterDropdownRootContext = require("../../filter-dropdown/root/FilterDropdownRootContext");
var _mergeProps = require("../../merge-props");
var _utils = require("../../floating-ui-react/utils");
var _useMenuFilterKeyDown = require("../filter-root/useMenuFilterKeyDown");
var _MenuFilterContext = require("../filter-root/MenuFilterContext");
var _MenuRootContext = require("../root/MenuRootContext");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * A search field that filters the menu items.
 * Requires the menu to be wrapped in `Menu.FilterProvider`.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */const MenuInput = exports.MenuInput = /*#__PURE__*/React.forwardRef(function MenuInput(componentProps, forwardedRef) {
  (0, _MenuFilterContext.useMenuFilterPart)('Input');
  const {
    store
  } = (0, _MenuRootContext.useMenuRootContext)();
  const value = (0, _FilterDropdownRootContext.useFilterDropdownValueContext)();
  const {
    onKeyDown,
    ...navigationProps
  } = store.useState('inputProps');
  const activeItemId = store.useState('highlightedItemId');
  const handleKeyDown = (0, _useMenuFilterKeyDown.useMenuFilterKeyDown)(value !== '');
  const handleInputRef = React.useCallback(input => {
    // Ref changes cover input removal without blur and restore focus after Strict Mode replay.
    store.set('inputFocused', input !== null && (0, _utils.activeElement)((0, _owner.ownerDocument)(input)) === input);
  }, [store]);
  const mergedRefs = (0, _useMergedRefs.useMergedRefs)(forwardedRef, handleInputRef);
  const inputProps = (0, _mergeProps.mergeProps)({
    onKeyDown: handleKeyDown,
    onFocus() {
      store.set('inputFocused', true);
    },
    onBlur() {
      store.set('inputFocused', false);
    }
  }, componentProps);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownInput.FilterDropdownInput, {
    ...inputProps,
    activeItemId: activeItemId,
    navigationProps: navigationProps,
    ref: mergedRefs
  });
});
if (process.env.NODE_ENV !== "production") MenuInput.displayName = "MenuInput";