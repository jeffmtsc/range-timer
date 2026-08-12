/* Range Timer — main application logic.
   A course of fire (competition) is a list of "details" (Match/Practice).
   Each detail is run as one or more "units": a single timed string repeated
   `repeatCount` times, or one "string" per unit for an appearances/turning
   -target detail. Before every unit the RSO is stepped through a spoken
   script generated from the course-of-fire data, ending in a fixed standby
   delay and a start beep. */

(() => {
"use strict";

// ---------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------
let competitions = Storage.loadCompetitions();
let settings = Storage.loadSettings();
let adminMode = Storage.loadAdminMode();

// Convenience lock, not real security: stops bored RSOs from idly editing
// competitions/matches between stages. Shared password, persisted locally.
const ADMIN_PASSWORD = "Munster";

let currentCompetitionId = null;
let currentDetailIndex = 0;
let editingCompetitionId = null; // for editor screens
let editingDetailId = null;      // null => creating new detail

const runner = {
  token: null,           // cancellation token for the active async sequence
  detail: null,
  competition: null,
  selectedSeconds: null, // chosen duration for "single" timing
  attemptIndex: 0,
  totalAttempts: 1,
  stringIndex: 0,
  totalStrings: 1,
  appearanceIndex: 0,
  phase: "ready",         // ready | brief | standby | live | expose | hold | unit-complete | detail-complete
  briefLines: [],
  briefIndex: 0,
  phaseEndTime: null,     // timestamp (ms) the current countdown reaches 0
  phaseDurationMs: null,  // total duration of current countdown, for formatting choice
  firstDetailOfSession: true
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function findCompetition(id) { return competitions.find(c => c.id === id); }
function findDetailIndex(comp, detailId) { return comp.details.findIndex(d => d.id === detailId); }

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
}

let toastTimer = null;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("visible"), 2200);
}

function showModal(title, bodyHtml, buttonLabel, onContinue) {
  $("modal-title").textContent = title;
  $("modal-body").innerHTML = bodyHtml;
  $("modal-btn").textContent = buttonLabel || "Continue";
  $("modal-overlay").classList.add("visible");
  $("modal-btn").onclick = () => {
    $("modal-overlay").classList.remove("visible");
    if (onContinue) onContinue();
  };
}

// ---------------------------------------------------------------------
// Admin Mode — gates editing (new/edit/delete competitions & matches, JSON
// import) behind a shared password so it isn't idly changed between
// matches. Not real security, just a convenience lock; state persists
// across sessions via Storage so it doesn't need re-entering constantly.
// ---------------------------------------------------------------------
function applyAdminModeUI() {
  document.body.classList.toggle("admin-mode", adminMode);
  $("menu-admin").textContent = adminMode ? "Disable Admin Mode" : "Enable Admin Mode";
}

function closeHomeMenu() {
  $("home-menu").classList.remove("visible");
}

function openAdminPasswordPrompt() {
  $("admin-password-input").value = "";
  $("admin-password-error").hidden = true;
  $("admin-modal-overlay").classList.add("visible");
  $("admin-password-input").focus();
}

function closeAdminPasswordPrompt() {
  $("admin-modal-overlay").classList.remove("visible");
}

function attemptAdminUnlock() {
  if ($("admin-password-input").value === ADMIN_PASSWORD) {
    adminMode = true;
    Storage.saveAdminMode(true);
    applyAdminModeUI();
    closeAdminPasswordPrompt();
    toast("Admin Mode enabled");
  } else {
    $("admin-password-error").hidden = false;
    $("admin-password-input").value = "";
    $("admin-password-input").focus();
  }
}

function formatMinSec(totalSeconds) {
  totalSeconds = Math.round(totalSeconds);
  if (totalSeconds >= 60) {
    const m = Math.floor(totalSeconds / 60), s = totalSeconds % 60;
    return `${m} minute${m === 1 ? "" : "s"}${s ? " " + s + " second" + (s === 1 ? "" : "s") : ""}`;
  }
  return `${totalSeconds} second${totalSeconds === 1 ? "" : "s"}`;
}

function wait(ms, token) {
  return new Promise(resolve => {
    const id = setTimeout(resolve, ms);
    token.timers.push(id);
  });
}

function newToken() {
  return { cancelled: false, timers: [] };
}
function cancelToken(token) {
  if (!token) return;
  token.cancelled = true;
  token.timers.forEach(clearTimeout);
  token.timers.length = 0;
}

// ---------------------------------------------------------------------
// Home screen
// ---------------------------------------------------------------------
function renderHome() {
  const list = $("competition-list");
  list.innerHTML = "";
  if (competitions.length === 0) {
    list.innerHTML = `<p class="hint">No courses of fire yet. Add one below, or import a JSON file.</p>`;
  }
  competitions.forEach(comp => {
    const card = document.createElement("div");
    card.className = "comp-card";
    const detailCount = comp.details.length;
    card.innerHTML = `
      <div class="comp-card-name">${esc(comp.name)}</div>
      <div class="comp-card-meta">${esc(comp.summary?.distances || "")} &middot; ${detailCount} match${detailCount === 1 ? "" : "es"}${comp.summary?.rounds ? " &middot; " + esc(comp.summary.rounds) + " rounds" : ""}</div>
    `;
    card.addEventListener("click", () => openCompetition(comp.id));
    list.appendChild(card);
  });
}

function openCompetition(id) {
  currentCompetitionId = id;
  runner.firstDetailOfSession = true;
  renderCompetitionScreen();
  showScreen("screen-competition");
}

