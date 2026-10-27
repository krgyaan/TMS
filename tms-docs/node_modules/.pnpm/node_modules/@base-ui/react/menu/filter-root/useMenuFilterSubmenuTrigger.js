"use strict";
'use client';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useMenuFilterSubmenuTrigger = useMenuFilterSubmenuTrigger;
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _useEnhancedClickHandler = require("@base-ui/utils/useEnhancedClickHandler");
var _createBaseUIEventDetails = require("../../internals/createBaseUIEventDetails");
var _reasons = require("../../internals/reasons");
var _event = require("../../floating-ui-react/utils/event");
var _useFilterDropdownItem = require("../../filter-dropdown/item/useFilterDropdownItem");
var _FilterDropdownRootContext = require("../../filter-dropdown/root/FilterDropdownRootContext");
var _MenuRootContext = require("../root/MenuRootContext");
/**
 * Registers a submenu trigger with the parent menu's filter and adapts it to a filterable
 * submenu: the trigger lives inside its own submenu root, but it is an item of the parent list.
 */
function useMenuFilterSubmenuTrigger(params) {
  // `virtualFocus` is set only by a filterable submenu root, so it tells this trigger whether the
  // submenu it opens renders a `role="dialog"` popup or a plain `role="menu"` one. The documented
  // plain-submenu recipe relies on the latter.
  const {
    store,
    virtualFocus
  } = (0, _MenuRootContext.useMenuRootContext)();
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const parent = store.useState('parent');

  // The submenu root's provider shadows the enclosing one, but the trigger belongs to the list
  // it opens from, which is the parent menu's.
  const parentListRef = parent.type === 'menu' ? parent.store.context.itemDomElements : null;
  const parentContext = (0, _FilterDropdownRootContext.useFilterContextForList)(parentListRef);
  const {
    visible,
    ref
  } = (0, _useFilterDropdownItem.useFilterDropdownItem)({
    ...params,
    context: parentContext,
    retainGroup: mounted
  });

  // Filtering the trigger out unmounts it, leaving its submenu open with no anchor.
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    if (visible || !open) {
      return;
    }
    store.setOpen(false, (0, _createBaseUIEventDetails.createChangeEventDetails)(_reasons.REASONS.none));
  }, [visible, open, store]);
  const clickProps = (0, _useEnhancedClickHandler.useEnhancedClickHandler)((event, interactionType) => {
    if (event.type === 'click' && store.select('open') && (interactionType === 'keyboard' || interactionType === 'mouse' && store.select('lastOpenChangeReason') === _reasons.REASONS.triggerPress)) {
      store.context.virtualFocusRef?.current?.focus({
        preventScroll: true
      });
    }
  });
  const props = {
    // Omitted rather than `undefined`, which would clear the `'menu'` the root puts on every
    // trigger.
    ...(virtualFocus ? {
      'aria-haspopup': 'dialog'
    } : undefined),
    ...clickProps,
    onPointerDown(event) {
      clickProps.onPointerDown(event);
      store.context.virtualPress = (0, _event.isVirtualPointerEvent)(event.nativeEvent);
    },
    onFocus(event) {
      // A plain parent menu moves DOM focus to whichever item the pointer crosses. While this
      // trigger's submenu is open and its input held focus, hand focus straight back so crossing
      // the trigger doesn't interrupt typing.
      const focusOwner = store.context.virtualFocusRef?.current;
      if (focusOwner && store.select('open') && event.relatedTarget === focusOwner) {
        event.preventBaseUIHandler();
        focusOwner.focus({
          preventScroll: true
        });
      }
    }
  };
  if (parentContext === null) {
    // A plain parent menu roves DOM focus across its items and never filters them.
    return {
      visible: true,
      ref: null,
      props
    };
  }
  return {
    visible: visible || mounted,
    ref,
    props
  };
}