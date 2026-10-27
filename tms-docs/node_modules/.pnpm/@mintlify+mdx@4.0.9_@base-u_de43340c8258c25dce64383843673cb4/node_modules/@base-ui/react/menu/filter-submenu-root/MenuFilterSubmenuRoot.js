"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuFilterSubmenuRoot = MenuFilterSubmenuRoot;
var React = _interopRequireWildcard(require("react"));
var _owner = require("@base-ui/utils/owner");
var _useStableCallback = require("@base-ui/utils/useStableCallback");
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _dom = require("@floating-ui/utils/dom");
var _MenuRoot = require("../root/MenuRoot");
var _MenuRootContext = require("../root/MenuRootContext");
var _MenuFilterDropdown = require("../filter-root/MenuFilterDropdown");
var _isKeyboardOpen = require("../utils/isKeyboardOpen");
var _useMenuFilterRoot = require("../filter-root/useMenuFilterRoot");
var _DirectionContext = require("../../internals/direction-context/DirectionContext");
var _useListNavigation = require("../../floating-ui-react/hooks/useListNavigation");
var _utils = require("../../floating-ui-react/utils");
var _createBaseUIEventDetails = require("../../internals/createBaseUIEventDetails");
var _reasons = require("../../internals/reasons");
var _moveHighlightFrom = require("../filter-root/moveHighlightFrom");
var _MenuSubmenuRootContext = require("../submenu-root/MenuSubmenuRootContext");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * The filterable implementation of `Menu.SubmenuRoot`, rendered in its place when the submenu
 * root sits inside `Menu.FilterProvider`.
 *
 * @internal
 */
