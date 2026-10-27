import type * as React from 'react';
import { REASONS } from "../internals/reasons.mjs";
/**
 * The `onItemHighlighted` reason for a list navigation event, matching the event type that the
 * reason promises in its details.
 */
export declare function getHighlightReason(event: Event | React.SyntheticEvent | undefined): typeof REASONS.keyboard | typeof REASONS.pointer | typeof REASONS.none;