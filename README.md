# GESAC free lanes

A phone-friendly grid showing how many lap lanes are free at GESAC's 50m and
25m pools, in half-hour slots, for the next five days.

## How it works

```
PerfectGym booking system ──► scripts/fetch.py ──► site/data.json ──► site/ (HTML, CSS, JS)
       (JSON feed)            (GitHub Actions,                         (GitHub Pages)
                               every 30 min)
```

1. **`scripts/fetch.py`** downloads each pool's availability calendar from
   Glen Eira Leisure's booking system (PerfectGym) and saves a compact copy as
   `site/data.json`. The feed can't be read directly from a browser on another
   site (it sends no CORS header), which is why this step runs on a server.
2. **`.github/workflows/update.yml`** runs the script on GitHub's servers every
   30 minutes and publishes the `site/` folder to GitHub Pages.
3. **`site/`** is the web page itself:
   - `index.html`: the structure
   - `style.css`: colours and layout (including dark mode)
   - `app.js`: reads `data.json` and draws the grid

## Run it on your own computer

```bash
python3 scripts/fetch.py               # writes site/data.json
python3 -m http.server -d site 8000    # serves the page
```

Then open http://localhost:8000. Other devices on the same Wi-Fi can open
`http://<this computer's IP>:8000`.

## Adding another pool

The calendar IDs are in the links on
<https://www.geleisure.com.au/swim/pool-availability>. Add an entry to `POOLS`
in `scripts/fetch.py`:

| Calendar ID | Pool |
|---|---|
| `2c38d8a41` | GESAC 50m |
| `68996c012` | GESAC 25m |
| `8af2e3f13` | GESAC Wellness Pool |
| `0bb104dd7` | CMSP 50m |
| `d7107ba59` | CMSP Warm Water Pool |
| `bd98534e8` | CMSP Dive Pool |

## Notes

- Availability is published by Glen Eira Leisure and is subject to change.
- GitHub pauses scheduled workflows in repositories with no activity for 60
  days. If the data stops updating, re-enable the workflow from the Actions tab.
