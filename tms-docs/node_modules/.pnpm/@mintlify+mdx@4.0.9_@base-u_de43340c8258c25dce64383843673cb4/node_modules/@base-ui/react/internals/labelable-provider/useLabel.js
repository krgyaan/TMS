"use strict";
'use client';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.focusElementWithVisible = focusElementWithVisible;
exports.getControlById = getControlById;
exports.useLabel = useLabel;
var _dom = require("@floating-ui/utils/dom");
var _owner = require("@base-ui/utils/owner");
var _useStableCallback = require("@base-ui/utils/useStableCallback");
var _utils = require("../../floating-ui-react/utils");
var _useRegisteredLabelId = require("../../utils/useRegisteredLabelId");
var _LabelableContext = require("./LabelableContext");
function useLabel(params = {}) {
  const {
    id: idProp,
    fallbackControlId,
    native = false,
    setLabelId: setLabelIdProp,
    focusControl: focusControlProp
  } = params;
  const {
    controlId: contextControlId,
    setLabelId: setContextLabelId
  } = (0, _LabelableContext.useLabelableContext)();
  const syncLabelId = (0, _useStableCallback.useStableCallback)(nextLabelId => {
    setContextLabelId(nextLabelId);
    setLabelIdProp?.(nextLabelId);
  });
  const id = (0, _useRegisteredLabelId.useRegisteredLabelId)(idProp, syncLabelId);
  const resolvedControlId = contextControlId ?? fallbackControlId;
  function focusControl(event) {
    if (focusControlProp) {
      focusControlProp(event, resolvedControlId);
      return;
    }
    if (!resolvedControlId) {
      return;
    }
    const controlElement = getControlById(event.currentTarget, resolvedControlId);
    if ((0, _dom.isHTMLElement)(controlElement)) {
      focusElementWithVisible(controlElement);
    }
  }
  function handleInteraction(event) {
    const target = (0, _utils.getTarget)(event.nativeEvent);
    if ((0, _utils.closest)(target, 'button,input,select,textarea')) {
      return;
    }

    // Prevent text selection when double clicking label.
    if (!event.defaultPrevented && event.detail > 1) {
      event.preventDefault();
    }
    if (native) {
      return;
    }
    focusControl(event);
  }
  return native ? {
    id,
    htmlFor: resolvedControlId,
    onMouseDown: handleInteraction
  } : {
    id,
    onClick: handleInteraction,
    onPointerDown(event) {
      event.preventDefault();
    }
  };
}
function getControlById(label, id) {
  let root = label.getRootNode();
  while ((0, _dom.isShadowRoot)(root)) {
    const element = root.getElementById(id);
    if (element) {
      return element;
    }
    root = root.host.getRootNode();
  }
  return (0, _owner.ownerDocument)(label).getElementById(id);
}
function focusElementWithVisible(element) {
  element.focus({
    // Available from Chrome 144+ (January 2026).
    // Safari and Firefox already support it.
    focusVisible: true
  });
}