'use client';

import * as React from 'react';
import { FloatingFocusManager, useHoverFloatingInteraction } from "../../floating-ui-react/index.mjs";
import { useMenuRootContext } from "../root/MenuRootContext.mjs";
import { useMenuPositionerContext } from "../positioner/MenuPositionerContext.mjs";
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { popupTransitionStateMapping } from "../../utils/popupStateMapping.mjs";
import { useOpenChangeComplete } from "../../internals/useOpenChangeComplete.mjs";
import { createChangeEventDetails } from "../../internals/createBaseUIEventDetails.mjs";
import { REASONS } from "../../internals/reasons.mjs";
import { useToolbarRootContext } from "../../toolbar/root/ToolbarRootContext.mjs";
import { COMPOSITE_KEYS } from "../../internals/composite/composite.mjs";
import { getDisabledMountTransitionStyles } from "../../internals/getDisabledMountTransitionStyles.mjs";
import { useMenuSubmenuRootContext } from "../submenu-root/MenuSubmenuRootContext.mjs";
import { useRenderedId } from "../../internals/resolveRenderedId.mjs";
import { resolvePopupLabel } from "../../internals/resolvePopupLabel.mjs";
import { MenuFilterImplContext, useMenuFilterImpl } from "../filter-root/MenuFilterContext.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * @internal
 */
export const MenuPopupPlain = /*#__PURE__*/React.forwardRef(function MenuPopupPlain(componentProps, forwardedRef) {
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
  } = useMenuRootContext();
  const inheritedSubmenuRootContext = useMenuSubmenuRootContext();
  const {
    side,
    align
  } = useMenuPositionerContext();
  const insideToolbar = useToolbarRootContext(true) != null;
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
  const [id, registerIdRef] = useRenderedId(componentProps, defaultFloatingId, setRenderedFloatingId);
  const ariaLabelledBy = resolvePopupLabel(componentProps, activeTriggerElement, activeTriggerId);

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
  useOpenChangeComplete({
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
      store.setOpen(false, createChangeEventDetails(event.reason, event.domEvent));
    }
    floatingTreeRoot.events.on('close', handleClose);
    return () => {
      floatingTreeRoot.events.off('close', handleClose);
    };
  }, [floatingTreeRoot.events, store]);
  useHoverFloatingInteraction(floatingContext, {
    enabled: hoverEnabled && !disabled && !isContextMenu && parent.type !== 'menubar',
    closeDelay
  });
  const setPopupElement = store.useStateSetter('popupElement');

  // Only a menu under a filter root bundles the handoff to a filterable parent. Whether one is
  // above is fixed for a mounted popup, so the hook doesn't change between renders.
  const useParentHandoff = React.useContext(MenuFilterImplContext)?.useParentHandoff ?? useNoParentHandoff;
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
  const element = useRenderElement('div', componentProps, {
    state,
    ref: [forwardedRef, store.context.popupRef, setPopupElement, registerIdRef],
    stateAttributesMapping: popupTransitionStateMapping,
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
        if (insideToolbar && COMPOSITE_KEYS.has(event.key)) {
          event.stopPropagation();
        }
      },
      onFocus: handleFocus
    }, getDisabledMountTransitionStyles(transitionStatus), elementProps, {
      'data-rootownerid': rootId
    }]
  });
  let returnFocus = parent.type === undefined || isContextMenu;
  if (activeTriggerElement || parent.type === 'menubar' && lastOpenChangeReason !== REASONS.outsidePress) {
    returnFocus = true;
  }

  // Internal defaults rather than consumer targets, so focus that already moved is respected.
  const dynamicReturnFocus = submenuRootContext?.getReturnElement ?? parentVirtualFocusRef;
  return /*#__PURE__*/_jsx(FloatingFocusManager, {
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
export const MenuPopup = /*#__PURE__*/React.forwardRef(function MenuPopup(props, forwardedRef) {
  const Popup = useMenuFilterImpl()?.Popup ?? MenuPopupPlain;
  return /*#__PURE__*/_jsx(Popup, {
    ...props,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuPopup.displayName = "MenuPopup";