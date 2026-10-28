"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useFilterDropdownItem = useFilterDropdownItem;
var React = _interopRequireWildcard(require("react"));
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _useRefWithInit = require("@base-ui/utils/useRefWithInit");
var _useValueAsRef = require("@base-ui/utils/useValueAsRef");
var _store = require("@base-ui/utils/store");
var _FilterDropdownRootContext = require("../root/FilterDropdownRootContext");
var _FilterDropdownGroupContext = require("../group/FilterDropdownGroupContext");
var _store2 = require("../store");
var _useRenderElement = require("../../internals/useRenderElement");
/** Text of the rendered children, for when the element is filtered out and has no DOM node. */
function childrenText(children) {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(childrenText).join('');
  }
  if (/*#__PURE__*/React.isValidElement(children)) {
    return childrenText(children.props.children);
  }
  return '';
}
/**
 * Registers an item with the enclosing filter root and reports whether the query keeps it.
 *
 * The item renders once before it is registered so its rendered text can be read and cached: a
 * popup can open with a query that already excludes the item, and a hidden item has no text left
 * to match against.
 *
 * @internal
 */
function useFilterDropdownItem(params) {
  const {
    label,
    retainGroup = false,
    children,
    render,
    context
  } = params;
  const nearestContext = (0, _FilterDropdownRootContext.useFilterDropdownItemContext)(context !== undefined);
  const groupContext = (0, _FilterDropdownGroupContext.useFilterDropdownGroupContext)();
  const owner = context === undefined ? nearestContext : context;
  const {
    registerItem,
    store
  } = owner ?? _store2.DETACHED_OWNER;
  const registerGroupItem = groupContext?.registerItem;
  const itemId = (0, _useRefWithInit.useRefWithInit)(() => Symbol('filter-dropdown-item')).current;
  const ref = React.useRef(null);
  const registeredTextRef = React.useRef(undefined);
  const matched = (0, _store.useStore)(store, _store2.selectors.isItemVisible, itemId);

  // An initial item is visible before registration (`visibleItemIds` is null), so start
  // registered and skip the mount re-render. A late item under an active filter starts
  // unregistered and renders once so its DOM text can be captured.
  const [registered, setRegistered] = React.useState(matched);

  // Read through refs so `register` stays stable while the children change identity.
  const childrenRef = (0, _useValueAsRef.useValueAsRef)(children);
  const renderRef = (0, _useValueAsRef.useValueAsRef)(render);

  // What the children last read as, to tell whether they changed while the item rendered no text.
  const childrenTextRef = React.useRef(undefined);
  const resolveText = React.useCallback(() => {
    if (label != null) {
      return label;
    }
    // An item without children can carry its text in its `render` element instead.
    const fromChildren = childrenText(childrenRef.current ?? (0, _useRenderElement.unwrapLazyRenderProp)(renderRef.current));
    const previousChildrenText = childrenTextRef.current;
    childrenTextRef.current = fromChildren;
    if (ref.current !== null) {
      return ref.current.textContent ?? '';
    }
    // A filtered-out item has no DOM node left. Its children are only a stand-in for the text it
    // renders, which can differ (a translation component, for example), so the cached text wins
    // unless the children changed.
    if (registeredTextRef.current !== undefined && fromChildren === previousChildrenText) {
      return registeredTextRef.current;
    }
    return fromChildren;
  }, [label, childrenRef, renderRef]);
  const register = React.useCallback(resolvedText => {
    const text = resolvedText ?? resolveText();
    if (text) {
      registeredTextRef.current = text;
    }
    return registerItem(itemId, {
      getText() {
        // A mounted item reports what it renders now, even nothing, since a descendant can change
        // its text without the item re-rendering. A filtered-out item falls back to the cached
        // text.
        if (label == null && ref.current) {
          registeredTextRef.current = ref.current.textContent ?? '';
        }
        return registeredTextRef.current;
      }
    });
  }, [itemId, label, registerItem, resolveText]);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    const unregister = register();
    setRegistered(true);
    return unregister;
  }, [register]);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => registerGroupItem?.(itemId, retainGroup), [registerGroupItem, itemId, retainGroup]);

  // Re-register when the item's text changes, so the active query runs again.
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    const text = resolveText();
    if (text !== registeredTextRef.current) {
      registeredTextRef.current = text;
      void register(text);
    }
  }, [register, resolveText, children, render, label]);
  return {
    visible: !registered || matched,
    ref
  };
}