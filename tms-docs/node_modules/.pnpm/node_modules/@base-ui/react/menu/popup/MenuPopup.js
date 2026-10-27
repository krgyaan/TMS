"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuPopupPlain = exports.MenuPopup = void 0;
var React = _interopRequireWildcard(require("react"));
var _floatingUiReact = require("../../floating-ui-react");
var _MenuRootContext = require("../root/MenuRootContext");
var _MenuPositionerContext = require("../positioner/MenuPositionerContext");
var _useRenderElement = require("../../internals/useRenderElement");
var _popupStateMapping = require("../../utils/popupStateMapping");
var _useOpenChangeComplete = require("../../internals/useOpenChangeComplete");
var _createBaseUIEventDetails = require("../../internals/createBaseUIEventDetails");
var _reasons = require("../../internals/reasons");
var _ToolbarRootContext = require("../../toolbar/root/ToolbarRootContext");
var _composite = require("../../internals/composite/composite");
var _getDisabledMountTransitionStyles = require("../../internals/getDisabledMountTransitionStyles");
var _MenuSubmenuRootContext = require("../submenu-root/MenuSubmenuRootContext");
var _resolveRenderedId = require("../../internals/resolveRenderedId");
var _resolvePopupLabel = require("../../internals/resolvePopupLabel");
var _MenuFilterContext = require("../filter-root/MenuFilterContext");
var _jsxRuntime = require("react/jsx-runtime");
/**
 * @internal
 */
