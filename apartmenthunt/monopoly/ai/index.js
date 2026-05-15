'use strict';

import { legacyStrategy } from './legacy.js';
import { greedyLandGrabStrategy } from './greedy.js';

export const AI_VARIANT_REGULAR_JOE = 'regular_joe';
export const AI_VARIANT_GREEDY_LAND_GRAB = 'greedy_land_grab';

export const AI_VARIANT_IDS = [AI_VARIANT_REGULAR_JOE, AI_VARIANT_GREEDY_LAND_GRAB];

export const AI_VARIANT_LABELS = {
  [AI_VARIANT_REGULAR_JOE]: 'Regular Joe',
  [AI_VARIANT_GREEDY_LAND_GRAB]: 'Greedy land grab',
};

export function normalizeAiVariant(raw) {
  if (raw === AI_VARIANT_GREEDY_LAND_GRAB || raw === AI_VARIANT_REGULAR_JOE) return raw;
  if (raw === 'legacy' || raw === 'greedy') return raw === 'greedy' ? AI_VARIANT_GREEDY_LAND_GRAB : AI_VARIANT_REGULAR_JOE;
  return AI_VARIANT_REGULAR_JOE;
}

export function getStrategy(variant) {
  const v = normalizeAiVariant(variant);
  return v === AI_VARIANT_GREEDY_LAND_GRAB ? greedyLandGrabStrategy : legacyStrategy;
}
