'use strict';

/** @typedef {{ chance: boolean, communityChest: boolean }} GoojfSlot */

/**
 * Held Get Out Of Jail Free cards (one Chance + one Community Chest deck each).
 */
export function createEmptyGoojfHeld() {
  return {
    human: { chance: false, communityChest: false },
    ai: { chance: false, communityChest: false },
  };
}

/**
 * @param {number} playerIdx 0 human, 1 AI
 * @param {'chance'|'communityChest'} deck
 */
export function goojfSlotForDeck(deck) {
  return deck === 'chance' ? 'chance' : 'communityChest';
}

/**
 * @param {{ human: GoojfSlot, ai: GoojfSlot }} held
 * @param {number} playerIdx
 * @param {'chance'|'communityChest'} deck
 */
export function hasGoojf(held, playerIdx, deck) {
  const key = playerIdx === 0 ? 'human' : 'ai';
  const slot = goojfSlotForDeck(deck);
  return Boolean(held[key][slot]);
}

/**
 * Pull from deck onto player card row (drawing).
 * @param {{ human: GoojfSlot, ai: GoojfSlot }} held
 * @param {number} playerIdx
 * @param {'chance'|'communityChest'} deck
 */
export function awardGoojf(held, playerIdx, deck) {
  const key = playerIdx === 0 ? 'human' : 'ai';
  const slot = goojfSlotForDeck(deck);
  held[key][slot] = true;
}

/**
 * Return card to deck bottom (leave jail etc.).
 */
export function clearGoojf(held, playerIdx, deck) {
  const key = playerIdx === 0 ? 'human' : 'ai';
  const slot = goojfSlotForDeck(deck);
  held[key][slot] = false;
}

/**
 * @param {unknown} raw
 * @returns {{ human: GoojfSlot, ai: GoojfSlot }}
 */
export function migrateGoojfHeld(raw) {
  const blank = createEmptyGoojfHeld();
  if (!raw || typeof raw !== 'object') return blank;
  for (const side of ['human', 'ai']) {
    const s = raw[side];
    if (!s || typeof s !== 'object') continue;
    blank[side].chance = Boolean(s.chance);
    blank[side].communityChest = Boolean(s.communityChest);
  }
  return blank;
}

/** House rule hook for selling / gifting cards between players later. Not implemented yet. */
export function canTradeGoojf() {
  return false;
}
