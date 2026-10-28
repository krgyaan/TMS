import * as React from 'react';
import type { MenuPopupProps } from "../popup/MenuPopup.mjs";
/**
 * A container for the filter input and item list.
 * Renders a `<div>` element with a `dialog` role.
 */
export declare const MenuFilterPopup: React.ForwardRefExoticComponent<Omit<MenuPopupProps, "ref"> & React.RefAttributes<HTMLDivElement>>;