function renderCompetitionScreen() {
  const comp = findCompetition(currentCompetitionId);
  if (!comp) { showScreen("screen-home"); return; }

  $("comp-title").textContent = comp.name;
  const s = comp.summary || {};
  $("comp-summary").innerHTML = `
    ${s.distances ? `<div><b>Distances:</b> ${esc(s.distances)}</div>` : ""}
    ${s.rounds ? `<div><b>Rounds required:</b> ${esc(s.rounds)}</div>` : ""}
    ${s.maxScore ? `<div><b>Max score:</b> ${esc(s.maxScore)}</div>` : ""}
    ${s.duration ? `<div><b>Duration:</b> ${esc(s.duration)}</div>` : ""}
    ${s.notes ? `<div style="margin-top:6px;">${esc(s.notes)}</div>` : ""}
  `;

  const roList = $("ro-script-list");
  roList.innerHTML = (comp.rangeCommands || []).map(line => `<li>${esc(line)}</li>`).join("");
  $("comp-extra-note").textContent = comp.extraNote || "";

  const dl = $("detail-list");
  dl.innerHTML = "";
  comp.details.forEach((d, idx) => {
    const row = document.createElement("div");
    row.className = "detail-row";
    const label = d.practice ? `${d.match} — ${d.practice}` : d.match;
    row.innerHTML = `
      <div class="detail-main">
        <div class="detail-title">${esc(label)}</div>
        <div class="detail-sub">${esc(d.distance || "")}${d.distance ? " · " : ""}${esc(summarizeTiming(d))}</div>
      </div>
      <button class="detail-edit-btn admin-only" aria-label="Edit">&#9998;</button>
    `;
    row.querySelector(".detail-main").addEventListener("click", () => openRunner(comp.id, idx));
    row.querySelector(".detail-edit-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      openDetailEditor(comp.id, d.id);
    });
    dl.appendChild(row);
    if (d.scoreChangeAfter) {
      const div = document.createElement("div");
      div.className = "score-change-divider";
      div.textContent = "— Score & Change Targets —";
      dl.appendChild(div);
    }
  });

  $("btn-add-detail").onclick = () => openDetailEditor(comp.id, null);
}

// Details with more than one duration option (e.g. GRSB 20s / GRCF 30s) are
// not "pick one" alternatives — both are shot at the same time, the longer
// one starting on the standby beep and the shorter one starting later on a
// second beep, so every option finishes together on the cease-fire beep.
function isDualStartTiming(t) {
  return t && t.type === "single" && t.durationOptions && t.durationOptions.length > 1;
}
function sortedDurationOptions(t) {
  return [...t.durationOptions].sort((a, b) => b.seconds - a.seconds);
}

function summarizeTiming(d) {
  const t = d.timing;
  if (!t) return "";
  if (t.type === "single") {
    const opts = (t.durationOptions || []).map(o => `${o.label}: ${formatMinSec(o.seconds)}`).join(" / ");
    const staggerNote = isDualStartTiming(t) ? " (staggered start, finish together)" : "";
    return (t.isSighters ? "Sighters — " : "") + opts + staggerNote + (d.repeatCount > 1 ? ` (x${d.repeatCount})` : "");
  }
  if (t.type === "appearances") {
    const strings = t.strings > 1 ? `${t.strings} strings × ` : "";
    return `${strings}${t.appearancesPerString} appearances, ${t.exposureSeconds}s/${t.intervalSeconds}s`;
  }
  return "";
}

// ---------------------------------------------------------------------
// RSO script generation
// ---------------------------------------------------------------------
function describeAppearancesOneString(t) {
  return `${t.appearancesPerString} appearance${t.appearancesPerString === 1 ? "" : "s"}, each exposed for ${t.exposureSeconds} second${t.exposureSeconds === 1 ? "" : "s"} with ${t.intervalSeconds} second interval${t.intervalSeconds === 1 ? "" : "s"} between, firing ${t.shotsPerAppearance} shot${t.shotsPerAppearance === 1 ? "" : "s"} per appearance`;
}

function detailLabel(detail) {
  return detail.practice ? `${detail.match} — ${detail.practice}` : detail.match;
}

function generateIntroLine(comp, detail, ctx) {
  const label = detailLabel(detail);
  let qualifier = "";
  if (detail.timing.type === "appearances" && ctx.totalStrings > 1) {
    qualifier = `, String ${ctx.stringIndex + 1} of ${ctx.totalStrings}`;
  } else if (ctx.totalAttempts > 1) {
    qualifier = `, Attempt ${ctx.attemptIndex + 1} of ${ctx.totalAttempts}`;
  }
  let sentence;
  if (detail.timing.type === "appearances") {
    sentence = `You will fire ${describeAppearancesOneString(detail.timing)}.`;
  } else if (isDualStartTiming(detail.timing)) {
    const [longer, shorter] = sortedDurationOptions(detail.timing);
    const gap = longer.seconds - shorter.seconds;
    sentence = `${longer.label} shooters start on the first beep, with ${formatMinSec(longer.seconds)} to fire. `
      + `${shorter.label} shooters start ${formatMinSec(gap)} later on a second beep, with ${formatMinSec(shorter.seconds)} to fire. `
      + `Both finish together on the cease-fire signal.`
      + (detail.description ? ` ${detail.description}.` : "");
  } else if (detail.timing.isSighters) {
    sentence = `You will have ${formatMinSec(ctx.selectedSeconds)} of unlimited sighting fire.`;
  } else {
    sentence = `You will have ${formatMinSec(ctx.selectedSeconds)} to fire${detail.description ? ": " + detail.description : ""}.`;
  }
  const distancePart = detail.distance ? `, shot at ${detail.distance}` : "";
  return `This is ${label}${qualifier} of the ${comp.name}${distancePart}. ${sentence}`;
}

