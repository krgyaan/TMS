"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useMenuItemCommonProps = useMenuItemCommonProps;
var React = _interopRequireWildcard(require("react"));
var _platform = require("@base-ui/utils/platform");
var _reasons = require("../../internals/reasons");
var _ContextMenuRootContext = require("../../context-menu/root/ContextMenuRootContext");
var _MenuRootContext = require("../root/MenuRootContext");
var _dispatchClickWithModifiers = require("../../utils/dispatchClickWithModifiers");
function preventMouseDownDefault(event) {
  event.preventDefault();
}
/**
 * Returns common props shared by all menu item types.
 * This hook extracts the shared logic for id, role, tabIndex, and interaction handlers.
 */
function useMenuItemCommonProps(params) {
  const {
    closeOnClick,
    highlighted,
    id,
    nodeId,
    store,
    typingRef,
    itemRef,
    itemMetadata
  } = params;
  const rootContext = (0, _MenuRootContext.useMenuRootContext)();
  const contextMenuContext = (0, _ContextMenuRootContext.useContextMenuRootContext)(true);

  // A submenu trigger is an item of the parent menu's list, so it follows that list's focus model.
  const isSubmenuTrigger = itemMetadata.type === 'submenu-trigger';
  const virtualFocus = isSubmenuTrigger ? rootContext.parentVirtualFocus : rootContext.virtualFocus;
  const selectionStore = isSubmenuTrigger && rootContext.parent.type === 'menu' ? rootContext.parent.store : rootContext.store;
  const ariaSelected = selectionStore.useState('webkitAriaSelected', highlighted);
  const {
    events: menuEvents
  } = store.useState('floatingTreeRoot');
  const open = store.useState('open');
  const isContextMenu = contextMenuContext !== undefined;
  // `-1` rather than omitting it, which leaves links and buttons in the tab order.
  const tabIndex = !virtualFocus && open && highlighted ? 0 : -1;
  return React.useMemo(() => ({
    id,
    role: 'menuitem',
    tabIndex,
    'aria-selected': ariaSelected,
    // Real focus stays on the input or list that owns virtual navigation.
    onMouseDown: virtualFocus ? preventMouseDownDefault : undefined,
    onKeyDown(event) {
      if (event.key === ' ' && typingRef?.current) {
        event.preventDefault();
      }
    },
    onMouseMove(event) {
      if (!nodeId) {
        return;
      }

      // Inform the floating tree that a menu item within this menu was hovered/moved over
      // so unrelated descendant submenus can be closed.
      menuEvents.emit('itemhover', {
        nodeId,
        target: event.currentTarget
      });
    },
    onClick(event) {
      if (closeOnClick) {
        menuEvents.emit('close', {
          domEvent: event.nativeEvent,
          reason: _reasons.REASONS.itemPress
        });
      }
    },
    onMouseUp(event) {
      if (contextMenuContext) {
        const initialCursorPoint = contextMenuContext.initialCursorPointRef.current;
        contextMenuContext.initialCursorPointRef.current = null;
        if (isContextMenu && initialCursorPoint && Math.abs(event.clientX - initialCursorPoint.x) <= 1 && Math.abs(event.clientY - initialCursorPoint.y) <= 1) {
          return;
        }

        // On non-macOS platforms, this mouseup belongs to the right-click gesture
        // that opened the context menu, so it must not activate an item.
        if (isContextMenu && !_platform.platform.os.mac && event.button === 2) {
          return;
        }
      }
      if (itemRef.current && store.context.allowMouseUpTriggerRef.current && (!isContextMenu || event.button === 2)) {
        // This fires whenever the user clicks on the trigger, moves the cursor, and releases it over the item.
        // We trigger the click and override the `closeOnClick` preference to always close the menu.
        if (itemMetadata.type === 'regular-item') {
          // `detail: 1` and `pointerType: 'mouse'` mark this as a mouse-gesture click so
          // MenuRoot and FloatingFocusManager don't treat it as a keyboard activation.
          (0, _dispatchClickWithModifiers.dispatchClickWithModifiers)(itemRef.current, event, {
            detail: 1,
            pointerType: 'mouse'
          });
        }
      }
    }
  }), [closeOnClick, tabIndex, id, menuEvents, nodeId, store.context.allowMouseUpTriggerRef, typingRef, itemRef, contextMenuContext, isContextMenu, itemMetadata.type, ariaSelected, virtualFocus]);
}