"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getHighlightReason = getHighlightReason;
var _reasons = require("../internals/reasons");
/**
 * The `onItemHighlighted` reason for a list navigation event, matching the event type that the
 * reason promises in its details.
 */
function getHighlightReason(event) {
  if (event == null) {
    return _reasons.REASONS.none;
  }
  if (event.type.startsWith('key')) {
    return _reasons.REASONS.keyboard;
  }
  if (event.type.startsWith('mouse') || event.type.startsWith('pointer')) {
    return _reasons.REASONS.pointer;
  }
  return _reasons.REASONS.none;
}