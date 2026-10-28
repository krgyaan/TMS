import * as React from 'react';
import { unwrapLazyRenderProp } from "./useRenderElement.mjs";
export function resolvePopupLabel(props, activeTriggerElement, activeTriggerId) {
  const render = unwrapLazyRenderProp(props.render);
  const renderedElementProps = /*#__PURE__*/React.isValidElement(render) ? render.props : undefined;
  const ariaLabel = props['aria-label'] ?? renderedElementProps?.['aria-label'];
  let ariaLabelledBy = props['aria-labelledby'] ?? renderedElementProps?.['aria-labelledby'];
  if (ariaLabelledBy == null && !ariaLabel) {
    // Prefer the element's live id: a `render` element's own id wins over the registered one.
    ariaLabelledBy = activeTriggerElement ? activeTriggerElement.id || undefined : activeTriggerId || undefined;
  }
  return ariaLabelledBy;
}