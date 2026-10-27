/**
 * Keyboard and assistive-technology activations produce `detail === 0` clicks; mouse-gesture
 * clicks (including the synthesized drag-release click from `useMenuItemCommonProps`) carry
 * `detail >= 1`.
 */
export declare function isKeyboardClick(reason: string | null, event: Event | undefined): boolean;
/**
 * Whether a menu opens from the keyboard, which lands focus in the popup. Arrow keys report
 * `list-navigation`; Enter and Space dispatch a click carrying no pointer detail.
 */
export declare function isKeyboardOpen(reason: string | null, event: Event | undefined): boolean;