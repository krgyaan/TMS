"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useMenuFilterPopup = useMenuFilterPopup;
var React = _interopRequireWildcard(require("react"));
var _dom = require("@floating-ui/utils/dom");
var _owner = require("@base-ui/utils/owner");
var _warn = require("@base-ui/utils/warn");
var _utils = require("../../floating-ui-react/utils");
var _FilterDropdownRootContext = require("../../filter-dropdown/root/FilterDropdownRootContext");
var _refocusOwner = require("../../filter-dropdown/utils/refocusOwner");
var _useListNavigation = require("../../floating-ui-react/hooks/useListNavigation");
var _DirectionContext = require("../../internals/direction-context/DirectionContext");
function useMenuFilterPopup(orientation) {
  const context = (0, _FilterDropdownRootContext.useFilterDropdownRootContext)();
  const direction = (0, _DirectionContext.useDirection)();
  const {
    focusOwnerRef
  } = context;

  // Focus that entered a nested popup by keyboard or click stays there while the
  // pointer crosses the parent popup. Returning to a submenu trigger restores focus to the
  // parent input. Focus that merely followed the pointer in follows it back out.
  const nestedFocusRef = React.useRef(null);
  // A tap fires compatibility mouse events, which must not focus the input and raise the
  // on-screen keyboard.
  const pointerTypeRef = React.useRef('mouse');
  function trackPointerType(event) {
    pointerTypeRef.current = event.pointerType || 'mouse';
  }

  /* istanbul ignore else -- `process.env.NODE_ENV` is a build-time constant under test */
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      if (context.open && focusOwnerRef.current === null) {
        (0, _warn.warn)('A filterable menu opened without a <Menu.Input>. Render the input inside ' + '<Menu.Popup>, or drop <Menu.FilterProvider> for a menu that does not filter.');
      }
    }, [context.open, focusOwnerRef]);
  }
  function restoreInputFocus(event, enteredTrigger) {
    const focusOwner = focusOwnerRef.current;
    if (!context.open || !focusOwner) {
      return;
    }
    const activeEl = (0, _utils.activeElement)((0, _owner.ownerDocument)(event.currentTarget));
    if (activeEl === focusOwner || (0, _utils.contains)(event.currentTarget, activeEl)) {
      return;
    }

    // Nested popups are portalled, so their events still bubble through this React tree.
    // The composed path only contains this popup when the pointer is really over it, and a
    // closing popup must not re-capture focus during its exit transition.
    let submenuTrigger = null;
    const nearestPopup = event.nativeEvent.composedPath().find(node => {
      if (!(0, _dom.isHTMLElement)(node)) {
        return false;
      }
      if (node.getAttribute('role') === 'dialog' || node.hasAttribute('data-rootownerid')) {
        return true;
      }
      if (node.hasAttribute('aria-haspopup')) {
        submenuTrigger = node;
      }
      return false;
    });
    if (nearestPopup !== event.currentTarget) {
      return;
    }

    // A nested popup that took focus keeps it while the pointer moves over the parent popup.
    // Entering a submenu trigger returns focus to the parent's input.
    if (nestedFocusRef.current && !(enteredTrigger && submenuTrigger)) {
      return;
    }
    if (enteredTrigger && submenuTrigger && (0, _dom.isElement)(event.relatedTarget) && (0, _utils.contains)(submenuTrigger, event.relatedTarget)) {
      return;
    }
    (0, _refocusOwner.refocusOwner)(focusOwner);
  }
  return {
    // The input owns virtual focus.
    'aria-activedescendant': undefined,
    // Not valid on a dialog; the list's implicit orientation is already vertical.
    'aria-orientation': undefined,
    onMouseDown(event) {
      if ((0, _utils.getTarget)(event.nativeEvent) === event.currentTarget) {
        // Keep focus on the virtual focus owner when the popup's own background is pressed.
        event.preventDefault();
      }
    },
    onPointerDown: trackPointerType,
    // `pointerover` precedes the compatibility `mouseover`, so a mouse entering right after a tap
    // is recognized before the handoff below.
    onPointerOver: trackPointerType,
    onPointerMove: trackPointerType,
    onMouseMove(event) {
      if (pointerTypeRef.current === 'mouse') {
        restoreInputFocus(event, false);
      }
    },
    onMouseOver(event) {
      if (pointerTypeRef.current === 'mouse' && nestedFocusRef.current) {
        restoreInputFocus(event, true);
      }
    },
    onFocus(event) {
      // `focusin` bubbles, so this also sees the owner itself being focused.
      const target = (0, _utils.getTarget)(event.nativeEvent);

      // Nested popups are portalled, so their focus events bubble through this React tree
      // while their elements sit outside this one in the DOM.
      if (target === focusOwnerRef.current) {
        nestedFocusRef.current = null;
      } else if ((0, _dom.isHTMLElement)(target) && !(0, _utils.contains)(event.currentTarget, target) && !(0, _refocusOwner.isRefocusingOwner)()) {
        nestedFocusRef.current = target;
      }

      // Focus that lands on the popup itself, the focus manager's fallback target, moves on to
      // the input, which owns focus while the menu filters.
      if (context.open && target === event.currentTarget) {
        focusOwnerRef.current?.focus({
          preventScroll: true
        });
      }
    },
    onKeyDown(event) {
      const target = (0, _utils.getTarget)(event.nativeEvent);
      if (target === focusOwnerRef.current || (0, _utils.isTypeableElement)(target)) {
        return;
      }
      if ((0, _useListNavigation.isCrossOrientationCloseKey)(event.key, orientation, direction === 'rtl', false)) {
        focusOwnerRef.current?.focus({
          preventScroll: true
        });
        // Nested popups bubble through this React tree, so keep the key from the parent.
        event.stopPropagation();
      }
    }
  };
}