/* Range Timer — local persistence (localStorage). Fully offline, no network calls. */

const Storage = (() => {
  const KEY_COMPETITIONS = "rt_competitions_v1";
  const KEY_SETTINGS = "rt_settings_v1";
  const KEY_ADMIN_MODE = "rt_admin_mode_v1";

  const DEFAULT_SETTINGS = {
    standbyDelaySeconds: 5,
    randomJitter: false,
    volume: 0.9,
    keepAwake: true,
    sunlightMode: true, // default on — this app is built for use outdoors in bright daylight
    showRoScript: true
  };

  function loadCompetitions() {
    let list;
    try {
      const raw = localStorage.getItem(KEY_COMPETITIONS);
      list = raw ? JSON.parse(raw) : null;
    } catch (e) {
      list = null;
    }
    if (!list) {
      // first run: seed from the built-in library
      list = JSON.parse(JSON.stringify(BUILTIN_COMPETITIONS));
      saveCompetitions(list);
      return list;
    }
    // merge in any built-in competitions the user doesn't already have
    // (e.g. after an app update ships more preloaded courses of fire)
    const existingIds = new Set(list.map(c => c.id));
    let changed = false;
    for (const builtin of BUILTIN_COMPETITIONS) {
      if (!existingIds.has(builtin.id)) {
        list.push(JSON.parse(JSON.stringify(builtin)));
        changed = true;
      }
    }
    // Re-sort into the canonical order defined by BUILTIN_COMPETITIONS in
    // data.js. Without this, a phone that installed the app a while ago
    // keeps whatever order its localStorage was first seeded with forever
    // — reordering the array in data.js would only affect brand-new
    // installs. Any competition that isn't one of the built-ins (added
    // locally via the editor or JSON import) isn't in this order, so it
    // keeps its existing relative position, sorted after all the built-ins.
    const builtinOrder = new Map(BUILTIN_COMPETITIONS.map((c, i) => [c.id, i]));
    const sorted = list.slice().sort((a, b) => {
      const ai = builtinOrder.has(a.id) ? builtinOrder.get(a.id) : Infinity;
      const bi = builtinOrder.has(b.id) ? builtinOrder.get(b.id) : Infinity;
      return ai - bi; // stable sort — ties (e.g. two custom competitions) keep their prior relative order
    });
    if (sorted.some((c, i) => c !== list[i])) changed = true;
    list = sorted;
    if (changed) saveCompetitions(list);
    return list;
  }

  function saveCompetitions(list) {
    localStorage.setItem(KEY_COMPETITIONS, JSON.stringify(list));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(KEY_SETTINGS);
      const parsed = raw ? JSON.parse(raw) : {};
      return Object.assign({}, DEFAULT_SETTINGS, parsed);
    } catch (e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  }

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  // Admin Mode gates the editing UI (new/edit/delete competitions and
  // matches, import JSON) behind a simple shared password, so bored RSOs
  // can't accidentally reshape a course of fire between matches. It's a
  // convenience lock, not real security — persisted across sessions so
  // whoever unlocks it for the day doesn't have to re-enter the password
  // every time the app is reopened.
  function loadAdminMode() {
    try {
      return localStorage.getItem(KEY_ADMIN_MODE) === "1";
    } catch (e) {
      return false;
    }
  }

  function saveAdminMode(enabled) {
    localStorage.setItem(KEY_ADMIN_MODE, enabled ? "1" : "0");
  }

  return { loadCompetitions, saveCompetitions, loadSettings, saveSettings, loadAdminMode, saveAdminMode, uid, DEFAULT_SETTINGS };
})();
