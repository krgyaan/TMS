'use client';

import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useMenuFilterImpl } from "../filter-root/MenuFilterContext.mjs";
import { useMenuRootContext } from "../root/MenuRootContext.mjs";
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { useBaseUiId } from "../../internals/useBaseUiId.mjs";
import { resolvePopupLabel } from "../../internals/resolvePopupLabel.mjs";
import { jsx as _jsx } from "react/jsx-runtime";
const MenuListPlain = /*#__PURE__*/React.forwardRef(function MenuListPlain(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    id: idProp,
    ...elementProps
  } = componentProps;
  const {
    store,
    orientation
  } = useMenuRootContext();
  const activeTriggerId = store.useState('activeTriggerId');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const setListElement = store.useStateSetter('listElement');
  const id = useBaseUiId(idProp);

  // The trigger reads `aria-controls` off the stored element, which an id change alone leaves in
  // place, so subscribers are told to read it again. Mounting publishes the element itself.
  const renderedIdRef = React.useRef(id);
  useIsoLayoutEffect(() => {
    if (renderedIdRef.current !== id) {
      renderedIdRef.current = id;
      store.notifyAll();
    }
  }, [id, store]);
  const ariaLabelledBy = resolvePopupLabel(componentProps, activeTriggerElement, activeTriggerId);
  return useRenderElement('div', componentProps, {
    ref: [forwardedRef, setListElement],
    props: [{
      id,
      role: 'menu',
      // The popup focuses the list on a pointer open in place of itself.
      tabIndex: -1,
      // `menu` is implicitly vertical, so only the non-default value needs to be rendered.
      'aria-orientation': orientation === 'horizontal' ? 'horizontal' : undefined,
      'aria-labelledby': ariaLabelledBy
    }, elementProps]
  });
});

/**
 * Groups menu items so other content, such as a filter input, can share the popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
if (process.env.NODE_ENV !== "production") MenuListPlain.displayName = "MenuListPlain";
export const MenuList = /*#__PURE__*/React.forwardRef(function MenuList(props, forwardedRef) {
  const List = useMenuFilterImpl()?.List ?? MenuListPlain;
  return /*#__PURE__*/_jsx(List, {
    ...props,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuList.displayName = "MenuList";