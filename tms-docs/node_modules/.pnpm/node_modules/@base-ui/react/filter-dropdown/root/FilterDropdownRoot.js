"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilterDropdownRoot = FilterDropdownRoot;
var React = _interopRequireWildcard(require("react"));
var _useRefWithInit = require("@base-ui/utils/useRefWithInit");
var _useStableCallback = require("@base-ui/utils/useStableCallback");
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _filter = require("../../internals/filter");
var _useBaseUiId = require("../../internals/useBaseUiId");
var _useItemRegistry = require("../../internals/useItemRegistry");
var _FilterDropdownRootContext = require("./FilterDropdownRootContext");
var _store = require("../store");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * Holds the filter query, matches it against the registered items, and publishes the result. The
 * host owns list navigation; this root moves the highlight through `setActiveIndex`.
 *
 * @internal
 */function FilterDropdownRoot(props) {
  const {
    children,
    open,
    disabled = false,
    openedByKeyboard = false,
    locale,
    value,
    query,
    onValueChange,
    filter,
    autoHighlight = false,
    triggerId: triggerIdProp,
    listRef,
    getActiveIndex,
    setActiveIndex,
    focusOwnerRef: focusOwnerRefProp
  } = props;
  const parentItemContext = React.useContext(_FilterDropdownRootContext.FilterDropdownItemContext);
  const [renderedListId, setRenderedListId] = React.useState(undefined);
  const [inputFocusVisible, setInputFocusVisible] = React.useState(openedByKeyboard);
  const [keyboardModality, setKeyboardModality] = React.useState(openedByKeyboard);
  const [previousOpenedByKeyboard, setPreviousOpenedByKeyboard] = React.useState(openedByKeyboard);

  // Both reset when the host reports a new value; doing it during render skips an extra commit.
  if (openedByKeyboard !== previousOpenedByKeyboard) {
    setPreviousOpenedByKeyboard(openedByKeyboard);
    setInputFocusVisible(openedByKeyboard);
    setKeyboardModality(openedByKeyboard);
  }
  const {
    items: registeredItems,
    registerItem: registerInRegistry,
    liveItems
  } = (0, _useItemRegistry.useItemRegistry)();
  const defaultId = (0, _useBaseUiId.useBaseUiId)();
  const store = (0, _useRefWithInit.useRefWithInit)(() => new _store.FilterDropdownStore()).current;

  // The count is published as items register, not with the next registry snapshot, so a
  // `Menu.Empty` mounting alongside the items never reads a stale zero.
  const registerItem = (0, _useStableCallback.useStableCallback)((id, item) => {
    const unregister = registerInRegistry(id, item);
    store.set('registeredItemCount', liveItems.size);
    return () => {
      unregister();
      store.set('registeredItemCount', liveItems.size);
    };
  });
  const fallbackFocusOwnerRef = React.useRef(null);
  const lastFilterQueryRef = React.useRef(null);
  const defaultMatchItem = React.useMemo(() => (0, _filter.getFilter)({
    locale
  }).contains, [locale]);
  const focusOwnerRef = focusOwnerRefProp ?? fallbackFocusOwnerRef;
  const filterQuery = (query ?? value).trim();
  // An unused inline filter must not re-run auto-highlighting when the consumer re-renders.
  const matchItem = filterQuery === '' || filter === null ? null : filter ?? defaultMatchItem;
  const autoHighlightEnabled = open && (autoHighlight === 'always' || autoHighlight && filterQuery !== '');
  // React 17 resolves generated ids in an effect, so they must be read live rather than captured
  // in a state initializer.
  const defaultListId = defaultId ? `${defaultId}-list` : undefined;
  const listId = (renderedListId ?? defaultListId) || undefined;
  // The host owns the trigger. `null` and `''` both mean no element carries an id to point at.
  const triggerId = triggerIdProp || undefined;
  const handleValueChange = (0, _useStableCallback.useStableCallback)((nextValue, eventDetails) => {
    onValueChange?.(nextValue, eventDetails);
    // Indexes are positional, so a kept highlight would land on whatever fills its slot.
    // With `autoHighlight`, the filtering effect below places the highlight instead.
    if (!eventDetails.isCanceled && !autoHighlight) {
      setActiveIndex(null);
    }
  });
  const handleItemsChange = (0, _useStableCallback.useStableCallback)(previousItems => {
    const items = listRef.current;
    const activeIndex = getActiveIndex();

    // A positional highlight must not silently move to another item. A change that leaves the
    // highlighted item in place keeps it, such as an item appended after it or one that renders
    // once before the query filters it out. A query change already reset the highlight.
    if (activeIndex != null && items[activeIndex] != null && items[activeIndex] === previousItems[activeIndex]) {
      return;
    }
    setActiveIndex(autoHighlightEnabled && items.length > 0 ? 0 : null);
  });

  // Re-runs on the registry snapshot published once every item in the commit has registered,
  // and on the committed query, because a controlled consumer can reject a proposed change. It
  // reads the live registry so items registered in this commit count before their snapshot.
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    if (!open && query === undefined) {
      return;
    }
    const queryChanged = lastFilterQueryRef.current !== null && lastFilterQueryRef.current !== filterQuery;
    lastFilterQueryRef.current = filterQuery;

    // With no query or external filtering, every registered item is visible. External filtering
    // still follows `autoHighlight`; otherwise the item set invalidates the highlight.
    if (matchItem === null) {
      store.set('visibleItemIds', null);
      // Registry updates, such as an item's text changing, keep the current highlight.
      if (autoHighlightEnabled && liveItems.size > 0) {
        if (queryChanged || getActiveIndex() == null) {
          setActiveIndex(0);
        }
      } else if (filterQuery === '' && queryChanged) {
        setActiveIndex(null);
      }
      return;
    }
    const currentIds = store.state.visibleItemIds;
    // The popup's content mounts a commit after the root opens. Publishing an empty result before
    // anything registered would hide every item as it arrives and remount the matches.
    if (currentIds === null && liveItems.size === 0) {
      return;
    }
    const nextIds = new Set();
    let hasNewMatch = currentIds === null;
    liveItems.forEach(({
      getText
    }, id) => {
      const text = getText();
      if (text != null && matchItem(text, filterQuery)) {
        nextIds.add(id);
        hasNewMatch ||= !currentIds?.has(id);
      }
    });

    // New matches or a smaller result set invalidate the previous item identities.
    if (hasNewMatch || currentIds?.size !== nextIds.size) {
      // The first filtered snapshot can land after initial keyboard navigation in React 18. It
      // has no prior result identity to invalidate, unless the controlled query itself changed.
      if (autoHighlightEnabled && nextIds.size > 0) {
        setActiveIndex(0);
      } else if (currentIds !== null || queryChanged) {
        setActiveIndex(null);
      }
      store.set('visibleItemIds', nextIds);
    } else if (autoHighlightEnabled && queryChanged && nextIds.size > 0) {
      setActiveIndex(0);
    }
  }, [open, query, filterQuery, registeredItems, liveItems, matchItem, autoHighlightEnabled, store, setActiveIndex, getActiveIndex]);
  const contextValue = React.useMemo(() => ({
    open,
    disabled,
    inputFocusVisible,
    setInputFocusVisible,
    keyboardModality,
    setKeyboardModality,
    autoHighlight,
    triggerId,
    defaultListId,
    listId,
    setRenderedListId,
    focusOwnerRef,
    setActiveIndex,
    onItemsChange: handleItemsChange,
    onValueChange: handleValueChange
  }), [open, disabled, inputFocusVisible, keyboardModality, autoHighlight, triggerId, defaultListId, listId, focusOwnerRef, setActiveIndex, handleItemsChange, handleValueChange]);
  const itemContextValue = React.useMemo(() => ({
    parent: parentItemContext,
    store,
    registerItem,
    listRef
  }), [parentItemContext, store, registerItem, listRef]);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownRootContext.FilterDropdownItemContext.Provider, {
    value: itemContextValue,
    children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownRootContext.FilterDropdownRootContext.Provider, {
      value: contextValue,
      children: /*#__PURE__*/(0, _jsxRuntime.jsx)(_FilterDropdownRootContext.FilterDropdownValueContext.Provider, {
        value: query ?? value,
        children: children
      })
    })
  });
}