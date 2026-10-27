"use strict";
'use client';

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard").default;
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useBaseUIFloating = useBaseUIFloating;
var React = _interopRequireWildcard(require("react"));
var _useIsoLayoutEffect = require("@base-ui/utils/useIsoLayoutEffect");
var _reactDom = require("@floating-ui/react-dom");
var _dom = require("@floating-ui/utils/dom");
var _FloatingTree = require("../components/FloatingTree");
/**
 * Provides data to position a floating element and context to add interactions.
 * The caller supplies the root store, which owns the reference and floating elements.
 * @see https://floating-ui.com/docs/useFloating
 */
function useBaseUIFloating(options) {
  const {
    nodeId,
    externalTree,
    rootContext: store
  } = options;
  const referenceElement = store.useState('referenceElement');
  const floatingElement = store.useState('floatingElement');
  const domReferenceElement = store.useState('domReferenceElement');
  const open = store.useState('open');
  const floatingId = store.useState('floatingId');
  const [positionReference, setPositionReferenceRaw] = React.useState(null);
  const domReferenceRef = React.useRef(null);
  const tree = (0, _FloatingTree.useFloatingTree)(externalTree);
  const storeElements = React.useMemo(() => ({
    reference: referenceElement,
    floating: floatingElement,
    domReference: domReferenceElement
  }), [referenceElement, floatingElement, domReferenceElement]);
  const position = (0, _reactDom.useFloating)({
    ...options,
    elements: {
      ...storeElements,
      ...(positionReference && {
        reference: positionReference
      })
    }
  });
  const setPositionReference = React.useCallback(node => {
    const computedPositionReference = (0, _dom.isElement)(node) ? {
      getBoundingClientRect: () => node.getBoundingClientRect(),
      getClientRects: () => node.getClientRects(),
      contextElement: node
    } : node;
    // Store the positionReference in state if the DOM reference is specified externally via the
    // `elements.reference` option. This ensures that it won't be overridden on future renders.
    setPositionReferenceRaw(computedPositionReference);
    position.refs.setReference(computedPositionReference);
  }, [position.refs]);
  const refs = React.useMemo(() => ({
    ...position.refs,
    setPositionReference,
    domReference: domReferenceRef
  }), [position.refs, setPositionReference]);
  const elements = React.useMemo(() => ({
    ...position.elements,
    domReference: domReferenceElement
  }), [position.elements, domReferenceElement]);
  const context = React.useMemo(() => ({
    ...position,
    dataRef: store.context.dataRef,
    open,
    onOpenChange: store.setOpen,
    events: store.context.events,
    floatingId,
    refs,
    elements,
    nodeId,
    rootStore: store
  }), [position, refs, elements, nodeId, store, open, floatingId]);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    if (domReferenceElement) {
      domReferenceRef.current = domReferenceElement;
    }
  }, [domReferenceElement]);
  (0, _useIsoLayoutEffect.useIsoLayoutEffect)(() => {
    store.context.dataRef.current.floatingContext = context;
    const node = tree?.nodesRef.current.find(n => n.id === nodeId);
    if (node) {
      node.context = context;
    }
  });
  return React.useMemo(() => ({
    ...position,
    context,
    refs,
    elements,
    rootStore: store
  }), [position, refs, elements, context, store]);
}