/* eslint-disable @typescript-eslint/no-loop-func */

export function getNodeChildren(nodes, id, onlyOpenChildren = true) {
  const directChildren = nodes.filter(node => node.parentId === id);
  return directChildren.flatMap(child => [...(!onlyOpenChildren || child.context?.open ? [child] : []), ...getNodeChildren(nodes, child.id, onlyOpenChildren)]);
}
export function getNodeAncestors(nodes, id) {
  let allAncestors = [];
  let currentParentId = nodes.find(node => node.id === id)?.parentId;
  while (currentParentId) {
    const currentNode = nodes.find(node => node.id === currentParentId);
    currentParentId = currentNode?.parentId;
    if (currentNode) {
      allAncestors = allAncestors.concat(currentNode);
    }
  }
  return allAncestors;
}