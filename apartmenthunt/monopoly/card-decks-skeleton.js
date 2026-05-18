'use strict';

/**
 * Chance / Community Chest skeleton — Classic UK sixteen each, themed copy + square IDs.
 *
 * Indices must stay aligned with `BOARD` in `game.js`:
 * Community Chest squares: **2, 17, 33**
 * Chance squares: **7, 22, 36**
 *
 * @typedef {'library'|'garden'|'citibikeDock'|'opc'|'iceCreamWindow'|'phils'} NiceFlavorKey
 */

/** @type {readonly [2, 17, 33]} */
export const COMMUNITY_CHEST_INDICES = Object.freeze([2, 17, 33]);

/** @type {readonly [7, 22, 36]} */
export const CHANCE_INDICES = Object.freeze([7, 22, 36]);

/** Nice square index → stable key for `squareBodies` lookups on drawn cards */
export const NICE_FLAVOR_KEY_BY_INDEX = Object.freeze({
  2: 'library',
  7: 'opc',
  17: 'garden',
  22: 'iceCreamWindow',
  33: 'citibikeDock',
  /** Curly apostrophe matches tile label */
  36: 'phils',
});

const _CC_SET = new Set(COMMUNITY_CHEST_INDICES);
const _CH_SET = new Set(CHANCE_INDICES);

/**
 * @param {number} boardIndex
 * @returns {'communityChest'|'chance'|null}
 */
export function niceSquareDeck(boardIndex) {
  if (_CC_SET.has(boardIndex)) return 'communityChest';
  if (_CH_SET.has(boardIndex)) return 'chance';
  return null;
}

/**
 * @param {number} boardIndex
 * @returns {NiceFlavorKey|null}
 */
export function niceFlavorKey(boardIndex) {
  return NICE_FLAVOR_KEY_BY_INDEX[boardIndex] ?? null;
}

/**
 * Ridgewood Commons CSA — not a seventh square; optional **pay bank** text + amount.
 * Classic “school fees” is £50×25=$1,250; use this when you want the real-world $1k share.
 * Swap at resolver/build time for `cc_school_fees` or a custom slot — keeps the deck at 16.
 */
export const RIDGEWOOD_COMMONS_CSA = Object.freeze({
  amount: 1000,
  body: 'You buy a Ridgewood Commons farm share. Pay $1,000.',
});

/**
 * @typedef {{
 *   id: string,
 *   ukClassic: string,
 *   defaultBody: string,
 *   globalOnly?: boolean,
 *   squareBodies?: Partial<Record<NiceFlavorKey, string>>,
 *   notes?: string,
 * }} CardLineSkeleton
 */

