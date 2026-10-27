"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ItemIndicator = void 0;
var React = _interopRequireWildcard(require("react"));
var _useTransitionStatus = require("../internals/useTransitionStatus");
var _useOpenChangeComplete = require("../internals/useOpenChangeComplete");
var _useRenderElement = require("../internals/useRenderElement");
var _stateAttributesMapping = require("../internals/stateAttributesMapping");
// The public wrappers mount this component only when selected or kept mounted, avoiding the
// hook costs for unselected items. Pass selection as a prop so memoization observes changes.
const ItemIndicator = exports.ItemIndicator = /*#__PURE__*/React.memo(/*#__PURE__*/React.forwardRef(function ItemIndicator(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    keepMounted,
    selected,
    ...elementProps
  } = componentProps;
  const indicatorRef = React.useRef(null);
  const {
    transitionStatus,
    setMounted
  } = (0, _useTransitionStatus.useTransitionStatus)(selected);
  const state = {
    selected,
    transitionStatus
  };
  const element = (0, _useRenderElement.useRenderElement)('span', componentProps, {
    ref: [forwardedRef, indicatorRef],
    state,
    props: [{
      'aria-hidden': true,
      children: '✔️'
    }, elementProps],
    stateAttributesMapping: _stateAttributesMapping.transitionStatusMapping
  });
  (0, _useOpenChangeComplete.useOpenChangeComplete)({
    batch: true,
    enabled: !selected,
    open: selected,
    ref: indicatorRef,
    onComplete() {
      if (!selected) {
        setMounted(false);
      }
    }
  });
  return element;
}));
if (process.env.NODE_ENV !== "production") ItemIndicator.displayName = "ItemIndicator";