'use strict';

import { CARD_BOARD, CHANCE_UTILITY_RENT_PER_DICE } from './card-catalog.js';

/**
 * Interpreted payloads for monopoly/game.js resolver.
 *
 * Kind summary:
 * - advance_forward_to_index — step clockwise; movePlayer collects passing Payday
 * - collect_bank / pay_bank
 * - collect_each_other / pay_each_other (2-player: one opponent)
 * - repairs_bank
 * - go_jail
 * - retain_goojf — deck drawer omits GOOJF until cleared; runner awards held slot
 * - advance_nearest_then_land — `{ group:'transit'|'utility', chanceUtilityTenDice?, doubleTransitRent? }`
 * - step_relative_turn — `{ delta }` backwards allowed (no Salary)
 */
export const EFFECT_BY_ID = Object.freeze({
  cc_advance_go: { kind: 'advance_forward_to_index', index: CARD_BOARD.payday },
  cc_bank_error: { kind: 'collect_bank', amount: 5000 },
  cc_doctor_fee: { kind: 'pay_bank', amount: 1250 },
  cc_sale_of_stock: { kind: 'collect_bank', amount: 1250 },
  cc_goojf: { kind: 'retain_goojf', deck: 'communityChest' },
  cc_go_jail: { kind: 'go_jail' },
  cc_holiday_fund: { kind: 'collect_bank', amount: 2500 },
  cc_income_tax_refund: { kind: 'collect_bank', amount: 500 },
  cc_birthday: { kind: 'collect_each_other', amount: 250 },
  cc_life_insurance: { kind: 'collect_bank', amount: 2500 },
  cc_hospital: { kind: 'pay_bank', amount: 2500 },
  cc_school_fees: { kind: 'pay_bank', amount: 1250 },
  cc_consultancy: { kind: 'collect_bank', amount: 625 },
  cc_street_repairs: { kind: 'repairs_bank', perHouse: 1000, perHotel: 2875 },
  cc_second_prize: { kind: 'collect_bank', amount: 250 },
  cc_inherit: { kind: 'collect_bank', amount: 2500 },

  ch_advance_go: { kind: 'advance_forward_to_index', index: CARD_BOARD.payday },
  ch_advance_trafalgar: {
    kind: 'advance_forward_to_index',
    index: CARD_BOARD.groveStreetOrTrafalgarAnalog,
  },
  ch_advance_mayfair: { kind: 'advance_forward_to_index', index: CARD_BOARD.catalpaMayfairAnalog },
  ch_advance_pall_mall: {
    kind: 'advance_forward_to_index',
    index: CARD_BOARD.morganPallMallAnalog,
  },
  ch_nearest_transit_a: { kind: 'advance_nearest_then_land', group: 'transit', doubleTransitRent: true },
  ch_nearest_transit_b: { kind: 'advance_nearest_then_land', group: 'transit', doubleTransitRent: true },
  ch_nearest_utility: {
    kind: 'advance_nearest_then_land',
    group: 'utility',
    chanceUtilityTenDice: true,
  },
  ch_bank_dividend: { kind: 'collect_bank', amount: 1250 },
  ch_goojf: { kind: 'retain_goojf', deck: 'chance' },
  ch_go_back_three: { kind: 'step_relative_turn', delta: -3 },
  ch_go_jail: { kind: 'go_jail' },
  ch_general_repairs: { kind: 'repairs_bank', perHouse: 625, perHotel: 2500 },
  ch_speeding_fine: { kind: 'pay_bank', amount: 375 },
  ch_trip_kings_cross: {
    kind: 'advance_forward_to_index',
    index: CARD_BOARD.kingsCrossAnalogGTrain,
  },
  ch_chairman: { kind: 'pay_each_other', amount: 1250 },
  ch_building_loan: { kind: 'collect_bank', amount: 3750 },
});

/** @param {string} cardId */
export function effectForCard(cardId) {
  const e = EFFECT_BY_ID[cardId];
  if (!e)
    console.warn('[cards] Missing effect payload for card', cardId);
  return e;
}

export { CARD_BOARD, CHANCE_UTILITY_RENT_PER_DICE };

export function forwardSteps(fromIndex, toIndex) {
  let d = toIndex - fromIndex;
  if (d <= 0) d += 40;
  return d;
}

/**
 * @typedef {{ kind: BoardSquareLike['kind'] } & Record<string, unknown>} BoardSquareLike
 * @template T
 */
/**
 * @param {'transit'|'utility'} groupKind
 * @param {readonly { kind?: string }[]} board BOARD array
 */
export function nearestIndexForward(fromIndex, groupKind, board) {
  const want = groupKind;
  for (let s = 1; s <= 40; s++) {
    const idx = (fromIndex + s) % 40;
    const sq = board[idx];
    if (want === 'transit' && sq.kind === 'transit') return idx;
    if (want === 'utility' && sq.kind === 'utility') return idx;
  }
  return fromIndex;
}
