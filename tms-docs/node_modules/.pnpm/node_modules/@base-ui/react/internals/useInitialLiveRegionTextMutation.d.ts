import * as React from 'react';
export declare const INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY = 200;
/**
 * @param present Whether the live region element is currently rendered. Lets a conditionally
 * rendered region re-run the marker each time its element (re)appears with text.
 */
export declare function useInitialLiveRegionTextMutation<T extends HTMLElement>(present?: boolean): React.RefObject<T | null>;