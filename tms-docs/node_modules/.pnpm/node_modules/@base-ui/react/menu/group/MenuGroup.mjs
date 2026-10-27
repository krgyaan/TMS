'use client';

import * as React from 'react';
import { useMenuFilterImpl } from "../filter-root/MenuFilterContext.mjs";
import { useRenderElement } from "../../internals/useRenderElement.mjs";
import { MenuGroupContext } from "./MenuGroupContext.mjs";

/**
 * @internal
 */
import { jsx as _jsx } from "react/jsx-runtime";
export const MenuGroupPlain = /*#__PURE__*/React.forwardRef(function MenuGroupPlain(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    ...elementProps
  } = componentProps;
  const [labelId, setLabelId] = React.useState(undefined);
  const element = useRenderElement('div', componentProps, {
    ref: forwardedRef,
    props: {
      role: 'group',
      'aria-labelledby': labelId,
      ...elementProps
    }
  });
  return /*#__PURE__*/_jsx(MenuGroupContext.Provider, {
    value: setLabelId,
    children: element
  });
});

/**
 * Groups related menu items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
if (process.env.NODE_ENV !== "production") MenuGroupPlain.displayName = "MenuGroupPlain";
export const MenuGroup = /*#__PURE__*/React.forwardRef(function MenuGroup(props, forwardedRef) {
  const Group = useMenuFilterImpl()?.Group ?? MenuGroupPlain;
  return /*#__PURE__*/_jsx(Group, {
    ...props,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuGroup.displayName = "MenuGroup";