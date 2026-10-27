"use strict";
'use client';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useSyncedFloatingRootContext = useSyncedFloatingRootContext;
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _dom = require("@floating-ui/utils/dom");
/**
 * Narrowed to the store members this hook uses so consumers do not need to provide
 * unrelated store capabilities.
 */

/**
 * Keeps the provided FloatingRootStore in sync with the provided PopupStore.
 */
function useSyncedFloatingRootContext(options) {
  const {
    popupStore,
    treatPopupAsFloatingElement = false,
    floatingRootContext: store,
    floatingId,
    nested,
    onOpenChange
  } = options;
  const open = popupStore.useState('open');
  const referenceElement = popupStore.useState('activeTriggerElement');
  const floatingElement = popupStore.useState(treatPopupAsFloatingElement ? 'popupElement' : 'positionerElement');
  const handleOpenChange = onOpenChange;
  popupStore.useSyncedValue('floatingId', floatingId);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    const valuesToSync = {
      open,
      floatingId,
      referenceElement,
      floatingElement
    };
    if ((0, _dom.isElement)(referenceElement)) {
      valuesToSync.domReferenceElement = referenceElement;
    }
    if (store.state.positionReference === store.state.referenceElement) {
      valuesToSync.positionReference = referenceElement;
    }
    store.update(valuesToSync);
  }, [open, floatingId, referenceElement, floatingElement, store]);

  // Keep non-reactive context values fresh for interactions that call `store.setOpen`.
  store.context.onOpenChange = handleOpenChange;
  store.context.nested = nested;
  return store;
}