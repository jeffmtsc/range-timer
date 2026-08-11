/* Range Timer — local persistence (localStorage). Fully offline, no network calls. */

const Storage = (() => {
  const KEY_COMPETITIONS = "rt_competitions_v1";
  const KEY_SETTINGS = "rt_settings_v1";

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

  return { loadCompetitions, saveCompetitions, loadSettings, saveSettings, uid, DEFAULT_SETTINGS };
})();