// For a second (or later) string/attempt within the same match — the RSO
// never left this position, so there's no need to re-explain the course of
// fire or re-run "Do you understand?" / "Eyes & Ears, going Live" again.
// Rewrites "With 6 rounds, load and make ready!" into "With a further 6
// rounds, load and make ready!" (falling back to a generic phrase when the
// round count isn't a plain number, e.g. "the required number of rounds").
function repeatLoadCommandLine(loadLine) {
  if (!loadLine) return null;
  const m = loadLine.match(/(\d+|the required number of)\s+rounds,\s*(load[\s\S]*)/i);
  if (!m) return loadLine;
  const qty = /^\d+$/.test(m[1]) ? `${m[1]} rounds` : "a further supply of rounds";
  const prefix = /^\d+$/.test(m[1]) ? "With a further" : "With";
  return `${prefix} ${qty}, ${m[2]}`;
}

function buildBriefLines(comp, detail, ctx) {
  const commands = comp.rangeCommands && comp.rangeCommands.length ? comp.rangeCommands : ["Is the line ready?", "The line is ready! Standby!"];
  const loadIndex = commands.findIndex(l => /load/i.test(l));

  if (ctx.isRepeat) {
    // Same position, same match — skip straight from the reload pause to
    // the load command (worded as "a further N rounds") and whatever
    // ready/standby commands follow it, instead of the full briefing.
    const lines = [];
    const loadLineText = detail.loadCommand || (loadIndex >= 0 ? commands[loadIndex] : "");
    const repeatLoad = repeatLoadCommandLine(loadLineText);
    if (repeatLoad) lines.push(repeatLoad);
    const afterLoad = loadIndex >= 0 ? commands.slice(loadIndex + 1) : commands;
    afterLoad.forEach(line => lines.push(line));
    return lines;
  }

  const lines = [];
  lines.push(generateIntroLine(comp, detail, ctx));
  if (detail.startPosition) lines.push(`Start position: ${detail.startPosition}.`);
  commands.forEach(line => {
    if (detail.loadCommand && /load/i.test(line)) {
      lines.push(detail.loadCommand);
    } else {
      lines.push(line);
    }
  });
  return lines;
}

// ---------------------------------------------------------------------
// Runner screen
// ---------------------------------------------------------------------
function openRunner(compId, detailIndex) {
  const comp = findCompetition(compId);
  const detail = comp.details[detailIndex];
  if (!detail) return;

  currentCompetitionId = compId;
  currentDetailIndex = detailIndex;

  cancelToken(runner.token);
  runner.competition = comp;
  runner.detail = detail;
  runner.attemptIndex = 0;
  runner.totalAttempts = detail.repeatCount || 1;
  runner.stringIndex = 0;
  runner.totalStrings = detail.timing.type === "appearances" ? (detail.timing.strings || 1) : 1;
  // For dual-start details (e.g. GRSB/GRCF), selectedSeconds represents the
  // total time until the shared cease-fire beep — i.e. the longer option —
  // since both durations run together rather than being a pick-one choice.
  runner.selectedSeconds = detail.timing.type === "single"
    ? (isDualStartTiming(detail.timing) ? sortedDurationOptions(detail.timing)[0].seconds
      : (detail.timing.durationOptions[0] ? detail.timing.durationOptions[0].seconds : 30))
    : null;
  runner.phase = "ready";
  runner.phaseEndTime = null;
  runner.infoVisible = true;

  $("runner-match").textContent = detailLabel(detail);
  $("info-distance").textContent = detail.distance || "—";
  $("info-position").textContent = detail.startPosition || "—";
  $("info-description").textContent = detail.description || "—";
  const loadCmd = detail.loadCommand || (comp.rangeCommands || []).find(l => /load/i.test(l)) || "";
  if (loadCmd) {
    $("info-load-row").style.display = "";
    $("info-load").textContent = loadCmd;
  } else {
    $("info-load-row").style.display = "none";
  }

  renderDurationPicker();
  updateRunnerProgress();
  setRunnerPhaseUI();
  showScreen("screen-runner");
}

function renderDurationPicker() {
  const container = $("duration-picker");
  container.innerHTML = "";
  const t = runner.detail.timing;
  if (t.type !== "single" || !t.durationOptions || t.durationOptions.length <= 1) return;

  if (isDualStartTiming(t)) {
    // Not a pick-one choice — both options are shot together with a
    // staggered start, so just show what each one does, non-interactively.
    const [longer, shorter] = sortedDurationOptions(t);
    const gap = longer.seconds - shorter.seconds;
    [
      { text: `${longer.label} — starts now (${formatMinSec(longer.seconds)})` },
      { text: `${shorter.label} — starts ${formatMinSec(gap)} later (${formatMinSec(shorter.seconds)})` }
    ].forEach(chip => {
      const div = document.createElement("div");
      div.className = "duration-chip";
      div.textContent = chip.text;
      container.appendChild(div);
    });
    return;
  }

  t.durationOptions.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `${opt.label} (${formatMinSec(opt.seconds)})`;
    if (opt.seconds === runner.selectedSeconds) btn.classList.add("selected");
    btn.addEventListener("click", () => {
      if (runner.phase !== "ready" && runner.phase !== "unit-complete" && runner.phase !== "detail-complete") return;
      runner.selectedSeconds = opt.seconds;
      renderDurationPicker();
    });
    container.appendChild(btn);
  });
}

