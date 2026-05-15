'use strict';

import { boot } from './game.js';

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