/** @type {{ communityChest: CardLineSkeleton[], chance: CardLineSkeleton[] }} */
export const CARD_DECKS_SKELETON = Object.freeze({
  communityChest: [
    {
      id: 'cc_advance_go',
      ukClassic: 'Advance to Go (Collect £200)',
      defaultBody: 'Advance to Payday. Collect $5,000.',
      notes: 'Rotate square-specific lines across library / garden / citibikeDock when implementing.',
      squareBodies: {
        library: 'Books due — walk back to Payday. Collect $5,000.',
        garden: 'Plot meeting ends — head to Payday. Collect $5,000.',
        citibikeDock: 'Unlock the bike and roll to Payday. Collect $5,000.',
      },
    },
    {
      id: 'cc_bank_error',
      ukClassic: 'Bank error in your favour. Collect £200',
      defaultBody: 'Bank error in your favour. Collect $5,000.',
      squareBodies: {
        citibikeDock: 'Citibike angel points post as free ride credit. Collect $5,000.',
      },
    },
    {
      id: 'cc_doctor_fee',
      ukClassic: "Doctor's fee. Pay £50",
      defaultBody: "Doctor's fee. Pay $1,250.",
      squareBodies: {
        library: 'Washington Irving hits you with a late fine. Pay $1,250.',
      },
    },
    {
      id: 'cc_sale_of_stock',
      ukClassic: 'From sale of stock you get £50',
      defaultBody: 'From sale of stock you get $1,250.',
      notes: 'Keep generic; optional to skip themed alt entirely.',
    },
    {
      id: 'cc_goojf',
      ukClassic: 'Get Out of Jail Free',
      defaultBody: 'Get out of Shuttle stop free. Keep this card until used, traded, or sold.',
    },
    {
      id: 'cc_go_jail',
      ukClassic: 'Go to Jail…',
      defaultBody: 'Go to Shuttle stop. Do not pass Payday, do not collect $5,000.',
      squareBodies: {
        citibikeDock: 'The dock is full but broken. Go to Shuttle stop. Do not pass Payday, do not collect $5,000.',
      },
    },
    {
      id: 'cc_holiday_fund',
      ukClassic: 'Holiday fund matures. Receive £100',
      defaultBody: 'Holiday fund matures. Receive $2,500.',
      squareBodies: {
        garden: 'The raffle at the harvest potluck hits your number. Receive $2,500.',
      },
    },
    {
      id: 'cc_income_tax_refund',
      ukClassic: 'Income tax refund. Collect £20',
      defaultBody: 'Income tax refund. Collect $500.',
      squareBodies: {
        library: 'You find $500 pressed in a library book. Collect $500.',
      },
    },
    {
      id: 'cc_birthday',
      ukClassic: 'It is your birthday. Collect £10 from every player',
      defaultBody: 'It is your birthday. Collect $250 from each player.',
      squareBodies: {
        garden: 'Harvest festival — everyone chips in for your cider. Collect $250 from each player.',
        library: 'End of school year — students shower you with gift cards. Collect $250 from each player.',
      },
    },
    {
      id: 'cc_life_insurance',
      ukClassic: 'Life insurance matures. Collect £100',
      defaultBody: 'Life insurance matures. Collect $2,500.',
      notes: 'Themed line optional / often skipped.',
    },
    {
      id: 'cc_hospital',
      ukClassic: 'Pay hospital fees of £100',
      defaultBody: 'Pay hospital fees of $2,500.',
    },
    {
      id: 'cc_school_fees',
      ukClassic: 'Pay school fees of £50',
      defaultBody: 'Pay school fees of $1,250.',
      squareBodies: {
        library: 'Donation drive for the local school at the library. Pay $1,250.',
      },
    },
    {
      id: 'cc_consultancy',
      ukClassic: 'Receive £25 consultancy fee',
      defaultBody: 'Receive $625 consultancy fee.',
      notes: 'Themed line optional / often skipped.',
    },
    {
      id: 'cc_street_repairs',
      ukClassic: 'Street repairs. £40 / £115 per hotel',
      defaultBody: 'You are assessed for street repairs. Pay $1,000 per house and $2,875 per hotel.',
      notes: 'Keep canonical only — no square flavor.',
    },
    {
      id: 'cc_second_prize',
      ukClassic: 'Second prize in a beauty contest. Collect £10',
      defaultBody: 'Second prize in a beauty contest. Collect $250.',
      notes: 'Skip bespoke beauty/crossword mapping for now; replace default later if you want.',
    },
    {
      id: 'cc_inherit',
      ukClassic: 'You inherit £100',
      defaultBody: 'You inherit $2,500.',
    },
  ],

  chance: [
    {
      id: 'ch_advance_go',
      ukClassic: 'Advance to Go (Collect £200)',
      defaultBody: 'Advance to Payday. Collect $5,000.',
      notes: 'Rotate lines across opc / iceCreamWindow / phils when implementing.',
      squareBodies: {
        opc: 'Drop-off day at OPC went well — head to Payday to cash out. Collect $5,000.',
        iceCreamWindow: 'They’re giving out samples; you skip the line to Payday. Collect $5,000.',
        phils: 'Last call already? You walk it to Payday. Collect $5,000.',
      },
    },
    {
      id: 'ch_advance_trafalgar',
      ukClassic: 'Advance to Trafalgar Square…',
      defaultBody: 'Advance to Grove St. If you pass Payday, collect $5,000.',
      notes: 'Spread “advance to named property” flavor across the three Chance squares.',
    },
    {
      id: 'ch_advance_mayfair',
      ukClassic: 'Advance to Mayfair',
      defaultBody: 'Advance to Catalpa Ave.',
    },
    {
      id: 'ch_advance_pall_mall',
      ukClassic: 'Advance to Pall Mall…',
      defaultBody: 'Advance to Morgan Ave. If you pass Payday, collect $5,000.',
    },
    {
      id: 'ch_nearest_transit_a',
      ukClassic: 'Advance to the nearest Station…',
      defaultBody: 'Advance to the nearest transit line. If unowned, you may buy it. If owned, pay owner double the rent.',
      notes: 'Duplicate card in deck (×2) in classic — no square-tied flavor.',
    },
    {
      id: 'ch_nearest_transit_b',
      ukClassic: 'Advance to the nearest Station… (duplicate)',
      defaultBody: 'Advance to the nearest transit line. If unowned, you may buy it. If owned, pay owner double the rent.',
    },
    {
      id: 'ch_nearest_utility',
      ukClassic: 'Advance token to nearest Utility…',
      defaultBody:
        'Advance to the nearest utility (National Gas or Con Ed). If unowned, you may buy it. If owned, throw dice and pay owner ten times the amount thrown (scaled board rates).',
    },
    {
      id: 'ch_bank_dividend',
      ukClassic: 'Bank pays you dividend of £50',
      defaultBody: 'Bank pays you dividend of $1,250.',
      squareBodies: {
        opc: 'You clean out your closet and sell it to OPC for store credit. Collect $1,250.',
        iceCreamWindow: 'Free samples at the ice cream window — collect $1,250',
        phils: "Phil's New Year's pours are on the house for regulars. Collect  $1,250.",
      },
    },
    {
      id: 'ch_goojf',
      ukClassic: 'Get Out of Jail Free',
      defaultBody: 'Get off the shuttle bus free. Keep this card until used, traded, or sold.',
    },
    {
      id: 'ch_go_back_three',
      ukClassic: 'Go Back 3 Spaces',
      defaultBody: 'Go back 3 spaces.',
    },
    {
      id: 'ch_go_jail',
      ukClassic: 'Go to Jail…',
      defaultBody: 'Get on the shuttle buss. Do not pass Payday, do not collect $5,000.',
    },
    {
      id: 'ch_general_repairs',
      ukClassic: 'Make general repairs…',
      defaultBody: 'General repairs. Pay $625 per house and $2,500 per hotel.',
    },
    {
      id: 'ch_speeding_fine',
      ukClassic: 'Speeding fine £15',
      defaultBody: 'You ran a red light on a Citibike. Pay $375.',
      globalOnly: true,
      notes: 'Deliberately not tied to citibikeDock square.',
    },
    {
      id: 'ch_trip_kings_cross',
      ukClassic: 'Take a trip to Kings Cross Station…',
      defaultBody: 'Ride the G Train. If you pass Payday, collect $5,000.',
    },
    {
      id: 'ch_chairman',
      ukClassic: 'Chairman of the Board. Pay each player £50',
      defaultBody: 'You buy the round at Phil’s. Pay $1,250 to each player.',
      squareBodies: {
        phils: "You're already at Phil’s — open a tab for the table. Pay $1,250 to each player.",
      },
    },
    {
      id: 'ch_building_loan',
      ukClassic: 'Building loan matures. Collect £150',
      defaultBody: 'Your building loan matures. Collect $3,750.',
    },
  ],
});
