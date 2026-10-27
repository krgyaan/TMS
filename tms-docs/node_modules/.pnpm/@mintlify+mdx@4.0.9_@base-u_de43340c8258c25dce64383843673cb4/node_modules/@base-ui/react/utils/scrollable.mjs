import { getComputedStyle, getParentNode, isElement, isHTMLElement, isLastTraversableNode } from '@floating-ui/utils/dom';
export function isScrollableY(element, allowOverflowIntent = false) {
  const {
    overflowY
  } = getComputedStyle(element);
  if (overflowY !== 'auto' && overflowY !== 'scroll') {
    return false;
  }
  // When `allowOverflowIntent` is true, a container that overflows only once extra space is
  // added (e.g. drawer keyboard scroll slack) still counts, as long as it has layout size on
  // the axis.
  return allowOverflowIntent ? element.clientHeight > 0 : element.scrollHeight > element.clientHeight;
}
export function isScrollableX(element, allowOverflowIntent = false) {
  const {
    overflowX
  } = getComputedStyle(element);
  if (overflowX !== 'auto' && overflowX !== 'scroll') {
    return false;
  }
  return allowOverflowIntent ? element.clientWidth > 0 : element.scrollWidth > element.clientWidth;
}
export function isScrollable(element, axis, allowOverflowIntent = false) {
  return axis === 'vertical' ? isScrollableY(element, allowOverflowIntent) : isScrollableX(element, allowOverflowIntent);
}
export function findScrollableAncestor(target, root, axis, allowOverflowIntent = false) {
  // `getParentNode` crosses shadow boundaries (and slots), so a target inside a shadow root
  // still walks up to scrollable ancestors in the light DOM. Non-HTML targets (SVG, MathML)
  // can't scroll, but their HTML ancestors can.
  let node = target;
  while (isElement(node) && node !== root && !isLastTraversableNode(node)) {
    if (isHTMLElement(node) && isScrollable(node, axis, allowOverflowIntent)) {
      return node;
    }
    node = getParentNode(node);
  }
  return null;
}
export function findScrollableTouchTarget(target, root, axis = 'vertical', allowOverflowIntent = false) {
  return findScrollableAncestor(target, root, axis, allowOverflowIntent) ?? (isScrollable(root, axis, allowOverflowIntent) ? root : null);
}