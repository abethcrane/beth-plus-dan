'use strict';

import { raiseCashMortgageOnly, liquidateMortgageThenSell, tryUnmortgageCheapestWithFloor } from './helpers.js';

const GREEDY_MIN_CASH = 5000;

export const greedyLandGrabStrategy = {
  liquidateUntil(deps, playerIdx, needCash) {
    liquidateMortgageThenSell(deps, playerIdx, needCash);
  },

  handleUnownedPurchase(deps, { idx, sq, cb }) {
    const { state, PLAYER_LABEL, formatMoney, log, aiPick, aiQuips } = deps;
    setTimeout(() => {
      if (state.winner != null) return;
      raiseCashMortgageOnly(deps, 1, sq.price);
      if (state.cash[1] >= sq.price) {
        state.cash[1] -= sq.price;
        state.ownership[idx] = 'ai';
        log(`${PLAYER_LABEL.ai}: ${aiPick(aiQuips.buy)} Bought ${sq.name} for ${formatMoney(sq.price)}.`);
      } else {
        log(
          `${PLAYER_LABEL.ai}: ${aiPick(aiQuips.pass)} Skipped ${sq.name} — not enough liquidity without selling upgrades.`,
        );
      }
      deps.save();
      deps.renderAll();
      if (state.winner == null) cb?.();
    }, 900);
  },

  maintainAfterLand(deps) {
    const {
      state,
      BOARD,
      shuffle,
      hasMonopoly,
      canBuildHere,
      houseCostFor,
      hotelCostFor,
      log,
      aiPick,
      aiQuips,
      save,
      renderAll,
      PLAYER_LABEL,
    } = deps;

    let guard = 0;
    while (guard++ < 120) {
      let progressed = false;
      while (tryUnmortgageCheapestWithFloor(deps, 1, GREEDY_MIN_CASH)) {
        progressed = true;
      }

      const indices = BOARD.map((_, ix) => ix).filter((ix) => state.ownership[ix] === 'ai' && BOARD[ix].kind === 'property');

      let builtHere = false;
      for (const idx of shuffle(indices)) {
        const sq = BOARD[idx];
        const mono = hasMonopoly('ai', sq.group, state.ownership);
        if (!mono) continue;
        const b = state.buildings[idx] || { houses: 0, hotel: false };
        if (b.hotel) continue;
        if (!canBuildHere('ai', idx, state.ownership, state.buildings)) continue;

        if (b.houses === 4 && !b.hotel) {
          const cost = hotelCostFor(idx);
          if (state.cash[1] - cost >= GREEDY_MIN_CASH) {
            state.cash[1] -= cost;
            state.buildings[idx] = { houses: 0, hotel: true };
            log(`${PLAYER_LABEL.ai}: ${aiPick(aiQuips.house)} Hotel on ${sq.name}.`);
            save();
            renderAll();
            builtHere = true;
            break;
          }
        } else if (b.houses < 4) {
          const cost = houseCostFor(idx);
          if (state.cash[1] - cost >= GREEDY_MIN_CASH) {
            state.cash[1] -= cost;
            state.buildings[idx] = { houses: b.houses + 1, hotel: false };
            log(`${PLAYER_LABEL.ai}: Built house on ${sq.name}.`);
            save();
            renderAll();
            builtHere = true;
            break;
          }
        }
      }

      if (builtHere) continue;
      if (!progressed) break;
    }
  },
};
