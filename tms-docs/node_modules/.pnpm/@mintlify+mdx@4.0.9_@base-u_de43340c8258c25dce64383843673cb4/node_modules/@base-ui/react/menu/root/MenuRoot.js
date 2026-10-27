"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuRoot = MenuRoot;
exports.MenuRootInternal = void 0;
var React = _interopRequireWildcard(require("react"));
var _useTimeout = require("@base-ui/utils/useTimeout");
var _useStableCallback = require("@base-ui/utils/useStableCallback");
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _useRefWithInit = require("@base-ui/utils/useRefWithInit");
var _empty = require("@base-ui/utils/empty");
var _fastHooks = require("@base-ui/utils/fastHooks");
var _floatingUiReact = require("../../floating-ui-react");
var _MenuRootContext = require("./MenuRootContext");
var _MenubarContext = require("../../menubar/MenubarContext");
var _constants = require("../../internals/constants");
var _DirectionContext = require("../../internals/direction-context/DirectionContext");
var _useOpenInteractionType = require("../../utils/useOpenInteractionType");
var _createBaseUIEventDetails = require("../../internals/createBaseUIEventDetails");
var _reasons = require("../../internals/reasons");
var _getHighlightReason = require("../../utils/getHighlightReason");
var _ContextMenuRootContext = require("../../context-menu/root/ContextMenuRootContext");
var _mergeProps = require("../../merge-props");
var _useAnimationsFinished = require("../../internals/useAnimationsFinished");
var _MenuStore = require("../store/MenuStore");
var _popups = require("../../utils/popups");
var _useBaseUiId = require("../../internals/useBaseUiId");
var _MenuFilterProviderContext = require("../filter-provider/MenuFilterProviderContext");
var _isKeyboardOpen = require("../utils/isKeyboardOpen");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * @internal
 */const MenuRootInternal = exports.MenuRootInternal = (0, _fastHooks.fastComponent)(function MenuRootInternal(props) {
  const {
    children,
    open: openProp,
    onOpenChange,
    onOpenChangeComplete,
    onItemHighlighted: onItemHighlightedProp,
    defaultOpen = false,
    disabled: disabledProp = false,
    modal: modalProp,
    loopFocus = true,
    orientation = 'vertical',
    actionsRef,
    closeParentOnEsc = false,
    handle,
    triggerId: triggerIdProp,
    defaultTriggerId: defaultTriggerIdProp = null,
    highlightItemOnHover = true,
    isSubmenu = false,
    virtualFocus = false,
    virtualFocusRef,
    allowEscape = true,
    resetOnPointerLeave = true
  } = props;
  const contextMenuContext = (0, _ContextMenuRootContext.useContextMenuRootContext)(true);
  const parentMenuRootContext = (0, _MenuRootContext.useMenuRootContext)(true);
  const menubarContext = (0, _MenubarContext.useMenubarContext)(true);

  // Depend on the stable pieces rather than the parent context object, so a parent context
  // invalidation doesn't cascade into every descendant root's context.
  const enclosingMenuStore = parentMenuRootContext?.store;
  const parentVirtualFocus = parentMenuRootContext?.virtualFocus ?? false;
  const parentFromContext = React.useMemo(() => {
    if (isSubmenu && enclosingMenuStore) {
      return {
        type: 'menu',
        store: enclosingMenuStore
      };
    }
    if (menubarContext) {
      return {
        type: 'menubar',
        context: menubarContext
      };
    }

    // Ensure this is not a Menu nested inside ContextMenu.Trigger.
    // ContextMenu parentContext is always undefined as ContextMenu.Root is instantiated with
    // <MenuRootContext.Provider value={undefined}>
    if (contextMenuContext && !enclosingMenuStore) {
      return {
        type: 'context-menu',
        context: contextMenuContext
      };
    }
    return {
      type: undefined
    };
  }, [contextMenuContext, enclosingMenuStore, menubarContext, isSubmenu]);
  const rootId = (0, _useBaseUiId.useBaseUiId)();
  // React 17 resolves generated ids in an effect, so they must be read live rather than captured
  // in a state initializer.
  const defaultFloatingId = (0, _useBaseUiId.useBaseUiId)();
  const [renderedFloatingId, setRenderedFloatingId] = React.useState(undefined);

  // A registered `''` means the popup rendered with an explicitly empty id, so nothing may point
  // at the generated fallback.
  const floatingId = (renderedFloatingId ?? defaultFloatingId) || undefined;
  const floatingParentNodeIdFromContext = (0, _floatingUiReact.useFloatingParentNodeId)();
  const parentMenuStore = parentFromContext.type === 'menu' ? parentFromContext.store : undefined;
  // An initially open submenu should animate in only when the user watches it appear, i.e. when
  // its subtree mounts because the parent popup is playing its own enter transition. A parent
  // that was `defaultOpen` at page load never passes through `'starting'`, and under a
  // `keepMounted` parent these initializers run at page load while the parent's status is still
  // `undefined` — in both cases the submenu is page-load content that must not animate. Gated on
  // being open at mount so a closed submenu doesn't seed `instantType` it would never clear. Read
  // during the first render only — consumed exclusively by first-render initializers below
  // (`useState` and the store's initial state).
  const animateInitialOpen = (openProp ?? defaultOpen) && parentMenuStore?.state.transitionStatus === 'starting';

  // Mirror an instantly-opened parent (e.g. keyboard click) so `[data-instant]` styling
  // suppresses the enter transition on both popups or neither. Captured once —
  // `animateInitialOpen` is only meaningful during the first render.
  const seededInstantType = (0, _useRefWithInit.useRefWithInit)(() => animateInitialOpen ? parentMenuStore?.state.instantType : undefined).current;
  const store = (0, _useRefWithInit.useRefWithInit)(() => {
    const menuStore = new _MenuStore.MenuStore({
      open: defaultOpen,
      openProp,
      activeTriggerId: defaultTriggerIdProp,
      triggerIdProp,
      parent: parentFromContext,
      disabled: disabledProp,
      highlightItemOnHover,
      modal: parentFromContext.type === undefined ? modalProp : undefined,
      rootId,
      instantType: seededInstantType
    }, floatingId, floatingParentNodeIdFromContext != null);
    // A stable ref object, so descendants can read it during render from the first commit.
    menuStore.context.virtualFocusRef = virtualFocusRef;
    return menuStore;
  }).current;
  store.useControlledProp('openProp', openProp);
  store.useControlledProp('triggerIdProp', triggerIdProp);
  store.useContextCallback('onOpenChangeComplete', onOpenChangeComplete);
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const floatingNodeIdFromContext = (0, _floatingUiReact.useFloatingNodeId)(floatingTreeRoot);
  const open = store.useState('open');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const positionerElement = store.useState('positionerElement');
  const hoverEnabled = store.useState('hoverEnabled');
  const disabled = store.useState('disabled');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const parent = store.useState('parent');
  const activeIndex = store.useState('activeIndex');
  const keyboardOpen = store.useState('keyboardOpen');
  const payload = store.useState('payload');
  const floatingParentNodeId = store.useState('floatingParentNodeId');
  const openEventRef = React.useRef(null);
  const allowOutsidePressDismissalRef = React.useRef(parent.type !== 'context-menu');
  const allowOutsidePressDismissalTimeout = (0, _useTimeout.useTimeout)();
  const allowTouchToCloseRef = React.useRef(true);
  const allowTouchToCloseTimeout = (0, _useTimeout.useTimeout)();
  const nested = floatingParentNodeId != null;
  if (process.env.NODE_ENV !== 'production') {
    if (parent.type !== undefined && modalProp !== undefined) {
      console.warn('Base UI: The `modal` prop is not supported on nested menus. It will be ignored.');
    }
  }
  const {
    openMethod,
    triggerProps: interactionTypeProps
  } = (0, _useOpenInteractionType.useOpenInteractionType)(open);
  store.useSyncedValues({
    disabled: disabledProp,
    highlightItemOnHover,
    modal: parent.type === undefined ? modalProp : undefined,
    openMethod,
    rootId
  });
  (0, _popups.useImplicitActiveTrigger)(store);
  const {
    forceUnmount,
    transitionStatus
  } = (0, _popups.useOpenStateTransitions)(open, store, () => {
    store.set('allowMouseEnter', false);
  }, animateInitialOpen);
  const runOnceAnimationsFinish = (0, _useAnimationsFinished.useAnimationsFinished)(store.context.popupRef);

  // An inherited `instantType` is only for the initial reveal. A later controlled `open` flip
  // bypasses `setOpen`, so nothing would reset it and `[data-instant]` would wrongly suppress
  // every subsequent transition. Clear it once the enter phase settles, unless an interactive
  // open change already replaced it.
  React.useEffect(() => {
    if (seededInstantType === undefined) {
      return undefined;
    }
    const clearSeededInstantType = () => {
      if (store.state.instantType === seededInstantType) {
        store.set('instantType', undefined);
      }
    };

    // A controlled close can interrupt the initial enter before the animations-finished cleanup
    // below fires (its abort cancels the pending callback, and a closed popup schedules no new
    // one). Nothing is left to protect once closing starts — the exit's suppression was already
    // decided at its trigger commit — so clear now or the next reopen renders a stale
    // `[data-instant]`.
    if (!open) {
      clearSeededInstantType();
      return undefined;
    }
    if (transitionStatus !== undefined) {
      return undefined;
    }

    // With no popup element (e.g. its subtree is suspended or waiting on data), there is no
    // enter transition to protect, and `useAnimationsFinished` would return without invoking the
    // callback — a ref assignment alone would never rerun this effect, leaving the seed stuck.
    // Clear immediately: a popup that appears after the reveal settles is page-load-like content.
    if (store.context.popupRef.current == null) {
      clearSeededInstantType();
      return undefined;
    }
    const abortController = new AbortController();
    runOnceAnimationsFinish(clearSeededInstantType, abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [seededInstantType, open, transitionStatus, runOnceAnimationsFinish, store]);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    if (contextMenuContext && !parentMenuRootContext) {
      // This is a context menu root.
      // It doesn't support detached triggers yet, so we have to sync the parent context manually.
      store.update({
        parent: {
          type: 'context-menu',
          context: contextMenuContext
        },
        floatingNodeId: floatingNodeIdFromContext,
        floatingParentNodeId: floatingParentNodeIdFromContext
      });
    } else if (parentMenuRootContext || !store.select('activeTriggerElement')) {
      // Without an active trigger, the root must supply its own tree IDs.
      // Read the store here: a trigger can register after render, before this effect.
      store.update({
        floatingNodeId: floatingNodeIdFromContext,
        floatingParentNodeId: floatingParentNodeIdFromContext
      });
    }
  }, [contextMenuContext, parentMenuRootContext, floatingNodeIdFromContext, floatingParentNodeIdFromContext, activeTriggerElement, store]);
  React.useEffect(() => {
    if (!open) {
      openEventRef.current = null;
    }
    if (parent.type !== 'context-menu') {
      return;
    }
    if (!open) {
      allowOutsidePressDismissalTimeout.clear();
      allowOutsidePressDismissalRef.current = false;
      return;
    }

    // With `mousedown` outside press events and long press touch input, there
    // needs to be a grace period after opening to ensure the dismissal event
    // doesn't fire immediately after open.
    allowOutsidePressDismissalTimeout.start(500, () => {
      allowOutsidePressDismissalRef.current = true;
    });
  }, [allowOutsidePressDismissalTimeout, open, parent.type]);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    if (!open && !hoverEnabled) {
      store.set('hoverEnabled', true);
    }
  }, [open, hoverEnabled, store]);
  const setOpen = (0, _useStableCallback.useStableCallback)((nextOpen, eventDetails) => {
    const reason = eventDetails.reason;

    // Read the store directly, as relayed tree events and stale hover timers can request
    // a close after the state changed but before this component re-rendered.
    if (!nextOpen && !store.select('open')) {
      return;
    }
    if (open === nextOpen && eventDetails.trigger === activeTriggerElement && lastOpenChangeReason === reason) {
      return;
    }
    const shouldPreventUnmountOnClose = (0, _popups.attachPreventUnmountOnClose)(eventDetails);

    // Do not immediately reset the activeTriggerId to allow
    // exit animations to play and focus to be returned correctly.
    if (!nextOpen && eventDetails.trigger == null) {
      eventDetails.trigger = activeTriggerElement ?? undefined;
    }
    onOpenChange?.(nextOpen, eventDetails);
    if (eventDetails.isCanceled) {
      return;
    }
    store.state.floatingRootContext.dispatchOpenChange(nextOpen, eventDetails);
    const nativeEvent = eventDetails.event;
    if (nextOpen === false && reason !== _reasons.REASONS.itemPress && nativeEvent?.type === 'click' && nativeEvent.pointerType === 'touch' && !allowTouchToCloseRef.current) {
      return;
    }

    // Prevent the menu from closing on mobile devices that have a delayed click event.
    // In some cases the menu, when tapped, will fire the focus event first and then the click event.
    // Without this guard, the menu will close immediately after opening.
    if (nextOpen && reason === _reasons.REASONS.triggerFocus) {
      allowTouchToCloseRef.current = false;
      allowTouchToCloseTimeout.start(300, () => {
        allowTouchToCloseRef.current = true;
      });
    } else {
      allowTouchToCloseRef.current = true;
      allowTouchToCloseTimeout.clear();
    }
    const isDismissClose = !nextOpen && (reason === _reasons.REASONS.escapeKey || reason == null);
    openEventRef.current = eventDetails.event;
    const popupOpenState = (0, _popups.createPopupOpenState)(store.state, nextOpen, eventDetails.trigger, shouldPreventUnmountOnClose());
    popupOpenState.openChangeReason = reason;
    popupOpenState.keyboardOpen = nextOpen && (0, _isKeyboardOpen.isKeyboardOpen)(reason, nativeEvent);
    if (parent.type === 'menubar' && (reason === _reasons.REASONS.triggerFocus || reason === _reasons.REASONS.focusOut || reason === _reasons.REASONS.triggerHover || reason === _reasons.REASONS.listNavigation || reason === _reasons.REASONS.siblingOpen)) {
      popupOpenState.instantType = 'group';
    } else if ((0, _isKeyboardOpen.isKeyboardClick)(reason, nativeEvent)) {
      popupOpenState.instantType = 'click';
    } else if (isDismissClose) {
      popupOpenState.instantType = 'dismiss';
    } else {
      popupOpenState.instantType = undefined;
    }

    // `instantType` must land in the same update that mounts the popup subtree: in React 17
    // legacy mode this `update` can flush synchronously, and a separate `instantType` write
    // after it would come too late for an initially open submenu seeding its own store from
    // this one during that flush.
    store.update(popupOpenState);
  });
  const floatingRootContext = (0, _floatingUiReact.useSyncedFloatingRootContext)({
    popupStore: store,
    floatingRootContext: store.state.floatingRootContext,
    floatingId,
    nested: floatingParentNodeIdFromContext != null,
    onOpenChange: setOpen
  });
  const floatingEvents = floatingRootContext.context.events;

  // Registered in a layout effect (not a passive one) so `setOpen` emits from imperative
  // `MenuHandle.open()` calls made in the same commit this root mounts — e.g. from another layout
  // effect during a route-transition handoff — are received instead of being silently dropped.
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    const handleSetOpenEvent = ({
      open: nextOpen,
      eventDetails
    }) => setOpen(nextOpen, eventDetails);
    floatingEvents.on('setOpen', handleSetOpenEvent);
    return () => {
      floatingEvents?.off('setOpen', handleSetOpenEvent);
    };
  }, [floatingEvents, setOpen]);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => store.subscribeToParentMenu(), [store]);
  const handleImperativeClose = React.useCallback(() => {
    store.setOpen(false, (0, _createBaseUIEventDetails.createChangeEventDetails)(_reasons.REASONS.imperativeAction));
  }, [store]);
  React.useImperativeHandle(actionsRef, () => ({
    unmount: forceUnmount,
    close: handleImperativeClose
  }), [forceUnmount, handleImperativeClose]);
  let ctx;
  if (parent.type === 'context-menu') {
    ctx = parent.context;
  }
  React.useImperativeHandle(ctx?.positionerRef, () => positionerElement, [positionerElement]);
  React.useImperativeHandle(ctx?.actionsRef, () => ({
    setOpen
  }), [setOpen]);
  const dismiss = (0, _floatingUiReact.useDismiss)(floatingRootContext, {
    enabled: !disabled,
    bubbles: {
      escapeKey: closeParentOnEsc && parent.type === 'menu'
    },
    outsidePress() {
      if (parent.type !== 'context-menu' || openEventRef.current?.type === 'contextmenu') {
        return true;
      }
      return allowOutsidePressDismissalRef.current;
    },
    externalTree: nested ? floatingTreeRoot : undefined
  });
  const direction = (0, _DirectionContext.useDirection)();
  const listNavigation = (0, _floatingUiReact.useListNavigation)(floatingRootContext, {
    enabled: !disabled,
    listRef: store.context.itemDomElements,
    activeIndex,
    virtual: virtualFocus,
    nested: parent.type === 'menubar' || !virtualFocus && parent.type !== undefined,
    parentOrientation: parent.type === 'menubar' ? parent.context.orientation : undefined,
    loopFocus,
    // Filtered menus keep DOM focus on the input, while keyboard and virtual opens initially
    // highlight an item as ordinary menus do. The input stays in the arrow-key loop unless the
    // filter highlights automatically.
    focusItemOnOpen: virtualFocus ? keyboardOpen : undefined,
    allowEscape: virtualFocus && loopFocus && allowEscape,
    orientation,
    // A virtual-focus list can navigate on either axis, but its trigger always opens on the
    // vertical one.
    triggerOrientation: virtualFocus ? 'vertical' : orientation,
    rtl: direction === 'rtl',
    disabledIndices: _empty.EMPTY_ARRAY,
    onNavigate(nextActiveIndex, event) {
      store.setActiveIndex(nextActiveIndex, (0, _getHighlightReason.getHighlightReason)(event), event?.nativeEvent);
    },
    // A virtual-focus submenu's keyboard opening is orchestrated by its navigation wrapper based
    // on both menus' orientations; the generic arrow-key opening would also react to the parent's
    // forwarded cross-axis keys while closed.
    openOnArrowKeyDown: parent.type !== 'context-menu' && !(virtualFocus && isSubmenu),
    externalTree: !virtualFocus && nested ? floatingTreeRoot : undefined,
    nestedReturnFocusRef: parentMenuStore?.context.virtualFocusRef,
    focusItemOnHover: highlightItemOnHover,
    resetOnPointerLeave
  });
  const onTyping = React.useCallback(nextTyping => {
    store.context.typingRef.current = nextTyping;
  }, [store]);
  const typeahead = (0, _floatingUiReact.useTypeahead)(floatingRootContext, {
    // Under virtual focus the input owns typing, so typeahead would race the filter query.
    enabled: !disabled && !virtualFocus,
    listRef: store.context.itemLabels,
    elementsRef: store.context.itemDomElements,
    activeIndex,
    resetMs: _constants.TYPEAHEAD_RESET_MS,
    onMatch: (index, event) => {
      if (open && index !== activeIndex) {
        store.setActiveIndex(index, _reasons.REASONS.keyboard, event.nativeEvent);
      }
    },
    onTyping
  });
  const onItemHighlighted = (0, _useStableCallback.useStableCallback)(onItemHighlightedProp);
  const lastHighlightIndexRef = React.useRef(-1);

  // Runs when `activeIndex` commits and again when the item registry settles, since an index
  // can come to point at a different element while its value stays the same.
  const syncHighlightedItem = (0, _useStableCallback.useStableCallback)(() => {
    const index = store.state.activeIndex;
    const item = index === null ? undefined : store.context.itemDomElements.current[index] ?? undefined;
    // An item removed in this commit stays registered until the list flushes, which calls back
    // here with the settled registry.
    if (item?.isConnected === false) {
      return;
    }
    const itemIndex = item === undefined ? -1 : index;
    if (lastHighlightIndexRef.current === itemIndex && store.context.reportedItem === item) {
      return;
    }
    lastHighlightIndexRef.current = itemIndex;
    store.context.reportedItem = item;
    // Only virtual focus renders from the highlighted element. Publishing it in every menu would
    // notify each item's subscription on every highlight change.
    if (virtualFocus) {
      store.set('highlightedItem', item);
    }
    // The tag left by the write that produced this committed value.
    const {
      highlightReason,
      highlightEvent
    } = store.context;
    store.context.highlightReason = _reasons.REASONS.none;
    store.context.highlightEvent = undefined;
    if (!onItemHighlightedProp) {
      return;
    }
    onItemHighlighted(item, (0, _createBaseUIEventDetails.createGenericEventDetails)(highlightReason, highlightEvent, {
      label: item === undefined ? undefined : store.context.itemLabels.current[itemIndex] ?? undefined
    }));
  });
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    syncHighlightedItem();
  }, [activeIndex, syncHighlightedItem]);

  // Under virtual focus an element inside the popup holds real focus, so it takes the
  // navigation's reference props (`aria-activedescendant` and the key handling) and the trigger
  // keeps only the props that open the menu.
  const openTriggerProps = React.useMemo(() => {
    if (!virtualFocus) {
      return listNavigation.reference;
    }
    if (!listNavigation.trigger) {
      return _empty.EMPTY_OBJECT;
    }
    // Focusing the trigger while the menu is open must not seed the virtual highlight. This can
    // happen before a pointer press closes the menu in Safari.
    const {
      onFocus,
      ...rest
    } = listNavigation.trigger;
    return rest;
  }, [virtualFocus, listNavigation.reference, listNavigation.trigger]);
  store.useSyncedValue('inputProps', virtualFocus ? listNavigation.reference ?? _empty.EMPTY_OBJECT : _empty.EMPTY_OBJECT);
  const activeTriggerProps = React.useMemo(() => {
    const mergedProps = (0, _mergeProps.mergeProps)(typeahead.reference, openTriggerProps, dismiss.reference, {
      onMouseMove() {
        store.set('allowMouseEnter', true);
      }
    }, interactionTypeProps);
    mergedProps['aria-haspopup'] = 'menu';
    mergedProps['aria-expanded'] = open;
    return mergedProps;
  }, [store, typeahead.reference, openTriggerProps, dismiss.reference, interactionTypeProps, open]);
  const inactiveTriggerProps = React.useMemo(() => {
    const mergedProps = (0, _mergeProps.mergeProps)(listNavigation.trigger, dismiss.trigger, interactionTypeProps);
    mergedProps['aria-haspopup'] = 'menu';
    mergedProps['aria-expanded'] = false;
    return mergedProps;
  }, [listNavigation.trigger, dismiss.trigger, interactionTypeProps]);

  // The initial render has no store subscribers yet. Seed these props before triggers render so
  // the synchronization effect below doesn't make every trigger render twice in the first commit.
  (0, _useRefWithInit.useRefWithInit)(() => {
    store.update({
      inactiveTriggerProps
    });
    return null;
  });
  const popupProps = React.useMemo(() => (0, _mergeProps.mergeProps)(_popups.FOCUSABLE_POPUP_PROPS, {
    onMouseMove() {
      store.set('allowMouseEnter', true);
      if (parent.type === 'menu') {
        store.set('hoverEnabled', false);
      }
    },
    onClick() {
      if (store.select('hoverEnabled')) {
        store.set('hoverEnabled', false);
      }
    },
    onKeyDown(event) {
      // The Menubar's CompositeRoot captures keyboard events via
      // event delegation. This works well when Menu.Root is nested inside Menubar,
      // but with detached triggers we need to manually forward the event to the CompositeRoot.
      const relay = store.select('keyboardEventRelay');
      if (relay && !event.isPropagationStopped()) {
        relay(event);
      }
    }
  }, typeahead.floating, listNavigation.floating, dismiss.floating), [parent.type, store, typeahead.floating, listNavigation.floating, dismiss.floating]);
  const itemProps = listNavigation.item ?? _empty.EMPTY_OBJECT;
  (0, _popups.usePopupInteractionProps)(store, {
    floatingRootContext,
    activeTriggerProps,
    inactiveTriggerProps,
    popupProps,
    itemProps
  });
  const context = React.useMemo(() => ({
    store,
    parent: parentFromContext,
    orientation,
    loopFocus,
    allowEscape,
    defaultFloatingId,
    setRenderedFloatingId,
    virtualFocus,
    parentVirtualFocus,
    syncHighlightedItem
  }), [store, parentFromContext, orientation, loopFocus, allowEscape, defaultFloatingId, virtualFocus, parentVirtualFocus, syncHighlightedItem]);
  const renderedChildren = typeof children === 'function' ? children({
    payload
  }) : children;
  let content = /*#__PURE__*/(0, _jsxRuntime.jsxs)(_MenuRootContext.MenuRootContext.Provider, {
    value: context,
    children: [handle && /*#__PURE__*/(0, _jsxRuntime.jsx)(_popups.PopupHandleAttachment, {
      handle: handle,
      store: store
    }), renderedChildren]
  });
  if (parent.type === undefined || parent.type === 'context-menu') {
    // set up a FloatingTree to provide the context to nested menus
    content = /*#__PURE__*/(0, _jsxRuntime.jsx)(_floatingUiReact.FloatingTree, {
      externalTree: floatingTreeRoot,
      children: content
    });
  }
  return content;
});

/**
 * Groups all parts of the menu.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
if (process.env.NODE_ENV !== "production") MenuRootInternal.displayName = "MenuRootInternal";
function MenuRoot(props) {
  const filterProvider = React.useContext(_MenuFilterProviderContext.MenuFilterProviderContext);
  if (filterProvider === null) {
    return /*#__PURE__*/(0, _jsxRuntime.jsx)(MenuRootInternal, {
      ...props
    });
  }
  const FilterRoot = filterProvider.Root;
  return (
    /*#__PURE__*/
    // The root consumes its provider so a plain submenu inside doesn't inherit it.
    (0, _jsxRuntime.jsx)(_MenuFilterProviderContext.MenuFilterProviderContext.Provider, {
      value: null,
      children: /*#__PURE__*/(0, _jsxRuntime.jsx)(FilterRoot, {
        ...filterProvider.options,
        ...props
      })
    })
  );
}