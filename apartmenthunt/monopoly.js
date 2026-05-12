(() => {
  const STORAGE_KEY = 'bushwick-monopoly-state-v6';
  const STARTING_CASH = 37500;
  const GO_BONUS = 5000;
  const PLAYERS = ['human', 'ai'];
  const PLAYER_LABEL = { human: 'You', ai: 'The Broker' };

  /** @typedef {'corner'|'property'|'tax'|'transit'|'nice'} SquareKind */

  /** Prices & base rents follow UK Monopoly × 25 (£→$). Taxes kept deliberately cheap vs starting cash. Starting cash £1500→$37,500; GO £200→$5,000. */

  /** @type {{ kind: SquareKind, name: string, price?: number, baseRent?: number, group?: string, tax?: number, side: string, stripColor?: string }[]} */
  const BOARD = [
    { kind: 'corner', name: 'GO — Pay Day', side: 'sw' },
    { kind: 'property', name: 'Broadway', price: 1500, baseRent: 50, group: 'brown', side: 's' },
    { kind: 'nice', name: 'Washington Irving\nLibrary', side: 's' },
    { kind: 'property', name: 'Myrtle Ave', price: 1500, baseRent: 100, group: 'brown', side: 's' },
    { kind: 'tax', name: 'Broker Fee', tax: 1500, side: 's' },
    { kind: 'transit', name: 'M Train', price: 5000, baseRent: 0, group: 'transit', side: 's', stripColor: '#ff6319' },
    { kind: 'property', name: '60th Pl', price: 2500, baseRent: 150, group: 'light_blue', side: 's' },
    { kind: 'nice', name: 'Mixtape', side: 's' },
    { kind: 'property', name: 'Forest Ave', price: 2500, baseRent: 150, group: 'light_blue', side: 's' },
    { kind: 'property', name: '69th Ave', price: 3000, baseRent: 200, group: 'light_blue', side: 's' },
    { kind: 'corner', name: 'Shuttle stop', side: 'nw' },
    { kind: 'property', name: 'Morgan Ave', price: 3500, baseRent: 250, group: 'pink', side: 'w' },
    { kind: 'tax', name: 'National Gas', tax: 1000, side: 'w' },
    { kind: 'property', name: 'Wyckoff Ave', price: 3500, baseRent: 250, group: 'pink', side: 'w' },
    { kind: 'property', name: 'Seneca Ave', price: 4000, baseRent: 300, group: 'pink', side: 'w' },
    { kind: 'transit', name: 'L Train', price: 5000, baseRent: 0, group: 'transit', side: 'w', stripColor: '#a7a9ac' },
    { kind: 'property', name: 'Gates Ave', price: 4500, baseRent: 350, group: 'orange', side: 'w' },
    { kind: 'nice', name: 'Ridgewood\nCommunity Garden', side: 'w' },
    { kind: 'property', name: 'Halsey St', price: 4500, baseRent: 350, group: 'orange', side: 'w' },
    { kind: 'property', name: 'Palmetto St', price: 5000, baseRent: 400, group: 'orange', side: 'w' },
    { kind: 'corner', name: 'Maria Hernandez\nPark', side: 'nw' },
    { kind: 'property', name: 'Greene Ave', price: 5500, baseRent: 450, group: 'red', side: 'n' },
    { kind: 'nice', name: 'Ice Cream Window', side: 'n' },
    { kind: 'property', name: 'Grove St', price: 5500, baseRent: 450, group: 'red', side: 'n' },
    { kind: 'property', name: 'Evergreen Ave', price: 6000, baseRent: 500, group: 'red', side: 'n' },
    { kind: 'transit', name: 'J / Z Train', price: 5000, baseRent: 0, group: 'transit', side: 'n', stripColor: '#996633' },
    { kind: 'property', name: 'Hancock St', price: 6500, baseRent: 550, group: 'yellow', side: 'n' },
    { kind: 'property', name: 'Covert St', price: 6500, baseRent: 550, group: 'yellow', side: 'n' },
    { kind: 'tax', name: 'Con Ed Electric', tax: 1000, side: 'n' },
    { kind: 'property', name: 'Weirfeld St', price: 7000, baseRent: 550, group: 'yellow', side: 'n' },
    { kind: 'corner', name: 'Trackwork —\ntake the bus', side: 'ne' },
    { kind: 'property', name: 'Grandview Ave', price: 7500, baseRent: 650, group: 'green', side: 'e' },
    { kind: 'property', name: 'Onderdonk Ave', price: 7500, baseRent: 650, group: 'green', side: 'e' },
    { kind: 'nice', name: 'Citibike Dock', side: 'e' },
    { kind: 'property', name: 'Woodward Ave', price: 8000, baseRent: 700, group: 'green', side: 'e' },
    { kind: 'transit', name: 'G Train', price: 5000, baseRent: 0, group: 'transit', side: 'e', stripColor: '#6cbe45' },
    { kind: 'nice', name: 'Panina', side: 'e' },
    { kind: 'property', name: 'Cornelia St', price: 8750, baseRent: 875, group: 'blue', side: 'e' },
    { kind: 'tax', name: 'Application Fee', tax: 750, side: 'e' },
    { kind: 'property', name: 'Catalpa Ave', price: 10000, baseRent: 1250, group: 'blue', side: 'e' },
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
  };

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

  function houseCostFor(idx) {
    const sq = BOARD[idx];
    if (sq.kind !== 'property') return 0;
    return Math.round(sq.price * 0.5);
  }

  function hotelCostFor(idx) {
    const sq = BOARD[idx];
    if (sq.kind !== 'property') return 0;
    return Math.round(sq.price * 0.75);
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

    if (sq.kind === 'transit') {
      const n = countGroupOwned('transit', owner, ownership);
      const table = [625, 1250, 2500, 5000];
      return table[Math.max(0, Math.min(n, 4) - 1)] ?? 250;
    }

    const b = buildings[idx] || { houses: 0, hotel: false };
    let mult = rentMultiplier(b.houses, b.hotel);
    let rent = sq.baseRent * mult;
    const mono = hasMonopoly(owner, sq.group, ownership);
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
    };
  }

  let state = initialState();
  let cells = [];
  let els = {};

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

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const o = JSON.parse(raw);
      if (!o.positions || o.positions.length !== 2) return false;
      state = { ...initialState(), ...o };
      if (!state.history) state.history = [];
      return true;
    } catch (_) {
      return false;
    }
  }

  function bankrupt(loser) {
    state.winner = loser === 0 ? 1 : 0;
    state.phase = 'game_over';
    state.history.push(`${new Date().toISOString().slice(11, 19)} ${PLAYER_LABEL[PLAYERS[loser]]} is tapped out. ${PLAYER_LABEL[PLAYERS[state.winner]]} wins.`);
    if (state.history.length > 80) state.history.shift();
    save();
    renderLog();
    renderAll();
  }

  function charge(playerIdx, amount, reason) {
    state.cash[playerIdx] -= amount;
    log(`${PLAYER_LABEL[PLAYERS[playerIdx]]} paid ${formatMoney(amount)} (${reason}).`);
    if (state.cash[playerIdx] < 0) bankrupt(playerIdx);
    else {
      save();
      renderHud();
    }
  }

  function credit(playerIdx, amount, reason) {
    state.cash[playerIdx] += amount;
    log(`${PLAYER_LABEL[PLAYERS[playerIdx]]} received ${formatMoney(amount)} (${reason}).`);
    save();
    renderHud();
  }

  function resolveLanding(playerIdx, cb) {
    const idx = state.positions[playerIdx];
    const sq = BOARD[idx];

    if (sq.kind === 'tax') {
      charge(playerIdx, sq.tax, sq.name);
      if (state.winner == null) cb?.();
      return;
    }

    if (sq.kind === 'nice') {
      if (state.winner == null) cb?.();
      return;
    }

    if (sq.kind === 'corner') {
      if (state.winner == null) cb?.();
      return;
    }

    const ownerKey = state.ownership[idx];
    if (!ownerKey) {
      if (playerIdx === 0 && sq.price != null) {
        state.phase = 'player_buy';
        els.buyBtn.disabled = state.cash[0] < sq.price;
        els.passBtn.disabled = false;
        renderPrompt(`${sq.name} — ${formatMoney(sq.price)}. Buy it?`);
        renderHud();
        return;
      }
      if (playerIdx === 1 && sq.price != null) {
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
      if (state.winner == null) cb?.();
      return;
    }

    const ownerIdx = ownerKey === 'human' ? 0 : 1;
    const rent = computeRent(idx, state.ownership, state.buildings);
    charge(playerIdx, rent, `Rent on ${sq.name}`);
    if (state.winner == null) credit(ownerIdx, rent, `Rent from ${sq.name}`);
    updatePieces();
    if (state.winner == null) cb?.();
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
    state.phase = 'ai_roll';
    renderPrompt('The Broker is thinking…');
    save();
    renderHud();
    setTimeout(runAiTurn, 700);
  }

  function runAiTurn() {
    if (state.winner != null) return;
    const dice = rollDice();
    els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${dice[0] + dice[1]}`;
    animateDice();
    const total = dice[0] + dice[1];
    movePlayer(1, total, () => {
      if (state.positions[1] === 30) {
        teleportToJail(1);
        save();
        renderAll();
        state.phase = 'player_roll';
        renderPrompt('Your turn — roll the dice.');
        els.rollBtn.disabled = false;
        return;
      }
      resolveLanding(1, () => {
        if (state.winner != null) return;
        maybeAiBuild();
        state.phase = 'player_roll';
        renderPrompt('Your turn — roll the dice.');
        els.rollBtn.disabled = false;
        save();
        renderAll();
      });
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
    state.positions[playerIdx] = 10;
    log(`${PLAYER_LABEL[PLAYERS[playerIdx]]}: Trackwork — catch the shuttle bus.`);
    save();
    updatePieces();
  }

  function onRoll() {
    if (state.phase !== 'player_roll' || state.winner != null) return;
    els.rollBtn.disabled = true;
    const dice = rollDice();
    els.diceEl.textContent = `${dice[0]} + ${dice[1]} = ${dice[0] + dice[1]}`;
    animateDice();
    const total = dice[0] + dice[1];
    movePlayer(0, total, () => {
      const idx = state.positions[0];
      if (idx === 30) {
        teleportToJail(0);
        save();
        renderAll();
        endPlayerTurn();
        return;
      }
      resolveLanding(0, () => {
        if (state.winner != null) return;
        if (state.phase === 'player_buy') return;
        endPlayerTurn();
      });
    });
  }

  function onBuy() {
    if (state.phase !== 'player_buy') return;
    const idx = state.positions[0];
    const sq = BOARD[idx];
    if (sq.price == null || state.cash[0] < sq.price) return;
    state.cash[0] -= sq.price;
    state.ownership[idx] = 'human';
    log(`You bought ${sq.name} for ${formatMoney(sq.price)}.`);
    state.phase = 'player_roll';
    renderPrompt('Nice pick — Broker’s turn.');
    save();
    renderAll();
    endPlayerTurn();
  }

  function onPass() {
    if (state.phase !== 'player_buy') return;
    const idx = state.positions[0];
    log(`You passed on ${BOARD[idx].name}.`);
    state.phase = 'player_roll';
    renderPrompt('Okay — Broker’s turn.');
    save();
    renderAll();
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
    els.promptEl.textContent = text;
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
    const paused = els.continueWrap && !els.continueWrap.hidden;
    const sq = BOARD[state.positions[0]];
    els.rollBtn.disabled = paused || state.phase !== 'player_roll' || state.winner != null;
    els.buyBtn.disabled = paused || state.phase !== 'player_buy' || !sq?.price || state.cash[0] < sq.price;
    els.passBtn.disabled = paused || state.phase !== 'player_buy';
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
        paused || state.cash[0] < nextCost || state.phase !== 'player_roll' || state.winner != null;
      btn.addEventListener('click', () => onBuildPick(idx));
      els.buildRow.appendChild(btn);
    });
  }

  function updatePieces() {
    cells.forEach((cell) => {
      if (!cell) return;
      const slot = cell.querySelector('.mono-cell-pieces');
      if (slot) slot.innerHTML = '';
    });
    PLAYERS.forEach((pkey, pi) => {
      const cell = cells[state.positions[pi]];
      if (!cell) return;
      const slot = cell.querySelector('.mono-cell-pieces');
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
      piece.style.transform = dup ? (pi === 0 ? 'translate(-4px,-4px)' : 'translate(4px,4px)') : '';
      slot.appendChild(piece);
    });
    cells.forEach((cell, idx) => {
      cell.classList.toggle('mono-cell--owned-human', state.ownership[idx] === 'human');
      cell.classList.toggle('mono-cell--owned-ai', state.ownership[idx] === 'ai');
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
    els.gameOverEl.hidden = state.winner == null;
    if (state.winner != null) {
      els.gameOverText.textContent = `${PLAYER_LABEL[PLAYERS[state.winner]]} wins.`;
    }
  }

  function buildBoardDOM() {
    const root = document.getElementById('monoBoard');
    if (!root) return;
    els.boardRoot = root;
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
      cell.className = `mono-cell mono-cell--${sq.side}`;
      if (sq.kind === 'property' || sq.kind === 'transit') {
        cell.classList.add('mono-cell--property');
        const strip = document.createElement('div');
        strip.className = 'mono-strip';
        strip.style.background = sq.stripColor || GROUP_COLORS[sq.group] || '#666';
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
        name.innerHTML = sq.name.replace(/\n/g, '<br/>');
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
      root.appendChild(cell);
      cells[idx] = cell;
    });

    center.innerHTML = `
      <div class="mono-brand">
        <span class="mono-brand-title">Bushwickopoly</span>
        <span class="mono-brand-sub">the apartment hunt, gamified</span>
      </div>
      <div class="mono-dice" id="monoDice">🎲</div>
      <div class="mono-cash-grid">
        <div><span>You</span><strong id="monoCashHuman">$0</strong></div>
        <div><span>Broker</span><strong id="monoCashAi">$0</strong></div>
      </div>
      <p class="mono-prompt" id="monoPrompt"></p>
      <div class="mono-actions">
        <button type="button" class="cta-btn mono-action-btn" id="monoRoll">Roll</button>
        <button type="button" class="cta-btn mono-action-btn mono-action-btn-outline" id="monoBuy">Buy</button>
        <button type="button" class="cta-btn mono-action-btn mono-action-btn-outline" id="monoPass">Pass</button>
      </div>
      <div class="mono-build" id="monoBuildRow"></div>
      <ul class="mono-log" id="monoLog"></ul>
      <div class="mono-continue" id="monoContinue" hidden>
        <p>Saved game found.</p>
        <button type="button" class="cta-btn" id="monoContinueBtn">Continue</button>
        <button type="button" class="cta-btn cta-btn-outline" id="monoNewBtn">New game</button>
      </div>
      <div class="mono-gameover" id="monoGameOver" hidden>
        <p id="monoGameOverText"></p>
        <button type="button" class="cta-btn" id="monoResetBtn">Play again</button>
      </div>
    `;

    els.diceEl = center.querySelector('#monoDice');
    els.promptEl = center.querySelector('#monoPrompt');
    els.rollBtn = center.querySelector('#monoRoll');
    els.buyBtn = center.querySelector('#monoBuy');
    els.passBtn = center.querySelector('#monoPass');
    els.logEl = center.querySelector('#monoLog');
    els.cashHuman = center.querySelector('#monoCashHuman');
    els.cashAi = center.querySelector('#monoCashAi');
    els.buildRow = center.querySelector('#monoBuildRow');
    els.continueWrap = center.querySelector('#monoContinue');
    els.gameOverEl = center.querySelector('#monoGameOver');
    els.gameOverText = center.querySelector('#monoGameOverText');

    els.rollBtn.addEventListener('click', onRoll);
    els.buyBtn.addEventListener('click', onBuy);
    els.passBtn.addEventListener('click', onPass);
    center.querySelector('#monoResetBtn').addEventListener('click', () => {
      state = initialState();
      save();
      els.continueWrap.hidden = true;
      renderPrompt('Your turn — roll the dice.');
      log('New game.');
      renderAll();
    });
    center.querySelector('#monoContinueBtn').addEventListener('click', () => {
      els.continueWrap.hidden = true;
      renderAll();
    });
    center.querySelector('#monoNewBtn').addEventListener('click', () => {
      state = initialState();
      save();
      els.continueWrap.hidden = true;
      renderPrompt('Your turn — roll the dice.');
      log('New game.');
      renderAll();
    });
  }

  function boot() {
    const section = document.getElementById('game');
    if (!section) return;
    buildBoardDOM();
    const had = load();
    if (had && state.winner == null) {
      els.continueWrap.hidden = false;
      renderPrompt('Continue your saved game or start fresh.');
    } else {
      if (!had) log('Welcome — roll to start.');
      renderPrompt(state.winner != null ? 'Game over — play again?' : 'Your turn — roll the dice.');
    }
    renderAll();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();
