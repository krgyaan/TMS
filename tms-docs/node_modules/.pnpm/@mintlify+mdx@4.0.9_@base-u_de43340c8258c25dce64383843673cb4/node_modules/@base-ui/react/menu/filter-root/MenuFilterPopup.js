"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuFilterPopup = void 0;
var React = _interopRequireWildcard(require("react"));
var _useMenuFilterPopup = require("./useMenuFilterPopup");
var _MenuPopup = require("../popup/MenuPopup");
var _MenuRootContext = require("../root/MenuRootContext");
var _mergeProps = require("../../merge-props");
var _reasons = require("../../internals/reasons");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * A container for the filter input and item list.
 * Renders a `<div>` element with a `dialog` role.
 */const MenuFilterPopup = exports.MenuFilterPopup = /*#__PURE__*/React.forwardRef(function MenuFilterPopup(props, forwardedRef) {
  const {
    store,
    orientation
  } = (0, _MenuRootContext.useMenuRootContext)();
  const open = store.useState('open');
  const parent = store.useState('parent');
  const openMethod = store.useState('openMethod');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const interactionProps = (0, _useMenuFilterPopup.useMenuFilterPopup)(orientation);
  const openedByHover = open && lastOpenChangeReason === _reasons.REASONS.triggerHover;
  const mayFocusInput = parent.type !== 'menu' || open && (openMethod === 'keyboard' || lastOpenChangeReason === _reasons.REASONS.listNavigation || lastOpenChangeReason === _reasons.REASONS.triggerHover || lastOpenChangeReason === _reasons.REASONS.triggerPress);

  // The input holds real focus; the popup is never the focus target.
  let initialFocus = false;
  if (mayFocusInput) {
    initialFocus = () => {
      // A tap would raise the on-screen keyboard, but a screen reader press (such as an iOS
      // VoiceOver double-tap) still reports a touch and needs the input focused.
      const touchOpen = (openMethod === 'touch' || openMethod === 'pen') && !store.context.virtualPress;
      if (openedByHover || touchOpen) {
        return false;
      }
      return store.context.virtualFocusRef?.current ?? false;
    };
  }
  const popupProps = (0, _mergeProps.mergeProps)(interactionProps, props);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuPopup.MenuPopupPlain, {
    ...popupProps,
    role: "dialog",
    initialFocus: initialFocus,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuFilterPopup.displayName = "MenuFilterPopup";