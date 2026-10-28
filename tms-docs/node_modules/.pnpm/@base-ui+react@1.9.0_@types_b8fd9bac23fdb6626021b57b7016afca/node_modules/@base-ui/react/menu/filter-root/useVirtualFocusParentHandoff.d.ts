import type { MenuParent } from "../root/MenuRoot.js";
import type { MenuStore } from "../store/MenuStore.js";
import type { MenuFilterParentHandoff } from "./MenuFilterContext.js";
/**
 * A plain submenu whose parent is filterable. The parent keeps real focus on its input, so its
 * trigger never blurs and its return focus waits for this popup's exit animation. The submenu
 * hands focus and the parent's highlight back itself.
 */
export declare function useVirtualFocusParentHandoff(store: MenuStore<unknown>, parent: MenuParent, open: boolean, virtualFocus: boolean): MenuFilterParentHandoff;