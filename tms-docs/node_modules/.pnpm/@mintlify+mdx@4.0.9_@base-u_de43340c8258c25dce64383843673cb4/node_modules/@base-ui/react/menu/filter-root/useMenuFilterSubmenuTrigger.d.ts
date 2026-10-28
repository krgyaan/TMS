import type { MenuFilterItemParams, MenuFilterItemResult } from "./MenuFilterContext.js";
/**
 * Registers a submenu trigger with the parent menu's filter and adapts it to a filterable
 * submenu: the trigger lives inside its own submenu root, but it is an item of the parent list.
 */
export declare function useMenuFilterSubmenuTrigger(params: MenuFilterItemParams): MenuFilterItemResult;