function MenuFilterSubmenuRoot(props) {
  const parent = (0, _MenuRootContext.useMenuRootContext)();
  const parentStore = parent.store;
  const parentDisabled = parentStore.useState('disabled');
  const {
    rootProps,
    dropdownProps
  } = (0, _useMenuFilterRoot.useMenuFilterRoot)(props);
  const parentReferenceRef = React.useRef(null);
  function handleSubmenuEnter(trigger, event) {
    const focusedElement = parent.virtualFocus ? parentStore.context.virtualFocusRef?.current : (0, _utils.activeElement)((0, _owner.ownerDocument)(trigger));
    if ((0, _dom.isHTMLElement)(focusedElement)) {
      parentReferenceRef.current = {
        reference: focusedElement,
        trigger
      };
      parentStore.setActiveIndex(null, event ? _reasons.REASONS.keyboard : _reasons.REASONS.none, event);
    }
  }
  function highlightTrigger(trigger, event) {
    parentStore.highlightItem(trigger, _reasons.REASONS.keyboard, event);
  }
  function handleSubmenuExit(event) {
    const parentReference = parentReferenceRef.current;
    if (!parentReference) {
      return;
    }
    parentReference.reference.focus({
      preventScroll: true
    });
    highlightTrigger(parentReference.trigger, event);
  }
  function handleOpenChange(nextOpen, details) {
    rootProps.onOpenChange?.(nextOpen, details);
    if (details.isCanceled) {
      return;
    }
    if (!nextOpen) {
      if (details.reason === _reasons.REASONS.escapeKey && (0, _dom.isHTMLElement)(details.trigger)) {
        highlightTrigger(details.trigger, details.event);
        // `MenuPopup` returns focus through `getReturnElement`, so point it at the element that
        // can hold real focus: the parent's input, not its untabbable trigger.
        parentReferenceRef.current = {
          reference: parent.virtualFocus ? parentStore.context.virtualFocusRef?.current ?? details.trigger : details.trigger,
          trigger: details.trigger
        };
      }
      return;
    }
    parentReferenceRef.current = null;
    if ((0, _dom.isHTMLElement)(details.trigger) && (0, _isKeyboardOpen.isKeyboardOpen)(details.reason, details.event)) {
      // A keyboard click reports its click, which isn't the key that opened the submenu.
      handleSubmenuEnter(details.trigger, details.reason === _reasons.REASONS.listNavigation ? details.event : undefined);
    }
  }
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuRoot.MenuRootInternal, {
    ...rootProps,
    isSubmenu: true,
    disabled: parentDisabled || props.disabled,
    onOpenChange: handleOpenChange,
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(MenuFilterSubmenuNavigation, {
      parentStore: parentStore,
      parentVirtualFocus: parent.virtualFocus,
      parentAllowEscape: parent.virtualFocus && parent.allowEscape,
      parentOrientation: parent.orientation,
      parentLoopFocus: parent.loopFocus,
      getReturnElement: () => parentReferenceRef.current?.reference ?? (parent.virtualFocus ? parentStore.context.virtualFocusRef?.current : null) ?? null,
      onSubmenuEnter: handleSubmenuEnter,
      onSubmenuExit: handleSubmenuExit,
      children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuFilterDropdown.MenuFilterDropdown, {
        ...dropdownProps,
        children: props.children
      })
    })
  });
}
function MenuFilterSubmenuNavigation(props) {
  const {
    children,
    parentStore,
    parentVirtualFocus,
    parentAllowEscape,
    parentOrientation,
    parentLoopFocus,
    onSubmenuEnter,
    onSubmenuExit,
    getReturnElement
  } = props;
  const {
    store,
    orientation
  } = (0, _MenuRootContext.useMenuRootContext)();
  const direction = (0, _DirectionContext.useDirection)();
  const mounted = store.useState('mounted');
  const wasMountedRef = React.useRef(false);
  const handleReturnFocus = (0, _useStableCallback.useStableCallback)(() => {
    // A plain parent has no input to return to. Focus the trigger this submenu opened from, as a
    // plain submenu does, so a hover close doesn't strand focus on the body.
    const [ownTrigger] = store.context.triggerElements.elements();
    return getReturnElement() ?? ((0, _dom.isHTMLElement)(ownTrigger) ? ownTrigger : null);
  });

  // A hover close makes the focus manager skip its return focus, which would strand the
  // submenu input's focus on the body once the popup unmounts. This runs in the effect body
  // rather than a cleanup: React drops the focus event when it fires during the mutation phase,
  // so the input would never learn it holds focus.
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    const wasMounted = wasMountedRef.current;
    wasMountedRef.current = mounted;
    if (mounted || !wasMounted) {
      return;
    }
    const returnElement = handleReturnFocus();
    if (!returnElement || !parentStore.select('open')) {
      return;
    }
    const doc = (0, _owner.ownerDocument)(returnElement);
    const activeEl = (0, _utils.activeElement)(doc);
    if (activeEl === doc.body || (0, _utils.contains)(store.select('popupElement'), activeEl)) {
      returnElement.focus({
        preventScroll: true
      });
    }
  }, [mounted, store, parentStore, handleReturnFocus]);
  function moveInParent(from, event) {
    const item = (0, _moveHighlightFrom.moveHighlightFrom)(parentStore, from, event, {
      orientation: parentOrientation,
      rtl: direction === 'rtl',
      loopFocus: parentLoopFocus,
      allowEscape: parentAllowEscape
    });
    if (!parentVirtualFocus) {
      item?.focus({
        preventScroll: true
      });
    }
  }
  function close(event) {
    if (!store.select('open')) {
      return;
    }

    // The key can reach this popup re-dispatched on its highlighted item, so it can't be left to
    // bubble to the parent. A close key that also navigates the parent moves it from here.
    (0, _utils.stopEvent)(event);
    const trigger = store.select('activeTriggerElement');
    const eventDetails = (0, _createBaseUIEventDetails.createChangeEventDetails)(_reasons.REASONS.listNavigation, event.nativeEvent);
    store.setOpen(false, eventDetails);
    if (!eventDetails.isCanceled) {
      onSubmenuExit(event.nativeEvent);
    }

    // `onSubmenuExit` bails when the submenu was opened by pointer, so return focus here.
    const returnElement = getReturnElement() ?? store.select('activeTriggerElement');
    if (!store.select('open') && (0, _dom.isHTMLElement)(returnElement) && (0, _utils.activeElement)((0, _owner.ownerDocument)(returnElement)) !== returnElement) {
      returnElement.focus();
    }
    if (!store.select('open') && (0, _dom.isHTMLElement)(trigger) && (0, _useListNavigation.isMainOrientationKey)(event.key, parentOrientation)) {
      moveInParent(trigger, event);
    }
  }
  const handleTriggerKeyDown = (0, _useStableCallback.useStableCallback)(event => {
    if ((0, _useListNavigation.isMainOrientationKey)(event.key, parentOrientation)) {
      moveInParent(event.currentTarget, event);
      event.preventBaseUIHandler();
      (0, _utils.stopEvent)(event);
      return;
    }
    const open = store.select('open');
    const isRtl = direction === 'rtl';
    const isCloseKey = (0, _useListNavigation.isCrossOrientationCloseKey)(event.key, orientation, isRtl, false);
    if (open && isCloseKey) {
      close(event);
      return;
    }
    const isOpenKey = (0, _useListNavigation.isCrossOrientationOpenKey)(event.key, parentOrientation, isRtl);
    if (!isOpenKey) {
      return;
    }
    (0, _utils.stopEvent)(event);
    if (open) {
      // Re-entering an already-open submenu hands the cursor to its own focus owner. The submenu
      // is always virtually focused, so there is no roving-focus branch here. The highlight is
      // kept, so an automatic highlight or an earlier keyboard position survives re-entry.
      onSubmenuEnter(event.currentTarget, event.nativeEvent);
      store.context.virtualFocusRef?.current?.focus({
        preventScroll: true
      });
      return;
    }
    store.setOpen(true, (0, _createBaseUIEventDetails.createChangeEventDetails)(_reasons.REASONS.listNavigation, event.nativeEvent, event.currentTarget));
  });
  const handlePopupKeyDown = (0, _useStableCallback.useStableCallback)(event => {
    // A key that composes text in the input must not close the submenu.
    if (event.which === 229) {
      return;
    }
    const isCloseKey = (0, _useListNavigation.isCrossOrientationCloseKey)(event.key, orientation, direction === 'rtl', false);
    if (isCloseKey) {
      close(event);
    }
  });
  const contextValue = React.useMemo(() => ({
    getReturnElement: handleReturnFocus,
    onTriggerKeyDown: handleTriggerKeyDown,
    onPopupKeyDown: handlePopupKeyDown
  }), [handleReturnFocus, handleTriggerKeyDown, handlePopupKeyDown]);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuSubmenuRootContext.MenuSubmenuRootContext.Provider, {
    value: contextValue,
    children: children
  });
}