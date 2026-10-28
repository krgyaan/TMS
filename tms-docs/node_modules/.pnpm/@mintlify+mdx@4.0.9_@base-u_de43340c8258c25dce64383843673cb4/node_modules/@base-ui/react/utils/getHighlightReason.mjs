import { REASONS } from "../internals/reasons.mjs";

/**
 * The `onItemHighlighted` reason for a list navigation event, matching the event type that the
 * reason promises in its details.
 */
export function getHighlightReason(event) {
  if (event == null) {
    return REASONS.none;
  }
  if (event.type.startsWith('key')) {
    return REASONS.keyboard;
  }
  if (event.type.startsWith('mouse') || event.type.startsWith('pointer')) {
    return REASONS.pointer;
  }
  return REASONS.none;
}