// Whether finishing the current detail means the RSO is about to move the
// line to a different discipline — either this is the last match/practice
// in the course of fire, or the next one is at a different distance or
// start position. Shared by the on-screen end-of-match display and by
// goToNextDetail's command sequence, so they always agree.
function getEndOfDetailInfo() {
  const comp = runner.competition;
  const finishedDetail = runner.detail;
  const isLastDetail = currentDetailIndex + 1 >= comp.details.length;
  const nextDetail = isLastDetail ? null : comp.details[currentDetailIndex + 1];
  const disciplineChanging = isLastDetail || (
    nextDetail.distance !== finishedDetail.distance ||
    nextDetail.startPosition !== finishedDetail.startPosition
  );
  return { isLastDetail, nextDetail, disciplineChanging };
}

function updateRunnerProgress() {
  const bits = [];
  if (runner.totalAttempts > 1) bits.push(`Attempt ${runner.attemptIndex + 1} of ${runner.totalAttempts}`);
  if (runner.totalStrings > 1) bits.push(`String ${runner.stringIndex + 1} of ${runner.totalStrings}`);
  const compDetails = runner.competition.details;
  bits.push(`Match ${currentDetailIndex + 1} of ${compDetails.length}`);
  $("runner-progress").textContent = bits.join(" · ");
}

function setRunnerPhaseUI() {
  const statusEl = $("runner-status");
  const clockEl = $("runner-clock");
  const subEl = $("runner-sub");
  const briefEl = $("runner-brief");
  const pickerVisible = runner.phase === "ready" || runner.phase === "unit-complete" || runner.phase === "detail-complete";
  $("duration-picker").style.display = pickerVisible ? "" : "none";

  statusEl.className = "runner-status";
  briefEl.classList.remove("visible");
  clockEl.style.display = "";

  switch (runner.phase) {
    case "ready":
      statusEl.textContent = "READY";
      clockEl.textContent = runner.detail.timing.type === "appearances"
        ? `${runner.detail.timing.appearancesPerString}×${runner.detail.timing.exposureSeconds}s`
        : formatMinSec(runner.selectedSeconds);
      subEl.textContent = isDualStartTiming(runner.detail.timing)
        ? "Staggered start — see below. Tap BEGIN to start the RSO briefing"
        : "Tap BEGIN to start the RSO briefing";
      setStartButton("BEGIN", true);
      break;
    case "brief":
      clockEl.style.display = "none";
      briefEl.classList.add("visible");
      $("brief-line").textContent = runner.briefLines[runner.briefIndex];
      $("brief-progress").textContent = `Command ${runner.briefIndex + 1} of ${runner.briefLines.length}`;
      subEl.textContent = "";
      setStartButton(runner.briefIndex === runner.briefLines.length - 1 ? "STANDBY" : "NEXT", true);
      break;
    case "standby":
      statusEl.textContent = "STANDBY";
      statusEl.classList.add("standby");
      subEl.textContent = "";
      setStartButton("…", false);
      break;
    case "live":
      statusEl.textContent = "LIVE";
      statusEl.classList.add("live");
      if (isDualStartTiming(runner.detail.timing)) {
        const [longer, shorter] = sortedDurationOptions(runner.detail.timing);
        const gap = longer.seconds - shorter.seconds;
        subEl.textContent = `${longer.label} running now — ${shorter.label} starts in ${formatMinSec(gap)} on a second beep`;
      } else {
        subEl.textContent = runner.detail.description || "";
      }
      setStartButton("RUNNING", false);
      break;
    case "expose":
      statusEl.textContent = "SHOOT";
      statusEl.classList.add("live");
      subEl.textContent = `Appearance ${runner.appearanceIndex + 1} of ${runner.detail.timing.appearancesPerString}`;
      setStartButton("RUNNING", false);
      break;
    case "hold":
      statusEl.textContent = "PAUSE";
      subEl.textContent = "Resetting…";
      setStartButton("RUNNING", false);
      break;
    case "unit-complete": {
      // More strings/attempts remain within this SAME match — the RSO stays
      // put at the same distance/position, so this is just a reload pause,
      // not a full cease-fire-and-clear (that only happens at the end of
      // the whole match, in goToNextDetail).
      const moreStrings = runner.detail.timing.type === "appearances" && runner.stringIndex < runner.totalStrings;
      statusEl.textContent = moreStrings ? "RELOAD" : "CEASE FIRE";
      statusEl.classList.add("stop");
      clockEl.textContent = "DONE";
      subEl.textContent = moreStrings ? "String complete — reload, then tap BEGIN for the next string" : (runner.attemptIndex + 1 < runner.totalAttempts ? "Attempt complete — tap BEGIN for the next attempt" : "Detail complete");
      setStartButton("BEGIN", true);
      break;
    }
    case "detail-complete": {
      // The stage is over and there's nothing further to fire in it — this
      // always calls for a cease fire the instant the timer runs out, never
      // a plain "Done". BEGIN is disabled here on purpose so the RSO can't
      // accidentally re-fire the same stage; Next is the only way forward
      // (Repeat is still available if they deliberately want to redo it).
      const { disciplineChanging } = getEndOfDetailInfo();
      statusEl.textContent = "CEASE FIRE";
      statusEl.classList.add("stop");
      clockEl.textContent = "CLEAR";
      subEl.textContent = disciplineChanging
        ? "Unload and show clear. Once RSOs confirm all firearms are safe, tap Next."
        : "Unload and show clear. Once firearms are safe, tap Next to continue (or Repeat to run again).";
      setStartButton("BEGIN", false);
      break;
    }
  }

  // "Next" only ever means "the stage that just ended is truly over, move on
  // to the next one" — it must never be actionable mid-stage (which would
  // abandon whatever's running) or at any point that isn't detail-complete,
  // so it can never send the RSO back into the stage they just finished.
  $("btn-runner-next").disabled = runner.phase !== "detail-complete";

  $("runner-info-panel").classList.toggle("visible", !!runner.infoVisible && (runner.phase === "ready"));
}

