# Beth & Dan Need an Apartment

A little website to help us find an apartment in Ridgewood / Bushwick, plus a Ridgewood-themed Monopoly clone (“Bushwickopoly”).

## Run locally

No build step — it's all static HTML/CSS/JS.

```bash
# from repo root
python3 -m http.server 8000
# or: npx serve .
```

Then open [http://localhost:8000/apartmenthunt/](http://localhost:8000/apartmenthunt/) for the hunt page, or [http://localhost:8000/apartmenthunt/monopoly/](http://localhost:8000/apartmenthunt/monopoly/) for the game.

## Deploy to GitHub Pages

1. Create a repo on GitHub (e.g. `bethanddanneedanapartment`)
2. Push:
   ```bash
   git remote add origin git@github.com:YOURUSER/bethanddanneedanapartment.git
   git push -u origin main
   ```
3. Go to **Settings → Pages → Source** and select `main` branch, root `/`
4. Your site will be live at `https://YOURUSER.github.io/bethanddanneedanapartment/`

## Bushwickopoly (`apartmenthunt/monopoly/`)

In-game rules live under **“How this version works”** on [apartmenthunt/monopoly/index.html](apartmenthunt/monopoly/index.html). Summary:

- OG Monopoly rules with **UK prices × 25** (shown as $ on the board).
- **Pass or land on Go** — collect **$5,000**.
- **No Chance / Community Chest cards** yet — those squares are a safe haven.
- **Mortgages, houses, and hotels** are in; you need a color monopoly to build.
- **Opponent** — choose **Easy** (Regular Joe) or **Hard** (Yes Man) above the board before your first roll; it locks once the game starts.
- **Doubles** — roll again. **Three doubles in one turn** sends you to trackwork “transit jail” (shuttle bus corner).

Entry point: `apartmenthunt/monopoly.js` (loads the board module).

## Structure (high level)

```
index.html              - Beth + Dan landing
apartmenthunt/
  index.html            - apartment hunt main page
  style.css             - shared styles (hunt + games)
  main.js               - hunt page behavior
  quiz/                 - “which apartment are you?” quiz
  monopoly/             - Bushwickopoly HTML shell
  monopoly.js           - game bootstrap
  monopoly/game.js      - board + rules implementation
  game.js               - apartment 8-ball widget on the hunt page
assets/                 - shared images (some paths gitignored)
```
