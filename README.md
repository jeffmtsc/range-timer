# Range Timer

A course-of-fire timer for shooting competitions, built to run on Android as an installable, fully offline web app (PWA). It walks the RSO through the spoken commands for each match/string, then handles the standby delay and beeps automatically.

Preloaded with all 14 NASRPC courses of fire the club uses: **GR1500**, **GP85**, **Timed & Precision 1**, **WA1500 Main Match**, **Centrefire Pistol 48 Shot (WA48)**, **Revolver 400**, **GR1020**, **GP40**, **Multi Target**, **25m Precision**, **50m Benchrest**, **Timed & Precision 2**, **50m Sporting Rifle Prone**, and **50m Precision** (100m Prone is skipped — the club has no 100m range). Add your own any time with the in-app editor, or by importing a JSON file.

## Getting it onto an Android phone

This app is a set of static files (HTML/CSS/JS) — it needs to be hosted somewhere reachable by a browser once, so it can be installed. After that first install it runs completely offline; no ongoing hosting or internet connection is needed.

**Easiest option — GitHub Pages (free, ~5 minutes):**
1. Create a new GitHub repository and upload all the files in this folder to it (or `git push` them).
2. In the repo's Settings → Pages, set the source to the main branch, root folder.
3. GitHub will give you a URL like `https://yourname.github.io/range-timer/`.
4. Open that URL in Chrome on the Android phone.
5. Tap the browser menu (⋮) → **Add to Home screen** / **Install app**.
6. Once installed, turn on airplane mode and confirm it still opens and works — that confirms it's fully offline.

**Alternative — any static host:** Netlify, Vercel, Cloudflare Pages, or even a spare web server all work the same way — upload the folder, open the resulting URL on the phone once, then install to home screen.

**Alternative — no hosting account:** drag this folder onto [Netlify Drop](https://app.netlify.com/drop) for a temporary public URL, good enough to install from.

## Using it

- **Home screen** — pick a course of fire.
- **Course screen** — shows the summary, the full Range Officer script (tap to expand), and the list of matches/practices in order. Tap a match to open the timer; tap the pencil to edit it.
- **Timer screen**:
  1. Pick the duration variant if there's more than one (e.g. GRSB 20s vs GRCF 30s), then tap **BEGIN**.
  2. Read each line aloud as it appears — a line is generated automatically for the match (name, distance, time/appearances), followed by your competition's standard range commands. Tap **NEXT** to move through them.
  3. The last line is **STANDBY** — tapping it starts the fixed delay (5 seconds by default, set in Settings), then the start beep fires automatically.
  4. The clock runs for a single timed string, or steps through target-up/target-down "appearances" with their own beeps for turning-target strings, repeating for multiple strings or repeat attempts as the course of fire requires.
  5. **Repeat** restarts the current string/attempt from the briefing if you need to redo it. **Next →** moves to the next match. If the next match is a different distance/position — or this was the last match in the course of fire — you'll be prompted to announce "Cease fire, unload and show clear" before continuing; after that (and after a "Score & Change Targets" pause where the course of fire calls for one), it moves on to the next match or the course-complete screen.
- **+ New Course of Fire** on the home screen opens a builder for adding a competition you don't have preloaded — fill in the summary and range commands, then add each match/practice with its distance, position, description, and timing (a single timed string, or an appearances/turning-target sequence).
- **Export/Import JSON** — the export icon on a course-of-fire screen downloads it as a `.json` file; **Import JSON** on the home screen loads one back in (or a file containing an array of several). Handy for sharing a course of fire you've built, or for adding ones a future update provides as a file rather than typing them in by hand.
- **Settings** (gear icon) — standby delay, optional random jitter, beep volume/test, keep-screen-on, sunlight mode (on by default — pure white background and dark high-contrast colours for visibility in direct sun), and whether the RSO script prompts appear.

## Notes

- All beeps are synthesized (Web Audio), not audio files, so there's nothing to download or that can go missing offline. Turn the phone volume all the way up outdoors.
- `icons/icon-192.png`, `icon-512.png`, and `icon-512-maskable.png` are generated from the Munster Target Shooting Club crest. To swap in an updated logo later, replace the source referenced at the top of `make_icons.py` and re-run `python3 make_icons.py`.
- Everything is stored locally on the device (localStorage) — courses of fire you add or edit stay on that phone. Use Export/Import JSON to move a course of fire to another device.
