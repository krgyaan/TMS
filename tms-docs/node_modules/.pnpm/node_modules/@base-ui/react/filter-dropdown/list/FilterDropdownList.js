"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilterDropdownList = void 0;
var React = _interopRequireWildcard(require("react"));
var _useRenderElement = require("../../internals/useRenderElement");
var _FilterDropdownRootContext = require("../root/FilterDropdownRootContext");
var _FilterDropdownGroupContext = require("../group/FilterDropdownGroupContext");
var _resolveRenderedId = require("../../internals/resolveRenderedId");
var _utils = require("../../floating-ui-react/utils");
var _refocusOwner = require("../utils/refocusOwner");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * @internal
 */const FilterDropdownList = exports.FilterDropdownList = /*#__PURE__*/React.forwardRef(function FilterDropdownList(componentProps, forwardedRef) {
  // `id` is resolved by `useRenderedId`, which also honors an id on the `render` element.
  const {
    render,
    className,
    style,
    id: idProp,
    ...elementProps
  } = componentProps;
  const context = (0, _FilterDropdownRootContext.useFilterDropdownRootContext)();
  const [id, registerIdRef] = (0, _resolveRenderedId.useRenderedId)(componentProps, context.defaultListId, context.setRenderedListId);
  const defaultProps = {
    // Chromium includes scrollable elements in sequential focus navigation by default.
    tabIndex: -1,
    id,
    onFocus(event) {
      // A press on the list's own content, such as its background, a group, or a group label,
      // focuses the list.
      const owner = context.focusOwnerRef.current;
      if (owner && event.relatedTarget === owner && (0, _utils.getTarget)(event.nativeEvent) === event.currentTarget) {
        (0, _refocusOwner.refocusOwner)(owner);
      }
    },
    onPointerMove() {
      context.setKeyboardModality(false);
    },
    onPointerDown() {
      context.setKeyboardModality(false);
    }
  };
  return (0, _useRenderElement.useRenderElement)('div', componentProps, {
    ref: [forwardedRef, registerIdRef],
    props: [defaultProps, elementProps, {
      // The list's groups and items belong to this root's query. A nested root's list renders
      // inside an enclosing group, which must not count them as its own members.
      children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownGroupContext.FilterDropdownGroupContext.Provider, {
        value: null,
        children: elementProps.children
      })
    }]
  });
});
if (process.env.NODE_ENV !== "production") FilterDropdownList.displayName = "FilterDropdownList";