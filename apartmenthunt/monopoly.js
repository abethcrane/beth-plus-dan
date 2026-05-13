(() => {
  const STORAGE_KEY = 'bushwick-monopoly-state-v15';
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
    { kind: 'transit', name: 'M Train', price: 200 * 25, baseRent: 0, group: 'transit', side: 's', stripColor: '#ff6319' },
    { kind: 'property', name: '60th Pl', group: 'light_blue', side: 's', ...ukProp(100, 50, [6, 30, 90, 270, 400, 550]) },
    { kind: 'nice', name: 'Mixtape', side: 's' },
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
      tileColor: '#4299f0',
    },
    { kind: 'property', name: 'Wyckoff Ave', group: 'pink', side: 'w', ...ukProp(140, 100, [10, 50, 150, 450, 625, 750]) },
    { kind: 'property', name: 'Seneca Ave', group: 'pink', side: 'w', ...ukProp(160, 100, [12, 60, 180, 500, 700, 900]) },
    { kind: 'transit', name: 'L Train', price: 200 * 25, baseRent: 0, group: 'transit', side: 'w', stripColor: '#a7a9ac' },
    { kind: 'property', name: 'Gates Ave', group: 'orange', side: 'w', ...ukProp(180, 100, [14, 70, 200, 550, 750, 950]) },
    { kind: 'nice', name: 'Ridgewood\nCommunity Garden', side: 'w' },
    { kind: 'property', name: 'Halsey St', group: 'orange', side: 'w', ...ukProp(180, 100, [14, 70, 200, 550, 750, 950]) },
    { kind: 'property', name: 'Palmetto St', group: 'orange', side: 'w', ...ukProp(200, 100, [16, 80, 220, 600, 800, 1000]) },
    { kind: 'corner', name: 'Maria Hernandez\nPark', side: 'nw' },
    { kind: 'property', name: 'Greene Ave', group: 'red', side: 'n', ...ukProp(220, 150, [18, 90, 250, 700, 875, 1050]) },
    { kind: 'nice', name: 'Ice Cream Window', side: 'n' },
    { kind: 'property', name: 'Grove St', group: 'red', side: 'n', ...ukProp(220, 150, [18, 90, 250, 700, 875, 1050]) },
    { kind: 'property', name: 'Evergreen Ave', group: 'red', side: 'n', ...ukProp(240, 150, [20, 100, 300, 750, 925, 1100]) },
    { kind: 'transit', name: 'J / Z Train', price: 200 * 25, baseRent: 0, group: 'transit', side: 'n', stripColor: '#996633' },
    { kind: 'property', name: 'Hancock St', group: 'yellow', side: 'n', ...ukProp(260, 150, [22, 110, 330, 800, 975, 1150]) },
    { kind: 'property', name: 'Covert St', group: 'yellow', side: 'n', ...ukProp(260, 150, [22, 110, 330, 800, 975, 1150]) },
    {
      kind: 'utility',
      name: 'Con Ed Electric',
      price: 150 * 25,
      baseRent: 0,
      group: 'utility',
      side: 'n',
      tileColor: '#4299f0',
    },
    { kind: 'property', name: 'Weirfeld St', group: 'yellow', side: 'n', ...ukProp(280, 150, [24, 120, 360, 850, 1025, 1200]) },
    { kind: 'corner', name: 'Trackwork —\ntake the bus', side: 'ne' },
    { kind: 'property', name: 'Grandview Ave', group: 'green', side: 'e', ...ukProp(300, 200, [26, 130, 390, 900, 1100, 1275]) },
    { kind: 'property', name: 'Onderdonk Ave', group: 'green', side: 'e', ...ukProp(300, 200, [26, 130, 390, 900, 1100, 1275]) },
    { kind: 'nice', name: 'Citibike Dock', side: 'e' },
    { kind: 'property', name: 'Woodward Ave', group: 'green', side: 'e', ...ukProp(320, 200, [28, 150, 450, 1000, 1200, 1400]) },
    { kind: 'transit', name: 'G Train', price: 200 * 25, baseRent: 0, group: 'transit', side: 'e', stripColor: '#6cbe45' },
    { kind: 'nice', name: 'Panina', side: 'e' },
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
      body += `<p class="mono-deed-note">Community spot — no purchase. Draw-style rules don’t apply in this build; landing does nothing special.</p>`;
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

  function renderDeedTray() {
    if (!els.deedTray) return;
    els.deedTray.innerHTML = '';
    if (deedOpenOrder.length === 0) {
      els.deedTray.hidden = true;
      els.deedTray.setAttribute('aria-hidden', 'true');
      return;
    }
    els.deedTray.hidden = false;
    els.deedTray.setAttribute('aria-hidden', 'false');
    deedOpenOrder.forEach((idx) => {
      const art = document.createElement('article');
      art.className = 'mono-deed-tile';
      art.dataset.boardIdx = String(idx);
      art.setAttribute('aria-label', `${BOARD[idx].name.replace(/\n/g, ' ')} listing`);
      art.innerHTML = buildDeedCardMarkup(idx);
      art.querySelector('.mono-deed-tile-close')?.addEventListener('click', () => removeDeedTile(idx));
      els.deedTray.appendChild(art);
    });
  }

  function toggleDeedTile(idx) {
    if (idx < 0 || idx >= BOARD.length) return;
    const pos = deedOpenOrder.indexOf(idx);
    if (pos >= 0) deedOpenOrder.splice(pos, 1);
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

    boardRoot.addEventListener('click', (e) => {
      const cell = e.target.closest('[data-board-idx]');
      if (!cell || !boardRoot.contains(cell)) return;
      toggleDeedTile(Number(cell.dataset.boardIdx));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
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

  function initialState() {
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
    };
  }

  let state = initialState();
  let cells = [];
  let els = {};
  let portfolioScrollRaf = null;
  let monoFooterDockBound = false;
  /** @type {number[]} Board indices with listing cards open below the board (order preserved). */
  let deedOpenOrder = [];
  /** Debounce resuming AI turn after refresh / normalize (see normalizeTurnState). */
  let monoAiResumeTimeout = null;

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
      state.phase === 'player_resolving'
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
      state = { ...initialState(), ...o };
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
        'player_raise_cash',
        'ai_roll',
        'game_over',
      ]);
      if (!phases.has(state.phase)) {
        state.phase = 'player_roll';
      }
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
    state.history.push(`${new Date().toISOString().slice(11, 19)} ${PLAYER_LABEL[PLAYERS[loser]]} is tapped out. ${PLAYER_LABEL[PLAYERS[state.winner]]} wins.`);
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

  function aiTrySellOne(playerIdx) {
    const owner = PLAYERS[playerIdx];
    const props = BOARD.map((_, idx) => idx).filter((idx) =>
      canSellHere(owner, idx, state.ownership, state.buildings),
    );
    if (props.length === 0) return false;
    const pick = props[Math.floor(Math.random() * props.length)];
    return sellOneBuilding(owner, pick);
  }

  function aiTryMortgageOne(playerIdx) {
    const candidates = BOARD.map((_, idx) => idx).filter((idx) => canMortgage(playerIdx, idx));
    if (candidates.length === 0) return false;
    candidates.sort((a, b) => mortgageValueFor(a) - mortgageValueFor(b));
    return applyMortgage(playerIdx, candidates[0]);
  }

  function aiLiquidateUntil(playerIdx, needCash) {
    let guard = 0;
    while (state.cash[playerIdx] < needCash && guard++ < 240) {
      const before = state.cash[playerIdx];
      if (aiTrySellOne(playerIdx)) continue;
      if (aiTryMortgageOne(playerIdx)) continue;
      if (state.cash[playerIdx] === before) break;
    }
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
      maybeAiBuild();
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
      maybeAiBuild();
      beginHumanTurn();
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
              maybeAiBuild();
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
              maybeAiBuild();
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
      aiLiquidateUntil(1, amount);
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

  function logLandfall(playerIdx, idx) {
    const sq = BOARD[idx];
    const you = playerIdx === 0 ? 'You' : PLAYER_LABEL.ai;

    if (sq.kind === 'tax') {
      log(`${you} landed on ${sq.name} (pay ${formatMoney(sq.tax)}).`);
      return;
    }
    if (sq.kind === 'nice') {
      log(`${you} landed on ${sq.name} (nothing owed).`);
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

  function resolveLanding(playerIdx, cb, landingPayCtx) {
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
      if (state.winner == null) cb?.();
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
        const reserve = Math.round(state.cash[1] * 0.4);
        const buy = state.cash[1] - sq.price >= reserve && Math.random() > 0.15;
        setTimeout(() => {
          if (state.winner != null) return;
          if (buy && state.cash[1] >= sq.price) {
            state.cash[1] -= sq.price;
            state.ownership[idx] = 'ai';
            log(`${PLAYER_LABEL.ai}: ${aiPick(AI_QUIPS.buy)} Bought ${sq.name} for ${formatMoney(sq.price)}.`);
          } else {
            log(`${PLAYER_LABEL.ai}: ${aiPick(AI_QUIPS.pass)} Skipped ${sq.name}.`);
          }
          save();
          renderAll();
          if (state.winner == null) cb?.();
        }, 900);
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
    const rent = computeRent(idx, state.ownership, state.buildings);
    logLandfall(playerIdx, idx);
    const resume = paymentResumeFromLandingPay(landingPayCtx);
    settlePayment(playerIdx, rent, `Rent on ${sq.name}`, true, {
      payeeIdx: ownerIdx,
      resume,
    });
  }

  function maybeAiBuild() {
    const indices = BOARD.map((_, idx) => idx).filter((idx) => state.ownership[idx] === 'ai' && BOARD[idx].kind === 'property');
    for (const idx of shuffle(indices)) {
      const sq = BOARD[idx];
      const mono = hasMonopoly('ai', sq.group, state.ownership);
      if (!mono) continue;
      const b = state.buildings[idx] || { houses: 0, hotel: false };
      if (b.hotel) continue;
      if (!canBuildHere('ai', idx, state.ownership, state.buildings)) continue;
      if (b.houses === 4 && !b.hotel) {
        const cost = hotelCostFor(idx);
        if (state.cash[1] >= cost) {
          state.cash[1] -= cost;
          state.buildings[idx] = { houses: 0, hotel: true };
          log(`${PLAYER_LABEL.ai}: ${aiPick(AI_QUIPS.house)} Hotel on ${sq.name}.`);
          save();
          renderAll();
          return;
        }
      } else if (b.houses < 4) {
        const cost = houseCostFor(idx);
        if (state.cash[1] >= cost) {
          state.cash[1] -= cost;
          state.buildings[idx] = { houses: b.houses + 1, hotel: false };
          log(`${PLAYER_LABEL.ai}: Built house on ${sq.name}.`);
          save();
          renderAll();
          return;
        }
      }
    }
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
          maybeAiBuild();
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

  function onJailPayFine() {
    if (state.winner != null || state.turnOwner !== 0 || !humanServingJail()) return;
    if (
      state.phase === 'player_raise_cash' ||
      state.phase === 'player_resolving' ||
      state.phase === 'player_buy'
    ) {
      return;
    }
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
      state.phase === 'player_buy'
    ) {
      return;
    }
    if (state.phase !== 'player_jail') {
      state.phase = 'player_jail';
    }
    const inj = state.inJail[0];
    if (!inj || inj.failedDoubles >= 3) return;
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
    const preferPay =
      mustPay ||
      (state.cash[1] >= JAIL_FINE &&
        (state.cash[1] >= JAIL_FINE * 3 || inj.failedDoubles >= 2 || Math.random() > 0.45));

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
            maybeAiBuild();
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
    if (state.phase === 'player_buy' || state.phase === 'player_raise_cash') return;
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
    if (state.phase !== 'player_roll' || state.winner != null) return;
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
        : `${name} is ${formatMoney(sq.price)} — you have ${formatMoney(state.cash[0])} (${formatMoney(sq.price - state.cash[0])} short). Raise cash in your portfolio (mortgage / sell upgrades), then Buy or Pass.`,
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
    window.addEventListener('resize', onScroll);
  }

  function renderPortfolios() {
    if (!els.portfolioHuman || !els.portfolioAi) return;
    const cols = [
      { ul: els.portfolioHuman, key: 'human' },
      { ul: els.portfolioAi, key: 'ai' },
    ];
    cols.forEach(({ ul, key }) => {
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
            const pausedRow = els.continueWrap && !els.continueWrap.hidden;
            const liquidity = humanPortfolioLiquidityAllowed() && !pausedRow;
            const actions = document.createElement('div');
            actions.className = 'mono-portfolio-actions';
            if (liquidity && canSellHere('human', idx, state.ownership, state.buildings)) {
              const sb = document.createElement('button');
              sb.type = 'button';
              sb.className = 'mono-mini-btn mono-portfolio-act mono-portfolio-act--sell';
              sb.textContent = 'Sell';
              sb.addEventListener('click', () => {
                if (!humanPortfolioLiquidityAllowed() || state.winner != null) return;
                sellOneBuilding('human', idx);
              });
              actions.appendChild(sb);
            }
            if (liquidity && canMortgage(0, idx)) {
              const mb = document.createElement('button');
              mb.type = 'button';
              mb.className = 'mono-mini-btn mono-portfolio-act mono-portfolio-act--mortgage';
              mb.textContent = `Mortgage +${formatMoney(mortgageValueFor(idx))}`;
              mb.addEventListener('click', () => {
                if (!humanPortfolioLiquidityAllowed() || state.winner != null) return;
                applyMortgage(0, idx);
              });
              actions.appendChild(mb);
            }
            if (humanUnmortgageAllowed() && state.mortgaged[idx]) {
              const ub = document.createElement('button');
              ub.type = 'button';
              ub.className = 'mono-mini-btn mono-portfolio-act mono-portfolio-act--unmortgage';
              ub.textContent = `Unmortgage ${formatMoney(unmortgageCostFor(idx))}`;
              ub.disabled = pausedRow || !canUnmortgage(0, idx);
              ub.addEventListener('click', () => {
                if (!humanUnmortgageAllowed() || state.winner != null) return;
                applyUnmortgage(0, idx);
              });
              actions.appendChild(ub);
            }
            if (actions.childNodes.length) item.appendChild(actions);
          }
          chips.appendChild(item);
        });
        li.appendChild(chips);
        ul.appendChild(li);
      });
    });
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

  function renderHud() {
    els.cashHuman.textContent = formatMoney(state.cash[0]);
    els.cashAi.textContent = formatMoney(state.cash[1]);
    renderHumanCurrentSquareHud();
    renderPortfolios();
    const paused = els.continueWrap && !els.continueWrap.hidden;
    const sq = BOARD[state.positions[0]];
    const ph = state.phase;

    const hideRoll =
      paused ||
      state.winner != null ||
      ph === 'player_buy' ||
      ph === 'player_jail' ||
      (state.turnOwner === 0 && humanServingJail()) ||
      ph === 'player_resolving' ||
      ph === 'player_raise_cash' ||
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
          ? `You owe ${formatMoney(d.amount)} (${d.reason}). Raise ${formatMoney(short)} more — mortgage listings or sell upgrades in your portfolio, then tap Pay.`
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
    }

    els.buildRow.innerHTML = '';
    const opts = humanBuildableProps();
    opts.forEach((idx) => {
      const sqP = BOARD[idx];
      const b = state.buildings[idx] || { houses: 0, hotel: false };
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mono-mini-btn';
      const nextCost = b.houses === 4 && !b.hotel ? hotelCostFor(idx) : houseCostFor(idx);
      const label = b.houses === 4 && !b.hotel ? `Hotel ${sqP.name.split(' ').slice(0, 3).join(' ')}` : `House (${b.houses}/4) ${sqP.name.split(' ').slice(0, 2).join(' ')}`;
      btn.textContent = `${label} · ${formatMoney(nextCost)}`;
      btn.disabled =
        paused || state.cash[0] < nextCost || ph !== 'player_roll' || state.winner != null;
      btn.addEventListener('click', () => onBuildPick(idx));
      els.buildRow.appendChild(btn);
    });

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
        ox = pi === 0 ? -4 : 4;
        oy = pi === 0 ? -4 : 4;
      }
      if (bothShuttle) {
        ox = pi === 0 ? -3 : 3;
        oy = pi === 0 ? -3 : 3;
      }
      if (bothVisit) {
        ox = pi === 0 ? -4 : 4;
        oy = pi === 0 ? -4 : 4;
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
    renderHud();
    renderLog();
    updatePieces();
    if (deedOpenOrder.length > 0 && els.deedTray) renderDeedTray();
    els.gameOverEl.hidden = state.winner == null;
    if (state.winner != null) {
      els.gameOverText.textContent = `${PLAYER_LABEL[PLAYERS[state.winner]]} wins.`;
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
      }
      if (sq.kind === 'utility') {
        cell.classList.add('mono-cell--property');
        cell.classList.add('mono-cell--utility');
        cell.style.setProperty('--utility-color', sq.tileColor || GROUP_COLORS.utility);
      }
      if (sq.kind === 'nice') {
        cell.classList.add('mono-cell--nice');
      }
      if (idx === 20) {
        cell.classList.add('mono-cell--nice');
      }
      if (sq.kind === 'tax') {
        cell.classList.add('mono-cell--tax');
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
          name.appendChild(document.createTextNode('Payday: '));
          const goAmt = document.createElement('span');
          goAmt.className = 'mono-price';
          goAmt.textContent = formatMoney(GO_BONUS);
          name.appendChild(goAmt);
        } else {
          name.innerHTML = sq.name.replace(/\n/g, '<br/>');
        }
        body.appendChild(name);
        if (sq.price != null) {
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
        <div class="mono-brand">
          <span class="mono-brand-title">Bushwickopoly</span>
          <span class="mono-brand-sub">the apartment hunt, gamified</span>
        </div>
        <div class="mono-dice" id="monoDice">🎲</div>
      </div>
      <div class="mono-portfolio-region">
        <div class="mono-cash-grid">
          <div class="mono-cash-col mono-cash-col--human">
            <span class="mono-cash-label">You</span>
            <strong id="monoCashHuman">$0</strong>
            <div class="mono-portfolio-shell" id="monoPortfolioHumanShell">
              <span class="mono-portfolio-hint mono-portfolio-hint--up" hidden aria-hidden="true">···</span>
              <ul class="mono-portfolio mono-scrollbar-none" id="monoPortfolioHuman" aria-label="Your listings"></ul>
              <span class="mono-portfolio-hint mono-portfolio-hint--down" hidden>More ↓</span>
            </div>
          </div>
          <div class="mono-cash-col mono-cash-col--ai">
            <span class="mono-cash-label">${PLAYER_LABEL.ai}</span>
            <strong id="monoCashAi">$0</strong>
            <div class="mono-portfolio-shell" id="monoPortfolioAiShell">
              <span class="mono-portfolio-hint mono-portfolio-hint--up" hidden aria-hidden="true">···</span>
              <ul class="mono-portfolio mono-scrollbar-none" id="monoPortfolioAi" aria-label="${PLAYER_LABEL.ai} listings"></ul>
              <span class="mono-portfolio-hint mono-portfolio-hint--down" hidden>More ↓</span>
            </div>
          </div>
        </div>
      </div>
      <div class="mono-center-footer">
        <p class="mono-current-square" id="monoCurrentSquare" aria-live="polite"></p>
        <p class="mono-prompt" id="monoPrompt"></p>
        <div class="mono-actions">
          <button type="button" class="cta-btn mono-action-btn" id="monoRoll">Roll</button>
          <button type="button" class="cta-btn mono-action-btn mono-action-btn-outline" id="monoBuy">Buy</button>
          <button type="button" class="cta-btn mono-action-btn mono-action-btn-outline" id="monoPass">Pass</button>
          <button type="button" class="cta-btn mono-action-btn" id="monoPayDue" hidden>Pay</button>
        </div>
        <div class="mono-actions-jail" id="monoJailActions" hidden>
          <button type="button" class="cta-btn mono-action-btn mono-action-btn-outline" id="monoJailPay">Pay fine</button>
          <button type="button" class="cta-btn mono-action-btn" id="monoJailRoll">Roll for doubles</button>
        </div>
        <div class="mono-build" id="monoBuildRow"></div>
        <ul class="mono-log mono-scrollbar-none" id="monoLog"></ul>
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
    els.cashHuman = center.querySelector('#monoCashHuman');
    els.cashAi = center.querySelector('#monoCashAi');
    els.portfolioHumanShell = center.querySelector('#monoPortfolioHumanShell');
    els.portfolioAiShell = center.querySelector('#monoPortfolioAiShell');
    els.portfolioHuman = center.querySelector('#monoPortfolioHuman');
    els.portfolioAi = center.querySelector('#monoPortfolioAi');
    els.buildRow = center.querySelector('#monoBuildRow');
    els.continueWrap = center.querySelector('#monoContinue');
    els.gameOverEl = center.querySelector('#monoGameOver');
    els.gameOverText = center.querySelector('#monoGameOverText');
    els.gameOverDetail = center.querySelector('#monoGameOverDetail');
    els.jailActions = center.querySelector('#monoJailActions');
    els.jailPayBtn = center.querySelector('#monoJailPay');
    els.jailRollBtn = center.querySelector('#monoJailRoll');

    els.rollBtn.addEventListener('click', onRoll);
    els.buyBtn.addEventListener('click', onBuy);
    els.passBtn.addEventListener('click', onPass);
    els.payDueBtn.addEventListener('click', onPayDue);
    els.jailPayBtn.addEventListener('click', onJailPayFine);
    els.jailRollBtn.addEventListener('click', onJailRollDoubles);
    center.querySelector('#monoResetBtn').addEventListener('click', () => {
      closeAllDeedTiles();
      state = initialState();
      save();
      els.continueWrap.hidden = true;
      els.gameOverEl.hidden = true;
      els.diceEl.textContent = '🎲';
      renderPrompt('Your turn — roll the dice.');
      log('New game.');
      renderAll();
    });
    center.querySelector('#monoContinueBtn').addEventListener('click', () => {
      els.continueWrap.hidden = true;
      normalizeTurnState();
      renderAll();
    });
    center.querySelector('#monoNewBtn').addEventListener('click', () => {
      closeAllDeedTiles();
      state = initialState();
      save();
      els.continueWrap.hidden = true;
      renderPrompt('Your turn — roll the dice.');
      log('New game.');
      renderAll();
    });

    wireDeedUI(root);
    bindPortfolioScrollUi();
    bindMonoFooterDock();
    queueMicrotask(() => schedulePortfolioScrollHints());
  }

  function boot() {
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
    renderAll();
  }

  /** After refresh: if we’re in a human decision / roll state, never block the board behind “Continue…”. */
  function loadedSaveNeedsImmediateHumanHud() {
    if (state.winner != null) return false;
    if (state.phase === 'player_buy') return true;
    if (state.phase === 'player_jail') return true;
    if (state.phase === 'player_raise_cash' && state.paymentDue) return true;
    if (state.phase === 'player_roll' && state.turnOwner === 0) return true;
    if (state.phase === 'player_resolving' && state.turnOwner === 0) return true;
    return false;
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
