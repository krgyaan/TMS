export type ScrollAxis = 'horizontal' | 'vertical';
export declare function isScrollableY(element: HTMLElement, allowOverflowIntent?: boolean): boolean;
export declare function isScrollableX(element: HTMLElement, allowOverflowIntent?: boolean): boolean;
export declare function isScrollable(element: HTMLElement, axis: ScrollAxis, allowOverflowIntent?: boolean): boolean;
export declare function findScrollableAncestor(target: EventTarget | null, root: HTMLElement, axis: ScrollAxis, allowOverflowIntent?: boolean): HTMLElement | null;
export declare function findScrollableTouchTarget(target: EventTarget | null, root: HTMLElement, axis?: ScrollAxis, allowOverflowIntent?: boolean): HTMLElement | null;