function setStartButton(label, enabled) {
  const btn = $("btn-runner-start");
  btn.textContent = label;
  btn.disabled = !enabled;
  btn.classList.toggle("stop", label === "STANDBY");
}

let rafHandle = null;
function tickClock() {
  rafHandle = requestAnimationFrame(tickClock);
  if (!runner.phaseEndTime) return;
  const remainingMs = Math.max(0, runner.phaseEndTime - performance.now());
  const remainingS = remainingMs / 1000;
  const clockEl = $("runner-clock");
  if (runner.phase === "standby") {
    clockEl.textContent = Math.ceil(remainingS).toString();
  } else if (remainingS >= 10) {
    const m = Math.floor(remainingS / 60), s = Math.floor(remainingS % 60);
    clockEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;
  } else {
    clockEl.textContent = remainingS.toFixed(1);
  }
}

function beginUnit() {
  const comp = runner.competition, detail = runner.detail;
  // A second (or later) string within a multi-string match, or a second (or
  // later) repeat attempt, means the RSO never left this position — use the
  // abbreviated "further rounds" re-brief instead of the full script.
  const isRepeat = runner.stringIndex > 0 || runner.attemptIndex > 0;
  runner.briefLines = buildBriefLines(comp, detail, {
    attemptIndex: runner.attemptIndex,
    totalAttempts: runner.totalAttempts,
    stringIndex: runner.stringIndex,
    totalStrings: runner.totalStrings,
    selectedSeconds: runner.selectedSeconds,
    isRepeat
  });
  runner.briefIndex = 0;
  runner.phase = "brief";
  updateRunnerProgress();
  setRunnerPhaseUI();
}

function advanceBrief() {
  if (runner.briefIndex < runner.briefLines.length - 1) {
    runner.briefIndex++;
    setRunnerPhaseUI();
  } else {
    startStandby();
  }
}

async function startStandby() {
  AudioEngine.ensureContext();
  if (settings.keepAwake) WakeLock.request();
  runner.phase = "standby";
  setRunnerPhaseUI();
  const token = newToken();
  runner.token = token;
  let delayMs = settings.standbyDelaySeconds * 1000;
  if (settings.randomJitter) delayMs += Math.random() * 2000;
  runner.phaseEndTime = performance.now() + delayMs;
  await wait(delayMs, token);
  if (token.cancelled) return;
  runner.phaseEndTime = null;
  AudioEngine.startBeep();
  runUnitBody(token);
}

async function runUnitBody(token) {
  const detail = runner.detail;
  const t = detail.timing;
  if (t.type === "single" && isDualStartTiming(t)) {
    // Staggered dual start (e.g. GRSB/GRCF): the standby beep that already
    // fired starts the longest-duration group; each shorter option gets its
    // own start beep later, timed so every group finishes together on the
    // single cease-fire beep at the end.
    const sorted = sortedDurationOptions(t); // longest first
    const longestSeconds = sorted[0].seconds;
    runner.phase = "live";
    setRunnerPhaseUI();
    runner.phaseEndTime = performance.now() + longestSeconds * 1000;
    let elapsedMs = 0;
    for (let i = 1; i < sorted.length; i++) {
      const offsetMs = (longestSeconds - sorted[i].seconds) * 1000;
      const gapMs = offsetMs - elapsedMs;
      if (gapMs > 0) {
        await wait(gapMs, token);
        if (token.cancelled) return;
        elapsedMs += gapMs;
      }
      AudioEngine.startBeep();
      const stillRunning = sorted.slice(0, i + 1).map(o => o.label).join(" and ");
      $("runner-sub").textContent = `${stillRunning} both running — finishing together`;
    }
    const remainingMs = longestSeconds * 1000 - elapsedMs;
    if (remainingMs > 0) {
      await wait(remainingMs, token);
      if (token.cancelled) return;
    }
    runner.phaseEndTime = null;
    AudioEngine.ceaseFireBeep();
    finishUnit();
    return;
  }
  if (t.type === "single") {
    runner.phase = "live";
    setRunnerPhaseUI();
    runner.phaseEndTime = performance.now() + runner.selectedSeconds * 1000;
    await wait(runner.selectedSeconds * 1000, token);
    if (token.cancelled) return;
    runner.phaseEndTime = null;
    AudioEngine.ceaseFireBeep();
    finishUnit();
    return;
  }
  if (t.type === "appearances") {
    for (let i = 0; i < t.appearancesPerString; i++) {
      runner.appearanceIndex = i;
      runner.phase = "expose";
      setRunnerPhaseUI();
      if (i > 0) AudioEngine.exposureInBeep();
      runner.phaseEndTime = performance.now() + t.exposureSeconds * 1000;
      await wait(t.exposureSeconds * 1000, token);
      if (token.cancelled) return;
      runner.phaseEndTime = null;
      const isLast = i === t.appearancesPerString - 1;
      if (isLast) {
        AudioEngine.ceaseFireBeep();
        finishUnit();
        return;
      } else {
        AudioEngine.exposureOutBeep();
        runner.phase = "hold";
        setRunnerPhaseUI();
        runner.phaseEndTime = performance.now() + t.intervalSeconds * 1000;
        await wait(t.intervalSeconds * 1000, token);
        if (token.cancelled) return;
        runner.phaseEndTime = null;
      }
    }
  }
}

