import type { MenuRoot } from "../root/MenuRoot.mjs";
import type { MenuFilterProviderOptions } from "../filter-provider/MenuFilterProviderOptions.mjs";
export type MenuFilterRootProps<Payload = unknown> = MenuRoot.Props<Payload> & MenuFilterProviderOptions;