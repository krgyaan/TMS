export declare function activeElement(doc: Document): Element | null;
export declare function contains(parent?: Element | null, child?: Element | null): boolean;
/**
 * Finds the closest matching element in the composed tree, crossing slots and shadow roots.
 * `:scope` is not supported.
 */
export declare function closest<K extends keyof HTMLElementTagNameMap>(node: Node | null | undefined, selector: K): HTMLElementTagNameMap[K] | null;
export declare function closest<K extends keyof SVGElementTagNameMap>(node: Node | null | undefined, selector: K): SVGElementTagNameMap[K] | null;
export declare function closest<E extends Element = Element>(node: Node | null | undefined, selector: string): E | null;
export declare function getTarget(event: Event): EventTarget | null;