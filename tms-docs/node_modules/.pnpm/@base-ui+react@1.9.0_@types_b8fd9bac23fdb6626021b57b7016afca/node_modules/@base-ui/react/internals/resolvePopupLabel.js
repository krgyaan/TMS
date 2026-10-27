"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolvePopupLabel = resolvePopupLabel;
var React = _interopRequireWildcard(require("react"));
var _useRenderElement = require("./useRenderElement");
function resolvePopupLabel(props, activeTriggerElement, activeTriggerId) {
  const render = (0, _useRenderElement.unwrapLazyRenderProp)(props.render);
  const renderedElementProps = /*#__PURE__*/React.isValidElement(render) ? render.props : undefined;
  const ariaLabel = props['aria-label'] ?? renderedElementProps?.['aria-label'];
  let ariaLabelledBy = props['aria-labelledby'] ?? renderedElementProps?.['aria-labelledby'];
  if (ariaLabelledBy == null && !ariaLabel) {
    // Prefer the element's live id: a `render` element's own id wins over the registered one.
    ariaLabelledBy = activeTriggerElement ? activeTriggerElement.id || undefined : activeTriggerId || undefined;
  }
  return ariaLabelledBy;
}