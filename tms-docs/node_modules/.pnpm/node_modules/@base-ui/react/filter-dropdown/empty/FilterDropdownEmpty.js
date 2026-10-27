"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilterDropdownEmpty = void 0;
var React = _interopRequireWildcard(require("react"));
var _store = require("@base-ui/utils/store");
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _useRenderElement = require("../../internals/useRenderElement");
var _FilterDropdownRootContext = require("../root/FilterDropdownRootContext");
var _store2 = require("../store");
var _useInitialLiveRegionTextMutation = require("../../internals/useInitialLiveRegionTextMutation");
/**
 * @internal
 */
const FilterDropdownEmpty = exports.FilterDropdownEmpty = /*#__PURE__*/React.forwardRef(function FilterDropdownEmpty(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    ...elementProps
  } = componentProps;
  const {
    store
  } = (0, _FilterDropdownRootContext.useFilterDropdownItemContext)();
  const isEmpty = (0, _store.useStore)(store, _store2.selectors.isEmpty);

  // Items mounting in the same commit register in layout effects, after this first render, and
  // don't register on the server at all. Deciding once they have keeps the children from
  // mounting for a frame on every open, and the message out of server markup.
  const [ready, setReady] = React.useState(false);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    setReady(true);
  }, []);
  const visible = ready && isEmpty;
  const emptyRef = (0, _useInitialLiveRegionTextMutation.useInitialLiveRegionTextMutation)(visible);
  return (0, _useRenderElement.useRenderElement)('div', componentProps, {
    enabled: visible,
    ref: [forwardedRef, emptyRef],
    props: [{
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': true
    }, elementProps]
  });
});
if (process.env.NODE_ENV !== "production") FilterDropdownEmpty.displayName = "FilterDropdownEmpty";