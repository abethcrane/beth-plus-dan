'use strict';

import { legacyStrategy } from './legacy.js';
import { yesManStrategy } from './greedy.js';

export const AI_VARIANT_REGULAR_JOE = 'regular_joe';
export const AI_VARIANT_YES_MAN = 'yes_man';

export const AI_VARIANT_IDS = [AI_VARIANT_REGULAR_JOE, AI_VARIANT_YES_MAN];

export const DIFFICULTY_SEGMENTS = {
  easy: { variant: AI_VARIANT_REGULAR_JOE, label: 'Easy', subtitle: 'Regular Joe' },
  hard: { variant: AI_VARIANT_YES_MAN, label: 'Hard', subtitle: 'Yes Man' },
};

export function normalizeAiVariant(raw) {
  if (raw === AI_VARIANT_YES_MAN || raw === AI_VARIANT_REGULAR_JOE) return raw;
  if (raw === 'legacy' || raw === 'greedy' || raw === 'greedy_land_grab')
    return raw === 'legacy' ? AI_VARIANT_REGULAR_JOE : AI_VARIANT_YES_MAN;
  return AI_VARIANT_REGULAR_JOE;
}

export function getStrategy(variant) {
  const v = normalizeAiVariant(variant);
  return v === AI_VARIANT_YES_MAN ? yesManStrategy : legacyStrategy;
}
