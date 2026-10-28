import type { MenuRoot } from "../root/MenuRoot.js";
import type { MenuFilterProviderOptions } from "../filter-provider/MenuFilterProviderOptions.js";
export type MenuFilterRootProps<Payload = unknown> = MenuRoot.Props<Payload> & MenuFilterProviderOptions;