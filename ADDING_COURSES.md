# Adding a course to Tour Sim

Tour Sim is one self-contained file, `index.html`. It is built from the sources in `src/`. Every course uses real data:

- **Scorecard:** from a published source.
- **Hole layout:** from OpenStreetMap (OSM).
- **Elevation:** from USGS 3DEP. 3DEP covers the US only.

Do not invent holes, hazards or yardages. If OSM has no line for a hole, the build creates one from the real yardage and par and flags the hole `syn:1`.

Before you start, you need Python 3 with `numpy` and `requests`, and an internet connection for steps 2, 3 and 5. Run every command from the `src/` folder.

## Steps

1. **Add the scorecard.** In `courses.py`, add an `add(...)` call with:
   - `id`, `rank`, `name` and `loc`
   - the 18-hole par string
   - each tee as `('Name', L('18 yardages'))`
   - the source of the scorecard
   - optional: hole `names`, `style` (`parkland` | `links` | `coastal` | `heath` | `dunes` | `prairie` | `desert`) and `sig` notes

   Then run:
   ```
   python3 courses.py
   ```
   This updates `courses.json`.
2. **Find the course on the map.** Add a search string to `Q` in `osm/nom.py`, then run:
   ```
   cd osm && python3 nom.py
   ```
   If it picks the wrong area, add a fixed centre point to `C` in `osm/fetch.py` instead.
3. **Download the OSM features.** Run:
   ```
   cd osm && python3 fetch.py <id>
   ```
   This writes `osm/<id>.json` with the fairways, greens, bunkers, water, woods, trees and coastline.
4. **Check the holes.** Run:
   ```
   python3 build_geo.py <id>
   ```
   It prints each hole against the scorecard and lists any hole it will have to create.
5. **Download the elevation.** Run, from `dem/`:
   ```
   python3 mkbbox.py
   python3 fetch_dem.py
   ```
   This writes `dem/<id>.npy`.
6. **Export the game data.** Run:
   ```
   python3 -c "import json,build_geo as b;b.write_js([c['id'] for c in json.load(open('courses.json'))])"
   ```
   This regenerates `js/data.js`.
7. **Tune the look (optional).** In `js/hole.js`:
   - `STYLE_OVR` sets the grass, sand and rough colours. Compare them with an aerial photo.
   - `DENS` sets the tree density.
   - `TREEMIX` sets the tree species.
   - `COAST_C` and `CLIFF_C` mark seaside and cliff courses.

   Do not add cart paths that OSM doesn't have.
8. **Build.** Run:
   ```
   bash build.sh
   ```
   This rewrites `../index.html`. Open it in a browser, pick the new course, and play a few holes.

## Saves
- **Where saves live:** in the browser's localStorage, under keys starting with `ts.`. Examples are `ts.round`, `ts.diff` and the records keys.
- **Schema version:** stored in `ts.schema`. If you change the save format, add a step to `SAVE_MIGRATIONS` in `js/game10.js`. Never rename or reshape the existing keys.
- **Adding a course is always safe:** records are keyed by course id plus tee name, so new courses and tees never break old saves.
- **Saves belong to the website address:** the browser keeps them per address. Every page on jamesgregory5-svg.github.io shares them, including the test link and the final. A copy opened from a file, or hosted on another domain, starts with empty saves. There is no export/import.