function finishUnit() {
  WakeLock.release();
  const t = runner.detail.timing;
  if (t.type === "appearances" && runner.stringIndex < runner.totalStrings - 1) {
    runner.stringIndex++;
    runner.phase = "unit-complete";
  } else if (runner.attemptIndex < runner.totalAttempts - 1) {
    runner.attemptIndex++;
    runner.stringIndex = 0;
    runner.phase = "unit-complete";
  } else {
    runner.phase = "detail-complete";
  }
  updateRunnerProgress();
  setRunnerPhaseUI();
}

function handleStartButton() {
  switch (runner.phase) {
    case "ready":
    case "unit-complete":
    case "detail-complete":
      beginUnit();
      break;
    case "brief":
      advanceBrief();
      break;
    default:
      break; // standby / live / expose / hold — button disabled
  }
}

function handleRepeat() {
  cancelToken(runner.token);
  WakeLock.release();
  runner.phase = "ready";
  runner.phaseEndTime = null;
  setRunnerPhaseUI();
}

function goToNextDetail() {
  // Belt-and-braces: Next is only ever meant to fire once the stage that
  // was running has genuinely finished. The button itself is disabled
  // outside "detail-complete" (see setRunnerPhaseUI), but guard here too so
  // nothing can advance — or worse, treat an in-progress stage as finished
  // and skip/replay it — from any other phase.
  if (runner.phase !== "detail-complete") return;
  cancelToken(runner.token);
  WakeLock.release();
  const comp = runner.competition;
  const finishedDetail = runner.detail;
  // The runner screen itself already showed "CEASE FIRE — unload and show
  // clear" (see the detail-complete case in setRunnerPhaseUI) before Next
  // became the only enabled action, so there's no need to show that again
  // here as a modal — go straight to whatever comes after it.
  const { isLastDetail, nextDetail, disciplineChanging } = getEndOfDetailInfo();

  const announceMove = () => {
    if (isLastDetail) {
      showModal("The Range is Safe", "That concludes your competition.", "Back to course", () => {
        showScreen("screen-competition");
      });
    } else if (disciplineChanging) {
      showModal(
        "The Range is Safe",
        `You may move to <b>${esc(nextDetail.distance || "the next position")}</b> for <b>${esc(detailLabel(nextDetail))}</b>.`,
        "Continue",
        () => openRunner(comp.id, currentDetailIndex + 1)
      );
    } else {
      openRunner(comp.id, currentDetailIndex + 1);
    }
  };

  if (finishedDetail.scoreChangeAfter) {
    showModal("Score & Change Targets", "Score and change targets, then continue when ready.", "Continue", announceMove);
  } else {
    announceMove();
  }
}

function exitRunner() {
  cancelToken(runner.token);
  WakeLock.release();
  showScreen("screen-competition");
}

// ---------------------------------------------------------------------
// Competition / detail editors
// ---------------------------------------------------------------------
function openCompetitionEditor(id) {
  // Defense in depth: the entry points (pencil icon, +New button) are
  // already hidden for normal users via the .admin-only CSS class, but
  // guard here too so nothing can reach the editor without Admin Mode.
  if (!adminMode) return;
  editingCompetitionId = id;
  const comp = id ? findCompetition(id) : null;
  $("editor-title").textContent = comp ? "Edit Course of Fire" : "New Course of Fire";
  $("btn-editor-delete").style.display = comp ? "" : "none";
  $("f-comp-name").value = comp?.name || "";
  $("f-comp-code").value = comp?.code || "";
  $("f-comp-distances").value = comp?.summary?.distances || "";
  $("f-comp-rounds").value = comp?.summary?.rounds || "";
  $("f-comp-maxscore").value = comp?.summary?.maxScore || "";
  $("f-comp-duration").value = comp?.summary?.duration || "";
  $("f-comp-notes").value = comp?.summary?.notes || "";
  $("f-comp-ro-script").value = (comp?.rangeCommands || []).join("\n");
  $("f-comp-extra").value = comp?.extraNote || "";
  showScreen("screen-editor");
}

function saveCompetitionForm(e) {
  e.preventDefault();
  if (!adminMode) return;
  const isNew = !editingCompetitionId;
  const comp = isNew ? { id: Storage.uid("comp"), details: [] } : findCompetition(editingCompetitionId);
  comp.name = $("f-comp-name").value.trim() || "Untitled";
  comp.code = $("f-comp-code").value.trim();
  comp.summary = {
    distances: $("f-comp-distances").value.trim(),
    rounds: $("f-comp-rounds").value.trim(),
    maxScore: $("f-comp-maxscore").value.trim(),
    duration: $("f-comp-duration").value.trim(),
    notes: $("f-comp-notes").value.trim()
  };
  comp.rangeCommands = $("f-comp-ro-script").value.split("\n").map(s => s.trim()).filter(Boolean);
  comp.extraNote = $("f-comp-extra").value.trim();

  if (isNew) competitions.push(comp);
  Storage.saveCompetitions(competitions);
  toast("Saved");
  currentCompetitionId = comp.id;
  renderCompetitionScreen();
  showScreen("screen-competition");
  renderHome();
}

