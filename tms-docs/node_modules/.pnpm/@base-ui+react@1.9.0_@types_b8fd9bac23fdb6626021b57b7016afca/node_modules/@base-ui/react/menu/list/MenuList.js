"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MenuList = void 0;
var React = _interopRequireWildcard(require("react"));
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _MenuFilterContext = require("../filter-root/MenuFilterContext");
var _MenuRootContext = require("../root/MenuRootContext");
var _useRenderElement = require("../../internals/useRenderElement");
var _useBaseUiId = require("../../internals/useBaseUiId");
var _resolvePopupLabel = require("../../internals/resolvePopupLabel");
var _jsxRuntime = require("react/jsx-runtime");
const MenuListPlain = /*#__PURE__*/React.forwardRef(function MenuListPlain(componentProps, forwardedRef) {
  const {
    render,
    className,
    style,
    id: idProp,
    ...elementProps
  } = componentProps;
  const {
    store,
    orientation
  } = (0, _MenuRootContext.useMenuRootContext)();
  const activeTriggerId = store.useState('activeTriggerId');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const setListElement = store.useStateSetter('listElement');
  const id = (0, _useBaseUiId.useBaseUiId)(idProp);

  // The trigger reads `aria-controls` off the stored element, which an id change alone leaves in
  // place, so subscribers are told to read it again. Mounting publishes the element itself.
  const renderedIdRef = React.useRef(id);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    if (renderedIdRef.current !== id) {
      renderedIdRef.current = id;
      store.notifyAll();
    }
  }, [id, store]);
  const ariaLabelledBy = (0, _resolvePopupLabel.resolvePopupLabel)(componentProps, activeTriggerElement, activeTriggerId);
  return (0, _useRenderElement.useRenderElement)('div', componentProps, {
    ref: [forwardedRef, setListElement],
    props: [{
      id,
      role: 'menu',
      // The popup focuses the list on a pointer open in place of itself.
      tabIndex: -1,
      // `menu` is implicitly vertical, so only the non-default value needs to be rendered.
      'aria-orientation': orientation === 'horizontal' ? 'horizontal' : undefined,
      'aria-labelledby': ariaLabelledBy
    }, elementProps]
  });
});

/**
 * Groups menu items so other content, such as a filter input, can share the popup.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
if (process.env.NODE_ENV !== "production") MenuListPlain.displayName = "MenuListPlain";
const MenuList = exports.MenuList = /*#__PURE__*/React.forwardRef(function MenuList(props, forwardedRef) {
  const List = (0, _MenuFilterContext.useMenuFilterImpl)()?.List ?? MenuListPlain;
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(List, {
    ...props,
    ref: forwardedRef
  });
});
if (process.env.NODE_ENV !== "production") MenuList.displayName = "MenuList";