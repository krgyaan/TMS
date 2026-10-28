"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuFilterDropdown = MenuFilterDropdown;
var React = _interopRequireWildcard(require("react"));
var _useControlled = require("@base-ui/utils/useControlled");
var _useStableCallback = require("@base-ui/utils/useStableCallback");
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _useRefWithInit = require("@base-ui/utils/useRefWithInit");
var _MenubarContext = require("../../menubar/MenubarContext");
var _event = require("../../floating-ui-react/utils/event");
var _FilterDropdownRoot = require("../../filter-dropdown/root/FilterDropdownRoot");
var _useFilterDropdownCloseQuery = require("../../filter-dropdown/root/useFilterDropdownCloseQuery");
var _MenuRootContext = require("../root/MenuRootContext");
var _reasons = require("../../internals/reasons");
var _MenuFilterContext = require("./MenuFilterContext");
var _MenuFilterImpl = require("./MenuFilterImpl");
var _useMenuFilterKeyDown = require("./useMenuFilterKeyDown");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * Reads the menu store, which is only available below the menu root, and hands the filter
 * engine the list the menu navigates and the command that moves its highlight. The query is
 * owned here; the menu root keeps sole ownership of the open state.
 */
function MenuFilterDropdown(props) {
  const {
    value: valueProp,
    defaultValue = '',
    onValueChange,
    ...dropdownProps
  } = props;
  const {
    store
  } = (0, _MenuRootContext.useMenuRootContext)();
  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const keyboardOpen = store.useState('keyboardOpen');
  const activeTriggerId = store.useState('activeTriggerId');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const disabled = store.useState('disabled');
  const [value, setValue] = (0, _useControlled.useControlled)({
    controlled: valueProp,
    default: defaultValue,
    name: 'MenuFilterProvider',
    state: 'value'
  });
  const handleValueChange = (0, _useStableCallback.useStableCallback)((nextValue, eventDetails) => {
    onValueChange?.(nextValue, eventDetails);
    if (!eventDetails.isCanceled) {
      setValue(nextValue);
    }
  });
  const getActiveIndex = (0, _useStableCallback.useStableCallback)(() => store.state.activeIndex);
  const setActiveIndex = (0, _useStableCallback.useStableCallback)(index => {
    store.setActiveIndex(index, _reasons.REASONS.none);
  });
  const query = (0, _useFilterDropdownCloseQuery.useFilterDropdownCloseQuery)({
    open,
    mounted,
    value,
    onValueChange: handleValueChange
  });
  const filterTriggerProps = useFilterTriggerProps(value !== '');
  // Seeded before the triggers below render, like the root's inactive trigger props, so the sync
  // effect doesn't render every trigger twice in the first commit.
  (0, _useRefWithInit.useRefWithInit)(() => {
    store.set('filterTriggerProps', filterTriggerProps);
    return null;
  });
  store.useSyncedValue('filterTriggerProps', filterTriggerProps);

  // Only `setOpen` records a keyboard open, so a controlled close that bypasses it must not leave
  // the next programmatic open looking like one.
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    if (!open) {
      store.set('keyboardOpen', false);
    }
  }, [open, store]);

  // Trust the rendered element's id once it exists: an explicitly empty id must not fall back to a
  // registered id that no element carries.
  const triggerId = activeTriggerElement ? activeTriggerElement.id || null : activeTriggerId;
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_MenuFilterContext.MenuFilterImplContext.Provider, {
    value: _MenuFilterImpl.MENU_FILTER_IMPL,
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownRoot.FilterDropdownRoot, {
      ...dropdownProps,
      open: open,
      openedByKeyboard: keyboardOpen,
      disabled: disabled,
      value: value,
      query: query,
      onValueChange: handleValueChange,
      triggerId: triggerId,
      listRef: store.context.itemDomElements,
      getActiveIndex: getActiveIndex,
      setActiveIndex: setActiveIndex,
      focusOwnerRef: store.context.virtualFocusRef
    })
  });
}

/**
 * The props a filterable menu adds to its triggers: dialog semantics, screen reader press
 * tracking, and a relay of list navigation typed on the trigger to the input, since the input
 * holds real focus while the popup is open.
 */
function useFilterTriggerProps(hasValue) {
  const {
    store
  } = (0, _MenuRootContext.useMenuRootContext)();
  const isInMenubar = (0, _MenubarContext.useMenubarContext)(true) != null;
  const handleInputKeyDown = (0, _useMenuFilterKeyDown.useMenuFilterKeyDown)(hasValue);
  return React.useMemo(() => ({
    'aria-haspopup': 'dialog',
    onPointerDown(event) {
      store.context.virtualPress = (0, _event.isVirtualPointerEvent)(event.nativeEvent);
    },
    onKeyDown(event) {
      const focusOwner = store.context.virtualFocusRef?.current;
      if (!store.select('open') || !focusOwner || isInMenubar) {
        return;
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        focusOwner.focus({
          preventScroll: true
        });
        handleInputKeyDown(event);
        event.preventDefault();
        event.preventBaseUIHandler();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        // Cross-axis keys drive submenu open/close, which the trigger must not relay.
        event.preventBaseUIHandler();
      } else if (isTypeaheadKey(event)) {
        focusOwner.focus({
          preventScroll: true
        });
      }
    }
  }), [store, isInMenubar, handleInputKeyDown]);
}
function isTypeaheadKey(event) {
  return event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey;
}