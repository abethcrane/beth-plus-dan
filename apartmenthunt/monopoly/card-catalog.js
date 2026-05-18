'use strict';

/**
 * Card copy via skeleton + drawable deck helpers.
 * Resolver reads CARD_EFFECT_BY_ID from card-effects-registry.js separately to avoid cyclic imports.
 */

import { CARD_DECKS_SKELETON } from './card-decks-skeleton.js';

/** UK-analog squares on BOARD (classic geometry). */
export const CARD_BOARD = {
  payday: 0,
  groveStreetOrTrafalgarAnalog: 23,
  catalpaMayfairAnalog: 39,
  morganPallMallAnalog: 11,
  kingsCrossAnalogGTrain: 5,
};

/** Dice × (£10)×25 when Chance pulls you onto a deed utility (“ten times dice”). */
export const CHANCE_UTILITY_RENT_PER_DICE = 10 * 25;

const _SK_BY_ID = new Map();

for (const row of CARD_DECKS_SKELETON.communityChest) {
  _SK_BY_ID.set(row.id, row);
}
for (const row of CARD_DECKS_SKELETON.chance) {
  _SK_BY_ID.set(row.id, row);
}

/** @param {string} cardId
 * @param {string|null} flavorKey */
export function getCardFaceText(cardId, flavorKey) {
  const sk = _SK_BY_ID.get(cardId);
  if (!sk) return '';
  if (sk.globalOnly || !flavorKey) return sk.defaultBody;
  const sub = sk.squareBodies?.[flavorKey];
  return sub != null ? sub : sk.defaultBody;
}

export const CARD_ID_COMMUNITY_CHEST = /** @type {const} */ ([
  'cc_advance_go',
  'cc_bank_error',
  'cc_doctor_fee',
  'cc_sale_of_stock',
  'cc_goojf',
  'cc_go_jail',
  'cc_holiday_fund',
  'cc_income_tax_refund',
  'cc_birthday',
  'cc_life_insurance',
  'cc_hospital',
  'cc_school_fees',
  'cc_consultancy',
  'cc_street_repairs',
  'cc_second_prize',
  'cc_inherit',
]);

export const CARD_ID_CHANCE = /** @type {const} */ ([
  'ch_advance_go',
  'ch_advance_trafalgar',
  'ch_advance_mayfair',
  'ch_advance_pall_mall',
  'ch_nearest_transit_a',
  'ch_nearest_transit_b',
  'ch_nearest_utility',
  'ch_bank_dividend',
  'ch_goojf',
  'ch_go_back_three',
  'ch_go_jail',
  'ch_general_repairs',
  'ch_speeding_fine',
  'ch_trip_kings_cross',
  'ch_chairman',
  'ch_building_loan',
]);

export const GOOJF_CARD_IDS = Object.freeze({
  cc_goojf: 'communityChest',
  ch_goojf: 'chance',
});

export function isGoojfCard(id) {
  return id === 'cc_goojf' || id === 'ch_goojf';
}

/** @typedef {{ chance: boolean, communityChest: boolean }} _Slot */

/**
 * @param {readonly string[]} baseOrder
 * @param {{ human: _Slot, ai: _Slot }} held
 */
export function buildDrawableDeck(baseOrder, held) {
  return baseOrder.filter((id) => {
    if (id === 'cc_goojf')
      return !held.human.communityChest && !held.ai.communityChest;
    if (id === 'ch_goojf') return !held.human.chance && !held.ai.chance;
    return true;
  });
}
