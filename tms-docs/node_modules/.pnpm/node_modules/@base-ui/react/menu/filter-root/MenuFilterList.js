"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuFilterList = void 0;
var React = _interopRequireWildcard(require("react"));
var _owner = require("@base-ui/utils/owner");
var _shadowDom = require("@base-ui/utils/shadowDom");
var _useStableCallback = require("@base-ui/utils/useStableCallback");
var _dom = require("@floating-ui/utils/dom");
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _utils = require("../../floating-ui-react/utils");
var _FilterDropdownList = require("../../filter-dropdown/list/FilterDropdownList");
var _mergeProps = require("../../merge-props");
var _useMenuFilterKeyDown = require("./useMenuFilterKeyDown");
var _useListNavigation = require("../../floating-ui-react/hooks/useListNavigation");
var _MenuRootContext = require("../root/MenuRootContext");
var _CompositeListContext = require("../../internals/composite/list/CompositeListContext");
var _FilterDropdownRootContext = require("../../filter-dropdown/root/FilterDropdownRootContext");
var _resolvePopupLabel = require("../../internals/resolvePopupLabel");
var _DirectionContext = require("../../internals/direction-context/DirectionContext");
var _moveHighlightFrom = require("./moveHighlightFrom");
var _refocusOwner = require("../../filter-dropdown/utils/refocusOwner");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * The list of a filterable menu: it takes the `menu` role while the popup is a dialog holding
 * the input, and it forwards keys that land on it to the input.
 */const MenuFilterList = exports.MenuFilterList = /*#__PURE__*/React.forwardRef(function MenuFilterList(componentProps, forwardedRef) {
  const {
    store,
    orientation,
    loopFocus,
    allowEscape
  } = (0, _MenuRootContext.useMenuRootContext)();
  const direction = (0, _DirectionContext.useDirection)();
  const {
    onItemsChange,
    focusOwnerRef,
    triggerId
  } = (0, _FilterDropdownRootContext.useFilterDropdownRootContext)();
  const {
    listRef
  } = (0, _FilterDropdownRootContext.useFilterDropdownItemContext)();
  const {
    subscribeMapChange
  } = (0, _CompositeListContext.useCompositeListContext)();
  const value = (0, _FilterDropdownRootContext.useFilterDropdownValueContext)();
  const handleInputKeyDown = (0, _useMenuFilterKeyDown.useMenuFilterKeyDown)(value !== '');
  const handleKeyDown = (0, _useStableCallback.useStableCallback)(event => {
    const owner = focusOwnerRef.current;
    const target = (0, _utils.getTarget)(event.nativeEvent);
    const ownerFocused = owner != null && (0, _utils.activeElement)((0, _owner.ownerDocument)(owner)) === owner;
    const fromNestedPopup = !(0, _shadowDom.contains)(event.currentTarget, target);
    // Keys the input forwards to its highlighted item arrive here while the input still holds
    // focus, and a nested popup's keys bubble through this React tree from outside the list.
    if (owner == null || ownerFocused || fromNestedPopup) {
      if (event.which !== 229 && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && (0, _useListNavigation.isMainOrientationKey)(event.key, orientation)) {
        // Keep main-axis keys from reaching this popup's own list navigation, which lost its
        // place while the nested popup held focus. A plain submenu that closes on the key hands
        // focus back and lets it through, so move on from its trigger as a plain parent would.
        event.stopPropagation();
        const trigger = fromNestedPopup && ownerFocused ? getNestedPopupTrigger(target) : undefined;
        if (trigger) {
          (0, _moveHighlightFrom.moveHighlightFrom)(store, trigger, event, {
            orientation,
            rtl: direction === 'rtl',
            loopFocus,
            allowEscape
          });
        }
      }
      return;
    }

    // An item that already acted on the key (Enter and Space activate it) keeps it.
    if (event.defaultPrevented) {
      return;
    }

    // Real focus can land inside the list while the input still owns the keyboard: a scrollbar
    // press focuses the list itself, and a screen reader following `aria-activedescendant`
    // focuses the highlighted item. Hand focus back and route the key as the input would; a
    // typing key's default action follows the moved focus into the input.
    (0, _refocusOwner.refocusOwner)(owner);
    handleInputKeyDown(event);
  });

  // The item whose `aria-controls` popup holds `target`. The popup shares the target's root,
  // which is a shadow root when it's portaled into one.
  function getNestedPopupTrigger(target) {
    const root = target.getRootNode();
    return listRef.current.find(item => {
      const popupId = item?.getAttribute('aria-controls');
      return popupId != null && (0, _dom.isHTMLElement)(item) && (0, _shadowDom.contains)(root.getElementById(popupId), target);
    });
  }

  // `null` distinguishes the initial registration from a list emptied by filtering.
  const previousItemsRef = React.useRef(null);

  // CompositeList notifies subscribers before its `onMapChange`, so the positioner reports the
  // highlight against the settled registry only after the items change has been resolved here.
  const handleItemMapChange = (0, _useStableCallback.useStableCallback)(() => {
    const items = [...listRef.current];
    const previousItems = previousItemsRef.current;
    const changed = previousItems === null || previousItems.length !== items.length || items.some((item, index) => item !== previousItems[index]);
    if (changed && previousItems !== null) {
      onItemsChange(previousItems);
    }
    previousItemsRef.current = items;
  });
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    return subscribeMapChange(handleItemMapChange);
  }, [subscribeMapChange, handleItemMapChange]);
  const ariaLabelledBy = (0, _resolvePopupLabel.resolvePopupLabel)(componentProps, null, triggerId ?? null);
  const listProps = (0, _mergeProps.mergeProps)({
    role: 'menu',
    'aria-labelledby': ariaLabelledBy,
    'aria-orientation': orientation === 'horizontal' ? 'horizontal' : undefined,
    onKeyDown: handleKeyDown
  }, componentProps);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownList.FilterDropdownList, {
    ...listProps,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuFilterList.displayName = "MenuFilterList";