/**
 * Excludes infinite animations, whose finished promises never resolve while they run.
 */
export declare function getFiniteAnimations(element: Element, options?: GetAnimationsOptions): Animation[];