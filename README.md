# Tour Sim v1 Final

A WebGL golf sim with 26 real courses. Everything is in one file, `index.html`.

- **Play online:** https://jamesgregory5-svg.github.io/tour-sim-final/
- **Play offline:** download `tour-sim-final-offline.zip` (or `tour-sim-v1-final-offline.zip`) from the latest release, unzip it, and open `index.html` in Chrome, Edge, Firefox or Safari. It needs no internet connection.
- **Source:** in `src/`. Rebuild the game with `bash src/build.sh`.
- **Adding courses:** see [ADDING_COURSES.md](ADDING_COURSES.md).

## Saves
Saves are kept in the browser (localStorage, keys `ts.*`). They use the same keys and format as the test link.

The final site and the test link are on the same website address (jamesgregory5-svg.github.io), so in the same browser they share saves: progress carries over automatically. The offline file opened from disk is a different address, so it starts with empty saves. There is no export/import button for moving saves to it.
