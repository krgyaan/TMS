"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getFiniteAnimations = getFiniteAnimations;
/**
 * Excludes infinite animations, whose finished promises never resolve while they run.
 */
function getFiniteAnimations(element, options) {
  return element.getAnimations(options).filter(animation => {
    const timing = animation.effect?.getTiming();
    return timing?.duration !== Infinity && timing?.iterations !== Infinity;
  });
}