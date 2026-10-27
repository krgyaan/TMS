'use client';

import * as React from 'react';

/**
 * What `Menu.FilterProvider` hands to the root directly inside it: the filterable root
 * implementations (the provider is their only importer) and the filter props.
 */

/**
 * Non-null only directly below a provider. The root that consumes it resets it, so a plain
 * `Menu.SubmenuRoot` inside a filterable menu stays plain.
 */
export const MenuFilterProviderContext = /*#__PURE__*/React.createContext(null);
if (process.env.NODE_ENV !== "production") MenuFilterProviderContext.displayName = "MenuFilterProviderContext";