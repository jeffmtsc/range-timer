# Range Timer

A course-of-fire timer for shooting competitions, built to run on Android as an installable, fully offline web app (PWA). It walks the RSO through the spoken commands for each match/string, then handles the standby delay and beeps automatically.

Preloaded with all 14 NASRPC courses of fire the club uses: **GR1500**, **GP85**, **Timed & Precision 1**, **WA1500 Main Match**, **Centrefire Pistol 48 Shot (WA48)**, **Revolver 400**, **GR1020**, **GP40**, **Multi Target**, **25m Precision**, **50m Benchrest**, **Timed & Precision 2**, **50m Sporting Rifle Prone**, and **50m Precision** (100m Prone is skipped — the club has no 100m range). Add your own any time with the in-app editor, or by importing a JSON file — editing is locked behind Admin Mode (see below) so RSOs can't idly change things between matches.

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
- **Course screen** — shows the summary, the full Range Officer script (tap to expand), and the list of matches/practices in order. Tap a match to open the timer; in Admin Mode, tap the pencil to edit it.
- **Timer screen**:
  1. If the match has two duration options (e.g. GRSB 20s / GRCF 30s), both run automatically — this is not a pick-one choice. Tap **BEGIN** once: the longer one (GRCF) starts on the first beep, and the shorter one (GRSB) starts later on its own second beep, timed so both finish together on the single cease-fire beep. The screen shows both while running.
  2. Read each line aloud as it appears — a line is generated automatically for the match (name, distance, time/appearances), followed by your competition's standard range commands. Tap **NEXT** to move through them.
  3. The last line is **STANDBY** — tapping it starts the fixed delay (5 seconds by default, set in Settings), then the start beep fires automatically.
  4. The clock runs for a single timed string, or steps through target-up/target-down "appearances" with their own beeps for turning-target strings. If the match has more than one string or repeat attempt, finishing one just shows a **RELOAD** pause (tap BEGIN to go again) — you stay at the same position, no cease-fire needed yet. Tapping BEGIN for that next string/attempt skips straight to an abbreviated re-brief — "With a further [N] rounds, load and make ready!", "Is the line ready?", "The line is ready! Standby!" — rather than repeating the full course-of-fire explanation and "Do you understand?" / "Eyes & Ears" commands from the top.
  5. The instant the whole match is done — no tap needed — the screen shows **CEASE FIRE / CLEAR**, telling you to hold there until RSOs confirm all firearms are safe. BEGIN greys out so you can't accidentally re-fire the match, and **Next →** is disabled everywhere except this exact moment, so it can never fire mid-string or send you back into a match you've already finished — Next only ever means "this stage is genuinely over, move on." (Repeat still works any time if you deliberately want to redo the match.) Tapping Next walks through **Score & Change Targets** if the course of fire calls for one, then **The Range is Safe** ("You may move to [distance] for [next match]") if the next match is at a different distance/position, or "That concludes your competition" if it was the last match. If the next match is at the same distance/position, Next skips straight to Score & Change (if any) and the next match — no need to re-announce moving.
- **Admin Mode** — tap the gear icon (&#9881;) on the home screen for a small menu: **Settings** (open as normal) and **Enable Admin Mode**, which asks for a password. Until it's unlocked, every editing control is hidden — no "+ New Course of Fire", no "Import JSON", no pencil icons on the course screen or on individual matches — so a bored RSO can't reshape a course of fire between stages by tapping around. Export JSON stays available to everyone since it's read-only. Once unlocked, Admin Mode stays on (even after closing and reopening the app) until someone picks "Disable Admin Mode" from the same menu — no password needed to turn it back off.
- **+ New Course of Fire** (Admin Mode only) on the home screen opens a builder for adding a competition you don't have preloaded — fill in the summary and range commands, then add each match/practice with its distance, position, description, and timing (a single timed string, or an appearances/turning-target sequence).
- **Export/Import JSON** — the export icon on a course-of-fire screen downloads it as a `.json` file and is always available; **Import JSON** on the home screen (Admin Mode only) loads one back in (or a file containing an array of several). Handy for sharing a course of fire you've built, or for adding ones a future update provides as a file rather than typing them in by hand.
- **Settings** (gear icon → Settings) — standby delay, optional random jitter, beep volume/test, keep-screen-on, sunlight mode (on by default — pure white background and dark high-contrast colours for visibility in direct sun), and whether the RSO script prompts appear. Available to everyone, no Admin Mode needed.

## Notes

- All beeps are synthesized (Web Audio), not audio files, so there's nothing to download or that can go missing offline. Turn the phone volume all the way up outdoors.
- `icons/icon-192.png`, `icon-512.png`, and `icon-512-maskable.png` are generated from the Munster Target Shooting Club crest. To swap in an updated logo later, replace the source referenced at the top of `make_icons.py` and re-run `python3 make_icons.py`.
- Everything is stored locally on the device (localStorage) — courses of fire you add or edit stay on that phone. Use Export/Import JSON to move a course of fire to another device.
- The Admin Mode password is a shared, fixed password set in `app.js` (`ADMIN_PASSWORD`) — it's meant to stop idle tapping, not as real access control. Anyone reading the source (or this README) can find it.
