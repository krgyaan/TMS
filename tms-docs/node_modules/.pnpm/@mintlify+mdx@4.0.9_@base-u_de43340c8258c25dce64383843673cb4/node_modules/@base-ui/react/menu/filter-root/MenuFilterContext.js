"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuFilterImplContext = void 0;
exports.useMenuFilterImpl = useMenuFilterImpl;
exports.useMenuFilterItem = useMenuFilterItem;
exports.useMenuFilterPart = useMenuFilterPart;
var _formatErrorMessage2 = _interopRequireDefault(require("@base-ui/utils/formatErrorMessage"));
var React = _interopRequireWildcard(require("react"));
var _useMergedRefs = require("@base-ui/utils/useMergedRefs");
var _MenuRootContext = require("../root/MenuRootContext");
/**
 * The filter implementation that a filterable root hands to the parts below it. Only the roots
 * `Menu.FilterProvider` renders import it, so a plain menu never bundles it. Parts whose whole
 * structure differs are swapped as components; parts that only register with the filter call an
 * injected hook, so a menu that never renders them doesn't bundle a second implementation.
 */

/** Static below a filter root: the implementation never changes, so subscribers never re-render. */
const MenuFilterImplContext = exports.MenuFilterImplContext = /*#__PURE__*/React.createContext(null);
if (process.env.NODE_ENV !== "production") MenuFilterImplContext.displayName = "MenuFilterImplContext";
/**
 * The filter implementation when the menu this part belongs to is filterable, otherwise `null`.
 * `virtualFocus` marks a filter root; a plain `Menu.Root` never sets it. The result is fixed for
 * a mounted part: a filter root can't appear above it without remounting it.
 */
function useMenuFilterImpl(scope = 'root') {
  const impl = React.useContext(MenuFilterImplContext);
  const root = React.useContext(_MenuRootContext.MenuRootContext);
  if (impl === null || root === undefined) {
    return null;
  }
  const filterable = scope === 'submenu-trigger' ? root.virtualFocus || root.parentVirtualFocus : root.virtualFocus;
  return filterable ? impl : null;
}

/**
 * Throws unless the menu this part renders in is filterable, naming the part and the provider.
 */
function useMenuFilterPart(part) {
  if (useMenuFilterImpl() === null) {
    throw new Error(process.env.NODE_ENV !== "production" ? `Base UI: <Menu.${part}> must be placed in a menu wrapped in <Menu.FilterProvider>. ` + 'It reads the filter query and the matching items from the provider, which a plain menu ' + 'does not have. Wrap the <Menu.Root> or <Menu.SubmenuRoot> it belongs to in ' + '<Menu.FilterProvider>. See https://base-ui.com/react/components/menu#filtering' : (0, _formatErrorMessage2.default)(104, part));
  }
}
const UNFILTERED = {
  visible: true,
  ref: null
};
function useUnfilteredItem() {
  return UNFILTERED;
}

/**
 * Registers an item part with the filter of the menu it belongs to. A plain menu's items are
 * always visible.
 */
function useMenuFilterItem(props, forwardedRef, scope = 'root') {
  const impl = useMenuFilterImpl(scope);
  const useItem = (scope === 'submenu-trigger' ? impl?.useSubmenuTrigger : impl?.useItem) ?? useUnfilteredItem;
  const item = useItem({
    label: props.label,
    children: props.children,
    render: props.render
  });
  const ref = (0, _useMergedRefs.useMergedRefs)(forwardedRef, item.ref);
  return {
    visible: item.visible,
    ref,
    props: item.props
  };
}