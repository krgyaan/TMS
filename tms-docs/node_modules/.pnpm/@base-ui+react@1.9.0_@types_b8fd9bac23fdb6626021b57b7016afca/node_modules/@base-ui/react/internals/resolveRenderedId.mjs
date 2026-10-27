import * as React from 'react';
import { unwrapLazyRenderProp } from "./useRenderElement.mjs";
/**
 * Resolves an element's id using the same precedence as `useRenderElement`.
 * Returns `''` when the element renders with an explicitly empty id, which consumers must treat
 * as "no id" rather than falling back to the generated one, so ARIA relationships never reference
 * an id no element carries. Render callbacks are opaque and are expected to use the id passed to
 * them.
 *
 * @internal
 */
export function resolveRenderedId(props, fallbackId) {
  const render = unwrapLazyRenderProp(props.render);
  if (/*#__PURE__*/React.isValidElement(render)) {
    const renderProps = render.props;
    if (Object.hasOwn(renderProps, 'id')) {
      return renderProps.id ?? '';
    }
  }
  return props.id ?? fallbackId;
}

/**
 * Resolves the element's id and returns a ref that publishes it to the owner while mounted.
 * A generated fallback is never published as an override, so removing an explicit id lets the
 * element return to the generated one.
 *
 * @internal
 */
export function useRenderedId(props, defaultId, setId) {
  const id = resolveRenderedId(props, defaultId);
  const registeredId = id === defaultId ? undefined : id;
  const ref = React.useCallback(element => setId?.(element ? registeredId : undefined), [registeredId, setId]);
  return [id, ref];
}