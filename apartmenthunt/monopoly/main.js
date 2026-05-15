'use strict';

import { boot } from './game.js';

function initRulesPanel() {
  const el = document.querySelector('.mono-rules');
  if (!el) return;
  let stored = null;
  try {
    stored = sessionStorage.getItem('monoRulesOpen');
  } catch (_) {
    /* ignore */
  }
  if (stored === null) {
    el.open = window.matchMedia('(min-width: 768px)').matches;
  } else {
    el.open = stored === '1';
  }
  el.addEventListener('toggle', () => {
    try {
      sessionStorage.setItem('monoRulesOpen', el.open ? '1' : '0');
    } catch (_) {
      /* ignore */
    }
  });
}

function start() {
  initRulesPanel();
  boot();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', start)
  : start();
