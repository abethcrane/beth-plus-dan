# Beth & Dan Need an Apartment

A little website to help us find an apartment in Ridgewood / Bushwick.

## Run locally

No build step — it's all static HTML/CSS/JS.

```bash
# option 1: python
python3 -m http.server 8000

# option 2: node
npx serve .
```

Then open [http://localhost:8000](http://localhost:8000).

## Deploy to GitHub Pages

1. Create a repo on GitHub (e.g. `bethanddanneedanapartment`)
2. Push:
   ```bash
   git remote add origin git@github.com:YOURUSER/bethanddanneedanapartment.git
   git push -u origin main
   ```
3. Go to **Settings → Pages → Source** and select `main` branch, root `/`
4. Your site will be live at `https://YOURUSER.github.io/bethanddanneedanapartment/`

## Structure

```
index.html          - main page
style.css           - all styles
game.js             - apartment 8-ball
main.js             - scroll animations, contact form, nav
assets/photos/      - optimized photos
assets/flyer.png    - the original flyer
```
