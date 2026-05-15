'use strict';

export function tryMortgageSmallest(deps, playerIdx) {
  const { BOARD, state, canMortgage, applyMortgage, mortgageValueFor } = deps;
  const candidates = BOARD.map((_, idx) => idx).filter((idx) => canMortgage(playerIdx, idx));
  if (candidates.length === 0) return false;
  candidates.sort((a, b) => mortgageValueFor(a) - mortgageValueFor(b));
  return applyMortgage(playerIdx, candidates[0]);
}

export function trySellOneRandom(deps, playerIdx) {
  const { BOARD, state, PLAYERS, canSellHere, sellOneBuilding } = deps;
  const owner = PLAYERS[playerIdx];
  const props = BOARD.map((_, idx) => idx).filter((idx) =>
    canSellHere(owner, idx, state.ownership, state.buildings),
  );
  if (props.length === 0) return false;
  const pick = props[Math.floor(Math.random() * props.length)];
  return sellOneBuilding(owner, pick);
}

export function liquidateSellThenMortgage(deps, playerIdx, needCash) {
  const { state } = deps;
  let guard = 0;
  while (state.cash[playerIdx] < needCash && guard++ < 240) {
    const before = state.cash[playerIdx];
    if (trySellOneRandom(deps, playerIdx)) continue;
    if (tryMortgageSmallest(deps, playerIdx)) continue;
    if (state.cash[playerIdx] === before) break;
  }
}

export function liquidateMortgageThenSell(deps, playerIdx, needCash) {
  const { state } = deps;
  let guard = 0;
  while (state.cash[playerIdx] < needCash && guard++ < 240) {
    const before = state.cash[playerIdx];
    if (tryMortgageSmallest(deps, playerIdx)) continue;
    if (trySellOneRandom(deps, playerIdx)) continue;
    if (state.cash[playerIdx] === before) break;
  }
}

export function raiseCashMortgageOnly(deps, playerIdx, targetCash) {
  const { state } = deps;
  let guard = 0;
  while (state.cash[playerIdx] < targetCash && guard++ < 240) {
    const before = state.cash[playerIdx];
    if (!tryMortgageSmallest(deps, playerIdx)) {
      if (state.cash[playerIdx] === before) break;
    }
  }
}

export function tryUnmortgageCheapestWithFloor(deps, playerIdx, minCashAfter) {
  const { BOARD, state, PLAYERS, unmortgageCostFor, canUnmortgage, applyUnmortgage } = deps;
  const who = PLAYERS[playerIdx];
  const mortgaged = BOARD.map((_, idx) => idx).filter(
    (idx) => state.ownership[idx] === who && state.mortgaged[idx],
  );
  mortgaged.sort((a, b) => unmortgageCostFor(a) - unmortgageCostFor(b));
  for (const idx of mortgaged) {
    const c = unmortgageCostFor(idx);
    if (state.cash[playerIdx] - c >= minCashAfter && canUnmortgage(playerIdx, idx)) {
      return applyUnmortgage(playerIdx, idx);
    }
  }
  return false;
}