function deleteCurrentCompetition() {
  if (!adminMode || !editingCompetitionId) return;
  if (!confirm("Delete this course of fire? This cannot be undone.")) return;
  competitions = competitions.filter(c => c.id !== editingCompetitionId);
  Storage.saveCompetitions(competitions);
  renderHome();
  showScreen("screen-home");
}

function openDetailEditor(compId, detailId) {
  // Defense in depth — see the matching comment in openCompetitionEditor.
  if (!adminMode) return;
  editingCompetitionId = compId;
  editingDetailId = detailId;
  const comp = findCompetition(compId);
  const detail = detailId ? comp.details.find(d => d.id === detailId) : null;

  $("detaileditor-title").textContent = detail ? "Edit Match / Practice" : "New Match / Practice";
  $("btn-detaileditor-delete").style.display = detail ? "" : "none";

  $("f-d-match").value = detail?.match || "";
  $("f-d-practice").value = detail?.practice || "";
  $("f-d-distance").value = detail?.distance || "";
  $("f-d-position").value = detail?.startPosition || "";
  $("f-d-description").value = detail?.description || "";
  $("f-d-loadcmd").value = detail?.loadCommand || "";
  $("f-d-repeat").value = detail?.repeatCount || 1;
  $("f-d-scorechange").checked = !!detail?.scoreChangeAfter;

  const timing = detail?.timing || { type: "single", durationOptions: [{ label: "String", seconds: 30 }] };
  $("f-d-timing-type").value = timing.type;
  toggleTimingFields(timing.type);

  if (timing.type === "single") {
    $("f-d-single-durations").value = (timing.durationOptions || []).map(o => `${o.label}:${o.seconds}`).join("\n");
    $("f-d-sighters").checked = !!timing.isSighters;
  } else {
    $("f-d-single-durations").value = "String:30";
    $("f-d-sighters").checked = false;
  }
  if (timing.type === "appearances") {
    $("f-d-strings").value = timing.strings || 1;
    $("f-d-app-count").value = timing.appearancesPerString || 6;
    $("f-d-exposure").value = timing.exposureSeconds || 2;
    $("f-d-interval").value = timing.intervalSeconds || 5;
    $("f-d-shots-per-app").value = timing.shotsPerAppearance || 1;
  } else {
    $("f-d-strings").value = 1;
    $("f-d-app-count").value = 6;
    $("f-d-exposure").value = 2;
    $("f-d-interval").value = 5;
    $("f-d-shots-per-app").value = 1;
  }

  showScreen("screen-detail-editor");
}

function toggleTimingFields(type) {
  $("fields-single").hidden = type !== "single";
  $("fields-appearances").hidden = type !== "appearances";
}

function parseDurationOptions(text) {
  const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
  const opts = lines.map(line => {
    const idx = line.lastIndexOf(":");
    if (idx === -1) return { label: line, seconds: 30 };
    return { label: line.slice(0, idx).trim(), seconds: parseFloat(line.slice(idx + 1)) || 0 };
  });
  return opts.length ? opts : [{ label: "String", seconds: 30 }];
}

function saveDetailForm(e) {
  e.preventDefault();
  if (!adminMode) return;
  const comp = findCompetition(editingCompetitionId);
  const isNew = !editingDetailId;
  const detail = isNew ? { id: Storage.uid("detail") } : comp.details.find(d => d.id === editingDetailId);

  detail.match = $("f-d-match").value.trim() || "Match";
  detail.practice = $("f-d-practice").value.trim() || null;
  detail.distance = $("f-d-distance").value.trim();
  detail.startPosition = $("f-d-position").value.trim();
  detail.description = $("f-d-description").value.trim();
  detail.loadCommand = $("f-d-loadcmd").value.trim() || null;
  detail.repeatCount = Math.max(1, parseInt($("f-d-repeat").value, 10) || 1);
  detail.scoreChangeAfter = $("f-d-scorechange").checked;

  const type = $("f-d-timing-type").value;
  if (type === "single") {
    detail.timing = {
      type: "single",
      isSighters: $("f-d-sighters").checked,
      durationOptions: parseDurationOptions($("f-d-single-durations").value)
    };
  } else {
    detail.timing = {
      type: "appearances",
      strings: Math.max(1, parseInt($("f-d-strings").value, 10) || 1),
      appearancesPerString: Math.max(1, parseInt($("f-d-app-count").value, 10) || 1),
      exposureSeconds: Math.max(0.5, parseFloat($("f-d-exposure").value) || 2),
      intervalSeconds: Math.max(0, parseFloat($("f-d-interval").value) || 0),
      shotsPerAppearance: Math.max(1, parseInt($("f-d-shots-per-app").value, 10) || 1)
    };
  }

  if (isNew) comp.details.push(detail);
  Storage.saveCompetitions(competitions);
  toast("Saved");
  currentCompetitionId = comp.id;
  renderCompetitionScreen();
  showScreen("screen-competition");
}

function deleteCurrentDetail() {
  if (!adminMode || !editingDetailId) return;
  if (!confirm("Delete this match/practice?")) return;
  const comp = findCompetition(editingCompetitionId);
  comp.details = comp.details.filter(d => d.id !== editingDetailId);
  Storage.saveCompetitions(competitions);
  renderCompetitionScreen();
  showScreen("screen-competition");
}

