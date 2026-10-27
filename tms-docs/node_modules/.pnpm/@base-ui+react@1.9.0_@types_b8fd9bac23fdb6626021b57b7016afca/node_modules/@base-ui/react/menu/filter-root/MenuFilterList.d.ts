import * as React from 'react';
/**
 * The list of a filterable menu: it takes the `menu` role while the popup is a dialog holding
 * the input, and it forwards keys that land on it to the input.
 */
export declare const MenuFilterList: React.ForwardRefExoticComponent<Omit<import("../index.js").MenuListProps, "ref"> & React.RefAttributes<HTMLDivElement>>;