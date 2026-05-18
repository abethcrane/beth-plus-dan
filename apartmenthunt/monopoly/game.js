'use strict';

import { getStrategy, normalizeAiVariant, AI_VARIANT_YES_MAN, DIFFICULTY_SEGMENTS } from './ai/index.js';

import { niceSquareDeck, niceFlavorKey } from './card-decks-skeleton.js';

import {
  getCardFaceText,
  CARD_ID_CHANCE,
  CARD_ID_COMMUNITY_CHEST,
  buildDrawableDeck,
  isGoojfCard,
} from './card-catalog.js';

import {
  effectForCard,
  forwardSteps,
  nearestIndexForward,
  CHANCE_UTILITY_RENT_PER_DICE,
} from './card-effects.js';

import {
  migrateGoojfHeld,
  awardGoojf,
  clearGoojf,
  hasGoojf,
  createEmptyGoojfHeld,
} from './goojf-state.js';

  const STORAGE_KEY = 'bushwick-monopoly-state-v18';
  const STARTING_CASH = 37500;
  const GO_BONUS = 5000;
  /** Classic utility dice multipliers 4 / 10, scaled ×25 like rest of board economy → pay dice×100 or dice×250 */
  const UTILITY_MONOPOLY_SCALE = 25;
  const UTILITY_PER_DICE_ONE = 4 * UTILITY_MONOPOLY_SCALE;
  const UTILITY_PER_DICE_BOTH = 10 * UTILITY_MONOPOLY_SCALE;
  const JAIL_INDEX = 10;
  const TRACKWORK_INDEX = 30;
  const JAIL_FINE = 1250;
  const PLAYERS = ['human', 'ai'];
  /** AI opponent in the UI — another buyer with capital, not “the villain broker”. */
  const OPPONENT_ROLE = 'Investor';
  const PLAYER_LABEL = { human: 'You', ai: `The ${OPPONENT_ROLE}` };

  function winnerHeadline(winnerKey) {
    return winnerKey === 'human' ? 'You won!' : `${PLAYER_LABEL[winnerKey]} wins.`;
  }

  function opponentInProse() {
    return `the ${OPPONENT_ROLE.toLowerCase()}`;
  }

  /** @typedef {'corner'|'property'|'tax'|'transit'|'utility'|'nice'} SquareKind */

  /** Economy: UK Monopoly £ values × 25 → $. Sources: [Monopoly Wiki UK Properties category](https://monopoly.fandom.com/wiki/Category:UK_Properties) + [Wikibooks UK column](https://en.wikibooks.org/wiki/Monopoly/Properties_reference). Utilities: dice × (4×25) or × (10×25). */

  /**
   * @typedef {{ kind: SquareKind, name: string, price?: number, baseRent?: number, group?: string, tax?: number, side: string, stripColor?: string, tileColor?: string, rentSchedule?: number[], houseCost?: number, hotelCost?: number }} BoardSquare
   */

  /**
   * UK deed £ → game $. `rents` = [site, 1 house, …, 4 houses, hotel]; colour-set doubling applies to site rent only (handled in computeRent).
   * @param {number} poundsPrice
   * @param {number} poundsHouse
   * @param {[number, number, number, number, number, number]} rents
   */
  function ukProp(poundsPrice, poundsHouse, rents) {
    const m = 25;
    return {
      price: poundsPrice * m,
      baseRent: rents[0] * m,
      houseCost: poundsHouse * m,
      hotelCost: poundsHouse * m,
      rentSchedule: rents.map((x) => x * m),
    };
  }

  /** @type {BoardSquare[]} */
  const BOARD = [
    { kind: 'corner', name: 'Payday', side: 'sw' },
    { kind: 'property', name: 'Broadway', group: 'brown', side: 's', ...ukProp(60, 50, [2, 10, 30, 90, 160, 250]) },
    { kind: 'nice', name: 'Washington Irving\nLibrary', side: 's' },
    { kind: 'property', name: 'Myrtle Ave', group: 'brown', side: 's', ...ukProp(60, 50, [4, 20, 60, 180, 320, 450]) },
    { kind: 'tax', name: 'Broker Fee', tax: 200 * 25, side: 's' },
    { kind: 'transit', name: 'G Train', price: 200 * 25, baseRent: 0, group: 'transit', side: 's', stripColor: '#6cbe45' },
    { kind: 'property', name: '60th Pl', group: 'light_blue', side: 's', ...ukProp(100, 50, [6, 30, 90, 270, 400, 550]) },
    { kind: 'nice', name: 'OPC', side: 's' },
    { kind: 'property', name: 'Forest Ave', group: 'light_blue', side: 's', ...ukProp(100, 50, [6, 30, 90, 270, 400, 550]) },
    { kind: 'property', name: '69th Ave', group: 'light_blue', side: 's', ...ukProp(120, 50, [8, 40, 100, 300, 450, 600]) },
    { kind: 'corner', name: 'Shuttle stop', side: 'nw' },
    { kind: 'property', name: 'Morgan Ave', group: 'pink', side: 'w', ...ukProp(140, 100, [10, 50, 150, 450, 625, 750]) },
    {
      kind: 'utility',
      name: 'National Gas',
      price: 150 * 25,
      baseRent: 0,
      group: 'utility',
      side: 'w',
      tileColor: '#3db3ec',
    },
    { kind: 'property', name: 'Wyckoff Ave', group: 'pink', side: 'w', ...ukProp(140, 100, [10, 50, 150, 450, 625, 750]) },
    { kind: 'property', name: 'Seneca Ave', group: 'pink', side: 'w', ...ukProp(160, 100, [12, 60, 180, 500, 700, 900]) },
    { kind: 'transit', name: 'J / Z Train', price: 200 * 25, baseRent: 0, group: 'transit', side: 'w', stripColor: '#996633' },
    { kind: 'property', name: 'Gates Ave', group: 'orange', side: 'w', ...ukProp(180, 100, [14, 70, 200, 550, 750, 950]) },
    { kind: 'nice', name: 'Ridgewood\nCommunity Garden', side: 'w' },
    { kind: 'property', name: 'Halsey St', group: 'orange', side: 'w', ...ukProp(180, 100, [14, 70, 200, 550, 750, 950]) },
    { kind: 'property', name: 'Palmetto St', group: 'orange', side: 'w', ...ukProp(200, 100, [16, 80, 220, 600, 800, 1000]) },
    { kind: 'corner', name: 'Maria Hernandez\nPark', side: 'nw' },
    { kind: 'property', name: 'Greene Ave', group: 'red', side: 'n', ...ukProp(220, 150, [18, 90, 250, 700, 875, 1050]) },
    { kind: 'nice', name: 'Ice Cream Window', side: 'n' },
    { kind: 'property', name: 'Grove St', group: 'red', side: 'n', ...ukProp(220, 150, [18, 90, 250, 700, 875, 1050]) },
    { kind: 'property', name: 'Evergreen Ave', group: 'red', side: 'n', ...ukProp(240, 150, [20, 100, 300, 750, 925, 1100]) },
    { kind: 'transit', name: 'L Train', price: 200 * 25, baseRent: 0, group: 'transit', side: 'n', stripColor: '#a7a9ac' },
    { kind: 'property', name: 'Hancock St', group: 'yellow', side: 'n', ...ukProp(260, 150, [22, 110, 330, 800, 975, 1150]) },
    { kind: 'property', name: 'Covert St', group: 'yellow', side: 'n', ...ukProp(260, 150, [22, 110, 330, 800, 975, 1150]) },
    {
      kind: 'utility',
      name: 'Con Ed Electric',
      price: 150 * 25,
      baseRent: 0,
      group: 'utility',
      side: 'n',
      tileColor: '#3db3ec',
    },
    { kind: 'property', name: 'Weirfeld St', group: 'yellow', side: 'n', ...ukProp(280, 150, [24, 120, 360, 850, 1025, 1200]) },
    { kind: 'corner', name: 'Trackwork —\ntake the bus', side: 'ne' },
    { kind: 'property', name: 'Grandview Ave', group: 'green', side: 'e', ...ukProp(300, 200, [26, 130, 390, 900, 1100, 1275]) },
    { kind: 'property', name: 'Onderdonk Ave', group: 'green', side: 'e', ...ukProp(300, 200, [26, 130, 390, 900, 1100, 1275]) },
    { kind: 'nice', name: 'Citibike Dock', side: 'e' },
    { kind: 'property', name: 'Woodward Ave', group: 'green', side: 'e', ...ukProp(320, 200, [28, 150, 450, 1000, 1200, 1400]) },
    { kind: 'transit', name: 'M Train', price: 200 * 25, baseRent: 0, group: 'transit', side: 'e', stripColor: '#ff6319' },
    { kind: 'nice', name: 'Phil’s', side: 'e' },
    { kind: 'property', name: 'Cornelia St', group: 'blue', side: 'e', ...ukProp(350, 200, [35, 175, 500, 1100, 1300, 1500]) },
    { kind: 'tax', name: 'Application Fee', tax: 100 * 25, side: 'e' },
    { kind: 'property', name: 'Catalpa Ave', group: 'blue', side: 'e', ...ukProp(400, 200, [50, 200, 600, 1400, 1700, 2000]) },
  ];

  const GROUP_COLORS = {
    brown: '#8b6914',
    light_blue: '#6b9eb5',
    pink: '#c07098',
    orange: '#d4895c',
    red: '#c94c4c',
    yellow: '#d4c04a',
    green: '#5a9e6e',
    blue: '#5c6eb8',
    transit: '#9a9a9a',
    utility: '#4299f0',
  };

  /** HUD portfolio buckets: Monopoly color order, then trains/utilities, then edge cases. */
  const PORTFOLIO_GROUP_ORDER = [
    'brown',
    'light_blue',
    'pink',
    'orange',
    'red',
    'yellow',
    'green',
    'blue',
    '__transit',
    '__utility',
    '__misc',
  ];

  function cellGridPos(i) {
    if (i === 0) return { row: 11, col: 11 };
    if (i >= 1 && i <= 9) return { row: 11, col: 11 - i };
    if (i === 10) return { row: 11, col: 1 };
    if (i >= 11 && i <= 19) return { row: 11 - (i - 10), col: 1 };
    if (i === 20) return { row: 1, col: 1 };
    if (i >= 21 && i <= 29) return { row: 1, col: i - 19 };
    if (i === 30) return { row: 1, col: 11 };
    return { row: i - 29, col: 11 };
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let j = a.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [a[j], a[k]] = [a[k], a[j]];
    }
    return a;
  }

  function replenishDeckIfEmpty(arrKey, baseOrderIds) {
    let d = state[arrKey];
    if (!Array.isArray(d)) {
      state[arrKey] = [];
      d = state[arrKey];
    }
    if (d.length === 0) {
      state[arrKey] = shuffle([...buildDrawableDeck(baseOrderIds, state.goojfHeld)]);
    }
  }

  function deckKey(deckKind) {
    return deckKind === 'chance' ? 'chanceDeck' : 'communityChestDeck';
  }

  function peekDrawCard(deckKind) {
    replenishDeckIfEmpty(deckKey(deckKind), deckKind === 'chance' ? CARD_ID_CHANCE : CARD_ID_COMMUNITY_CHEST);
    const key = deckKey(deckKind);
    const deck = state[key];
    const id = deck.shift();
    if (!isGoojfCard(id)) deck.push(id);
    return id;
  }

  function pushGoojfBackToDeckBottom(deckKind) {
    const id = deckKind === 'chance' ? 'ch_goojf' : 'cc_goojf';
    replenishDeckIfEmpty(deckKey(deckKind), deckKind === 'chance' ? CARD_ID_CHANCE : CARD_ID_COMMUNITY_CHEST);
    state[deckKey(deckKind)].push(id);
  }

  function reconcileCardDecksAfterLoadIfNeeded() {
    state.goojfHeld = migrateGoojfHeld(state.goojfHeld);
    if (!Array.isArray(state.chanceDeck)) state.chanceDeck = [];
    if (!Array.isArray(state.communityChestDeck)) state.communityChestDeck = [];
    const expectChIds = buildDrawableDeck(CARD_ID_CHANCE, state.goojfHeld);
    const expectCcIds = buildDrawableDeck(CARD_ID_COMMUNITY_CHEST, state.goojfHeld);
    /** @returns {boolean} */
    function valid(saved, allowed) {
      if (!Array.isArray(saved) || saved.length !== allowed.length) return false;
      const a = [...saved].sort();
      const b = [...allowed].sort();
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
      }
      return true;
    }
    if (!valid(state.chanceDeck, expectChIds))
      state.chanceDeck = shuffle([...expectChIds]);
    if (!valid(state.communityChestDeck, expectCcIds))
      state.communityChestDeck = shuffle([...expectCcIds]);
  }
  function formatMoney(n) {
    return `$${n.toLocaleString()}`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function propertyScheduleRows(baseRent) {
    const rows = [
      ['Site rent', formatMoney(baseRent)],
      ['Monopoly · undeveloped', formatMoney(Math.round(baseRent * 2))],
    ];
    for (let h = 1; h <= 4; h++) {
      rows.push([
        `With ${h} house${h === 1 ? '' : 's'}`,
        formatMoney(Math.round(baseRent * rentMultiplier(h, false))),
      ]);
    }
    rows.push(['With hotel', formatMoney(Math.round(baseRent * rentMultiplier(0, true)))]);
    return rows;
  }

  /** UK-style deed column (site, 1–4 houses, hotel), already scaled ×25 into dollars. */
  function propertyScheduleRowsFromSchedule(schedule) {
    const [site, h1, h2, h3, h4, hotel] = schedule;
    return [
      ['Site rent', formatMoney(site)],
      ['Monopoly · undeveloped', formatMoney(site * 2)],
      ['With 1 house', formatMoney(h1)],
      ['With 2 houses', formatMoney(h2)],
      ['With 3 houses', formatMoney(h3)],
      ['With 4 houses', formatMoney(h4)],
      ['With hotel', formatMoney(hotel)],
    ];
  }

  function propertyScheduleRowsForSq(sq) {
    if (sq.rentSchedule?.length === 6) return propertyScheduleRowsFromSchedule(sq.rentSchedule);
    return propertyScheduleRows(sq.baseRent);
  }

  function buildDeedCardMarkup(idx) {
    const sq = BOARD[idx];
    const stripHex = sq.stripColor || GROUP_COLORS[sq.group] || '#888';
    const owner = state.ownership[idx];
    const headerTitle =
      sq.kind === 'property'
        ? 'TITLE LISTING'
        : sq.kind === 'transit'
          ? 'TRANSIT DEED'
          : sq.kind === 'utility'
            ? 'UTILITY DEED'
            : 'SPACE DETAILS';

    let body = '';

    if (sq.kind === 'property' && sq.price != null && sq.baseRent != null) {
      const houseC = houseCostFor(idx);
      const hotelC = hotelCostFor(idx);
      const monoOwned = owner ? hasMonopoly(owner, sq.group, state.ownership) : false;
      const rows = propertyScheduleRowsForSq(sq);
      const curRent =
        owner && sq.kind === 'property'
          ? computeRent(idx, state.ownership, state.buildings)
          : null;
      const b = state.buildings[idx] || { houses: 0, hotel: false };
      const buildNote =
        owner === 'human' && monoOwned
          ? canBuildHere('human', idx, state.ownership, state.buildings)
            ? 'You may upgrade here this turn (even building rule applies across the color group).'
            : 'You own the monopoly — upgrades must stay even across this group.'
          : '';

      const ownerLabel = owner === 'human' ? 'You' : owner === 'ai' ? PLAYER_LABEL.ai : 'Unowned';
      body += `<dl class="mono-deed-meta"><dt>Listed</dt><dd>${formatMoney(sq.price)}</dd><dt>Owner</dt><dd>${escapeHtml(ownerLabel)}</dd>`;
      if (owner) {
        const built = b.hotel ? 'Hotel' : `${b.houses} house${b.houses === 1 ? '' : 's'}`;
        body += `<dt>Built</dt><dd>${escapeHtml(built)}${monoOwned ? ' · monopoly' : ''}</dd>`;
      }
      body += '</dl>';

      body += '<table class="mono-deed-table"><tbody>';
      rows.forEach(([label, amt]) => {
        body += `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(amt)}</td></tr>`;
      });
      body += '</tbody></table>';

      if (curRent != null) {
        body += `<p class="mono-deed-now"><strong>Rent if someone lands here now:</strong> ${formatMoney(curRent)}</p>`;
      }

      body += `<ul class="mono-deed-costs mono-deed-list"><li>Upgrade (each house): ${formatMoney(houseC)}</li><li>Hotel: ${formatMoney(hotelC)} plus 4 houses on this lot</li></ul>`;
      const mv = mortgageValueFor(idx);
      const umc = unmortgageCostFor(idx);
      body += `<p class="mono-deed-note">Mortgage (bank pays you): <strong>${formatMoney(mv)}</strong>. Unmortgage later: <strong>${formatMoney(umc)}</strong> (10% interest).</p>`;
      if (state.mortgaged[idx]) {
        body +=
          '<p class="mono-deed-now"><strong>Mortgaged</strong> — no rent collected until you unmortgage.</p>';
      }
      if (buildNote) body += `<p class="mono-deed-note">${escapeHtml(buildNote)}</p>`;
      body +=
        '<p class="mono-deed-foot">Own every lot in this color — undeveloped rent doubles on those lots.</p>';
    } else if (sq.kind === 'transit' && sq.price != null) {
      const tiers = [625, 1250, 2500, 5000];
      body += `<dl class="mono-deed-meta"><dt>Listed</dt><dd>${formatMoney(sq.price)}</dd><dt>Owner</dt><dd>${escapeHtml(owner === 'human' ? 'You' : owner === 'ai' ? PLAYER_LABEL.ai : 'Unowned')}</dd></dl>`;
      body += '<table class="mono-deed-table"><tbody>';
      tiers.forEach((rent, i) => {
        body += `<tr><th scope="row">Rent if owner holds ${i + 1} line${i === 0 ? '' : 's'}</th><td>${formatMoney(rent)}</td></tr>`;
      });
      body += '</tbody></table>';
      const cur =
        owner === 'human' || owner === 'ai'
          ? computeRent(idx, state.ownership, state.buildings)
          : null;
      const n = owner ? countGroupOwned('transit', owner, state.ownership) : null;
      if (n != null) {
        body += `<p class="mono-deed-note">This owner holds <strong>${n}</strong> transit square(s); landed rent uses the matching row.</p>`;
      } else {
        body +=
          '<p class="mono-deed-note">Unowned — after purchase, rent depends on how many transit squares that same owner holds (see table).</p>';
      }
      if (cur != null) body += `<p class="mono-deed-now"><strong>Rent if landed now:</strong> ${formatMoney(cur)}</p>`;
      const tmv = mortgageValueFor(idx);
      const tumc = unmortgageCostFor(idx);
      body += `<p class="mono-deed-note">Mortgage: <strong>${formatMoney(tmv)}</strong>. Unmortgage: <strong>${formatMoney(tumc)}</strong>.</p>`;
      if (state.mortgaged[idx]) {
        body += '<p class="mono-deed-now"><strong>Mortgaged</strong> — no transit rent.</p>';
      }
    } else if (sq.kind === 'utility' && sq.price != null) {
      const ownerLabel = owner === 'human' ? 'You' : owner === 'ai' ? PLAYER_LABEL.ai : 'Unowned';
      body += `<dl class="mono-deed-meta"><dt>Listed</dt><dd>${formatMoney(sq.price)}</dd><dt>Owner</dt><dd>${escapeHtml(ownerLabel)}</dd></dl>`;
      body += `<p class="mono-deed-note">Classic utilities are dice × 4 or × 10; this board scales dollars by <strong>×${UTILITY_MONOPOLY_SCALE}</strong>, so rent is <strong>dice × ${UTILITY_PER_DICE_ONE}</strong> (one utility) or <strong>dice × ${UTILITY_PER_DICE_BOTH}</strong> (both).</p>`;
      const dice = state.lastDiceTotal ?? 7;
      if (owner) {
        const sameOwner = countGroupOwned('utility', owner, state.ownership);
        const perDice = sameOwner >= 2 ? UTILITY_PER_DICE_BOTH : UTILITY_PER_DICE_ONE;
        body += `<p class="mono-deed-note">This owner holds <strong>${sameOwner}</strong> / 2 utilities → rent <strong>dice × ${perDice}</strong>.</p>`;
        body += `<p class="mono-deed-now">Last dice total (${dice}): rent <strong>${formatMoney(dice * perDice)}</strong>.</p>`;
      } else {
        body +=
          '<p class="mono-deed-note">Unowned — rent depends on whether the owner has one or both utilities.</p>';
        body += `<p class="mono-deed-now">Example dice ${dice}: <strong>${formatMoney(dice * UTILITY_PER_DICE_ONE)}</strong> with one utility or <strong>${formatMoney(dice * UTILITY_PER_DICE_BOTH)}</strong> with both.</p>`;
      }
      const umv = mortgageValueFor(idx);
      const uumc = unmortgageCostFor(idx);
      body += `<p class="mono-deed-note">Mortgage: <strong>${formatMoney(umv)}</strong>. Unmortgage: <strong>${formatMoney(uumc)}</strong>.</p>`;
      if (state.mortgaged[idx]) {
        body += '<p class="mono-deed-now"><strong>Mortgaged</strong> — no utility rent.</p>';
      }
    } else if (sq.kind === 'tax' && sq.tax != null) {
      body += `<p class="mono-deed-note">Landing here: pay <strong>${formatMoney(sq.tax)}</strong>.</p>`;
    } else if (sq.kind === 'nice') {
      const deck = niceSquareDeck(idx);
      const dkTitle =
        deck === 'communityChest' ? 'Community Chest' : deck === 'chance' ? 'Chance' : 'Community';
      if (deck === 'communityChest') {
        body += `<p class="mono-deed-note">Community Chest — no purchase; draw when you land here.</p>`;
      } else if (deck === 'chance') {
        body += `<p class="mono-deed-note">Chance — no purchase; draw when you land here.</p>`;
      } else {
        body += `<p class="mono-deed-note">${dkTitle} spot — no purchase.</p>`;
      }
    } else if (sq.kind === 'corner') {
      if (idx === 0) {
        body += `<p class="mono-deed-note">Pass or land here: collect <strong>${formatMoney(GO_BONUS)}</strong>.</p>`;
      } else if (idx === 10) {
        body +=
          '<p class="mono-deed-note">Shuttle corner — “walking past” is just visiting; “on the bus” is serving trackwork time.</p>';
      } else if (idx === 20) {
        body +=
          '<p class="mono-deed-note">Neighborhood corner — no listing fee when you land here.</p>';
      } else if (idx === 30) {
        body +=
          '<p class="mono-deed-note">Trackwork — go to the shuttle corner and wait for doubles, pay the fine, or roll out after three tries.</p>';
      }
    }

    if (!body.trim()) {
      body = '<p class="mono-deed-note">No purchase info for this tile.</p>';
    }

    const nameHtml = escapeHtml(sq.name).replace(/\n/g, '<br/>');
    const dismissLabel = escapeHtml(sq.name.replace(/\n/g, ' '));
    return `
      <button type="button" class="mono-deed-tile-close" aria-label="Dismiss ${dismissLabel}">&times;</button>
      <div class="mono-deed-strip" style="background:${stripHex}"></div>
      <div class="mono-deed-head">
        <span class="mono-deed-label">${escapeHtml(headerTitle)}</span>
        <h3 class="mono-deed-name">${nameHtml}</h3>
      </div>
      <div class="mono-deed-body">${body}</div>
    `;
  }

  function useMonoDeedModal() {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
  }

  function mountDeedTrayForViewport() {
    if (!els.deedTray || !els.boardRoot) return;
    const modal = !els.deedTray.hidden && useMonoDeedModal() && deedOpenOrder.length > 0;
    if (modal) {
      if (els.deedTray.parentNode !== document.body) {
        document.body.appendChild(els.deedTray);
      }
    } else if (els.deedTray.parentNode === document.body) {
      els.boardRoot.after(els.deedTray);
    }
  }

  function syncMonoDeedModalShell() {
    if (!els.deedTray) return;
    mountDeedTrayForViewport();
    const modal = !els.deedTray.hidden && useMonoDeedModal() && deedOpenOrder.length > 0;
    els.deedTray.classList.toggle('mono-deed-tray--modal', modal);
    document.documentElement.classList.toggle('mono-deed-modal-open', modal);
    document.body.classList.toggle('mono-deed-modal-open', modal);
    if (modal) {
      els.deedTray.setAttribute('role', 'dialog');
      els.deedTray.setAttribute('aria-modal', 'true');
    } else {
      els.deedTray.removeAttribute('role');
      els.deedTray.removeAttribute('aria-modal');
    }
  }

  function renderDeedTray() {
    if (!els.deedTray) return;
    els.deedTray.innerHTML = '';
    if (deedOpenOrder.length === 0) {
      els.deedTray.hidden = true;
      els.deedTray.setAttribute('aria-hidden', 'true');
      els.deedTray.classList.remove('mono-deed-tray--modal');
      els.deedTray.removeAttribute('role');
      els.deedTray.removeAttribute('aria-modal');
      document.body.classList.remove('mono-deed-modal-open');
      document.documentElement.classList.remove('mono-deed-modal-open');
      mountDeedTrayForViewport();
      return;
    }
    els.deedTray.hidden = false;
    els.deedTray.setAttribute('aria-hidden', 'false');
    deedOpenOrder.forEach((idx) => {
      const art = document.createElement('article');
      art.className = 'mono-deed-tile';
      art.dataset.boardIdx = String(idx);
      art.setAttribute('aria-label', `${BOARD[idx].name.replace(/\n/g, ' ')} listing`);
      const scroll = document.createElement('div');
      scroll.className = 'mono-deed-tile-scroll';
      scroll.innerHTML = buildDeedCardMarkup(idx);
      scroll.querySelector('.mono-deed-tile-close')?.addEventListener('click', () => removeDeedTile(idx));
      art.appendChild(scroll);
      const foot = buildDeedActionBarEl(idx);
      if (foot) art.appendChild(foot);
      els.deedTray.appendChild(art);
    });
    syncMonoDeedModalShell();
  }

  function toggleDeedTile(idx) {
    if (idx < 0 || idx >= BOARD.length) return;
    const pos = deedOpenOrder.indexOf(idx);
    if (useMonoDeedModal()) {
      if (pos >= 0) deedOpenOrder.splice(pos, 1);
      else {
        deedOpenOrder.length = 0;
        deedOpenOrder.push(idx);
      }
    } else if (pos >= 0) deedOpenOrder.splice(pos, 1);
    else deedOpenOrder.push(idx);
    renderDeedTray();
  }

  function removeDeedTile(idx) {
    const pos = deedOpenOrder.indexOf(idx);
    if (pos >= 0) deedOpenOrder.splice(pos, 1);
    renderDeedTray();
  }

  function closeAllDeedTiles() {
    deedOpenOrder.length = 0;
    renderDeedTray();
  }

  function wireDeedUI(boardRoot) {
    if (els.deedTray) return;

    const tray = document.createElement('div');
    tray.id = 'monoDeedTray';
    tray.className = 'mono-deed-tray';
    tray.hidden = true;
    tray.setAttribute('aria-hidden', 'true');
    tray.setAttribute('aria-label', 'Open listing cards');
    boardRoot.after(tray);
    els.deedTray = tray;

    tray.addEventListener('click', (e) => {
      if (!tray.classList.contains('mono-deed-tray--modal')) return;
      if (e.target === tray) closeAllDeedTiles();
    });

    if (!monoDeedModalMmBound) {
      monoDeedModalMmBound = true;
      window.matchMedia('(max-width: 640px)').addEventListener('change', () => {
        if (els.deedTray && deedOpenOrder.length > 0) renderDeedTray();
        else if (els.deedTray) {
          els.deedTray.classList.remove('mono-deed-tray--modal');
          document.body.classList.remove('mono-deed-modal-open');
          document.documentElement.classList.remove('mono-deed-modal-open');
          mountDeedTrayForViewport();
        }
      });
    }

    boardRoot.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-board-idx]');
      if (!cell || !boardRoot.contains(cell)) return;
      toggleDeedTile(Number(cell.dataset.boardIdx));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (collapseMonoExpands()) return;
      if (!els.deedTray || els.deedTray.hidden) return;
      closeAllDeedTiles();
    });
  }

  function houseCostFor(idx) {
    const sq = BOARD[idx];
    if (sq.kind !== 'property') return 0;
    if (sq.houseCost != null) return sq.houseCost;
    return Math.round(sq.price * 0.5);
  }

  function hotelCostFor(idx) {
    const sq = BOARD[idx];
    if (sq.kind !== 'property') return 0;
    if (sq.hotelCost != null) return sq.hotelCost;
    return Math.round(sq.price * 0.75);
  }

  /** UK deed: mortgage = half listing price (already ×25 in `sq.price`). */
  function mortgageValueFor(idx) {
    const sq = BOARD[idx];
    if (sq.price == null) return 0;
    return Math.floor(sq.price / 2);
  }

  function unmortgageCostFor(idx) {
    const m = mortgageValueFor(idx);
    return m + Math.ceil(m * 0.1);
  }

  function groupHasMortgaged(owner, group) {
    if (!group) return false;
    let found = false;
    BOARD.forEach((sq, idx) => {
      if (sq.kind !== 'property' || sq.group !== group || state.ownership[idx] !== owner) return;
      if (state.mortgaged[idx]) found = true;
    });
    return found;
  }

  function maxGroupH(owner, group, ownership, buildings) {
    let maxH = 0;
    BOARD.forEach((sq, idx) => {
      if (sq.group !== group || ownership[idx] !== owner) return;
      const b = buildings[idx] || { houses: 0, hotel: false };
      const h = b.hotel ? 5 : b.houses;
      maxH = Math.max(maxH, h);
    });
    return maxH;
  }

  function canSellHere(owner, idx, ownership, buildings) {
    const sq = BOARD[idx];
    if (sq.kind !== 'property' || ownership[idx] !== owner) return false;
    const b = buildings[idx] || { houses: 0, hotel: false };
    if (b.hotel) return true;
    if (b.houses <= 0) return false;
    const maxH = maxGroupH(owner, sq.group, ownership, buildings);
    return b.houses === maxH;
  }

  function canMortgage(playerIdx, idx) {
    const owner = PLAYERS[playerIdx];
    if (state.ownership[idx] !== owner || state.mortgaged[idx]) return false;
    const sq = BOARD[idx];
    if (sq.price == null) return false;
    if (sq.kind === 'property') {
      if (maxGroupH(owner, sq.group, state.ownership, state.buildings) > 0) return false;
    }
    return true;
  }

  function canUnmortgage(playerIdx, idx) {
    if (state.ownership[idx] !== PLAYERS[playerIdx] || !state.mortgaged[idx]) return false;
    return state.cash[playerIdx] >= unmortgageCostFor(idx);
  }

  function applyMortgage(playerIdx, idx) {
    if (playerIdx === 0 && !humanPortfolioLiquidityAllowed()) return false;
    if (!canMortgage(playerIdx, idx)) return false;
    const m = mortgageValueFor(idx);
    state.mortgaged[idx] = true;
    state.cash[playerIdx] += m;
    log(`${PLAYER_LABEL[PLAYERS[playerIdx]]} mortgaged ${BOARD[idx].name.replace(/\n/g, ' ')} (+${formatMoney(m)}).`);
    save();
    renderAll();
    return true;
  }

  function applyUnmortgage(playerIdx, idx) {
    if (playerIdx === 0 && !humanUnmortgageAllowed()) return false;
    const c = unmortgageCostFor(idx);
    if (!canUnmortgage(playerIdx, idx)) return false;
    state.cash[playerIdx] -= c;
    delete state.mortgaged[idx];
    log(`${PLAYER_LABEL[PLAYERS[playerIdx]]} unmortgaged ${BOARD[idx].name.replace(/\n/g, ' ')} (${formatMoney(c)}).`);
    save();
    renderAll();
    return true;
  }

  function sellOneBuilding(ownerKey, idx) {
    if (!canSellHere(ownerKey, idx, state.ownership, state.buildings)) return false;
    const sq = BOARD[idx];
    const b = state.buildings[idx] || { houses: 0, hotel: false };
    const pi = ownerKey === 'human' ? 0 : 1;
    if (b.hotel) {
      const ref = Math.floor(hotelCostFor(idx) / 2);
      state.buildings[idx] = { houses: 4, hotel: false };
      state.cash[pi] += ref;
      log(`${PLAYER_LABEL[ownerKey]} sold hotel on ${sq.name.replace(/\n/g, ' ')} (+${formatMoney(ref)}).`);
    } else {
      const ref = Math.floor(houseCostFor(idx) / 2);
      state.buildings[idx] = { houses: b.houses - 1, hotel: false };
      state.cash[pi] += ref;
      log(`${PLAYER_LABEL[ownerKey]} sold a house on ${sq.name.replace(/\n/g, ' ')} (+${formatMoney(ref)}).`);
    }
    save();
    renderAll();
    return true;
  }

  /** Half of house/hotel cost — matches `sellOneBuilding`. */
  function sellBackRefundFor(idx) {
    const b = state.buildings[idx] || { houses: 0, hotel: false };
    if (b.hotel) return Math.floor(hotelCostFor(idx) / 2);
    if (b.houses > 0) return Math.floor(houseCostFor(idx) / 2);
    return 0;
  }

  function humanPortfolioLiquidityAllowed() {
    const ph = state.phase;
    return (
      ph === 'player_roll' || ph === 'player_buy' || ph === 'player_raise_cash' || ph === 'player_jail'
    );
  }

  function humanUnmortgageAllowed() {
    return (
      (state.phase === 'player_roll' || state.phase === 'player_jail') &&
      state.paymentDue == null &&
      state.winner == null
    );
  }

  /** @returns {string|null} null if a house/hotel can be placed here under Monopoly rules (cash / phase checks separate). */
  function humanBuildDisabledReason(idx) {
    const sq = BOARD[idx];
    if (sq.kind !== 'property' || state.ownership[idx] !== 'human') return 'Not your listing.';
    const b = state.buildings[idx] || { houses: 0, hotel: false };
    if (b.hotel) return 'Already a hotel.';
    if (!hasMonopoly('human', sq.group, state.ownership)) return 'Own every lot in this color to build.';
    if (groupHasMortgaged('human', sq.group)) return 'Unmortgage this color group first.';
    if (canBuildHere('human', idx, state.ownership, state.buildings)) return null;
    if (b.houses === 4)
      return 'Other lots in this color need 4 houses each before any hotel.';
    return 'Even building: add to shorter lots in this color first.';
  }

  function formatGroupTitle(groupKey) {
    if (groupKey === '__transit') return 'Transit';
    if (groupKey === '__utility') return 'Utilities';
    if (groupKey === '__misc') return 'Other';
    return String(groupKey)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function humanCanBuildThisTurn() {
    return (
      state.phase === 'player_roll' &&
      state.turnOwner === 0 &&
      state.winner == null &&
      !humanServingJail()
    );
  }

  function monoHudPaused() {
    return els.continueWrap && !els.continueWrap.hidden;
  }

  /** Inline sections below jail actions (not modals). */
  let monoExpandDevelop = false;
  let monoExpandFinance = false;
  let monoExpandListings = false;

  function collapseMonoExpands() {
    let ch = false;
    if (monoExpandDevelop) {
      monoExpandDevelop = false;
      ch = true;
    }
    if (monoExpandFinance) {
      monoExpandFinance = false;
      ch = true;
    }
    if (monoExpandListings) {
      monoExpandListings = false;
      ch = true;
    }
    if (ch) syncMonoExpandShell();
    return ch;
  }

  function syncMonoExpandShell() {
    const dOpen = monoExpandDevelop;
    const fOpen = monoExpandFinance;
    const lOpen = monoExpandListings;
    if (els.developExpandWrap) {
      els.developExpandWrap.classList.toggle('mono-expand--open', dOpen);
    }
    if (els.developExpandBody) {
      els.developExpandBody.hidden = !dOpen;
      els.developExpandBody.setAttribute('aria-hidden', dOpen ? 'false' : 'true');
    }
    if (els.developExpandToggle) {
      els.developExpandToggle.setAttribute('aria-expanded', dOpen ? 'true' : 'false');
    }
    if (els.financeExpandWrap) {
      els.financeExpandWrap.classList.toggle('mono-expand--open', fOpen);
    }
    if (els.financeExpandBody) {
      els.financeExpandBody.hidden = !fOpen;
      els.financeExpandBody.setAttribute('aria-hidden', fOpen ? 'false' : 'true');
    }
    if (els.financeExpandToggle) {
      els.financeExpandToggle.setAttribute('aria-expanded', fOpen ? 'true' : 'false');
    }
    if (els.listingsExpandWrap) {
      els.listingsExpandWrap.classList.toggle('mono-expand--open', lOpen);
    }
    if (els.listingsExpandBody) {
      els.listingsExpandBody.hidden = !lOpen;
      els.listingsExpandBody.setAttribute('aria-hidden', lOpen ? 'false' : 'true');
    }
    if (els.listingsExpandToggle) {
      els.listingsExpandToggle.setAttribute('aria-expanded', lOpen ? 'true' : 'false');
    }
  }

  function refreshMonoExpandBodies() {
    if (monoExpandDevelop) renderDevelopPanelBody();
    if (monoExpandFinance) renderFinancePanelBody();
  }

  /** Listing chip: same vibe as portfolio — toggles deed tray. */
  function makeListingChipButton(idx) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'mono-portfolio-chip mono-li-chip';
    chip.style.setProperty('--chip-accent', portfolioAccentColor(idx));
    if (state.mortgaged[idx]) chip.classList.add('mono-portfolio-chip--mortgaged');
    chip.textContent = portfolioLineFor(idx);
    chip.title = 'Open listing card';
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.winner != null) return;
      toggleDeedTile(idx);
      renderAll();
    });
    return chip;
  }

  function financeBlockedReason(idx) {
    const sq = BOARD[idx];
    if (state.ownership[idx] !== 'human' || state.mortgaged[idx]) return null;
    if (canMortgage(0, idx)) return null;
    if (sq.kind === 'property') {
      if (maxGroupH('human', sq.group, state.ownership, state.buildings) > 0)
        return 'Sell buildings on this color first.';
    }
    if (sq.price == null) return 'Not mortgagable.';
    return 'Cannot mortgage.';
  }

  function buildDeedActionBarEl(idx) {
    const owner = state.ownership[idx];
    const sq = BOARD[idx];
    const wrap = document.createElement('div');
    wrap.className = 'mono-deed-actions';

    if (owner !== 'human') {
      if (owner === 'ai' && sq.price != null) {
        const p = document.createElement('p');
        p.className = 'mono-deed-actions-note';
        p.textContent = `${PLAYER_LABEL.ai} holds this listing.`;
        wrap.appendChild(p);
      }
      return wrap.childElementCount ? wrap : null;
    }

    const paused = monoHudPaused();
    const row = document.createElement('div');
    row.className = 'mono-deed-actions-row';

    if (sq.kind === 'property' && sq.price != null) {
      const b = state.buildings[idx] || { houses: 0, hotel: false };
      if (!b.hotel) {
        const nextIsHotel = b.houses === 4 && !b.hotel;
        const nextCost = nextIsHotel ? hotelCostFor(idx) : houseCostFor(idx);
        const reason = humanBuildDisabledReason(idx);
        const canAct = humanCanBuildThisTurn() && !paused;
        const affordable = state.cash[0] >= nextCost;
        const canClick = canAct && reason == null && affordable;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mono-mini-btn mono-deed-act';
        btn.textContent = nextIsHotel
          ? `Hotel · ${formatMoney(nextCost)}`
          : `House · ${formatMoney(nextCost)} · ${b.houses}/4`;
        btn.disabled = !canClick || state.winner != null;
        if (!canAct) {
          btn.title = humanServingJail()
            ? 'Finish shuttle / roll first.'
            : 'Roll first — building is between moves.';
        } else if (reason) btn.title = reason;
        else if (!affordable) btn.title = `Need ${formatMoney(nextCost - state.cash[0])} more.`;
        else btn.title = '';
        btn.addEventListener('click', () => onBuildPick(idx));
        row.appendChild(btn);
      }

      if (
        humanPortfolioLiquidityAllowed() &&
        !paused &&
        canSellHere('human', idx, state.ownership, state.buildings)
      ) {
        const bSell = state.buildings[idx] || { houses: 0, hotel: false };
        const ref = sellBackRefundFor(idx);
        const sb = document.createElement('button');
        sb.type = 'button';
        sb.className = 'mono-mini-btn';
        sb.textContent = bSell.hotel
          ? `Sell hotel · +${formatMoney(ref)}`
          : `Sell house · +${formatMoney(ref)}`;
        sb.title = 'You get half of what you paid for this upgrade (bank buys it back).';
        sb.disabled = state.winner != null;
        sb.addEventListener('click', () => sellOneBuilding('human', idx));
        row.appendChild(sb);
      }
    }

    if (sq.price != null && (sq.kind === 'property' || sq.kind === 'transit' || sq.kind === 'utility')) {
      if (humanPortfolioLiquidityAllowed() && !paused && canMortgage(0, idx)) {
        const mb = document.createElement('button');
        mb.type = 'button';
        mb.className = 'mono-mini-btn';
        mb.textContent = `Mortgage +${formatMoney(mortgageValueFor(idx))}`;
        mb.disabled = state.winner != null;
        mb.addEventListener('click', () => applyMortgage(0, idx));
        row.appendChild(mb);
      }
      if (state.mortgaged[idx]) {
        const ub = document.createElement('button');
        ub.type = 'button';
        ub.className = 'mono-mini-btn';
        ub.textContent = `Unmortgage ${formatMoney(unmortgageCostFor(idx))}`;
        const umOk = humanUnmortgageAllowed() && canUnmortgage(0, idx);
        ub.disabled = !umOk || state.winner != null || paused;
        if (!paused) {
          if (!humanUnmortgageAllowed())
            ub.title = state.paymentDue
              ? 'Pay or raise cash for your current bill first.'
              : 'Between rolls only.';
          else if (!canUnmortgage(0, idx))
            ub.title = `Need ${formatMoney(unmortgageCostFor(idx) - state.cash[0])} more.`;
        }
        ub.addEventListener('click', () => applyUnmortgage(0, idx));
        row.appendChild(ub);
      }
    }

    if (row.childElementCount) wrap.appendChild(row);
    return wrap.childElementCount ? wrap : null;
  }

  function renderDevelopPanelBody() {
    if (!els.developExpandBody) return;
    els.developExpandBody.replaceChildren();
    const paused = monoHudPaused();
    const TIER_RANK = { complete: 0, completable: 1, blocked: 2 };

    const groups = portfolioGroupsFor('human').filter((g) =>
      g.items.some(({ idx: i }) => BOARD[i].kind === 'property'),
    );

    const ownedEntries = groups
      .map((g) => {
        const propItems = g.items.filter(({ idx: i }) => BOARD[i].kind === 'property');
        if (propItems.length === 0) return null;
        const groupKey = g.groupKey;
        if (groupKey === '__misc' || groupKey === '__transit' || groupKey === '__utility') return null;
        const stats = developColorGroupStats(groupKey);
        if (stats.total === 0) return null;
        const hasMono = hasMonopoly('human', groupKey, state.ownership);
        const tier = developGroupTier(groupKey);
        const boardMin = developGroupBoardMinIndex(groupKey);
        return { g, propItems, groupKey, stats, hasMono, tier, boardMin };
      })
      .filter(Boolean);

    const ownedColorKeys = new Set(
      ownedEntries.map((e) => e.groupKey).filter((k) => typeof k === 'string' && !String(k).startsWith('__')),
    );

    const missingEntries = developAllColorGroupKeys()
      .filter((groupKey) => !ownedColorKeys.has(groupKey))
      .map((groupKey) => {
        const stats = developColorGroupStats(groupKey);
        if (stats.total === 0) return null;
        const boardMin = developGroupBoardMinIndex(groupKey);
        const accent = portfolioRowAccent(groupKey, stats.indices[0]);
        const g = { groupKey, accent, items: [] };
        const hasMono = hasMonopoly('human', groupKey, state.ownership);
        const tier = developGroupTier(groupKey);
        return { g, propItems: [], groupKey, stats, hasMono, tier, boardMin };
      })
      .filter(Boolean);

    const entries = [...ownedEntries, ...missingEntries].sort((a, b) => {
      const d = TIER_RANK[a.tier] - TIER_RANK[b.tier];
      if (d !== 0) return d;
      return a.boardMin - b.boardMin;
    });

    if (entries.length === 0) {
      const p = document.createElement('p');
      p.className = 'mono-panel-empty';
      p.textContent = 'No title listings yet. Buy a full color set to unlock builds.';
      els.developExpandBody.appendChild(p);
      return;
    }

    const foot = document.createElement('p');
    foot.className = 'mono-panel-foot';
    foot.textContent =
      'See all of your properties in the Financing section.';

    let lastTier = /** @type {string | null} */ (null);
    for (const ent of entries) {
      if (ent.tier !== lastTier) {
        const tierH = document.createElement('div');
        tierH.className = 'mono-dev-tier-label';
        tierH.textContent =
          ent.tier === 'complete'
            ? 'Monopoly'
            : ent.tier === 'completable'
              ? 'Still completable'
              : 'Blocked — mixed ownership';
        els.developExpandBody.appendChild(tierH);
        lastTier = ent.tier;
      }

      const { g, propItems, groupKey, stats, hasMono } = ent;
      const section = document.createElement('section');
      section.className = 'mono-dev-section';

      const header = document.createElement('div');
      header.className = 'mono-dev-group-banner mono-dev-group-header';
      header.style.setProperty('--dev-group-accent', g.accent);
      header.textContent = developOneLineHeader(groupKey, stats, hasMono, ent.tier);
      section.appendChild(header);

      if (!hasMono) {
        els.developExpandBody.appendChild(section);
        continue;
      }

      const rowMeta = [...propItems]
        .sort((x, y) => x.idx - y.idx)
        .map(({ idx }) => {
          const b = state.buildings[idx] || { houses: 0, hotel: false };
          const kind = b.hotel ? 'maxed' : 'build';
          return { idx, b, kind };
        });

      for (const { idx, b, kind } of rowMeta) {
        const row = document.createElement('div');
        row.className = 'mono-dev-row';

        const chipWrap = document.createElement('div');
        chipWrap.className = 'mono-dev-chipwrap';
        chipWrap.appendChild(makeListingChipButton(idx));
        if (kind === 'maxed') {
          const sp = document.createElement('span');
          sp.className = 'mono-dev-hint-inline';
          sp.textContent = '· Maxed';
          chipWrap.appendChild(sp);
        }

        const actions = document.createElement('div');
        actions.className = 'mono-dev-actions';

        if (kind === 'build') {
          const inList = humanBuildableProps().includes(idx);
          const nextIsHotel = b.houses === 4 && !b.hotel;
          const nextCost = nextIsHotel ? hotelCostFor(idx) : houseCostFor(idx);
          const canAct = humanCanBuildThisTurn() && !paused;
          const affordable = state.cash[0] >= nextCost;

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'mono-mini-btn';
          btn.textContent = nextIsHotel
            ? `Hotel · ${formatMoney(nextCost)}`
            : `House · ${formatMoney(nextCost)}`;
          const canGo = canAct && inList && affordable && state.winner == null;
          btn.disabled = !canGo;
          const br = humanBuildDisabledReason(idx);
          if (!canAct)
            btn.title = humanServingJail() ? 'Finish on the shuttle first.' : 'Roll when it is your turn.';
          else if (br) btn.title = br;
          else if (!affordable) btn.title = `Need ${formatMoney(nextCost - state.cash[0])} more.`;
          else if (!inList)
            btn.title = 'Even building rule — upgrade another lot in this color first.';
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onBuildPick(idx);
          });
          actions.appendChild(btn);
        }

        row.appendChild(chipWrap);
        row.appendChild(actions);
        section.appendChild(row);
      }
      els.developExpandBody.appendChild(section);
    }
    els.developExpandBody.appendChild(foot);
  }

  function renderFinancePanelBody() {
    if (!els.financeExpandBody) return;
    els.financeExpandBody.replaceChildren();
    const paused = monoHudPaused();

    /** @type {{ idx: number }[]} */
    const lift = [];
    /** @type {{ idx: number }[]} */
    const raise = [];
    /** @type {{ idx: number, reason: string }[]} */
    const blocked = [];

    BOARD.forEach((sq, idx) => {
      if (state.ownership[idx] !== 'human') return;
      if (sq.kind !== 'property' && sq.kind !== 'transit' && sq.kind !== 'utility') return;
      if (sq.price == null) return;
      if (state.mortgaged[idx]) lift.push({ idx });
      else if (canMortgage(0, idx)) raise.push({ idx });
      else blocked.push({ idx, reason: financeBlockedReason(idx) || 'Cannot mortgage.' });
    });

    const makeSection = (title, classMod) => {
      const sec = document.createElement('section');
      sec.className = `mono-fin-section mono-fin-section--${classMod}`;
      const h = document.createElement('h4');
      h.className = 'mono-fin-heading';
      h.textContent = title;
      sec.appendChild(h);
      return sec;
    };

    const addRow = (container, idx, extras) => {
      const row = document.createElement('div');
      row.className = 'mono-fin-row';
      const chipWrap = document.createElement('div');
      chipWrap.className = 'mono-fin-chipwrap';
      chipWrap.appendChild(makeListingChipButton(idx));
      row.appendChild(chipWrap);
      const slot = document.createElement('div');
      slot.className = 'mono-fin-slot';
      extras(slot);
      row.appendChild(slot);
      container.appendChild(row);
    };

    if (lift.length === 0 && raise.length === 0 && blocked.length === 0) {
      const p = document.createElement('p');
      p.className = 'mono-panel-empty';
      p.textContent = 'No listings to finance yet.';
      els.financeExpandBody.appendChild(p);
      return;
    }

    if (lift.length) {
      const sec = makeSection('Unmortgage (restore rent)', 'lift');
      const list = document.createElement('div');
      list.className = 'mono-fin-list';
      lift.forEach(({ idx }) => {
        addRow(list, idx, (slot) => {
          const cost = unmortgageCostFor(idx);
          const umOk = humanUnmortgageAllowed() && canUnmortgage(0, idx);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'mono-mini-btn';
          btn.textContent = `Pay ${formatMoney(cost)}`;
          btn.disabled = !umOk || state.winner != null || paused;
          if (!paused) {
            if (!humanUnmortgageAllowed())
              btn.title = state.paymentDue
                ? 'Pay or raise cash for your current bill first.'
                : 'Between rolls only.';
            else if (!canUnmortgage(0, idx))
              btn.title = `Need ${formatMoney(cost - state.cash[0])} more.`;
          }
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyUnmortgage(0, idx);
          });
          slot.appendChild(btn);
        });
      });
      sec.appendChild(list);
      els.financeExpandBody.appendChild(sec);
    }

    if (raise.length) {
      const sec = makeSection('Mortgage (raise cash)', 'raise');
      const list = document.createElement('div');
      list.className = 'mono-fin-list';
      raise.forEach(({ idx }) => {
        addRow(list, idx, (slot) => {
          const gain = mortgageValueFor(idx);
          const ok = humanPortfolioLiquidityAllowed();
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'mono-mini-btn';
          btn.textContent = `+${formatMoney(gain)}`;
          btn.disabled = !ok || state.winner != null || paused;
          if (!ok) btn.title = 'Not available during this phase.';
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyMortgage(0, idx);
          });
          slot.appendChild(btn);
        });
      });
      sec.appendChild(list);
      els.financeExpandBody.appendChild(sec);
    }

    if (blocked.length) {
      const sec = makeSection('Cannot mortgage yet', 'blocked');
      const list = document.createElement('div');
      list.className = 'mono-fin-list';
      blocked.forEach(({ idx, reason }) => {
        addRow(list, idx, (slot) => {
          const sp = document.createElement('span');
          sp.className = 'mono-fin-reason';
          sp.textContent = reason;
          slot.appendChild(sp);
        });
      });
      sec.appendChild(list);
      els.financeExpandBody.appendChild(sec);
    }

    const foot = document.createElement('p');
    foot.className = 'mono-panel-foot';
    foot.textContent =
      'Tap a listing chip to open its card.';
    els.financeExpandBody.appendChild(foot);
  }

  function wireMonoExpandSections(center) {
    els.developExpandWrap = center.querySelector('#monoDevelopExpand');
    els.developExpandToggle = center.querySelector('#monoDevelopToggle');
    els.developExpandBody = center.querySelector('#monoDevelopBody');
    els.financeExpandWrap = center.querySelector('#monoFinanceExpand');
    els.financeExpandToggle = center.querySelector('#monoFinanceToggle');
    els.financeExpandBody = center.querySelector('#monoFinanceBody');
    els.listingsExpandWrap = center.querySelector('#monoListingsExpand');
    els.listingsExpandToggle = center.querySelector('#monoListingsToggle');
    els.listingsExpandBody = center.querySelector('#monoListingsBody');
    els.developBadge = center.querySelector('#monoDevelopBadge');

    els.developExpandToggle?.addEventListener('click', () => {
      if (els.developExpandToggle.disabled) return;
      monoExpandDevelop = !monoExpandDevelop;
      syncMonoExpandShell();
      refreshMonoExpandBodies();
    });
    els.financeExpandToggle?.addEventListener('click', () => {
      if (els.financeExpandToggle.disabled) return;
      monoExpandFinance = !monoExpandFinance;
      syncMonoExpandShell();
      refreshMonoExpandBodies();
    });
    els.listingsExpandToggle?.addEventListener('click', () => {
      monoExpandListings = !monoExpandListings;
      syncMonoExpandShell();
      queueMicrotask(() => schedulePortfolioScrollHints());
    });
    syncMonoExpandShell();
  }

  function rentMultiplier(houses, hotel) {
    if (hotel) return 8;
    if (houses <= 0) return 1;
    return houses + 1;
  }

  function countGroupOwned(group, owner, ownership) {
    if (!group) return 0;
    let n = 0;
    BOARD.forEach((sq, idx) => {
      if (sq.group === group && ownership[idx] === owner) n++;
    });
    return n;
  }

  function groupSize(group) {
    return BOARD.filter((sq) => sq.group === group).length;
  }

  function hasMonopoly(owner, group, ownership) {
    return countGroupOwned(group, owner, ownership) === groupSize(group);
  }

  function developGroupPropertyIndices(group) {
    const idxs = [];
    BOARD.forEach((sq, idx) => {
      if (sq.kind === 'property' && sq.group === group) idxs.push(idx);
    });
    return idxs;
  }

  function developColorGroupStats(group) {
    const indices = developGroupPropertyIndices(group);
    let human = 0;
    let ai = 0;
    let unowned = 0;
    for (const idx of indices) {
      const o = state.ownership[idx];
      if (o === 'human') human++;
      else if (o === 'ai') ai++;
      else unowned++;
    }
    return { total: indices.length, human, ai, unowned, indices };
  }

  function developGroupBoardMinIndex(group) {
    const idxs = developGroupPropertyIndices(group);
    if (idxs.length === 0) return 9999;
    return Math.min(...idxs);
  }

  /** Distinct title color group ids on the board (develop panel only). */
  function developAllColorGroupKeys() {
    const s = new Set();
    BOARD.forEach((sq) => {
      if (sq.kind === 'property' && sq.group) s.add(sq.group);
    });
    return [...s];
  }

  /** complete = you have monopoly; completable = you can still finish set (no investor lots); blocked otherwise. */
  function developGroupTier(groupKey) {
    if (hasMonopoly('human', groupKey, state.ownership)) return 'complete';
    if (developColorGroupStats(groupKey).ai > 0) return 'blocked';
    return 'completable';
  }

  function developOneLineHeader(groupKey, stats, hasMono, tier) {
    const title = formatGroupTitle(groupKey);
    const you = `You: ${stats.human}/${stats.total}`;
    if (hasMono) return `${title} · ${you} · monopoly`;
    if (tier === 'blocked') {
      const inv = `${PLAYER_LABEL.ai}: ${stats.ai}/${stats.total}`;
      return `${title} · ${you} · ${inv}`;
    }
    return `${title} · ${you} · completable: yes`;
  }

  function computeRent(idx, ownership, buildings) {
    const sq = BOARD[idx];
    const owner = ownership[idx];
    if (!owner || sq.kind === 'corner' || sq.kind === 'tax' || sq.kind === 'nice') return 0;
    if (state.mortgaged[idx]) return 0;

    if (sq.kind === 'transit') {
      /* Rent tiers 1–4 railroads owned (same owner): $625 / $1,250 / $2,500 / $5,000 — see computeRent table */
      const n = countGroupOwned('transit', owner, ownership);
      const table = [625, 1250, 2500, 5000];
      return table[Math.max(0, Math.min(n, 4) - 1)] ?? 250;
    }

    if (sq.kind === 'utility') {
      const n = countGroupOwned('utility', owner, ownership);
      const diceTotal = state.lastDiceTotal ?? 7;
      const perDice = n >= 2 ? UTILITY_PER_DICE_BOTH : UTILITY_PER_DICE_ONE;
      return diceTotal * perDice;
    }

    const b = buildings[idx] || { houses: 0, hotel: false };
    const mono = hasMonopoly(owner, sq.group, ownership);
    const sch = sq.rentSchedule;
    if (sch?.length === 6) {
      if (b.hotel) return sch[5];
      if (b.houses >= 1 && b.houses <= 4) return sch[b.houses];
      let site = sch[0];
      if (mono) site *= 2;
      return Math.round(site);
    }
    let mult = rentMultiplier(b.houses, b.hotel);
    let rent = sq.baseRent * mult;
    if (mono && b.houses === 0 && !b.hotel) rent *= 2;
    return Math.round(rent);
  }

  function minGroupH(owner, group, ownership, buildings) {
    let minH = Infinity;
    BOARD.forEach((sq, idx) => {
      if (sq.group !== group || ownership[idx] !== owner) return;
      const b = buildings[idx] || { houses: 0, hotel: false };
      const h = b.hotel ? 5 : b.houses;
      minH = Math.min(minH, h);
    });
    return minH === Infinity ? 0 : minH;
  }

  function canBuildHere(owner, idx, ownership, buildings) {
    const sq = BOARD[idx];
    if (groupHasMortgaged(owner, sq.group)) return false;
    const b = buildings[idx] || { houses: 0, hotel: false };
    if (b.hotel) return false;
    if (b.houses === 4 && !b.hotel) {
      return BOARD.every((s, i) => {
        if (s.group !== sq.group || ownership[i] !== owner) return true;
        const ob = buildings[i] || { houses: 0, hotel: false };
        if (ob.hotel) return true;
        return ob.houses === 4;
      });
    }
    const h = b.houses;
    const minH = minGroupH(owner, sq.group, ownership, buildings);
    return h === minH;
  }

  const AI_QUIPS = {
    buy: [
      'Another listing off the market.',
      'Trust me, comps support this.',
      "You'll regret passing at this price.",
    ],
    pass: [
      "I'll pass — saving dry powder.",
      'Too thin on cash for that one.',
      'My spreadsheet says no.',
    ],
    house: [
      'Minor cosmetic upgrades incoming.',
      'Adding value for the neighborhood.',
    ],
  };

  function aiPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function initialState(opts = {}) {
    return {
      positions: [0, 0],
      cash: [STARTING_CASH, STARTING_CASH],
      ownership: {},
      buildings: {},
      turn: 0,
      phase: 'player_roll',
      history: [],
      winner: null,
      lastDiceTotal: 7,
      inJail: [null, null],
      pendingDoublesExtraRoll: false,
      doublesRunHuman: 0,
      doublesRunAi: 0,
      bankruptDetail: null,
      mortgaged: {},
      paymentDue: null,
      paymentResume: null,
      /** Whose turn to take actions: 0 = you, 1 = AI opponent (survives refresh). */
      turnOwner: 0,
      aiVariant: normalizeAiVariant(opts.aiVariant ?? 'regular_joe'),
      gameStarted: Boolean(opts.gameStarted),
      /** Get Out Of Jail Free: which deck pile (not both simultaneously per deck). */
      goojfHeld: createEmptyGoojfHeld(),
      chanceDeck: /** @type {string[]} */ ([]),
      communityChestDeck: /** @type {string[]} */ ([]),
      /** Holds drawn card overlay context until dismissed / applied. */
      pendingCardReveal: /** @type {null | {
        playerIdx: number,
        cardId: string,
        body: string,
        deckTitle: string,
        landingPayCtx: { tag: string, wantsDouble?: boolean },
      }} */ (null),
    };
  }

  function startFreshGame() {
    collapseMonoExpands();
    closeAllDeedTiles();
    const keepVariant = normalizeAiVariant(state.aiVariant);
    state = initialState({ aiVariant: keepVariant });
    save();
    if (els.continueWrap) els.continueWrap.hidden = true;
    if (els.gameOverEl) els.gameOverEl.hidden = true;
    if (els.diceEl) els.diceEl.textContent = '';
    els.cardOverlay?.classList.add('mono-card-overlay--hidden');
    els.cardSheet?.classList.remove('mono-card-sheet--investor');
    renderPrompt('Your turn — roll the dice.');
    log('New game.');
    renderAll();
  }

  function deriveGameStartedFromSnapshots() {
    if (state.positions[0] !== 0 || state.positions[1] !== 0) return true;
    const o = state.ownership;
    if (o && typeof o === 'object' && Object.keys(o).length > 0) return true;
    const m = state.mortgaged;
    if (m && typeof m === 'object' && Object.keys(m).length > 0) return true;
    const b = state.buildings;
    if (b && typeof b === 'object' && Object.keys(b).length > 0) return true;
    if (state.cash[0] !== STARTING_CASH || state.cash[1] !== STARTING_CASH) return true;
    return false;
  }

  function mountDifficultyDock() {
    const dock = document.getElementById('monoDifficultyDock');
    if (!dock || dock.dataset.wired === '1') return;
    dock.dataset.wired = '1';

    dock.innerHTML = `
      <span class="mono-difficulty-caption" id="monoDifficultyCaption">Opponent</span>
      <div class="mono-difficulty-segmented" role="radiogroup" aria-labelledby="monoDifficultyCaption">
        <button type="button" class="mono-difficulty-hit" role="radio" aria-checked="true" id="monoDiffEasy" data-variant="${DIFFICULTY_SEGMENTS.easy.variant}">
          <span class="mono-difficulty-chip-label">${DIFFICULTY_SEGMENTS.easy.label}</span>
          <span class="mono-difficulty-chip-sub">${DIFFICULTY_SEGMENTS.easy.subtitle}</span>
        </button>
        <button type="button" class="mono-difficulty-hit" role="radio" aria-checked="false" id="monoDiffHard" data-variant="${DIFFICULTY_SEGMENTS.hard.variant}">
          <span class="mono-difficulty-chip-label">${DIFFICULTY_SEGMENTS.hard.label}</span>
          <span class="mono-difficulty-chip-sub">${DIFFICULTY_SEGMENTS.hard.subtitle}</span>
        </button>
      </div>
      <p class="mono-difficulty-lock-hint" id="monoDifficultyLockHint" hidden>Locked once game is started.</p>
      <p class="mono-difficulty-tap-hint" id="monoDifficultyTapHint" hidden aria-live="polite">
        Restart to change difficulty.
      </p>
    `;

    els.difficultyDock = dock;
    els.difficultyEasyBtn = dock.querySelector('#monoDiffEasy');
    els.difficultyHardBtn = dock.querySelector('#monoDiffHard');
    els.difficultyLockHint = dock.querySelector('#monoDifficultyLockHint');
    els.difficultyTapHint = dock.querySelector('#monoDifficultyTapHint');

    function pick(variant) {
      if (state.winner != null) return;
      if (state.gameStarted) {
        flashDifficultyLockedTapHint();
        return;
      }
      state.aiVariant = normalizeAiVariant(variant);
      save();
      renderAll();
    }

    els.difficultyEasyBtn.addEventListener('click', () => pick(DIFFICULTY_SEGMENTS.easy.variant));
    els.difficultyHardBtn.addEventListener('click', () => pick(DIFFICULTY_SEGMENTS.hard.variant));
  }

  function mountRestartControls() {
    const cluster = document.getElementById('monoRestartCluster');
    const reveal = document.getElementById('monoRestartRevealBtn');
    const panel = document.getElementById('monoRestartConfirmPanel');
    const confirmBtn = document.getElementById('monoRestartConfirmBtn');
    const cancelBtn = document.getElementById('monoRestartCancelBtn');
    if (!cluster || !reveal || !panel || !confirmBtn || !cancelBtn || cluster.dataset.wired === '1') return;
    cluster.dataset.wired = '1';

    let docPointerBound = false;
    function onDocPointerDown(e) {
      if (!cluster.contains(e.target)) disarm();
    }

    function disarm() {
      reveal.hidden = false;
      panel.hidden = true;
      reveal.setAttribute('aria-expanded', 'false');
      if (docPointerBound) {
        document.removeEventListener('pointerdown', onDocPointerDown, true);
        docPointerBound = false;
      }
    }

    function arm() {
      reveal.hidden = true;
      panel.hidden = false;
      reveal.setAttribute('aria-expanded', 'true');
      confirmBtn.focus();
      if (!docPointerBound) {
        document.addEventListener('pointerdown', onDocPointerDown, true);
        docPointerBound = true;
      }
    }

    reveal.addEventListener('click', () => arm());
    cancelBtn.addEventListener('click', () => disarm());
    confirmBtn.addEventListener('click', () => {
      disarm();
      startFreshGame();
    });

    cluster.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (panel.hidden) return;
      e.preventDefault();
      disarm();
      reveal.focus();
    });
  }

  function syncDifficultyDock() {
    if (!els.difficultyEasyBtn || !els.difficultyHardBtn) return;
    const v = normalizeAiVariant(state.aiVariant);
    const isHard = v === AI_VARIANT_YES_MAN;
    els.difficultyEasyBtn.classList.toggle('mono-difficulty-hit--on', !isHard);
    els.difficultyHardBtn.classList.toggle('mono-difficulty-hit--on', isHard);
    els.difficultyEasyBtn.setAttribute('aria-checked', String(!isHard));
    els.difficultyHardBtn.setAttribute('aria-checked', String(isHard));
    const locked = state.gameStarted && state.winner == null;
    const mobileUnlock = locked && mobileDifficultyUx();
    els.difficultyEasyBtn.disabled = locked && !mobileUnlock;
    els.difficultyHardBtn.disabled = locked && !mobileUnlock;
    els.difficultyEasyBtn.setAttribute('aria-disabled', String(locked && !mobileUnlock));
    els.difficultyHardBtn.setAttribute('aria-disabled', String(locked && !mobileUnlock));
    if (els.difficultyLockHint) els.difficultyLockHint.hidden = !locked;
    if (els.difficultyTapHint && !locked) els.difficultyTapHint.hidden = true;
    if (els.difficultyDock) els.difficultyDock.classList.toggle('mono-difficulty-locked', locked);
  }

  let state = initialState();
  let cells = [];
  let els = {};
  let portfolioScrollRaf = null;
  let monoFooterDockBound = false;
  let monoDeedModalMmBound = false;
  /** Board indices with open listing cards (order preserved on desktop; mobile modal = one at a time). */
  let deedOpenOrder = [];
  /** Debounce resuming AI turn after refresh / normalize (see normalizeTurnState). */
  let monoAiResumeTimeout = null;
  let monoDifficultyResizeWired = false;

  function mobileDifficultyUx() {
    try {
      return typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches;
    } catch (_) {
      return false;
    }
  }

  function dismissDifficultyTapHint() {
    if (els.difficultyTapHint) els.difficultyTapHint.hidden = true;
  }

  function flashDifficultyLockedTapHint() {
    if (!mobileDifficultyUx()) return;
    if (!els.difficultyTapHint) return;
    els.difficultyTapHint.hidden = false;
  }

  /** Canonical: on the shuttle corner token + inJail record means you must pay / roll doubles (not “just visiting”). */
  function humanServingJail() {
    return (
      state.winner == null &&
      state.positions[0] === JAIL_INDEX &&
      state.inJail[0] != null &&
      typeof state.inJail[0] === 'object'
    );
  }

  function normalizeInJailSlot(raw) {
    if (raw == null || typeof raw !== 'object') return null;
    const fd = Number(raw.failedDoubles);
    const failedDoubles = Number.isFinite(fd) ? Math.max(0, Math.min(3, Math.floor(fd))) : 0;
    const fe = raw.forcedExitDice;
    const n = Number(fe);
    const forcedExitDice =
      fe != null && Number.isFinite(n) ? Math.max(2, Math.min(12, Math.floor(n))) : null;
    return { failedDoubles, forcedExitDice };
  }

  /** @param {unknown} raw */
  function migratePendingCardReveal(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const pi = Number(raw.playerIdx);
    const cardId = typeof raw.cardId === 'string' ? raw.cardId : '';
    const body = typeof raw.body === 'string' ? raw.body : '';
    const deckTitle = typeof raw.deckTitle === 'string' ? raw.deckTitle : '';
    const lpc = raw.landingPayCtx;
    if (!Number.isFinite(pi) || (pi !== 0 && pi !== 1) || !cardId) return null;
    if (!lpc || typeof lpc !== 'object' || typeof lpc.tag !== 'string') return null;
    return {
      playerIdx: pi,
      cardId,
      body,
      deckTitle,
      landingPayCtx: {
        tag: lpc.tag,
        wantsDouble: typeof lpc.wantsDouble === 'boolean' ? lpc.wantsDouble : undefined,
      },
    };
  }

  function renderHumanJailPrompt() {
    const inj = state.inJail[0];
    if (!inj) return;
    const fd = inj.failedDoubles;
    if (fd >= 3) {
      const fe = inj.forcedExitDice;
      renderPrompt(
        fe != null
          ? `You’re stuck on the shuttle — pay ${formatMoney(JAIL_FINE)} to leave, then move ${fe} spaces (your last roll).`
          : `You’re stuck on the shuttle — pay ${formatMoney(JAIL_FINE)} to leave.`,
      );
    } else {
      renderPrompt(
        `On the shuttle bus — pay ${formatMoney(JAIL_FINE)} before rolling, or try doubles (${3 - fd} tries left).`,
      );
    }
  }

  /**
   * Single source of truth: board + inJail drives phase, not the other way around.
   * Skips mid-resolution states so animation / payment flows stay intact.
   */
  function reconcileHumanJailPhase() {
    if (state.winner != null || state.phase === 'game_over') return;
    if (
      state.phase === 'player_buy' ||
      state.phase === 'player_raise_cash' ||
      state.phase === 'player_resolving' ||
      state.phase === 'player_card' ||
      state.phase === 'investor_card'
    ) {
      return;
    }
    if (state.turnOwner !== 0) return;
    const serving = humanServingJail();
    if (serving && state.phase !== 'player_jail') {
      state.phase = 'player_jail';
      renderHumanJailPrompt();
      return;
    }
    if (state.phase === 'player_jail' && !serving) {
      state.phase = 'player_roll';
      renderPrompt(
        state.pendingDoublesExtraRoll ? 'Doubles — roll again.' : 'Your turn — roll the dice.',
      );
    }
  }

  function log(line) {
    state.history.push(`${new Date().toISOString().slice(11, 19)} ${line}`);
    if (state.history.length > 80) state.history.shift();
    save();
    renderLog();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function ownershipAt(idx) {
    if (!state.ownership || typeof state.ownership !== 'object') return undefined;
    return state.ownership[idx];
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const o = JSON.parse(raw);
      if (!o.positions || o.positions.length !== 2) return false;
      const savedGameStarted = typeof o.gameStarted === 'boolean' ? o.gameStarted : null;
      state = { ...initialState(), ...o };
      const migratedPending = migratePendingCardReveal(o.pendingCardReveal);
      state.pendingCardReveal = null;
      if (state.phase === 'player_card' && migratedPending?.playerIdx === 0) state.pendingCardReveal = migratedPending;
      else if (state.phase === 'investor_card' && migratedPending?.playerIdx === 1) state.pendingCardReveal = migratedPending;
      if (state.phase === 'player_card' && !state.pendingCardReveal) {
        if (humanServingJail()) state.phase = 'player_jail';
        else {
          const ridx = state.positions[0];
          const rsq = BOARD[ridx];
          if (rsq?.price != null && !ownershipAt(ridx)) state.phase = 'player_buy';
          else state.phase = 'player_roll';
        }
      }
      if (state.phase === 'investor_card' && !state.pendingCardReveal) {
        state.turnOwner = 1;
        state.phase = 'ai_roll';
      }
      if (!state.history) state.history = [];
      if (!state.ownership || typeof state.ownership !== 'object') state.ownership = {};
      if (!Array.isArray(state.inJail) || state.inJail.length !== 2) {
        state.inJail = [null, null];
      }
      state.inJail[0] = normalizeInJailSlot(state.inJail[0]);
      state.inJail[1] = normalizeInJailSlot(state.inJail[1]);
      if (typeof state.pendingDoublesExtraRoll !== 'boolean') state.pendingDoublesExtraRoll = false;
      if (typeof state.doublesRunHuman !== 'number') state.doublesRunHuman = 0;
      if (typeof state.doublesRunAi !== 'number') state.doublesRunAi = 0;
      if (!state.bankruptDetail || typeof state.bankruptDetail !== 'object') state.bankruptDetail = null;
      if (!state.mortgaged || typeof state.mortgaged !== 'object') state.mortgaged = {};
      if (state.paymentDue != null && typeof state.paymentDue !== 'object') state.paymentDue = null;
      if (state.paymentResume != null && typeof state.paymentResume !== 'object') state.paymentResume = null;
      if (state.paymentDue && state.paymentDue.resume == null && state.paymentResume != null) {
        state.paymentDue.resume = state.paymentResume;
      }
      if (typeof state.turnOwner !== 'number' || state.turnOwner < 0 || state.turnOwner > 1) {
        state.turnOwner = state.phase === 'ai_roll' ? 1 : 0;
      }
      if (humanServingJail()) {
        state.turnOwner = 0;
      }
      const phases = new Set([
        'player_roll',
        'player_buy',
        'player_jail',
        'player_resolving',
        'player_card',
        'investor_card',
        'player_raise_cash',
        'ai_roll',
        'game_over',
      ]);
      if (!phases.has(state.phase)) {
        state.phase = 'player_roll';
      }
      state.aiVariant = normalizeAiVariant(state.aiVariant);
      if (savedGameStarted !== null) {
        state.gameStarted = savedGameStarted;
      } else {
        state.gameStarted = deriveGameStartedFromSnapshots();
      }
      reconcileCardDecksAfterLoadIfNeeded();
      reconcileHumanJailPhase();
      return true;
    } catch (_) {
      return false;
    }
  }

  function bankrupt(loser, detail) {
    state.winner = loser === 0 ? 1 : 0;
    state.phase = 'game_over';
    state.paymentDue = null;
    state.paymentResume = null;
    state.turnOwner = 0;
    state.bankruptDetail =
      detail && typeof detail.amount === 'number'
        ? { loser, amount: detail.amount, reason: detail.reason ?? '', balanceBefore: detail.balanceBefore ?? 0 }
        : null;
    state.history.push(`${new Date().toISOString().slice(11, 19)} ${PLAYER_LABEL[PLAYERS[loser]]} is tapped out. ${winnerHeadline(PLAYERS[state.winner])}`);
    if (state.history.length > 80) state.history.shift();
    save();
    renderLog();
    renderAll();
  }

  function gameOverSubtext(d) {
    if (!d || typeof d.amount !== 'number') return '';
    const amt = formatMoney(d.amount);
    const had = formatMoney(Math.max(0, d.balanceBefore));
    const rentM = /^Rent on (.+)$/.exec(d.reason || '');
    const humanLost = d.loser === 0;

    if (humanLost) {
      if (rentM) {
        return `You owed ${opponentInProse()} ${amt} for landing on ${rentM[1]}, but only had ${had} on hand.`;
      }
      if (d.reason === 'Shuttle fine') {
        return `You owed ${amt} for the shuttle fine but only had ${had} on hand.`;
      }
      if (d.reason) {
        return `You owed ${amt} for landing on ${d.reason} but only had ${had} on hand.`;
      }
      return `You couldn’t cover ${amt} (had ${had}).`;
    }

    if (rentM) {
      return `${PLAYER_LABEL.ai} owed you ${amt} for landing on ${rentM[1]} but only had ${had} on hand.`;
    }
    if (d.reason === 'Shuttle fine') {
      return `${PLAYER_LABEL.ai} owed ${amt} for the shuttle fine but only had ${had} on hand.`;
    }
    if (d.reason) {
      return `${PLAYER_LABEL.ai} owed ${amt} (${d.reason}) but only had ${had} on hand.`;
    }
    return `${PLAYER_LABEL.ai} couldn’t cover ${amt} (had ${had}).`;
  }

  function paymentResumeFromLandingPay(landingPayCtx) {
    if (!landingPayCtx || !landingPayCtx.tag) return { mode: 'human_finish_or_double' };
    switch (landingPayCtx.tag) {
      case 'human_street':
        return { mode: 'human_finish_or_double' };
      case 'human_jail':
        return { mode: 'human_land_then_end' };
      case 'ai_street':
        return { mode: 'ai_post_land', wantsAnotherStreetRoll: !!landingPayCtx.wantsDouble };
      case 'ai_jail':
        return { mode: 'ai_jail_after_land' };
      default:
        return { mode: 'human_finish_or_double' };
    }
  }


  function aiDeps() {
    return {
      state,
      PLAYERS,
      BOARD,
      PLAYER_LABEL,
      formatMoney,
      shuffle,
      canMortgage,
      applyMortgage,
      canUnmortgage,
      applyUnmortgage,
      unmortgageCostFor,
      mortgageValueFor,
      canSellHere,
      sellOneBuilding,
      hasMonopoly,
      canBuildHere,
      houseCostFor,
      hotelCostFor,
      log,
      aiPick,
      aiQuips: AI_QUIPS,
      save,
      renderAll,
    };
  }

  function executePaymentResume() {
    const r = state.paymentResume;
    state.paymentResume = null;
    if (!r || state.winner != null) return;
    if (r.mode === 'human_finish_or_double') {
      humanFinishLandOrDoubleOrEnd();
    } else if (r.mode === 'human_land_then_end') {
      if (state.winner != null) return;
      if (state.phase === 'player_buy') return;
      endPlayerTurn();
    } else if (r.mode === 'human_jail_fine_forced') {
      const forced = r.forcedDice;
      state.inJail[0] = null;
      state.phase = 'player_resolving';
      renderHud();
      state.lastDiceTotal = forced;
      els.diceEl.textContent = `Fine paid — moving ${forced}`;
      animateDice();
      movePlayer(0, forced, () => {
        resolveLanding(
          0,
          () => {
            if (state.winner != null) return;
            if (state.phase === 'player_buy') return;
            endPlayerTurn();
          },
          { tag: 'human_jail' },
        );
      });
    } else if (r.mode === 'human_jail_fine_roll') {
      state.inJail[0] = null;
      state.phase = 'player_resolving';
      renderHud();
      humanJailExitThenResolve(() => {
        endPlayerTurn();
      });
    } else if (r.mode === 'ai_post_land') {
      if (state.winner != null) return;
      maybeAiMaintainAfterLand();
      if (r.wantsAnotherStreetRoll) {
        renderPrompt(`${PLAYER_LABEL.ai} rolled doubles — going again…`);
        save();
        renderAll();
        setTimeout(runAiTurn, 750);
      } else {
        state.doublesRunAi = 0;
        beginHumanTurn();
        save();
        renderAll();
      }
    } else if (r.mode === 'ai_jail_after_land') {
      if (state.winner != null) return;
      maybeAiMaintainAfterLand();
      beginHumanTurn();
      save();
      renderAll();
    } else if (r.mode === 'resume_after_card_pay') {
      if (state.winner != null) return;
      resumeAfterCardLand(r.playerIdx, r.landingPayCtx);
      save();
      renderAll();
    } else if (r.mode === 'ai_jail_fine_then_move') {
      if (state.winner != null) return;
      state.inJail[1] = null;
      const forced = r.forcedDice;
      if (forced != null) {
        state.lastDiceTotal = forced;
        els.diceEl.textContent = `Fine paid — moving ${forced}`;
        animateDice();
        movePlayer(1, forced, () => {
          resolveLanding(
            1,
            () => {
              if (state.winner != null) return;
              maybeAiMaintainAfterLand();
              beginHumanTurn();
              save();
              renderAll();
            },
            { tag: 'ai_jail' },
          );
        });
      } else {
        const dice = rollDice();
        const total = dice[0] + dice[1];
        els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${total}`;
        state.lastDiceTotal = total;
        animateDice();
        movePlayer(1, total, () => {
          resolveLanding(
            1,
            () => {
              if (state.winner != null) return;
              maybeAiMaintainAfterLand();
              beginHumanTurn();
              save();
              renderAll();
            },
            { tag: 'ai_jail' },
          );
        });
      }
    }
  }

  function applySettledPayment(playerIdx, amount, reason, silent, payeeIdx) {
    state.cash[playerIdx] -= amount;
    if (!silent) {
      log(`${PLAYER_LABEL[PLAYERS[playerIdx]]} paid ${formatMoney(amount)} (${reason}).`);
    } else if (silent && amount > 0) {
      log(`${PLAYER_LABEL[PLAYERS[playerIdx]]} paid ${formatMoney(amount)} (${reason}).`);
    }
    if (payeeIdx != null && payeeIdx !== playerIdx && amount > 0) {
      state.cash[payeeIdx] += amount;
    }
    state.paymentDue = null;
    save();
    updatePieces();
    renderHud();
  }

  function settlePayment(playerIdx, amount, reason, silent, opts) {
    const payeeIdx = opts?.payeeIdx ?? null;
    const resume = opts?.resume ?? null;

    if (amount <= 0) {
      state.paymentResume = resume;
      executePaymentResume();
      return;
    }

    if (state.cash[playerIdx] >= amount) {
      state.paymentResume = resume;
      applySettledPayment(playerIdx, amount, reason, silent, payeeIdx);
      executePaymentResume();
      return;
    }

    if (playerIdx === 1) {
      getStrategy(state.aiVariant).liquidateUntil(aiDeps(), 1, amount);
      if (state.cash[playerIdx] >= amount) {
        state.paymentResume = resume;
        applySettledPayment(playerIdx, amount, reason, silent, payeeIdx);
        executePaymentResume();
        return;
      }
      const balanceBefore = state.cash[playerIdx];
      bankrupt(playerIdx, { amount, reason, balanceBefore });
      return;
    }

    state.paymentDue = {
      amount,
      reason,
      silent,
      payeeIdx,
      payer: playerIdx,
      resume,
    };
    state.paymentResume = resume;
    state.phase = 'player_raise_cash';
    const short = amount - state.cash[playerIdx];
    renderPrompt(
      `You owe ${formatMoney(amount)} (${reason}). Raise ${formatMoney(short)} more — mortgage listings or sell upgrades in your portfolio, then tap Pay.`,
    );
    save();
    renderAll();
  }

  function defaultResumeFromPaymentDue(d) {
    if (!d?.reason) return { mode: 'human_finish_or_double' };
    if (d.reason === 'Shuttle fine') return { mode: 'human_jail_fine_roll' };
    return { mode: 'human_finish_or_double' };
  }

  function onPayDue() {
    if (state.phase !== 'player_raise_cash' || state.winner != null || !state.paymentDue) return;
    const d = state.paymentDue;
    if (state.cash[0] < d.amount) return;
    const resumeSnap = d.resume ?? state.paymentResume ?? defaultResumeFromPaymentDue(d);
    state.paymentResume = resumeSnap;
    applySettledPayment(0, d.amount, d.reason, d.silent, d.payeeIdx);
    executePaymentResume();
    if (state.phase === 'player_raise_cash' && state.paymentDue == null) {
      state.turnOwner = 0;
      state.phase = 'player_resolving';
      humanFinishLandOrDoubleOrEnd();
      save();
      renderAll();
    }
  }

  function resumeAfterCardLand(playerIdx, landingPayCtx) {
    if (!landingPayCtx) return;
    if (playerIdx === 1) {
      maybeAiMaintainAfterLand();
      if (landingPayCtx.tag === 'ai_street' && landingPayCtx.wantsDouble) {
        renderPrompt(`${PLAYER_LABEL.ai} rolled doubles — going again…`);
        save();
        renderAll();
        setTimeout(runAiTurn, 750);
        return;
      }
      state.doublesRunAi = 0;
      beginHumanTurn();
      save();
      renderAll();
      return;
    }
    humanFinishLandOrDoubleOrEnd();
  }

  function collectFromBank(playerIdx, amount, reason) {
    if (amount <= 0 || state.winner != null) return;
    state.cash[playerIdx] += amount;
    log(`${PLAYER_LABEL[PLAYERS[playerIdx]]}: ${reason} (${formatMoney(amount)}).`);
    save();
    renderHud();
    updatePieces();
  }

  function repairDebtFor(playerIdx, perHouse, perHotel) {
    let bill = 0;
    BOARD.forEach((sq, idx) => {
      if (state.ownership[idx] !== PLAYERS[playerIdx]) return;
      if (sq.kind !== 'property') return;
      const b = state.buildings[idx] || { houses: 0, hotel: false };
      if (!b?.hotel && b?.houses <= 0) return;
      if (b.hotel) bill += perHotel;
      else bill += b.houses * perHouse;
    });
    return bill;
  }

  function movePlayerBackward(playerIdx, steps, done) {
    let remaining = Math.abs(steps);
    const stepOnce = () => {
      if (remaining <= 0) {
        updatePieces();
        done?.();
        return;
      }
      state.positions[playerIdx] = (state.positions[playerIdx] + 39) % 40;
      remaining--;
      updatePieces();
      setTimeout(stepOnce, 100);
    };
    stepOnce();
  }

  function applyChanceUtilityPayment(playerIdx, targetIdx, landingPayCtx) {
    const sq = BOARD[targetIdx];
    const ownerKey = state.ownership[targetIdx];
    const dice = rollDice();
    const total = dice[0] + dice[1];
    state.lastDiceTotal = total;
    els.diceEl.textContent = `Card dice: ${dice[0]} + ${dice[1]} = ${total}`;
    animateDice();
    const ow = ownerKey === 'human' ? 0 : 1;
    const amt = total * CHANCE_UTILITY_RENT_PER_DICE;
    logLandfall(playerIdx, targetIdx);
    const resume = {
      mode: /** @type {const} */ ('resume_after_card_pay'),
      playerIdx,
      landingPayCtx,
    };
    settlePayment(playerIdx, amt, `Nearest utility (${sq.name}) — card rent`, true, {
      payeeIdx: ow,
      resume,
    });
  }

  function applyNearestUtilityThen(playerIdx, eff, landingPayCtx) {
    const from = state.positions[playerIdx];
    const idx = nearestIndexForward(from, 'utility', BOARD);
    const fs = forwardSteps(from, idx);
    movePlayer(playerIdx, fs, () => {
      const tgt = state.positions[playerIdx];
      const ownerKey = state.ownership[tgt];
      if (!ownerKey || state.mortgaged[tgt]) {
        resolveLanding(playerIdx, () => resumeAfterCardLand(playerIdx, landingPayCtx), landingPayCtx, undefined);
        return;
      }
      applyChanceUtilityPayment(playerIdx, tgt, landingPayCtx);
    });
  }

  function applyNearestTransitThen(playerIdx, eff, landingPayCtx) {
    const from = state.positions[playerIdx];
    const idx = nearestIndexForward(from, 'transit', BOARD);
    const fs = forwardSteps(from, idx);
    movePlayer(playerIdx, fs, () => {
      resolveLanding(playerIdx, () => resumeAfterCardLand(playerIdx, landingPayCtx), landingPayCtx, {
        cardDoubleTransit: !!eff.doubleTransitRent,
      });
    });
  }

  /** @param {'chance'|'communityChest'} deckKind */
  function deckTitleFor(deckKind) {
    return deckKind === 'chance' ? 'Chance' : 'Community Chest';
  }

  function peekDeckKindFor(cardId) {
    return String(cardId).startsWith('ch_') ? 'chance' : 'communityChest';
  }

  function applyResolvedCardEffect(playerIdx, cardId, landingPayCtx) {
    state.pendingCardReveal = null;
    const eff = effectForCard(cardId);
    const resumePkg = () => ({
      mode: /** @type {const} */ ('resume_after_card_pay'),
      playerIdx,
      landingPayCtx,
    });
    if (!eff || !eff.kind) {
      resumeAfterCardLand(playerIdx, landingPayCtx);
      save();
      renderAll();
      return;
    }

    switch (eff.kind) {
      case 'collect_bank':
        collectFromBank(playerIdx, eff.amount, getCardFaceText(cardId, null));
        resumeAfterCardLand(playerIdx, landingPayCtx);
        break;
      case 'pay_bank':
        settlePayment(playerIdx, eff.amount, `${deckTitleFor(peekDeckKindFor(cardId))} card`, true, {
          payeeIdx: null,
          resume: resumePkg(),
        });
        break;
      case 'collect_each_other': {
        const opp = 1 - playerIdx;
        const reason = `${deckTitleFor(peekDeckKindFor(cardId))}`;
        settlePayment(opp, eff.amount, `${reason} — chipped in`, true, {
          payeeIdx: playerIdx,
          resume: resumePkg(),
        });
        break;
      }
      case 'pay_each_other': {
        const opp = 1 - playerIdx;
        const reason = `${deckTitleFor(peekDeckKindFor(cardId))}`;
        settlePayment(playerIdx, eff.amount, `${reason} — your round`, true, {
          payeeIdx: opp,
          resume: resumePkg(),
        });
        break;
      }
      case 'repairs_bank': {
        const bill = repairDebtFor(playerIdx, eff.perHouse, eff.perHotel);
        settlePayment(playerIdx, bill, `${deckTitleFor(peekDeckKindFor(cardId))} — repairs`, true, {
          payeeIdx: null,
          resume: resumePkg(),
        });
        break;
      }
      case 'advance_forward_to_index': {
        const fs = forwardSteps(state.positions[playerIdx], eff.index);
        movePlayer(playerIdx, fs, () => {
          resolveLanding(playerIdx, () => resumeAfterCardLand(playerIdx, landingPayCtx), landingPayCtx, undefined);
          save();
          renderAll();
        });
        return;
      }
      case 'advance_nearest_then_land':
        if (eff.group === 'transit') applyNearestTransitThen(playerIdx, eff, landingPayCtx);
        else applyNearestUtilityThen(playerIdx, eff, landingPayCtx);
        return;
      case 'step_relative_turn':
        movePlayerBackward(playerIdx, eff.delta, () => {
          resolveLanding(playerIdx, () => resumeAfterCardLand(playerIdx, landingPayCtx), landingPayCtx, undefined);
          save();
          renderAll();
        });
        return;
      case 'go_jail':
        teleportToJail(playerIdx);
        resumeAfterCardLand(playerIdx, landingPayCtx);
        break;
      case 'retain_goojf': {
        awardGoojf(state.goojfHeld, playerIdx, eff.deck === 'communityChest' ? 'communityChest' : 'chance');
        log(
          `${PLAYER_LABEL[PLAYERS[playerIdx]]}: Get Out Of Jail Free (${deckTitleFor(eff.deck)}) — kept until used.`,
        );
        resumeAfterCardLand(playerIdx, landingPayCtx);
        break;
      }
      default:
        resumeAfterCardLand(playerIdx, landingPayCtx);
    }
    save();
    renderAll();
  }

  function beginNiceSquareCard(playerIdx, squareIdx, landingPayCtx) {
    const dk = niceSquareDeck(squareIdx);
    if (dk !== 'communityChest' && dk !== 'chance') {
      resumeAfterCardLand(playerIdx, landingPayCtx);
      return;
    }
    const cid = peekDrawCard(dk);
    const fk = niceFlavorKey(squareIdx);
    const body = getCardFaceText(cid, fk);
    const deckTitle = deckTitleFor(dk);
    log(
      `${PLAYER_LABEL[PLAYERS[playerIdx]]}: drew ${deckTitle} — "${body.replace(/\s+/g, ' ').trim().slice(0, 80)}${body.length > 80 ? '…' : ''}"`,
    );

    if (playerIdx === 1) {
      state.phase = /** @type {typeof state.phase} */ ('investor_card');
      state.pendingCardReveal = {
        playerIdx: 1,
        cardId: cid,
        body,
        deckTitle,
        landingPayCtx,
      };
      renderHud();
      return;
    }

    state.phase = /** @type {typeof state.phase} */ ('player_card');
    state.pendingCardReveal = {
      playerIdx,
      cardId: cid,
      body,
      deckTitle,
      landingPayCtx,
    };
    renderHud();
  }

  function dismissCardOverlay() {
    const p = state.pendingCardReveal;
    if (!p || state.winner != null) return;
    const humanCard = state.phase === 'player_card' && p.playerIdx === 0;
    const invCard = state.phase === 'investor_card' && p.playerIdx === 1;
    if (!humanCard && !invCard) return;
    els.cardOverlay?.classList.add('mono-card-overlay--hidden');
    els.cardSheet?.classList.remove('mono-card-sheet--investor');
    state.phase = 'player_resolving';
    applyResolvedCardEffect(p.playerIdx, p.cardId, p.landingPayCtx);
  }

  function onJailUseGoojf(deckKind /** @type {'chance'|'communityChest'} */) {
    if (state.winner != null || state.turnOwner !== 0 || !humanServingJail()) return;
    if (!hasGoojf(state.goojfHeld, 0, deckKind)) return;
    if (
      state.phase === 'player_raise_cash' ||
      state.phase === 'player_buy' ||
      state.phase === 'player_card' ||
      state.phase === 'investor_card'
    )
      return;
    dismissDifficultyTapHint();
    leaveJailWithGoojfThenRollAndLand(0, deckKind);
  }

  function logLandfall(playerIdx, idx) {
    const sq = BOARD[idx];
    const you = playerIdx === 0 ? 'You' : PLAYER_LABEL.ai;

    if (sq.kind === 'tax') {
      log(`${you} landed on ${sq.name} (pay ${formatMoney(sq.tax)}).`);
      return;
    }
    if (sq.kind === 'nice') {
      const deck = niceSquareDeck(idx);
      const dk =
        deck === 'communityChest' ? 'Community Chest' : deck === 'chance' ? 'Chance' : 'Nice spot';
      log(`${you} landed on ${sq.name} (${dk}).`);
      return;
    }
    if (sq.kind === 'corner') {
      log(`${you} landed on ${sq.name}.`);
      return;
    }

    const owner = state.ownership[idx];
    const me = playerIdx === 0 ? 'human' : 'ai';

    if (!owner && sq.price != null) {
      log(`${you} landed on ${sq.name} (unowned — ${formatMoney(sq.price)}).`);
      return;
    }

    if (owner === me) {
      log(
        `${you} landed on ${sq.name} (${playerIdx === 0 ? 'you own this' : `${PLAYER_LABEL.ai} already owns this`}).`,
      );
      return;
    }

    const rent = computeRent(idx, state.ownership, state.buildings);
    if (state.mortgaged[idx]) {
      if (playerIdx === 0) {
        log(`${you} landed on ${sq.name} (${opponentInProse()} owns this — mortgaged, no rent).`);
      } else {
        log(`${you} landed on ${sq.name} (you own this — listing mortgaged, no rent).`);
      }
      return;
    }
    if (playerIdx === 0) {
      log(`${you} landed on ${sq.name} (${opponentInProse()} owns this — ${formatMoney(rent)} rent due).`);
    } else {
      log(`${you} landed on ${sq.name} (you own this — ${PLAYER_LABEL.ai} owes ${formatMoney(rent)} rent).`);
    }
  }

  function resolveLanding(playerIdx, cb, landingPayCtx, landOpts) {
    const idx = state.positions[playerIdx];
    const sq = BOARD[idx];

    if (sq.kind === 'tax') {
      logLandfall(playerIdx, idx);
      const resume = paymentResumeFromLandingPay(landingPayCtx);
      settlePayment(playerIdx, sq.tax, sq.name, true, { payeeIdx: null, resume });
      return;
    }

    if (sq.kind === 'nice') {
      logLandfall(playerIdx, idx);
      beginNiceSquareCard(playerIdx, idx, landingPayCtx);
      return;
    }

    if (sq.kind === 'corner') {
      logLandfall(playerIdx, idx);
      if (state.winner == null) cb?.();
      return;
    }

    const ownerKey = state.ownership[idx];
    if (!ownerKey) {
      if (playerIdx === 0 && sq.price != null) {
        logLandfall(playerIdx, idx);
        state.phase = 'player_buy';
        const affordable = state.cash[0] >= sq.price;
        els.buyBtn.disabled = !affordable;
        els.passBtn.disabled = false;
        renderPrompt(
          affordable
            ? `${sq.name} — ${formatMoney(sq.price)}. Buy it?`
            : `${sq.name} is ${formatMoney(sq.price)} — you have ${formatMoney(state.cash[0])} (${formatMoney(sq.price - state.cash[0])} short). Raise cash in your portfolio (mortgage / sell upgrades), then Buy or Pass.`,
        );
        renderHud();
        return;
      }
      if (playerIdx === 1 && sq.price != null) {
        logLandfall(playerIdx, idx);
        getStrategy(state.aiVariant).handleUnownedPurchase(aiDeps(), { idx, sq, cb });
        return;
      }
      if (state.winner == null) cb?.();
      return;
    }

    if ((ownerKey === 'human' && playerIdx === 0) || (ownerKey === 'ai' && playerIdx === 1)) {
      logLandfall(playerIdx, idx);
      if (state.winner == null) cb?.();
      return;
    }

    const ownerIdx = ownerKey === 'human' ? 0 : 1;
    let rent = computeRent(idx, state.ownership, state.buildings);
    if (landOpts?.cardDoubleTransit && sq.kind === 'transit') rent *= 2;
    logLandfall(playerIdx, idx);
    const resume = paymentResumeFromLandingPay(landingPayCtx);
    settlePayment(playerIdx, rent, `Rent on ${sq.name}`, true, {
      payeeIdx: ownerIdx,
      resume,
    });
  }

  function maybeAiMaintainAfterLand() {
    getStrategy(state.aiVariant).maintainAfterLand(aiDeps());
  }

  function endPlayerTurn() {
    if (state.winner != null) return;
    state.doublesRunHuman = 0;
    state.pendingDoublesExtraRoll = false;
    state.turnOwner = 1;
    state.phase = 'ai_roll';
    renderPrompt(`${PLAYER_LABEL.ai} is thinking…`);
    save();
    renderHud();
    setTimeout(runAiTurn, 700);
  }

  function runAiTurn() {
    if (state.winner != null) return;
    if (state.phase === 'investor_card') return;
    state.phase = 'ai_roll';
    renderHud();
    if (state.positions[1] === JAIL_INDEX && state.inJail[1]) {
      runAiJailTurn();
      return;
    }
    const dice = rollDice();
    const isDouble = dice[0] === dice[1];
    if (isDouble) {
      state.doublesRunAi++;
      if (state.doublesRunAi >= 3) {
        els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${dice[0] + dice[1]}`;
        animateDice();
        log(`${PLAYER_LABEL.ai}: Three doubles — straight to the shuttle (no move).`);
        teleportToJail(1);
        state.doublesRunAi = 0;
        save();
        renderAll();
        beginHumanTurn();
        return;
      }
    } else {
      state.doublesRunAi = 0;
    }
    const wantsAnotherStreetRoll = isDouble;
    els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${dice[0] + dice[1]}`;
    animateDice();
    const total = dice[0] + dice[1];
    state.lastDiceTotal = total;
    movePlayer(1, total, () => {
      if (state.positions[1] === TRACKWORK_INDEX) {
        teleportToJail(1);
        state.doublesRunAi = 0;
        save();
        renderAll();
        beginHumanTurn();
        return;
      }
      resolveLanding(
        1,
        () => {
          if (state.winner != null) return;
          maybeAiMaintainAfterLand();
          if (wantsAnotherStreetRoll) {
            renderPrompt(`${PLAYER_LABEL.ai} rolled doubles — going again…`);
            save();
            renderAll();
            setTimeout(runAiTurn, 750);
            return;
          }
          state.doublesRunAi = 0;
          beginHumanTurn();
          save();
          renderAll();
        },
        { tag: 'ai_street', wantsDouble: wantsAnotherStreetRoll },
      );
    });
  }

  function rollDice() {
    return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
  }

  function animateDice() {
    els.diceEl.classList.remove('mono-dice-pop');
    void els.diceEl.offsetWidth;
    els.diceEl.classList.add('mono-dice-pop');
  }

  function movePlayer(playerIdx, steps, done) {
    let remaining = steps;
    const stepOnce = () => {
      if (remaining <= 0) {
        updatePieces();
        done?.();
        return;
      }
      const oldPos = state.positions[playerIdx];
      const newPos = (oldPos + 1) % 40;
      state.positions[playerIdx] = newPos;
      remaining--;
      if (newPos === 0 && oldPos !== 0) {
        state.cash[playerIdx] += GO_BONUS;
        log(`${PLAYER_LABEL[PLAYERS[playerIdx]]} passed GO (+${formatMoney(GO_BONUS)}).`);
        save();
        renderHud();
      }
      updatePieces();
      setTimeout(stepOnce, 120);
    };
    stepOnce();
  }

  function teleportToJail(playerIdx) {
    state.positions[playerIdx] = JAIL_INDEX;
    state.inJail[playerIdx] = { failedDoubles: 0, forcedExitDice: null };
    log(`${PLAYER_LABEL[PLAYERS[playerIdx]]}: Trackwork — catch the shuttle bus.`);
    save();
    updatePieces();
  }

  function beginHumanTurn() {
    if (state.winner != null) return;
    state.turnOwner = 0;
    state.doublesRunAi = 0;
    if (state.positions[0] === JAIL_INDEX && state.inJail[0]) {
      state.phase = 'player_jail';
      renderHumanJailPrompt();
    } else {
      state.phase = 'player_roll';
      renderPrompt('Your turn — roll the dice.');
    }
    save();
    renderAll();
  }

  function humanJailExitThenResolve(done) {
    const dice = rollDice();
    const total = dice[0] + dice[1];
    els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${total}`;
    state.lastDiceTotal = total;
    animateDice();
    movePlayer(0, total, () => {
      resolveLanding(
        0,
        () => {
          if (state.winner != null) return;
          if (state.phase === 'player_buy') return;
          done?.();
        },
        { tag: 'human_jail' },
      );
    });
  }

  function leaveJailWithGoojfThenRollAndLand(playerIdx, deckKind /** @type {'chance'|'communityChest'} */) {
    clearGoojf(state.goojfHeld, playerIdx, deckKind);
    pushGoojfBackToDeckBottom(deckKind);
    log(
      playerIdx === 0
        ? `You played Get Out Of Jail Free (${deckTitleFor(deckKind)}).`
        : `${PLAYER_LABEL[PLAYERS[playerIdx]]} played Get Out Of Jail Free (${deckTitleFor(deckKind)}).`,
    );
    state.inJail[playerIdx] = null;
    state.gameStarted = true;
    state.phase = 'player_resolving';
    const dice = rollDice();
    const total = dice[0] + dice[1];
    state.lastDiceTotal = total;
    els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${total}`;
    animateDice();
    save();
    renderAll();
    movePlayer(playerIdx, total, () => {
      const landTag =
        playerIdx === 0 ? /** @type {const} */ ('human_jail') : /** @type {const} */ ('ai_jail');
      resolveLanding(playerIdx, () => {
        if (playerIdx === 1) {
          if (state.winner != null) return;
          maybeAiMaintainAfterLand();
          beginHumanTurn();
          save();
          renderAll();
        } else {
          state.phase = 'player_roll';
          if (state.winner != null) return;
          if (state.phase === 'player_buy') return;
          endPlayerTurn();
        }
      }, { tag: landTag });
    });
  }

  function onJailPayFine() {
    if (state.winner != null || state.turnOwner !== 0 || !humanServingJail()) return;
    if (
      state.phase === 'player_raise_cash' ||
      state.phase === 'player_resolving' ||
      state.phase === 'player_buy' ||
      state.phase === 'player_card' ||
      state.phase === 'investor_card'
    ) {
      return;
    }
    state.gameStarted = true;
    if (state.phase !== 'player_jail') {
      state.phase = 'player_jail';
    }
    const inj = state.inJail[0];
    const forced = inj?.forcedExitDice;
    settlePayment(0, JAIL_FINE, 'Shuttle fine', false, {
      payeeIdx: null,
      resume:
        forced != null
          ? { mode: 'human_jail_fine_forced', forcedDice: forced }
          : { mode: 'human_jail_fine_roll' },
    });
  }

  function onJailRollDoubles() {
    if (state.winner != null || state.turnOwner !== 0 || !humanServingJail()) return;
    if (
      state.phase === 'player_raise_cash' ||
      state.phase === 'player_resolving' ||
      state.phase === 'player_buy' ||
      state.phase === 'player_card' ||
      state.phase === 'investor_card'
    ) {
      return;
    }
    state.gameStarted = true;
    if (state.phase !== 'player_jail') {
      state.phase = 'player_jail';
    }
    const inj = state.inJail[0];
    if (!inj || inj.failedDoubles >= 3) return;
    dismissDifficultyTapHint();
    state.phase = 'player_resolving';
    renderHud();
    const dice = rollDice();
    const total = dice[0] + dice[1];
    els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${total}`;
    state.lastDiceTotal = total;
    animateDice();
    if (dice[0] === dice[1]) {
      log(`Doubles — off the shuttle (no extra roll).`);
      state.inJail[0] = null;
      movePlayer(0, total, () => {
        resolveLanding(
          0,
          () => {
            if (state.winner != null) return;
            if (state.phase === 'player_buy') return;
            endPlayerTurn();
          },
          { tag: 'human_jail' },
        );
      });
    } else {
      inj.failedDoubles++;
      log(`No doubles — still on the shuttle (${inj.failedDoubles}/3).`);
      save();
      if (inj.failedDoubles >= 3) {
        inj.forcedExitDice = total;
        state.phase = 'player_jail';
        renderPrompt(
          `Third strike — pay ${formatMoney(JAIL_FINE)} to ride again. You’ll move ${total} spaces after paying (no more doubles rolls).`,
        );
        renderAll();
        return;
      }
      endPlayerTurn();
    }
  }

  function runAiJailTurn() {
    if (state.winner != null) return;
    const inj = state.inJail[1];
    if (!inj) {
      beginHumanTurn();
      return;
    }
    const mustPay = inj.failedDoubles >= 3;
    /** @type {'chance'|'communityChest'|null} */
    let gooDeck = null;
    if (hasGoojf(state.goojfHeld, 1, 'chance') && hasGoojf(state.goojfHeld, 1, 'communityChest')) {
      gooDeck = Math.random() < 0.5 ? 'chance' : 'communityChest';
    } else if (hasGoojf(state.goojfHeld, 1, 'chance')) gooDeck = 'chance';
    else if (hasGoojf(state.goojfHeld, 1, 'communityChest')) gooDeck = 'communityChest';

    const preferPay =
      mustPay ||
      (state.cash[1] >= JAIL_FINE &&
        (state.cash[1] >= JAIL_FINE * 3 || inj.failedDoubles >= 2 || Math.random() > 0.45));

    if (gooDeck && (mustPay || !preferPay || Math.random() < 0.5)) {
      leaveJailWithGoojfThenRollAndLand(1, gooDeck);
      return;
    }

    if (preferPay) {
      const forced = inj.forcedExitDice;
      settlePayment(1, JAIL_FINE, 'Shuttle fine', false, {
        payeeIdx: null,
        resume: { mode: 'ai_jail_fine_then_move', forcedDice: forced != null ? forced : null },
      });
      return;
    }

    const dice = rollDice();
    const total = dice[0] + dice[1];
    els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${total}`;
    state.lastDiceTotal = total;
    animateDice();
    if (dice[0] === dice[1]) {
      log(`${PLAYER_LABEL.ai}: Doubles — off the shuttle.`);
      state.inJail[1] = null;
      movePlayer(1, total, () => {
        resolveLanding(
          1,
          () => {
            if (state.winner != null) return;
            maybeAiMaintainAfterLand();
            beginHumanTurn();
            save();
            renderAll();
          },
          { tag: 'ai_jail' },
        );
      });
    } else {
      inj.failedDoubles++;
      log(`${PLAYER_LABEL.ai}: No doubles — still on the shuttle (${inj.failedDoubles}/3).`);
      if (inj.failedDoubles >= 3) {
        inj.forcedExitDice = total;
      }
      save();
      beginHumanTurn();
      renderAll();
    }
  }

  function humanFinishLandOrDoubleOrEnd() {
    if (state.winner != null) return;
    if (
      state.phase === 'player_buy' ||
      state.phase === 'player_raise_cash' ||
      state.phase === 'player_card' ||
      state.phase === 'investor_card'
    )
      return;
    if (state.pendingDoublesExtraRoll) {
      state.phase = 'player_roll';
      renderPrompt('Doubles — roll again.');
      renderAll();
      return;
    }
    endPlayerTurn();
  }

  function scheduleAiTurnResume() {
    if (monoAiResumeTimeout != null) clearTimeout(monoAiResumeTimeout);
    monoAiResumeTimeout = setTimeout(() => {
      monoAiResumeTimeout = null;
      if (state.winner != null || state.phase !== 'ai_roll' || state.turnOwner !== 1) return;
      runAiTurn();
    }, 120);
  }

  /** After load/Continue or a corrupted phase, align `phase` / `turnOwner` and resume the AI turn if it’s theirs. */
  function normalizeTurnState() {
    if (state.winner != null || !els.rollBtn) return;
    if (typeof state.turnOwner !== 'number' || state.turnOwner < 0 || state.turnOwner > 1) {
      state.turnOwner = state.phase === 'ai_roll' ? 1 : 0;
    }
    if (humanServingJail()) {
      state.turnOwner = 0;
    }
    if (state.phase === 'player_card' && state.pendingCardReveal?.playerIdx === 0) {
      state.turnOwner = 0;
      return;
    }
    if (state.phase === 'investor_card' && state.pendingCardReveal?.playerIdx === 1) {
      state.turnOwner = 1;
      return;
    }
    /** Orphaned draw state (crash / corrupted save): drop overlay and derive a workable phase */
    if (state.phase === 'investor_card') {
      state.pendingCardReveal = null;
      state.turnOwner = 1;
      state.phase = 'ai_roll';
      save();
      /** fall through */
    }
    if (state.phase === 'player_card') {
      state.pendingCardReveal = null;
      if (humanServingJail()) {
        state.phase = 'player_jail';
      } else {
        const ridx = state.positions[0];
        const rsq = BOARD[ridx];
        if (rsq?.price != null && !ownershipAt(ridx)) state.phase = 'player_buy';
        else state.phase = 'player_roll';
      }
      save();
      /** fall through → reconcileHumanJailPhase etc. */
    }
    /** Saves during dice / movement leave `player_resolving`; no UI handles that on refresh. */
    if (state.phase === 'player_resolving') {
      if (state.turnOwner === 0) {
        if (humanServingJail()) {
          state.phase = 'player_jail';
        } else {
          const ridx = state.positions[0];
          const rsq = BOARD[ridx];
          if (rsq?.price != null && !ownershipAt(ridx)) {
            state.phase = 'player_buy';
          } else {
            state.phase = 'player_roll';
          }
        }
      } else {
        state.turnOwner = 1;
        state.phase = 'ai_roll';
      }
      save();
    }
    if (
      state.phase === 'player_buy' ||
      state.phase === 'player_jail' ||
      state.phase === 'player_card' ||
      (state.phase === 'player_raise_cash' && state.paymentDue)
    ) {
      state.turnOwner = 0;
    }
    reconcileHumanJailPhase();
    if (state.phase === 'player_buy' && state.turnOwner === 0 && !humanServingJail()) {
      const idx = state.positions[0];
      const sq = BOARD[idx];
      if (sq?.price == null || ownershipAt(idx)) {
        state.phase = 'player_roll';
        save();
      }
    }
    if (
      state.turnOwner === 0 &&
      state.phase === 'player_roll' &&
      !humanServingJail() &&
      state.winner == null &&
      !state.pendingDoublesExtraRoll
    ) {
      const idx = state.positions[0];
      const sq = BOARD[idx];
      if (sq?.price != null && !ownershipAt(idx)) {
        state.phase = 'player_buy';
        save();
      }
    }
    if (state.phase === 'player_raise_cash' && state.paymentDue == null) {
      state.turnOwner = 0;
      state.phase = 'player_resolving';
      humanFinishLandOrDoubleOrEnd();
      save();
      renderAll();
      return;
    }
    if (state.turnOwner === 0) {
      if (state.phase === 'ai_roll') {
        beginHumanTurn();
        save();
        renderAll();
      }
      return;
    }
    if (state.phase === 'player_roll' || state.phase === 'player_resolving') {
      state.phase = 'ai_roll';
      state.paymentResume = null;
      save();
      renderHud();
    }
    if (state.turnOwner === 1 && state.phase === 'ai_roll') {
      scheduleAiTurnResume();
    }
  }

  function onRoll() {
    if (state.phase !== 'player_roll' || state.winner != null || state.turnOwner !== 0) return;
    dismissDifficultyTapHint();
    state.gameStarted = true;
    state.phase = 'player_resolving';
    state.pendingDoublesExtraRoll = false;
    renderHud();
    const dice = rollDice();
    const isDouble = dice[0] === dice[1];
    if (isDouble) {
      state.doublesRunHuman++;
      if (state.doublesRunHuman >= 3) {
        els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${dice[0] + dice[1]}`;
        animateDice();
        log(`Three doubles — straight to the shuttle (no move).`);
        teleportToJail(0);
        state.doublesRunHuman = 0;
        save();
        renderAll();
        endPlayerTurn();
        return;
      }
    } else {
      state.doublesRunHuman = 0;
    }
    state.pendingDoublesExtraRoll = isDouble;
    const total = dice[0] + dice[1];
    els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${total}`;
    animateDice();
    state.lastDiceTotal = total;
    movePlayer(0, total, () => {
      const idx = state.positions[0];
      if (idx === TRACKWORK_INDEX) {
        teleportToJail(0);
        state.pendingDoublesExtraRoll = false;
        state.doublesRunHuman = 0;
        save();
        renderAll();
        endPlayerTurn();
        return;
      }
      resolveLanding(
        0,
        () => {
          humanFinishLandOrDoubleOrEnd();
        },
        { tag: 'human_street' },
      );
    });
  }

  function onBuy() {
    if (state.phase !== 'player_buy') return;
    const idx = state.positions[0];
    const sq = BOARD[idx];
    if (sq.price == null || state.cash[0] < sq.price) return;
    const rollAgain = state.pendingDoublesExtraRoll;
    state.pendingDoublesExtraRoll = false;
    state.cash[0] -= sq.price;
    state.ownership[idx] = 'human';
    log(`You bought ${sq.name} for ${formatMoney(sq.price)}.`);
    state.phase = 'player_roll';
    renderPrompt(rollAgain ? 'Doubles — roll again.' : `Nice pick — ${PLAYER_LABEL.ai}'s turn.`);
    save();
    renderAll();
    if (rollAgain) return;
    endPlayerTurn();
  }

  function onPass() {
    if (state.phase !== 'player_buy') return;
    const idx = state.positions[0];
    const rollAgain = state.pendingDoublesExtraRoll;
    state.pendingDoublesExtraRoll = false;
    log(`You passed on ${BOARD[idx].name}.`);
    state.phase = 'player_roll';
    renderPrompt(rollAgain ? 'Doubles — roll again.' : `Okay — ${PLAYER_LABEL.ai}'s turn.`);
    save();
    renderAll();
    if (rollAgain) return;
    endPlayerTurn();
  }

  function humanBuildableProps() {
    const out = [];
    BOARD.forEach((sq, idx) => {
      if (sq.kind !== 'property' || state.ownership[idx] !== 'human') return;
      if (!hasMonopoly('human', sq.group, state.ownership)) return;
      const b = state.buildings[idx] || { houses: 0, hotel: false };
      if (b.hotel) return;
      if (!canBuildHere('human', idx, state.ownership, state.buildings)) return;
      out.push(idx);
    });
    return out;
  }

  function onBuildPick(idx) {
    if (state.phase !== 'player_roll' || state.winner != null || humanServingJail() || state.turnOwner !== 0)
      return;
    const sq = BOARD[idx];
    const b = state.buildings[idx] || { houses: 0, hotel: false };
    if (b.houses === 4 && !b.hotel) {
      const cost = hotelCostFor(idx);
      if (state.cash[0] < cost) return;
      state.cash[0] -= cost;
      state.buildings[idx] = { houses: 0, hotel: true };
      log(`Hotel on ${sq.name} (${formatMoney(cost)}).`);
    } else {
      const cost = houseCostFor(idx);
      if (state.cash[0] < cost || b.houses >= 4) return;
      state.buildings[idx] = { houses: b.houses + 1, hotel: false };
      state.cash[0] -= cost;
      log(`House on ${sq.name} (${formatMoney(cost)}). Now ${b.houses + 1} houses.`);
    }
    save();
    renderAll();
  }

  function renderPrompt(text) {
    if (!els.promptEl) return;
    els.promptEl.textContent = text;
  }

  function renderPlayerBuyPrompt() {
    const idx = state.positions[0];
    const sq = BOARD[idx];
    if (state.phase !== 'player_buy' || sq?.price == null || ownershipAt(idx)) return;
    const name = sq.name.replace(/\n/g, ' ');
    const affordable = state.cash[0] >= sq.price;
    renderPrompt(
      affordable
        ? `${name} — ${formatMoney(sq.price)}. Buy it?`
        : `${name} is ${formatMoney(sq.price)} — you have ${formatMoney(state.cash[0])} (${formatMoney(sq.price - state.cash[0])} short). Raise cash (Financing or a listing card), then Buy or Pass.`,
    );
  }

  /** After dismissing the continue overlay, re-derive prompt text from `phase` (boot overwrites it with “Continue…”). */
  function syncHudPromptToPhase(ph) {
    if (state.winner != null) return;
    if (ph === 'player_raise_cash' && state.paymentDue) return;
    if (ph === 'player_buy') {
      renderPlayerBuyPrompt();
      return;
    }
    if (ph === 'player_jail' && humanServingJail()) {
      renderHumanJailPrompt();
      return;
    }
    if (ph === 'investor_card' && state.pendingCardReveal?.playerIdx === 1) {
      renderPrompt(`${PLAYER_LABEL.ai} drew a card — read it above, then tap Acknowledged so their turn can proceed.`);
      return;
    }
    if (ph === 'player_card' && state.pendingCardReveal?.playerIdx === 0) {
      renderPrompt('Read the card — tap Continue to apply it.');
      return;
    }
    if (ph === 'player_roll' && state.turnOwner === 0 && !humanServingJail()) {
      renderPrompt(
        state.pendingDoublesExtraRoll ? 'Doubles — roll again.' : 'Your turn — roll the dice.',
      );
      return;
    }
    if (ph === 'ai_roll' && state.turnOwner === 1) {
      renderPrompt(`${PLAYER_LABEL.ai} is thinking…`);
    }
  }

  /** Accent color for HUD “On: …” line (matches board group / tile semantics). */
  function squareHudAccent(idx) {
    const sq = BOARD[idx];
    if (sq.stripColor) return sq.stripColor;
    if (sq.kind === 'property' && sq.group && GROUP_COLORS[sq.group]) return GROUP_COLORS[sq.group];
    if (sq.kind === 'transit') return sq.stripColor || GROUP_COLORS.transit;
    if (sq.kind === 'utility') return sq.tileColor || GROUP_COLORS.utility;
    if (sq.kind === 'tax') return '#efa9a2';
    if (idx === 0) return '#86efac';
    if (idx === TRACKWORK_INDEX) return '#f0b891';
    if (idx === JAIL_INDEX) return '#ec7c34';
    if (sq.kind === 'nice') return '#bfe4a8';
    return '#d4c4a8';
  }

  /** Renders “On:” HUD with the place name tinted to match its board color. */
  function renderHumanCurrentSquareHud() {
    const el = els.currentSquareEl;
    if (!el) return;
    const idx = state.positions[0];
    const sq = BOARD[idx];
    const name = sq.name.replace(/\n/g, ' ');
    const accent = squareHudAccent(idx);
    let suffix = '';
    if (sq.price != null) suffix = ` · ${formatMoney(sq.price)}`;
    else if (sq.tax != null) suffix = ` · ${formatMoney(sq.tax)}`;
    if (idx === JAIL_INDEX) {
      suffix += state.inJail[0] ? ' · on the bus' : ' · just visiting';
    }
    el.innerHTML = `On: <span class="mono-current-square-name" style="color: ${escapeHtml(accent)}">${escapeHtml(name)}</span>${escapeHtml(suffix)}`;
  }

  function syncMonoFooterDock() {
    if (!els.centerFooter || !els.boardWrap || !els.centerEl || !els.continueWrap || !els.gameOverEl) return;
    const dock = window.matchMedia('(max-width: 640px)').matches;
    if (dock) {
      els.boardWrap.classList.add('mono-board-wrap--footer-docked');
      els.centerFooter.classList.add('mono-center-footer--below-board');
      const tray = els.deedTray;
      if (tray?.parentNode === els.boardWrap) {
        els.boardWrap.insertBefore(els.centerFooter, tray);
      } else {
        els.boardWrap.appendChild(els.centerFooter);
      }
      els.boardWrap.appendChild(els.continueWrap);
      els.boardWrap.appendChild(els.gameOverEl);
    } else {
      els.boardWrap.classList.remove('mono-board-wrap--footer-docked');
      els.centerFooter.classList.remove('mono-center-footer--below-board');
      els.centerEl.appendChild(els.centerFooter);
      els.centerEl.appendChild(els.continueWrap);
      els.centerEl.appendChild(els.gameOverEl);
    }
  }

  function bindMonoFooterDock() {
    if (!monoFooterDockBound) {
      monoFooterDockBound = true;
      window.matchMedia('(max-width: 640px)').addEventListener('change', () => syncMonoFooterDock());
    }
    syncMonoFooterDock();
  }

  function portfolioGroupKeyFor(idx) {
    const sq = BOARD[idx];
    if (sq.kind === 'property') return sq.group || '__misc';
    if (sq.kind === 'transit') return '__transit';
    if (sq.kind === 'utility') return '__utility';
    return '__misc';
  }

  function portfolioGroupSortIndex(groupKey) {
    const i = PORTFOLIO_GROUP_ORDER.indexOf(groupKey);
    return i === -1 ? PORTFOLIO_GROUP_ORDER.length : i;
  }

  function portfolioRowAccent(groupKey, firstIdx) {
    if (groupKey === '__transit') return GROUP_COLORS.transit;
    if (groupKey === '__utility') return GROUP_COLORS.utility;
    if (groupKey === '__misc') return portfolioAccentColor(firstIdx);
    return GROUP_COLORS[groupKey] || portfolioAccentColor(firstIdx);
  }

  function portfolioGroupsFor(ownerKey) {
    const buckets = new Map();
    BOARD.forEach((sq, idx) => {
      if (state.ownership[idx] !== ownerKey) return;
      if (sq.kind !== 'property' && sq.kind !== 'transit' && sq.kind !== 'utility') return;
      const k = portfolioGroupKeyFor(idx);
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(idx);
    });
    buckets.forEach((arr) =>
      arr.sort((a, b) =>
        BOARD[a].name.localeCompare(BOARD[b].name, undefined, { sensitivity: 'base' }),
      ),
    );
    const keys = [...buckets.keys()].sort((a, b) => {
      const da = portfolioGroupSortIndex(a);
      const db = portfolioGroupSortIndex(b);
      if (da !== db) return da - db;
      return String(a).localeCompare(String(b));
    });
    return keys.map((groupKey) => {
      const indices = buckets.get(groupKey);
      const accent = portfolioRowAccent(groupKey, indices[0]);
      return {
        groupKey,
        accent,
        items: indices.map((idx) => ({
          idx,
          text: portfolioLineFor(idx),
          chipAccent: portfolioAccentColor(idx),
        })),
      };
    });
  }

  function portfolioAccentColor(idx) {
    const sq = BOARD[idx];
    if (sq.stripColor) return sq.stripColor;
    if (sq.kind === 'utility') return sq.tileColor || GROUP_COLORS.utility;
    if (sq.group && GROUP_COLORS[sq.group]) return GROUP_COLORS[sq.group];
    return GROUP_COLORS.transit;
  }

  function portfolioLineFor(idx) {
    const sq = BOARD[idx];
    const rawName = sq.name.replace(/\n/g, ' ');
    const m = state.mortgaged[idx] ? ' · M' : '';
    if (sq.kind !== 'property') return rawName + m;
    const b = state.buildings[idx] || { houses: 0, hotel: false };
    if (b.hotel) return `${rawName} · hotel${m}`;
    if (b.houses > 0) return `${rawName} · ${b.houses} house${b.houses === 1 ? '' : 's'}${m}`;
    return rawName + m;
  }

  function schedulePortfolioScrollHints() {
    if (portfolioScrollRaf != null) return;
    portfolioScrollRaf = requestAnimationFrame(() => {
      portfolioScrollRaf = null;
      syncPortfolioScrollHints();
    });
  }

  function syncPortfolioScrollHints() {
    syncOnePortfolioShell(els.portfolioHumanShell, els.portfolioHuman);
    syncOnePortfolioShell(els.portfolioAiShell, els.portfolioAi);
    syncOnePortfolioShell(els.portfolioOverviewHumanShell, els.portfolioOverviewHuman);
    syncOnePortfolioShell(els.portfolioOverviewAiShell, els.portfolioOverviewAi);
  }

  function syncOnePortfolioShell(shell, ul) {
    if (!shell || !ul) return;
    const up = shell.querySelector('.mono-portfolio-hint--up');
    const down = shell.querySelector('.mono-portfolio-hint--down');
    if (!up || !down) return;
    const epsilon = 5;
    const maxScroll = ul.scrollHeight - ul.clientHeight;
    const overflow = maxScroll > epsilon;
    const canUp = overflow && ul.scrollTop > epsilon;
    const canDown = overflow && ul.scrollTop < maxScroll - epsilon;
    up.hidden = !canUp;
    down.hidden = !canDown;
    shell.classList.toggle('mono-portfolio-shell--more-above', canUp);
    shell.classList.toggle('mono-portfolio-shell--more-below', canDown);
  }

  function bindPortfolioScrollUi() {
    if (els._portfolioScrollBound) return;
    els._portfolioScrollBound = true;
    const onScroll = () => schedulePortfolioScrollHints();
    els.portfolioHuman?.addEventListener('scroll', onScroll, { passive: true });
    els.portfolioAi?.addEventListener('scroll', onScroll, { passive: true });
    els.portfolioOverviewHuman?.addEventListener('scroll', onScroll, { passive: true });
    els.portfolioOverviewAi?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  function fillPortfolioUl(ul, key) {
    ul.innerHTML = '';
    const groups = portfolioGroupsFor(key);
    if (groups.length === 0) {
      const li = document.createElement('li');
      li.className = 'mono-portfolio-empty';
      li.textContent = 'No listings yet';
      ul.appendChild(li);
      return;
    }
    groups.forEach((g) => {
      const li = document.createElement('li');
      li.className = 'mono-portfolio-group';
      li.style.setProperty('--portfolio-accent', g.accent);
      const chips = document.createElement('div');
      chips.className = 'mono-portfolio-chips';
      g.items.forEach(({ text, chipAccent, idx }) => {
        const item = document.createElement('div');
        item.className = 'mono-portfolio-item';
        const chip = document.createElement('span');
        chip.className = `mono-portfolio-chip${state.mortgaged[idx] ? ' mono-portfolio-chip--mortgaged' : ''}`;
        chip.style.setProperty('--chip-accent', chipAccent);
        chip.textContent = text;
        item.appendChild(chip);
        if (key === 'human') {
          item.style.cursor = 'pointer';
          item.title = 'Open listing card';
          item.addEventListener('click', (ev) => {
            if (ev.target.closest('button')) return;
            if (state.winner != null) return;
            toggleDeedTile(idx);
            renderAll();
          });
        }
        chips.appendChild(item);
      });
      li.appendChild(chips);
      ul.appendChild(li);
    });
  }

  function renderPortfolios() {
    if (!els.portfolioHuman || !els.portfolioAi) return;
    fillPortfolioUl(els.portfolioHuman, 'human');
    fillPortfolioUl(els.portfolioAi, 'ai');
    if (els.portfolioOverviewHuman) fillPortfolioUl(els.portfolioOverviewHuman, 'human');
    if (els.portfolioOverviewAi) fillPortfolioUl(els.portfolioOverviewAi, 'ai');
    queueMicrotask(() => schedulePortfolioScrollHints());
  }

  function renderLog() {
    els.logEl.innerHTML = '';
    state.history.slice(-12).reverse().forEach((line) => {
      const li = document.createElement('li');
      li.textContent = line;
      els.logEl.appendChild(li);
    });
  }

  /** Held Get Out Of Jail cards (Chance / Community Chest) — only cards players keep in Bushwickopoly. */
  function renderHeldGoojfChipsRow(hostEl, playerIdx /** @type {0|1} */) {
    if (!hostEl) return;
    hostEl.innerHTML = '';
    const hasCh = hasGoojf(state.goojfHeld, playerIdx, 'chance');
    const hasCc = hasGoojf(state.goojfHeld, playerIdx, 'communityChest');
    if (!hasCh && !hasCc) {
      hostEl.hidden = true;
      return;
    }
    hostEl.hidden = false;
    if (hasCh) {
      const s = document.createElement('span');
      s.className = 'mono-held-goojf-chip';
      s.textContent = 'GOOJF · Chance';
      s.title = 'Get Out of Jail Free — Chance pile';
      hostEl.appendChild(s);
    }
    if (hasCc) {
      const s = document.createElement('span');
      s.className = 'mono-held-goojf-chip';
      s.textContent = 'GOOJF · Chest';
      s.title = 'Get Out of Jail Free — Community Chest pile';
      hostEl.appendChild(s);
    }
  }

  function syncCardOverlay(paused) {
    const ov = els.cardOverlay;
    const btn = els.cardDismiss;
    const sheet = els.cardSheet;
    if (!ov || !btn) return;
    const p = state.pendingCardReveal;
    const humanReveal =
      !paused && state.winner == null && state.phase === 'player_card' && p?.playerIdx === 0;
    const investorReveal =
      !paused && state.winner == null && state.phase === 'investor_card' && p?.playerIdx === 1;
    const visible = humanReveal || investorReveal;
    if (sheet) sheet.classList.toggle('mono-card-sheet--investor', investorReveal);
    if (visible && p) {
      if (els.cardDrawer)
        els.cardDrawer.textContent = investorReveal ? `${PLAYER_LABEL.ai} drew` : 'You drew';
      if (els.cardOverlayTitle) els.cardOverlayTitle.textContent = p.deckTitle || '';
      if (els.cardOverlayBody) els.cardOverlayBody.textContent = p.body || '';
      ov.classList.remove('mono-card-overlay--hidden');
      btn.textContent = investorReveal ? 'Acknowledged' : 'Continue';
    } else {
      ov.classList.add('mono-card-overlay--hidden');
      if (sheet) sheet.classList.remove('mono-card-sheet--investor');
      btn.textContent = 'Continue';
    }
    btn.disabled = !visible;
  }

  function renderHud() {
    const humanBal = formatMoney(state.cash[0]);
    const aiBal = formatMoney(state.cash[1]);
    if (els.cashHumanDock) els.cashHumanDock.textContent = humanBal;
    if (els.cashAiDock) els.cashAiDock.textContent = aiBal;
    renderHumanCurrentSquareHud();
    renderPortfolios();
    const paused = els.continueWrap && !els.continueWrap.hidden;
    if (paused || state.winner != null) collapseMonoExpands();
    const sq = BOARD[state.positions[0]];
    const ph = state.phase;
    syncCardOverlay(paused);

    const hideRoll =
      paused ||
      state.winner != null ||
      ph === 'player_buy' ||
      ph === 'player_jail' ||
      (state.turnOwner === 0 && humanServingJail()) ||
      ph === 'player_resolving' ||
      ph === 'player_raise_cash' ||
      ph === 'player_card' ||
      ph === 'investor_card' ||
      ph === 'ai_roll';
    els.rollBtn.hidden = hideRoll;

    const rollInteractive = ph === 'player_roll' && !humanServingJail();
    els.rollBtn.disabled = paused || state.winner != null || !rollInteractive;

    const showBuyPass = !paused && ph === 'player_buy' && state.winner == null;
    const showJail =
      !paused &&
      state.turnOwner === 0 &&
      state.winner == null &&
      humanServingJail() &&
      ph !== 'player_raise_cash' &&
      ph !== 'player_buy' &&
      ph !== 'player_card' &&
      ph !== 'investor_card' &&
      ph !== 'player_resolving';
    const showPayDue = !paused && ph === 'player_raise_cash' && state.winner == null && state.paymentDue;

    els.payDueBtn.hidden = !showPayDue;
    if (showPayDue && state.paymentDue) {
      const due = state.paymentDue.amount;
      els.payDueBtn.textContent = `Pay ${formatMoney(due)}`;
      els.payDueBtn.disabled = state.cash[0] < due;
    }

    if (!paused && ph === 'player_raise_cash' && state.paymentDue) {
      const d = state.paymentDue;
      const short = Math.max(0, d.amount - state.cash[0]);
      renderPrompt(
        short > 0
          ? `You owe ${formatMoney(d.amount)} (${d.reason}). Raise ${formatMoney(short)} more — open Financing or a listing card (mortgage / sell upgrades), then tap Pay.`
          : `You owe ${formatMoney(d.amount)} (${d.reason}). Tap Pay to settle.`,
      );
    }

    els.buyBtn.hidden = !showBuyPass;
    els.passBtn.hidden = !showBuyPass;

    els.buyBtn.disabled =
      paused || ph !== 'player_buy' || !sq?.price || state.cash[0] < (sq?.price ?? Infinity);
    if (ph === 'player_buy' && sq?.price != null) {
      const short = sq.price - state.cash[0];
      els.buyBtn.title =
        short > 0
          ? `Can't afford — need ${formatMoney(short)} more (you have ${formatMoney(state.cash[0])}).`
          : '';
    } else {
      els.buyBtn.title = '';
    }
    els.passBtn.disabled = paused || ph !== 'player_buy';

    if (els.promptEl) {
      const broke =
        ph === 'player_buy' && sq?.price != null && state.cash[0] < sq.price;
      els.promptEl.classList.toggle('mono-prompt--blocked', broke);
    }

    if (els.jailActions) {
      els.jailActions.hidden = !showJail;
      els.jailPayBtn.textContent = `Pay ${formatMoney(JAIL_FINE)} fine`;
      const inj = state.inJail[0];
      const noMoreDoublesRolls = inj && inj.failedDoubles >= 3;
      els.jailRollBtn.hidden = noMoreDoublesRolls;
      // Fine is always allowed while in jail (optional before 3rd miss; required after).
      els.jailPayBtn.disabled = paused || !inj;
      els.jailRollBtn.disabled = paused || noMoreDoublesRolls || !inj;
      const jc = els.jailGoojfChance;
      const jchest = els.jailGoojfChest;
      if (jc || jchest) {
        const can = !!showJail && !paused;
        const hCh = hasGoojf(state.goojfHeld, 0, 'chance');
        const hCc = hasGoojf(state.goojfHeld, 0, 'communityChest');
        if (jc) {
          jc.hidden = !hCh;
          jc.disabled = !can || !hCh;
        }
        if (jchest) {
          jchest.hidden = !hCc;
          jchest.disabled = !can || !hCc;
        }
      }
    }

    const nBuild = humanBuildableProps().length;
    if (els.developBadge) {
      els.developBadge.textContent = nBuild > 0 ? String(nBuild) : '';
      els.developBadge.hidden = nBuild === 0 || state.winner != null;
    }
    const mgmtLocked =
      paused || state.winner != null || ph === 'player_card' || ph === 'investor_card';

    renderHeldGoojfChipsRow(els.goojfHumanDock, 0);
    renderHeldGoojfChipsRow(els.goojfAiDock, 1);
    if (els.developExpandToggle) {
      els.developExpandToggle.disabled = mgmtLocked;
      els.developExpandToggle.title = paused ? 'Continue or start a new game first.' : '';
    }
    if (els.financeExpandToggle) {
      els.financeExpandToggle.disabled = mgmtLocked;
      els.financeExpandToggle.title = els.developExpandToggle?.title ?? '';
    }

    if (!paused && state.winner == null && els.promptEl) {
      syncHudPromptToPhase(ph);
    }
  }

  function updatePieces() {
    cells.forEach((cell) => {
      if (!cell) return;
      const slot = cell.querySelector('.mono-cell-pieces');
      if (slot) slot.innerHTML = '';
      const innerSlot = cell.querySelector('.mono-jail-inner-pieces');
      if (innerSlot) innerSlot.innerHTML = '';
    });
    PLAYERS.forEach((pkey, pi) => {
      const idx = state.positions[pi];
      const cell = cells[idx];
      if (!cell) return;
      const inShuttle = idx === JAIL_INDEX && state.inJail[pi];
      const slot = inShuttle
        ? cell.querySelector('.mono-jail-inner-pieces') || cell.querySelector('.mono-cell-pieces')
        : cell.querySelector('.mono-cell-pieces');
      if (!slot) return;
      const piece = document.createElement('div');
      piece.className = `mono-piece mono-piece--${pkey}`;
      piece.title = PLAYER_LABEL[pkey];
      const imgSrc = pkey === 'human' ? els.boardRoot.dataset.pieceHuman : els.boardRoot.dataset.pieceAi;
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = '';
        piece.appendChild(img);
      }
      const dup = state.positions[0] === state.positions[1];
      const bothShuttle =
        dup &&
        state.positions[0] === JAIL_INDEX &&
        state.inJail[0] &&
        state.inJail[1];
      const bothVisit =
        dup &&
        state.positions[0] === JAIL_INDEX &&
        !state.inJail[0] &&
        !state.inJail[1];
      let ox = 0;
      let oy = 0;
      if (dup) {
        ox = pi === 0 ? -9 : 9;
        oy = pi === 0 ? -9 : 9;
      }
      if (bothShuttle) {
        ox = pi === 0 ? -8 : 8;
        oy = pi === 0 ? -8 : 8;
      }
      if (bothVisit) {
        ox = pi === 0 ? -9 : 9;
        oy = pi === 0 ? -9 : 9;
      }
      piece.style.transform = ox || oy ? `translate(${ox}px,${oy}px)` : '';
      slot.appendChild(piece);
    });
    cells.forEach((cell, idx) => {
      cell.classList.toggle('mono-cell--owned-human', state.ownership[idx] === 'human');
      cell.classList.toggle('mono-cell--owned-ai', state.ownership[idx] === 'ai');
      cell.classList.toggle('mono-cell--mortgaged', !!state.mortgaged[idx]);
      const b = state.buildings[idx];
      let hb = cell.querySelector('.mono-house-badge');
      if (!hb) {
        hb = document.createElement('div');
        hb.className = 'mono-house-badge';
        cell.appendChild(hb);
      }
      if (b?.hotel) hb.textContent = 'H';
      else if (b?.houses) hb.textContent = String(b.houses);
      else hb.textContent = '';
    });
  }

  function renderAll() {
    syncDifficultyDock();
    renderHud();
    renderLog();
    updatePieces();
    if (deedOpenOrder.length > 0 && els.deedTray) renderDeedTray();
    refreshMonoExpandBodies();
    els.gameOverEl.hidden = state.winner == null;
    if (state.winner != null) {
      els.gameOverText.textContent = winnerHeadline(PLAYERS[state.winner]);
      const sub = gameOverSubtext(state.bankruptDetail);
      if (els.gameOverDetail) {
        els.gameOverDetail.textContent = sub;
        els.gameOverDetail.hidden = !sub;
      }
    }
  }

  function buildBoardDOM() {
    const root = document.getElementById('monoBoard');
    if (!root) return;
    els.boardRoot = root;
    const wrap = root.parentElement?.classList.contains('mono-board-wrap') ? root.parentElement : null;
    els.boardWrap = wrap || undefined;
    root.innerHTML = '';
    cells = Array(40).fill(null);

    const center = document.createElement('div');
    center.className = 'mono-center';
    center.style.gridRow = '2 / 11';
    center.style.gridColumn = '2 / 11';
    root.appendChild(center);

    BOARD.forEach((sq, idx) => {
      const { row, col } = cellGridPos(idx);
      const cell = document.createElement('div');
      cell.className = `mono-cell mono-cell--${sq.side} mono-cell--deed`;
      cell.dataset.boardIdx = String(idx);
      if (idx === 0) {
        cell.classList.add('mono-cell--payday');
      }
      if (idx === 30) {
        cell.classList.add('mono-cell--trackwork');
      }
      if (sq.kind === 'property') {
        cell.classList.add('mono-cell--property');
        const strip = document.createElement('div');
        strip.className = 'mono-strip';
        strip.style.background = sq.stripColor || GROUP_COLORS[sq.group] || '#666';
        cell.appendChild(strip);
      }
      if (sq.kind === 'transit') {
        cell.classList.add('mono-cell--property');
        cell.classList.add('mono-cell--transit');
        cell.style.setProperty('--transit-color', sq.stripColor || GROUP_COLORS.transit || '#666');
        const strip = document.createElement('div');
        strip.className = 'mono-strip';
        strip.style.background = sq.stripColor || GROUP_COLORS.transit || '#666';
        cell.appendChild(strip);
      }
      if (sq.kind === 'utility') {
        cell.classList.add('mono-cell--property');
        cell.classList.add('mono-cell--utility');
        cell.style.setProperty('--utility-color', sq.tileColor || GROUP_COLORS.utility);
        const strip = document.createElement('div');
        strip.className = 'mono-strip';
        strip.style.background = sq.tileColor || GROUP_COLORS.utility;
        cell.appendChild(strip);
      }
      if (sq.kind === 'nice') {
        cell.classList.add('mono-cell--nice');
      }
      if (idx === 20) {
        cell.classList.add('mono-cell--nice');
      }
      if (sq.kind === 'tax') {
        cell.classList.add('mono-cell--tax');
        const strip = document.createElement('div');
        strip.className = 'mono-strip mono-strip--tax';
        strip.setAttribute('aria-hidden', 'true');
        cell.appendChild(strip);
      }

      if (idx === 10) {
        cell.classList.add('mono-cell--jail-corner');
        const jailWrap = document.createElement('div');
        jailWrap.className = 'mono-jail-layout';
        const visitV = document.createElement('div');
        visitV.className = 'mono-jail-visit mono-jail-visit--v';
        visitV.textContent = 'walking';
        const inner = document.createElement('div');
        inner.className = 'mono-jail-inner';
        const innerLabel = document.createElement('span');
        innerLabel.className = 'mono-jail-inner-label';
        innerLabel.textContent = 'on the bus';
        inner.appendChild(innerLabel);
        const innerPieces = document.createElement('div');
        innerPieces.className = 'mono-jail-inner-pieces';
        inner.appendChild(innerPieces);
        const visitH = document.createElement('div');
        visitH.className = 'mono-jail-visit mono-jail-visit--h';
        visitH.textContent = 'past';
        jailWrap.appendChild(visitV);
        jailWrap.appendChild(inner);
        jailWrap.appendChild(visitH);
        cell.appendChild(jailWrap);
      } else {
        const body = document.createElement('div');
        body.className = 'mono-cell-body';
        const name = document.createElement('span');
        name.className = 'mono-name';
        if (idx === 0) {
          name.textContent = 'Payday';
        } else {
          name.innerHTML = sq.name.replace(/\n/g, '<br/>');
        }
        body.appendChild(name);
        if (idx === 0) {
          const goAmt = document.createElement('span');
          goAmt.className = 'mono-price';
          goAmt.textContent = formatMoney(GO_BONUS);
          body.appendChild(goAmt);
        } else if (sq.price != null) {
          const price = document.createElement('span');
          price.className = 'mono-price';
          price.textContent = formatMoney(sq.price);
          body.appendChild(price);
        } else if (sq.tax != null) {
          const price = document.createElement('span');
          price.className = 'mono-price';
          price.textContent = formatMoney(sq.tax);
          body.appendChild(price);
        }
        cell.appendChild(body);
      }
      const pieces = document.createElement('div');
      pieces.className = 'mono-cell-pieces';
      cell.appendChild(pieces);
      cell.style.gridRow = String(row);
      cell.style.gridColumn = String(col);
      cell.title = sq.name.replace(/\n/g, ' ');
      root.appendChild(cell);
      cells[idx] = cell;
    });

    center.innerHTML = `
      <div class="mono-center-head">
        <div class="mono-cash-dock" role="status" aria-label="Cash on hand">
          <div class="mono-cash-dock-pill mono-cash-dock-pill--human">
            <span class="mono-cash-dock-piece mono-piece mono-piece--human" aria-hidden="true"><img alt="" decoding="async" /></span>
            <div class="mono-cash-dock-stack">
              <div class="mono-cash-dock-row">
                <span class="mono-cash-dock-label">You</span>
                <strong class="mono-cash-dock-amt" id="monoCashHumanDock">$0</strong>
              </div>
              <div id="monoGoojfHumanHeld" class="mono-cash-dock-held" aria-label="Held Get Out Of Jail cards" hidden></div>
            </div>
          </div>
          <div class="mono-cash-dock-pill mono-cash-dock-pill--ai">
            <span class="mono-cash-dock-piece mono-piece mono-piece--ai" aria-hidden="true"><img alt="" decoding="async" /></span>
            <div class="mono-cash-dock-stack">
              <div class="mono-cash-dock-row mono-cash-dock-row--ai">
                <span class="mono-cash-dock-label">${PLAYER_LABEL.ai}</span>
                <strong class="mono-cash-dock-amt" id="monoCashAiDock">$0</strong>
              </div>
              <div id="monoGoojfAiHeld" class="mono-cash-dock-held mono-cash-dock-held--ai" aria-label="Held Get Out Of Jail cards (${PLAYER_LABEL.ai})" hidden></div>
            </div>
          </div>
        </div>
      </div>
      <div class="mono-portfolio-region">
        <div class="mono-cash-grid">
          <div class="mono-cash-col mono-cash-col--human">
            <div class="mono-portfolio-shell" id="monoPortfolioHumanShell">
              <span class="mono-portfolio-hint mono-portfolio-hint--up" hidden aria-hidden="true">···</span>
              <ul class="mono-portfolio mono-scrollbar-none" id="monoPortfolioHuman" aria-label="Your listings"></ul>
              <span class="mono-portfolio-hint mono-portfolio-hint--down" hidden>More ↓</span>
            </div>
          </div>
          <div class="mono-cash-col mono-cash-col--ai">
            <div class="mono-portfolio-shell" id="monoPortfolioAiShell">
              <span class="mono-portfolio-hint mono-portfolio-hint--up" hidden aria-hidden="true">···</span>
              <ul class="mono-portfolio mono-scrollbar-none" id="monoPortfolioAi" aria-label="${PLAYER_LABEL.ai} listings"></ul>
              <span class="mono-portfolio-hint mono-portfolio-hint--down" hidden>More ↓</span>
            </div>
          </div>
        </div>
      </div>
      <div class="mono-center-footer">
        <p id="monoDice" class="mono-dice-readout" aria-live="polite" aria-atomic="true"></p>
        <p
          class="mono-current-square mono-current-square--tappable"
          id="monoCurrentSquare"
          aria-live="polite"
          tabindex="0"
          role="button"
          title="Open listing card for this square"
        ></p>
        <p class="mono-prompt" id="monoPrompt"></p>
        <div class="mono-actions">
          <button type="button" class="cta-btn mono-action-btn" id="monoRoll">Roll</button>
          <button type="button" class="cta-btn mono-action-btn mono-action-btn-outline" id="monoBuy">Buy</button>
          <button type="button" class="cta-btn mono-action-btn mono-action-btn-outline" id="monoPass">Pass</button>
          <button type="button" class="cta-btn mono-action-btn" id="monoPayDue" hidden>Pay</button>
        </div>
        <div class="mono-actions-jail" id="monoJailActions" hidden>
          <div class="mono-actions-jail-primary">
            <button type="button" class="cta-btn mono-action-btn mono-action-btn-outline" id="monoJailPay">Pay fine</button>
            <button type="button" class="cta-btn mono-action-btn" id="monoJailRoll">Roll for doubles</button>
          </div>
          <div class="mono-actions-jail-goojf">
            <button type="button" class="cta-btn mono-action-btn mono-action-btn-outline" id="monoJailGoojfChance" hidden>
              GOOJF · Chance
            </button>
            <button type="button" class="cta-btn mono-action-btn mono-action-btn-outline" id="monoJailGoojfChest" hidden>
              GOOJF · Chest
            </button>
          </div>
        </div>
        <div class="mono-expand-stack">
          <div class="mono-expand" id="monoDevelopExpand">
            <button
              type="button"
              class="mono-expand-toggle"
              id="monoDevelopToggle"
              aria-expanded="false"
              aria-controls="monoDevelopBody"
            >
              <span class="mono-expand-chevron" aria-hidden="true">›</span>
              <span class="mono-expand-label">Develop</span>
              <span class="mono-mgmt-badge" id="monoDevelopBadge" hidden></span>
            </button>
            <div
              class="mono-expand-body mono-scrollbar-none"
              id="monoDevelopBody"
              hidden
              aria-hidden="true"
            ></div>
          </div>
          <div class="mono-expand" id="monoFinanceExpand">
            <button
              type="button"
              class="mono-expand-toggle"
              id="monoFinanceToggle"
              aria-expanded="false"
              aria-controls="monoFinanceBody"
            >
              <span class="mono-expand-chevron" aria-hidden="true">›</span>
              <span class="mono-expand-label">Financing</span>
            </button>
            <div
              class="mono-expand-body mono-scrollbar-none"
              id="monoFinanceBody"
              hidden
              aria-hidden="true"
            ></div>
          </div>
          <div class="mono-expand mono-expand--listings" id="monoListingsExpand">
            <button
              type="button"
              class="mono-expand-toggle"
              id="monoListingsToggle"
              aria-expanded="false"
              aria-controls="monoListingsBody"
            >
              <span class="mono-expand-chevron" aria-hidden="true">›</span>
              <span class="mono-expand-label">Who owns what</span>
            </button>
            <div
              class="mono-expand-body mono-scrollbar-none"
              id="monoListingsBody"
              hidden
              aria-hidden="true"
            >
              <div class="mono-overview-grid">
                <div class="mono-overview-col mono-overview-col--human">
                  <p class="mono-overview-player-label">You</p>
                  <div class="mono-portfolio-shell mono-portfolio-shell--overview" id="monoPortfolioOverviewHumanShell">
                    <span class="mono-portfolio-hint mono-portfolio-hint--up" hidden aria-hidden="true">···</span>
                    <ul class="mono-portfolio mono-portfolio--overview mono-scrollbar-none" id="monoPortfolioOverviewHuman" aria-label="Your listings"></ul>
                    <span class="mono-portfolio-hint mono-portfolio-hint--down" hidden>More ↓</span>
                  </div>
                </div>
                <div class="mono-overview-col mono-overview-col--ai">
                  <p class="mono-overview-player-label">${PLAYER_LABEL.ai}</p>
                  <div class="mono-portfolio-shell mono-portfolio-shell--overview" id="monoPortfolioOverviewAiShell">
                    <span class="mono-portfolio-hint mono-portfolio-hint--up" hidden aria-hidden="true">···</span>
                    <ul class="mono-portfolio mono-portfolio--overview mono-scrollbar-none" id="monoPortfolioOverviewAi" aria-label="${PLAYER_LABEL.ai} listings"></ul>
                    <span class="mono-portfolio-hint mono-portfolio-hint--down" hidden>More ↓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <ul class="mono-log mono-scrollbar-none" id="monoLog"></ul>
      </div>
      <div id="monoCardOverlay" class="mono-card-overlay mono-card-overlay--hidden" role="dialog" aria-modal="true" aria-labelledby="monoCardDrawer monoCardOverlayTitle">
        <div id="monoCardSheet" class="mono-card-sheet">
          <p class="mono-card-drawer" id="monoCardDrawer"></p>
          <p class="mono-card-deck-label" id="monoCardOverlayTitle"></p>
          <p class="mono-card-face" id="monoCardOverlayBody"></p>
          <button type="button" class="cta-btn mono-card-dismiss" id="monoCardDismiss" disabled>Continue</button>
        </div>
      </div>
      <div class="mono-continue" id="monoContinue" hidden>
        <p>Saved game found.</p>
        <button type="button" class="cta-btn" id="monoContinueBtn">Continue</button>
        <button type="button" class="cta-btn cta-btn-outline" id="monoNewBtn">New game</button>
      </div>
      <div class="mono-gameover" id="monoGameOver" hidden>
        <p id="monoGameOverText" class="mono-gameover-title"></p>
        <p id="monoGameOverDetail" class="mono-gameover-detail" hidden></p>
        <button type="button" class="cta-btn" id="monoResetBtn">Play again</button>
      </div>
    `;

    const dockHumanPieceImg = center.querySelector('.mono-cash-dock-pill--human .mono-cash-dock-piece img');
    const dockAiPieceImg = center.querySelector('.mono-cash-dock-pill--ai .mono-cash-dock-piece img');
    if (dockHumanPieceImg && root.dataset.pieceHuman) dockHumanPieceImg.src = root.dataset.pieceHuman;
    if (dockAiPieceImg && root.dataset.pieceAi) dockAiPieceImg.src = root.dataset.pieceAi;

    els.centerEl = center;
    els.centerFooter = center.querySelector('.mono-center-footer');
    els.diceEl = center.querySelector('#monoDice');
    els.currentSquareEl = center.querySelector('#monoCurrentSquare');
    els.promptEl = center.querySelector('#monoPrompt');
    els.rollBtn = center.querySelector('#monoRoll');
    els.buyBtn = center.querySelector('#monoBuy');
    els.passBtn = center.querySelector('#monoPass');
    els.payDueBtn = center.querySelector('#monoPayDue');
    els.logEl = center.querySelector('#monoLog');
    els.cashHumanDock = center.querySelector('#monoCashHumanDock');
    els.cashAiDock = center.querySelector('#monoCashAiDock');
    els.goojfHumanDock = center.querySelector('#monoGoojfHumanHeld');
    els.goojfAiDock = center.querySelector('#monoGoojfAiHeld');
    els.portfolioHumanShell = center.querySelector('#monoPortfolioHumanShell');
    els.portfolioAiShell = center.querySelector('#monoPortfolioAiShell');
    els.portfolioOverviewHumanShell = center.querySelector('#monoPortfolioOverviewHumanShell');
    els.portfolioOverviewAiShell = center.querySelector('#monoPortfolioOverviewAiShell');
    els.portfolioHuman = center.querySelector('#monoPortfolioHuman');
    els.portfolioAi = center.querySelector('#monoPortfolioAi');
    els.portfolioOverviewHuman = center.querySelector('#monoPortfolioOverviewHuman');
    els.portfolioOverviewAi = center.querySelector('#monoPortfolioOverviewAi');
    els.continueWrap = center.querySelector('#monoContinue');
    els.gameOverEl = center.querySelector('#monoGameOver');
    els.gameOverText = center.querySelector('#monoGameOverText');
    els.gameOverDetail = center.querySelector('#monoGameOverDetail');
    els.jailActions = center.querySelector('#monoJailActions');
    els.jailPayBtn = center.querySelector('#monoJailPay');
    els.jailRollBtn = center.querySelector('#monoJailRoll');
    els.jailGoojfChance = center.querySelector('#monoJailGoojfChance');
    els.jailGoojfChest = center.querySelector('#monoJailGoojfChest');
    els.cardOverlay = center.querySelector('#monoCardOverlay');
    els.cardSheet = center.querySelector('#monoCardSheet');
    els.cardDrawer = center.querySelector('#monoCardDrawer');
    els.cardOverlayTitle = center.querySelector('#monoCardOverlayTitle');
    els.cardOverlayBody = center.querySelector('#monoCardOverlayBody');
    els.cardDismiss = center.querySelector('#monoCardDismiss');
    function onCurrentSquareActivate() {
      if (state.winner != null) return;
      toggleDeedTile(state.positions[0]);
      renderAll();
    }
    els.currentSquareEl?.addEventListener('click', onCurrentSquareActivate);
    els.currentSquareEl?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      onCurrentSquareActivate();
    });

    els.rollBtn.addEventListener('click', onRoll);
    els.buyBtn.addEventListener('click', onBuy);
    els.passBtn.addEventListener('click', onPass);
    els.payDueBtn.addEventListener('click', onPayDue);
    els.jailPayBtn.addEventListener('click', onJailPayFine);
    els.jailRollBtn.addEventListener('click', onJailRollDoubles);
    els.jailGoojfChance?.addEventListener('click', () => onJailUseGoojf('chance'));
    els.jailGoojfChest?.addEventListener('click', () => onJailUseGoojf('communityChest'));
    els.cardDismiss?.addEventListener('click', () => dismissCardOverlay());
    wireMonoExpandSections(center);
    center.querySelector('#monoResetBtn').addEventListener('click', () => startFreshGame());
    center.querySelector('#monoContinueBtn').addEventListener('click', () => {
      els.continueWrap.hidden = true;
      normalizeTurnState();
      renderAll();
    });
    center.querySelector('#monoNewBtn').addEventListener('click', () => startFreshGame());

    mountDifficultyDock();
    mountRestartControls();
    syncDifficultyDock();
    wireDeedUI(root);
    bindPortfolioScrollUi();
    bindMonoFooterDock();
    queueMicrotask(() => schedulePortfolioScrollHints());
  }

  export function boot() {
    const section = document.getElementById('game');
    if (!section) return;
    buildBoardDOM();
    const had = load();
    if (had && state.winner == null) {
      normalizeTurnState();
      /** Full-screen gate hides Buy/Roll/Jail/Pay; skip it when the save already needs those controls. */
      if (loadedSaveNeedsImmediateHumanHud()) {
        els.continueWrap.hidden = true;
      } else {
        els.continueWrap.hidden = false;
        renderPrompt('Continue your saved game or start fresh.');
      }
    } else {
      els.continueWrap.hidden = true;
      if (!had) log('Welcome — roll to start.');
      renderPrompt(state.winner != null ? 'Game over — play again?' : 'Your turn — roll the dice.');
      queueMicrotask(() => normalizeTurnState());
    }
    if (!monoDifficultyResizeWired) {
      monoDifficultyResizeWired = true;
      window.addEventListener('resize', () => syncDifficultyDock());
    }
    renderAll();
  }

  /** After refresh: if we’re in a human decision / roll state, never block the board behind “Continue…”. */
  function loadedSaveNeedsImmediateHumanHud() {
    if (state.winner != null) return false;
    if (state.phase === 'player_buy') return true;
    if (state.phase === 'player_jail') return true;
    if (state.phase === 'player_raise_cash' && state.paymentDue) return true;
    if (state.phase === 'player_card' || state.phase === 'investor_card') return true;
    if (state.phase === 'player_roll' && state.turnOwner === 0) return true;
    if (state.phase === 'player_resolving' && state.turnOwner === 0) return true;
    return false;
  }