const MenuPopupPlain = exports.MenuPopupPlain = /*#__PURE__*/React.forwardRef(function MenuPopupPlain(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    finalFocus,
    id: idProp,
    initialFocus: initialFocusProp,
    ...elementProps
  } = componentProps;
  const {
    store,
    defaultFloatingId,
    setRenderedFloatingId,
    virtualFocus,
    orientation
  } = (0, _MenuRootContext.useMenuRootContext)();
  const inheritedSubmenuRootContext = (0, _MenuSubmenuRootContext.useMenuSubmenuRootContext)();
  const {
    side,
    align
  } = (0, _MenuPositionerContext.useMenuPositionerContext)();
  const insideToolbar = (0, _ToolbarRootContext.useToolbarRootContext)(true) != null;
  const open = store.useState('open');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  const mounted = store.useState('mounted');
  const instantType = store.useState('instantType');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const parent = store.useState('parent');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const rootId = store.useState('rootId');
  const floatingContext = store.useState('floatingRootContext');
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const closeDelay = store.useState('closeDelay');
  const hoverEnabled = store.useState('hoverEnabled');
  const disabled = store.useState('disabled');
  const openMethod = store.useState('openMethod');
  const activeTriggerId = store.useState('activeTriggerId');
  const listElement = store.useState('listElement');
  const [id, registerIdRef] = (0, _resolveRenderedId.useRenderedId)(componentProps, defaultFloatingId, setRenderedFloatingId);
  const ariaLabelledBy = (0, _resolvePopupLabel.resolvePopupLabel)(componentProps, activeTriggerElement, activeTriggerId);

  // A dialog's menu can render under a submenu provider; only the actual submenu inherits it.
  const submenuRootContext = parent.type === 'menu' ? inheritedSubmenuRootContext : undefined;
  const isContextMenu = parent.type === 'context-menu';
  let initialFocus = initialFocusProp ?? parent.type !== 'menu';
  if (initialFocusProp === undefined && listElement && parent.type !== 'menu') {
    initialFocus = () => {
      // A keyboard or screen reader open highlights an item, which list navigation focuses.
      if (store.state.activeIndex !== null) {
        return false;
      }
      // The list holds the `menu` role, so a pointer open lands focus on it rather than on the
      // presentational popup.
      return listElement;
    };
  }
  (0, _useOpenChangeComplete.useOpenChangeComplete)({
    open,
    ref: store.context.popupRef,
    onComplete() {
      if (open) {
        store.context.onOpenChangeComplete?.(true);
      }
    }
  });
  React.useEffect(() => {
    function handleClose(event) {
      store.setOpen(false, (0, _createBaseUIEventDetails.createChangeEventDetails)(event.reason, event.domEvent));
    }
    floatingTreeRoot.events.on('close', handleClose);
    return () => {
      floatingTreeRoot.events.off('close', handleClose);
    };
  }, [floatingTreeRoot.events, store]);
  (0, _floatingUiReact.useHoverFloatingInteraction)(floatingContext, {
    enabled: hoverEnabled && !disabled && !isContextMenu && parent.type !== 'menubar',
    closeDelay
  });
  const setPopupElement = store.useStateSetter('popupElement');

  // Only a menu under a filter root bundles the handoff to a filterable parent. Whether one is
  // above is fixed for a mounted popup, so the hook doesn't change between renders.
  const useParentHandoff = React.useContext(_MenuFilterContext.MenuFilterImplContext)?.useParentHandoff ?? useNoParentHandoff;
  const {
    parentVirtualFocusRef,
    handleFocus
  } = useParentHandoff(store, parent, open, virtualFocus);
  const state = {
    transitionStatus,
    side,
    align,
    open,
    nested: parent.type === 'menu',
    instant: instantType
  };
  const element = (0, _useRenderElement.useRenderElement)('div', componentProps, {
    state,
    ref: [forwardedRef, store.context.popupRef, setPopupElement, registerIdRef],
    stateAttributesMapping: _popupStateMapping.popupTransitionStateMapping,
    props: [popupProps, {
      id,
      // A rendered `Menu.List` carries the `menu` semantics instead.
      ...(listElement ? {
        role: 'presentation'
      } : {
        role: 'menu',
        // `menu` is implicitly vertical, so only the non-default value needs to be
        // rendered.
        'aria-orientation': orientation === 'horizontal' ? 'horizontal' : undefined,
        'aria-labelledby': ariaLabelledBy
      }),
      onKeyDown(event) {
        submenuRootContext?.onPopupKeyDown?.(event);
        if (insideToolbar && _composite.COMPOSITE_KEYS.has(event.key)) {
          event.stopPropagation();
        }
      },
      onFocus: handleFocus
    }, (0, _getDisabledMountTransitionStyles.getDisabledMountTransitionStyles)(transitionStatus), elementProps, {
      'data-rootownerid': rootId
    }]
  });
  let returnFocus = parent.type === undefined || isContextMenu;
  if (activeTriggerElement || parent.type === 'menubar' && lastOpenChangeReason !== _reasons.REASONS.outsidePress) {
    returnFocus = true;
  }

  // Internal defaults rather than consumer targets, so focus that already moved is respected.
  const dynamicReturnFocus = submenuRootContext?.getReturnElement ?? parentVirtualFocusRef;
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(_floatingUiReact.FloatingFocusManager, {
    context: floatingContext,
    openInteractionType: openMethod,
    modal: isContextMenu,
    disabled: !mounted,
    returnFocus: finalFocus ?? dynamicReturnFocus ?? returnFocus,
    explicitReturnFocus: finalFocus === undefined && dynamicReturnFocus ? false : undefined,
    initialFocus: initialFocus,
    restoreFocus: true,
    getInsideElements: parent.type === undefined ? () => [store.context.beforeTriggerFocusGuardRef.current] : undefined,
    externalTree: parent.type !== 'menubar' ? floatingTreeRoot : undefined,
    previousFocusableElement: activeTriggerElement,
    nextFocusableElement: parent.type === undefined ? store.context.triggerFocusTargetRef : undefined,
    beforeContentFocusGuardRef: store.context.beforeContentFocusGuardRef,
    children: element
  });
});
if (process.env.NODE_ENV !== "production") MenuPopupPlain.displayName = "MenuPopupPlain";
const NO_PARENT_HANDOFF = {
  parentVirtualFocusRef: undefined,
  handleFocus: undefined
};
function useNoParentHandoff() {
  return NO_PARENT_HANDOFF;
}

/**
 * A container for the menu items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
const MenuPopup = exports.MenuPopup = /*#__PURE__*/React.forwardRef(function MenuPopup(props, forwardedRef) {
  const Popup = (0, _MenuFilterContext.useMenuFilterImpl)()?.Popup ?? MenuPopupPlain;
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(Popup, {
    ...props,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuPopup.displayName = "MenuPopup";