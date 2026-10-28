import * as React from 'react';
import type { MenuFilterRoot } from "../filter-root/MenuFilterRoot.js";
import type { MenuFilterSubmenuRoot } from "../filter-submenu-root/MenuFilterSubmenuRoot.js";
import type { MenuFilterProviderOptions } from "./MenuFilterProviderOptions.js";
/**
 * What `Menu.FilterProvider` hands to the root directly inside it: the filterable root
 * implementations (the provider is their only importer) and the filter props.
 */
export interface MenuFilterProviderContext {
  Root: typeof MenuFilterRoot;
  SubmenuRoot: typeof MenuFilterSubmenuRoot;
  options: MenuFilterProviderOptions;
}
/**
 * Non-null only directly below a provider. The root that consumes it resets it, so a plain
 * `Menu.SubmenuRoot` inside a filterable menu stays plain.
 */
export declare const MenuFilterProviderContext: React.Context<MenuFilterProviderContext | null>;