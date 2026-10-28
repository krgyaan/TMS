'use client';

import * as React from 'react';
import { useMenuFilterPopup } from "./useMenuFilterPopup.mjs";
import { MenuPopupPlain } from "../popup/MenuPopup.mjs";
import { useMenuRootContext } from "../root/MenuRootContext.mjs";
import { mergeProps } from "../../merge-props/index.mjs";
import { REASONS } from "../../internals/reasons.mjs";

/**
 * A container for the filter input and item list.
 * Renders a `<div>` element with a `dialog` role.
 */
import { jsx as _jsx } from "react/jsx-runtime";
export const MenuFilterPopup = /*#__PURE__*/React.forwardRef(function MenuFilterPopup(props, forwardedRef) {
  const {
    store,
    orientation
  } = useMenuRootContext();
  const open = store.useState('open');
  const parent = store.useState('parent');
  const openMethod = store.useState('openMethod');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const interactionProps = useMenuFilterPopup(orientation);
  const openedByHover = open && lastOpenChangeReason === REASONS.triggerHover;
  const mayFocusInput = parent.type !== 'menu' || open && (openMethod === 'keyboard' || lastOpenChangeReason === REASONS.listNavigation || lastOpenChangeReason === REASONS.triggerHover || lastOpenChangeReason === REASONS.triggerPress);

  // The input holds real focus; the popup is never the focus target.
  let initialFocus = false;
  if (mayFocusInput) {
    initialFocus = () => {
      // A tap would raise the on-screen keyboard, but a screen reader press (such as an iOS
      // VoiceOver double-tap) still reports a touch and needs the input focused.
      const touchOpen = (openMethod === 'touch' || openMethod === 'pen') && !store.context.virtualPress;
      if (openedByHover || touchOpen) {
        return false;
      }
      return store.context.virtualFocusRef?.current ?? false;
    };
  }
  const popupProps = mergeProps(interactionProps, props);
  return /*#__PURE__*/_jsx(MenuPopupPlain, {
    ...popupProps,
    role: "dialog",
    initialFocus: initialFocus,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuFilterPopup.displayName = "MenuFilterPopup";