// ---------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------
function exportCompetition() {
  const comp = findCompetition(currentCompetitionId);
  if (!comp) return;
  const blob = new Blob([JSON.stringify(comp, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${comp.id || "course-of-fire"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importJsonFile(file) {
  if (!adminMode) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      let count = 0;
      list.forEach(comp => {
        if (!comp || !comp.name) return;
        if (!comp.id || findCompetition(comp.id)) comp.id = Storage.uid("comp");
        comp.details = comp.details || [];
        comp.details.forEach(d => { if (!d.id) d.id = Storage.uid("detail"); });
        competitions.push(comp);
        count++;
      });
      Storage.saveCompetitions(competitions);
      renderHome();
      toast(`Imported ${count} course${count === 1 ? "" : "s"} of fire`);
    } catch (err) {
      toast("Could not read that file — is it valid JSON?");
    }
  };
  reader.readAsText(file);
}

// ---------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------
function renderSettings() {
  $("s-standby-delay").value = settings.standbyDelaySeconds;
  $("s-random-jitter").checked = settings.randomJitter;
  $("s-volume").value = settings.volume;
  $("s-keep-awake").checked = settings.keepAwake;
  $("s-sunlight-mode").checked = settings.sunlightMode;
  $("s-show-ro-script").checked = settings.showRoScript;
  document.body.classList.toggle("sunlight-mode", settings.sunlightMode);
  AudioEngine.setVolume(settings.volume);
}

function wireSettings() {
  const save = () => {
    settings.standbyDelaySeconds = Math.max(0, parseFloat($("s-standby-delay").value) || 0);
    settings.randomJitter = $("s-random-jitter").checked;
    settings.volume = parseFloat($("s-volume").value);
    settings.keepAwake = $("s-keep-awake").checked;
    settings.sunlightMode = $("s-sunlight-mode").checked;
    settings.showRoScript = $("s-show-ro-script").checked;
    Storage.saveSettings(settings);
    document.body.classList.toggle("sunlight-mode", settings.sunlightMode);
    AudioEngine.setVolume(settings.volume);
  };
  ["s-standby-delay", "s-random-jitter", "s-volume", "s-keep-awake", "s-sunlight-mode", "s-show-ro-script"].forEach(id => {
    $(id).addEventListener("change", save);
    $(id).addEventListener("input", save);
  });
  $("btn-test-beeps").addEventListener("click", async () => {
    AudioEngine.ensureContext();
    AudioEngine.startBeep();
    await new Promise(r => setTimeout(r, 700));
    AudioEngine.exposureInBeep();
    await new Promise(r => setTimeout(r, 400));
    AudioEngine.exposureOutBeep();
    await new Promise(r => setTimeout(r, 700));
    AudioEngine.ceaseFireBeep();
  });
}

// ---------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------
function wireEvents() {
  $("btn-settings").addEventListener("click", (e) => {
    e.stopPropagation();
    $("home-menu").classList.toggle("visible");
  });
  document.addEventListener("click", (e) => {
    if (!$("home-menu-wrap").contains(e.target)) closeHomeMenu();
  });
  $("menu-settings").addEventListener("click", () => {
    closeHomeMenu();
    renderSettings();
    showScreen("screen-settings");
  });
  $("menu-admin").addEventListener("click", () => {
    closeHomeMenu();
    if (adminMode) {
      adminMode = false;
      Storage.saveAdminMode(false);
      applyAdminModeUI();
      toast("Admin Mode disabled");
    } else {
      openAdminPasswordPrompt();
    }
  });
  $("admin-modal-cancel").addEventListener("click", closeAdminPasswordPrompt);
  $("admin-modal-unlock").addEventListener("click", attemptAdminUnlock);
  $("admin-password-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptAdminUnlock();
  });
  $("btn-settings-back").addEventListener("click", () => showScreen("screen-home"));

  $("btn-new-competition").addEventListener("click", () => openCompetitionEditor(null));
  $("btn-import").addEventListener("click", () => $("import-file-input").click());
  $("import-file-input").addEventListener("change", (e) => {
    if (e.target.files[0]) importJsonFile(e.target.files[0]);
    e.target.value = "";
  });

  $("btn-comp-back").addEventListener("click", () => showScreen("screen-home"));
  $("btn-comp-edit").addEventListener("click", () => openCompetitionEditor(currentCompetitionId));
  $("btn-comp-export").addEventListener("click", exportCompetition);

  $("btn-runner-back").addEventListener("click", exitRunner);
  $("btn-runner-info").addEventListener("click", () => {
    runner.infoVisible = !runner.infoVisible;
    setRunnerPhaseUI();
  });
  $("btn-runner-start").addEventListener("click", handleStartButton);
  $("btn-runner-repeat").addEventListener("click", handleRepeat);
  $("btn-runner-next").addEventListener("click", goToNextDetail);
  $("btn-skip-brief").addEventListener("click", () => {
    if (runner.phase === "brief") startStandby();
  });

  $("competition-form").addEventListener("submit", saveCompetitionForm);
  $("btn-editor-cancel").addEventListener("click", () => showScreen(editingCompetitionId ? "screen-competition" : "screen-home"));
  $("btn-editor-delete").addEventListener("click", deleteCurrentCompetition);

  $("detail-form").addEventListener("submit", saveDetailForm);
  $("btn-detaileditor-cancel").addEventListener("click", () => showScreen("screen-competition"));
  $("btn-detaileditor-delete").addEventListener("click", deleteCurrentDetail);
  $("f-d-timing-type").addEventListener("change", (e) => toggleTimingFields(e.target.value));

  wireSettings();
}

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
function init() {
  wireEvents();
  applyAdminModeUI();
  renderHome();
  renderSettings();
  showScreen("screen-home");
  tickClock();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
})();
