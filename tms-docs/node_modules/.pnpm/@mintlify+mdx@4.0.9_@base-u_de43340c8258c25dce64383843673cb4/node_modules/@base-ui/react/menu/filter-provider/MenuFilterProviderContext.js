"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuFilterProviderContext = void 0;
var React = _interopRequireWildcard(require("react"));
/**
 * What `Menu.FilterProvider` hands to the root directly inside it: the filterable root
 * implementations (the provider is their only importer) and the filter props.
 */

/**
 * Non-null only directly below a provider. The root that consumes it resets it, so a plain
 * `Menu.SubmenuRoot` inside a filterable menu stays plain.
 */
const MenuFilterProviderContext = exports.MenuFilterProviderContext = /*#__PURE__*/React.createContext(null);
if (process.env.NODE_ENV !== "production") MenuFilterProviderContext.displayName = "MenuFilterProviderContext";