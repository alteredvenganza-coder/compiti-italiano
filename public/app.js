/* Compiti di Italiano: single-page app for students (phone) and teacher (desktop). */
"use strict";

/* ================= basics ================= */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const todayISO = () => new Date().toLocaleDateString("sv-SE");
const fmtDate = (d) => { if (!d) return ""; const x = new Date(String(d).length <= 10 ? d + "T12:00:00" : String(d).replace(" ", "T") + (String(d).includes("Z") ? "" : "Z")); return isNaN(x) ? d : x.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }); };
const fmtMin = (sec) => `${Math.round((sec || 0) / 60)} min`;
const fmtClock = (s) => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };

const S = { me: null, stats: null, play: null, cache: {} };

function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2600); }

async function api(path, opts = {}) {
  const res = await fetch(path, { method: opts.method || "GET", headers: opts.body ? { "content-type": "application/json" } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: "same-origin" });
  let data = {}; try { data = await res.json(); } catch {}
  if (res.status === 401 && S.me && !path.endsWith("/login")) { S.me = null; S.play = null; stopTimer(); setTimeout(() => go("#/"), 0); throw new Error(data.error || "Devi entrare di nuovo"); }
  if (!res.ok) throw new Error(data.error || "Qualcosa non ha funzionato, riprova");
  return data;
}
const go = (h) => { if (location.hash === h) render(); else location.hash = h; };

const I = {
  x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  check: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f6f1e4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  lock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9aa3c4" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  play: '<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#1235a8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h7"/><path d="M17 15l2 2 4-4"/></svg>',
  redo: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.4L3 8"/><path d="M3 3v5h5"/></svg>',
  speaker: '<svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="#f6f1e4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M19 5a10 10 0 010 14"/></svg>',
  flame: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d2412f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 2-5 5-5 8 0 4 3 7 7 7z"/></svg>',
  tabTasks: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h12l4 4v12H4z"/><path d="M8 12h8M8 16h5"/></svg>',
  tabGym: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/></svg>',
  tabMe: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
  notebook: '<svg width="150" height="118" viewBox="0 0 150 118" fill="none" stroke="#f6f1e4" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 30 L70 22 L72 96 L16 104 Z"/><path d="M70 22 L126 30 L124 104 L72 96"/><path d="M26 44 L58 40 M26 58 L58 54 M26 72 L50 69 M84 40 L114 44 M84 54 L114 58"/><path d="M98 70 L136 32 L144 40 L106 78 L94 82 Z"/></svg>',
  clock: '<svg class="clock" width="120" height="120" viewBox="0 0 120 120" fill="none" stroke="#3a5ccc" stroke-width="3" stroke-linecap="round" aria-hidden="true"><circle cx="60" cy="60" r="44"/><path d="M60 30v30l20 12"/></svg>',
  star: '<svg class="deco" width="190" height="190" viewBox="0 0 170 170" fill="none" stroke="#3a5ccc" stroke-width="3.5" stroke-linejoin="round" aria-hidden="true"><path d="M85 14 L104 62 L156 66 L116 98 L130 150 L85 122 L40 150 L54 98 L14 66 L66 62 Z"/></svg>',
};

/* ================= exercises ================= */
const norm = (s) => String(s ?? "").toLowerCase().replace(/[’`´]/g, "'").normalize("NFC").replace(/[^\p{L}\p{N}' ]/gu, " ").replace(/\s+/g, " ").trim();
const bare = (s) => norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "");
function checkText(given, accepted) {
  const list = Array.isArray(accepted) ? accepted : [accepted];
  if (list.some((a) => norm(a) === norm(given))) return { ok: true };
  if (list.some((a) => bare(a) === bare(given))) return { ok: true, accent: true };
  return { ok: false };
}

function weekItems(n) {
  const L = LEZ[n]; if (!L) return [];
  const cat = WEEK_CAT[n] || "Altro";
  const out = [];
  L.eserc.forEach((s, i) => {
    const m = s.match(/^(.*)\(([^)]*)\)\s*$/);
    if (!m) return;
    const ans = m[2].trim();
    const two = ans.includes("…");
    out.push({ id: `w${n}-e${i}`, t: "fill", q: m[1].trim(), a: two ? [ans.replace(/…\s*/, " ")] : [ans], cat, x: two ? "Scrivi le due parole che mancano, una dopo l'altra." : "" , two });
  });
  L.trad.forEach((s, i) => { const [q, a] = s.split("|"); out.push({ id: `w${n}-t${i}`, t: "tr", dir: "es-it", q, a: [a], cat }); });
  L.tradI.forEach((s, i) => { const [q, a] = s.split("|"); out.push({ id: `w${n}-ti${i}`, t: "tr", dir: "it-es", q, a: [a], cat }); });
  L.dett.forEach((w, i) => out.push({ id: `w${n}-d${i}`, t: "listen", a: w, cat: "Doppie e ortografia" }));
  return out;
}
const EX = {};
UNITS.forEach((u) => u.items.forEach((it, i) => { it.id = `${u.id}-${i}`; it.cat = it.cat || u.cat; EX[it.id] = it; }));
for (let n = 1; n <= 12; n++) weekItems(n).forEach((it) => (EX[it.id] = it));

function promptText(it) {
  if (it.t === "match") return "Abbina: " + it.pairs.map((p) => p[0]).join(", ");
  if (it.t === "listen") return "Dettato";
  return it.q;
}
function expectedText(it) {
  if (it.t === "match") return it.pairs.map((p) => `${p[0]} = ${p[1]}`).join(", ");
  if (it.t === "choice") return it.a;
  return Array.isArray(it.a) ? it.a[0] : it.a;
}

function buildCompito(a, reviewIds) {
  const N = a.minutes === 10 ? 6 : 12;
  const week = shuffle(weekItems(a.week));
  const unitItems = shuffle((WEEK_UNITS[a.week] || []).flatMap((id) => UNITS.find((u) => u.id === id)?.items || []));
  const picked = [];
  const fromWeek = week.filter((x) => x.t === "fill").slice(0, Math.ceil(N * 0.35))
    .concat(week.filter((x) => x.t === "tr").slice(0, Math.ceil(N * 0.25)))
    .concat(week.filter((x) => x.t === "listen").slice(0, Math.max(1, Math.round(N * 0.15))));
  const mixed = shuffle(fromWeek);
  for (const it of mixed) if (picked.length < N) picked.push(it.id);
  for (const it of unitItems) if (picked.length < N && !picked.includes(it.id)) picked.push(it.id);
  for (const it of week) if (picked.length < N && !picked.includes(it.id)) picked.push(it.id);
  if (a.include_review) (reviewIds || []).filter((id) => EX[id] && !picked.includes(id)).slice(0, 3).forEach((id) => picked.unshift(id));
  return picked;
}

/* ---------- player ---------- */
let timerId = null;
function stopTimer() { clearInterval(timerId); timerId = null; }

function startPlay(cfg) {
  // cfg: { kind: 'compito'|'palestra', key, ids, minutes, title, cat, meta }
  const saved = cfg.key ? ls.get(cfg.key, null) : null;
  S.play = saved && saved.ids ? { ...cfg, ...saved, phase: "answer" } : { ...cfg, i: 0, results: [], startedAt: Date.now(), phase: "answer" };
  if (cfg.minutes && !S.play.deadline) S.play.deadline = S.play.startedAt + cfg.minutes * 60000;
  persistPlay();
  go("#/play");
}
function persistPlay() { const p = S.play; if (p && p.key) ls.set(p.key, { ids: p.ids, i: p.i, results: p.results, startedAt: p.startedAt, deadline: p.deadline }); }

function renderPlay(root) {
  const p = S.play;
  if (!p) return go("#/");
  const it = EX[p.ids[p.i]];
  if (!it) return finishPlay();
  const segs = p.ids.map((_, k) => { const r = p.results[k]; return `<span class="${r ? (r.correct ? "ok" : "ko") : k === p.i ? "now" : ""}"></span>`; }).join("");
  const top = `<div class="top">
      <button class="iconbtn" data-act="quit" aria-label="Esci">${I.x}</button>
      <div class="grow stack" style="gap:6px"><span class="small" style="font-weight:700">${p.i + 1} di ${p.ids.length}</span>
        ${p.kind === "palestra" ? `<div class="pbar"><div style="width:${Math.round((p.i / p.ids.length) * 100)}%"></div></div>` : `<div class="bar">${segs}</div>`}</div>
      ${p.deadline ? `<div class="timer tnum" id="timer">${fmtClock((p.deadline - Date.now()) / 1000)}</div>` : ""}
    </div>`;
  root.innerHTML = `<div class="phone"><div class="player">${top}<div class="ex" id="ex"></div></div></div>`;
  renderItem($("#ex"), it);
  stopTimer();
  if (p.deadline) {
    timerId = setInterval(() => {
      const left = (p.deadline - Date.now()) / 1000;
      const el = $("#timer"); if (el) { el.textContent = fmtClock(left); el.classList.toggle("low", left < 60); }
      if (left <= 0) { stopTimer(); toast("Tempo finito! Consegno quello che hai fatto."); finishPlay(); }
    }, 500);
  }
}

const TITLES = { fill: "Completa la frase", tr: "Traduci", listen: "Ascolta e scrivi", choice: "Scegli", match: "Abbina le coppie" };
function renderItem(box, it) {
  const p = S.play;
  let title = TITLES[it.t];
  if (it.t === "tr") title = it.dir === "es-it" ? "Traduci in italiano" : "Traduci in spagnolo";
  let html = `<div class="stack" style="gap:4px"><span class="eyebrow blue">${esc(it.cat)}</span><h1 class="display d-m blue">${esc(title)}</h1></div>`;
  if (it.t === "fill") {
    html += `<div class="card stack"><p class="prompt">${esc(it.q).replace(/_{2,}/g, '<span class="blank" id="blank">&nbsp;</span>')}</p>${it.es ? `<p class="es" style="margin:0"><b>ES</b>${esc(it.es)}</p>` : ""}${it.x && it.two ? `<p class="small muted" style="margin:0">${esc(it.x)}</p>` : ""}</div>
      <label class="field">La tua risposta<input class="input" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"></label>`;
  } else if (it.t === "tr") {
    html += `<div class="card"><p class="prompt">${esc(it.q)}</p></div>
      <label class="field">${it.dir === "es-it" ? "In italiano" : "En español"}<textarea class="input" id="ans" rows="2" autocapitalize="sentences" spellcheck="false"></textarea></label>`;
  } else if (it.t === "listen") {
    html += `<p class="muted" style="margin:0">Premi il tasto, ascolta e scrivi la parola. Attenta alle doppie!</p>
      <div class="speak"><button class="play" data-act="say" aria-label="Ascolta la parola">${I.speaker}</button><button class="btn ghost sm" data-act="say-slow">Più lento</button></div>
      <label class="field">Scrivi qui<input class="input" id="ans" style="text-align:center;font-size:24px" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"></label>`;
  } else if (it.t === "choice") {
    const cv = choiceView(it);
    const pill = (l) => `<span class="pill" style="background:var(--cream);color:var(--cobalt)">${l}</span>`;
    html += cv.word ? `<p class="prompt" style="font-size:22px">${esc(cv.q)}</p>
      <div class="bigword" style="flex-direction:column;gap:10px">${pill(cv.wlang)}<div class="row" style="gap:14px;justify-content:center"><span class="display" style="font-size:${cv.word.length > 12 ? 32 : cv.word.length > 8 ? 42 : 60}px;overflow-wrap:anywhere;text-align:center">${esc(cv.word)}</span>${cv.wlang === "ITALIANO" ? spkBtn(cv.word, true) : ""}</div></div>
      <span class="eyebrow blue" style="text-align:center">Scegli in ${cv.olang === "ESPAÑOL" ? "spagnolo" : "italiano"}</span>`
      : `<div class="card"><p class="prompt" style="font-size:24px">${esc(it.q)}</p></div>`;
    html += `<div class="opts">${cv.opts.map((o, k) => `<button class="opt" data-act="choose" data-k="${k}">${esc(o)}</button>`).join("")}</div>`;
  } else if (it.t === "match") {
    if (!p.match || p.match.id !== it.id) p.match = { id: it.id, left: shuffle(it.pairs.map((x) => x[0])), right: shuffle(it.pairs.map((x) => x[1])), done: [], sel: null, mistakes: [] };
    const M = p.match;
    html += `<div class="match"><div class="col"><span class="eyebrow muted" style="text-align:center">Italiano</span>${M.left.map((w) => `<button class="opt ${M.done.includes(w) ? "done" : M.sel === w ? "sel" : ""}" data-act="mleft" data-w="${esc(w)}" ${M.done.includes(w) ? "disabled" : ""}>${esc(w)}</button>`).join("")}</div>
      <div class="col"><span class="eyebrow muted" style="text-align:center">Español</span>${M.right.map((w) => { const isDone = it.pairs.some((pp) => pp[1] === w && M.done.includes(pp[0])); return `<button class="opt ${isDone ? "done" : ""}" data-act="mright" data-w="${esc(w)}" ${isDone ? "disabled" : ""}>${esc(w)}</button>`; }).join("")}</div></div>
      <p class="hand" id="mnote" style="text-align:center;color:var(--red);min-height:28px;margin:0"></p>`;
  }
  if (["fill", "tr", "listen"].includes(it.t)) html += `<div class="actions"><button class="btn block big" data-act="check">Controlla</button><button class="link" data-act="skip">Non lo so, vai avanti</button></div>`;
  html += `<div id="sheet"></div>`;
  box.innerHTML = html;
  const inp = $("#ans");
  if (inp) {
    inp.addEventListener("input", () => { const b = $("#blank"); if (b) b.textContent = inp.value || " "; });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (S.play.phase === "answer") answer(inp.value); } });
    if (it.t !== "listen") setTimeout(() => inp.focus(), 50);
  }
  if (it.t === "listen") setTimeout(() => say(it.a, 0.85), 300);
}

// Feedback sounds, synthesized live (no files): a rising marimba-like arpeggio for right, a soft low "bwomp" for wrong.
let actx = null;
const soundOn = () => ls.get("sounds", true);
function tone(ctx, { f0, f1 = f0, type = "triangle", at = 0, dur = 0.18, vol = 0.25, cutoff = 0 }) {
  const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o; if (cutoff) { const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = cutoff; o.connect(lp); node = lp; }
  node.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
}
function ping(ctx, f, at, dur, vol) {
  // Glassy bell: pure sine + soft octave + a quiet inharmonic partial, quick attack, smooth decay.
  tone(ctx, { f0: f, at, dur, vol, type: "sine" });
  tone(ctx, { f0: f * 2, at, dur: dur * 0.6, vol: vol * 0.28, type: "sine" });
  tone(ctx, { f0: f * 2.76, at, dur: dur * 0.35, vol: vol * 0.08, type: "sine" });
}
function sfx(kind) {
  if (!soundOn()) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    if (kind === "ok") {          // bright rising fifth: E6 → B6
      ping(actx, 1318.5, 0, 0.35, 0.22); ping(actx, 1975.5, 0.075, 0.5, 0.2);
    } else if (kind === "ko") {   // soft, friendly descending pair: D5 → A4, rounded, no buzz
      tone(actx, { f0: 587.3, f1: 554.4, type: "sine", at: 0, dur: 0.14, vol: 0.24 });
      tone(actx, { f0: 440, f1: 392, type: "sine", at: 0.12, dur: 0.26, vol: 0.24 });
      tone(actx, { f0: 880, f1: 784, type: "triangle", at: 0.12, dur: 0.12, vol: 0.04 });
    } else if (kind === "win") {  // sparkly major arpeggio: G5 B5 D6 G6
      [[784, 0], [987.8, 0.08], [1174.7, 0.16], [1568, 0.26]].forEach(([f, at], i) => ping(actx, f, at, i === 3 ? 0.9 : 0.4, 0.17));
    }
  } catch {}
}

// Voice: ElevenLabs through our server (cached), with the phone's own voice as fallback.
let audioEl = null;
const voiceOk = { v: true };
async function say(text, rate) {
  const slow = rate < 0.7;
  if (voiceOk.v) {
    try {
      if (audioEl) audioEl.pause();
      audioEl = new Audio(`/api/tts?t=${encodeURIComponent(text)}${slow ? "&slow=1" : ""}`);
      await audioEl.play();
      return;
    } catch (e) { if (String(e && e.name) !== "NotAllowedError") voiceOk.v = false; else return toast("Tocca il tasto per ascoltare"); }
  }
  try {
    const synth = window.speechSynthesis; if (!synth) return toast("Questo telefono non legge ad alta voce");
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = "it-IT"; u.rate = slow ? 0.5 : 0.85;
    const v = synth.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith("it")); if (v) u.voice = v;
    synth.speak(u);
  } catch { toast("Non riesco a leggere ad alta voce"); }
}
const SPK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/></svg>';
const spkBtn = (text, light) => `<button class="iconbtn" style="${light ? "border-color:var(--cream);color:var(--cream)" : ""}" data-act="say-text" data-text="${esc(text)}" aria-label="Ascolta">${SPK}</button>`;

// "Cosa vuol dire «X»?" items run both ways: Italian word → Spanish options, or Spanish word → Italian options.
function choiceView(it) {
  const p = S.play;
  if (p.cv && p.cv.id === it.id) return p.cv;
  const m = it.q.match(/«([^»]+)»/);
  let cv;
  if (m && it.q.startsWith("Cosa vuol dire") && !m[1].includes(" ")) {
    const itWord = m[1], esWord = it.a.split(" / ")[0];
    if (Math.random() < 0.5) {
      cv = { word: itWord, wlang: "ITALIANO", olang: "ESPAÑOL", q: "Come si dice in spagnolo?", opts: shuffle([it.a, ...it.o]), correct: it.a, prompt: `${itWord} → spagnolo` };
    } else {
      const others = shuffle(UNITS.find((u) => u.id === "falsi").items.filter((x) => x.t === "choice" && x !== it && /^Cosa vuol dire «[^» ]+»/.test(x.q)).map((x) => x.q.match(/«([^»]+)»/)[1])).slice(0, 3);
      cv = { word: esWord, wlang: "ESPAÑOL", olang: "ITALIANO", q: "¿Cómo se dice en italiano?", opts: shuffle([itWord, ...others]), correct: itWord, prompt: `${esWord} → italiano` };
    }
    cv.itWord = itWord;
  } else cv = { word: null, opts: shuffle([it.a, ...it.o]), correct: it.a, prompt: it.q };
  cv.id = it.id; p.cv = cv; p.optOrder = cv.opts;
  return cv;
}

function answer(given, opts = {}) {
  const p = S.play; const it = EX[p.ids[p.i]];
  if (p.phase !== "answer") return;
  let res;
  const cv = it.t === "choice" ? choiceView(it) : null;
  if (it.t === "choice") res = { ok: given === cv.correct };
  else if (it.t === "match") res = { ok: opts.mistakes <= 1 };
  else if (opts.skip) res = { ok: false };
  else {
    if (!String(given).trim()) return toast("Scrivi una risposta, oppure premi «Non lo so»");
    res = checkText(given, it.a);
  }
  p.phase = "feedback";
  p.results[p.i] = {
    exercise_id: it.id, category: it.cat, prompt: cv ? cv.prompt : promptText(it),
    given: it.t === "match" ? (opts.mistakes ? `sbagli: ${opts.wrongs.join(", ")}` : "tutto giusto") : opts.skip ? "(non lo so)" : String(given),
    expected: cv ? cv.correct : expectedText(it), correct: res.ok, needs_review: it.t === "tr" && !res.ok && !opts.skip,
  };
  persistPlay();
  sfx(res.ok ? "ok" : "ko");
  if (navigator.vibrate && !res.ok) navigator.vibrate(60);
  const sheet = $("#sheet");
  const nextLbl = p.i < p.ids.length - 1 ? "Avanti" : "Finisci";
  const x = it.x && !it.two ? `<p style="margin:0">${esc(it.x)}</p>` : "";
  const itText = it.t === "fill" ? it.q.replace(/_{2,}/, expectedText(it)).replace(/\s*\([^)]*\)\s*$/, "") : it.t === "tr" && it.dir === "es-it" ? expectedText(it) : it.t === "listen" ? it.a : cv && cv.itWord ? cv.itWord : "";
  if (res.ok) {
    sheet.innerHTML = `<div class="sheet ok"><div class="spread"><span class="display d-s" style="color:var(--green-dark)">${res.accent ? "Giusto, ma…" : "Giusto!"}</span>${p.kind === "palestra" ? '<b style="color:var(--green-dark)">+10 XP</b>' : ""}</div>
      ${res.accent ? `<p style="margin:0">Attenta agli accenti: <b>${esc(expectedText(it))}</b></p>` : ""}${x}${itText && it.t !== "listen" ? `<div class="row small" style="color:var(--green-dark);font-weight:700">${spkBtn(itText)} Ascolta come si dice</div>` : ""}
      <button class="btn green block big" data-act="next">${nextLbl}</button></div>`;
  } else {
    sheet.innerHTML = `<div class="sheet ko"><span class="display d-s">${opts.skip ? "Ecco come si dice" : "Quasi!"}</span>
      ${!opts.skip && it.t !== "match" && it.t !== "choice" ? `<div><span class="eyebrow" style="opacity:.85">Hai scritto</span><div style="font-size:18px;text-decoration:line-through">${esc(given)}</div></div>` : ""}
      <div class="row" style="align-items:flex-end"><div class="grow"><span class="eyebrow" style="opacity:.85">Si dice</span><div class="hand" style="font-size:32px">${esc(cv && cv.word ? `${cv.word} = ${cv.correct}` : cv ? cv.correct : expectedText(it))}</div></div>${itText ? spkBtn(itText, true) : ""}</div>
      ${x}${it.t === "tr" && !opts.skip ? '<p class="small" style="margin:0;opacity:.9">Nad controllerà la tua traduzione: magari va bene anche così.</p>' : ""}
      <button class="btn light block big" data-act="next">${nextLbl}</button></div>`;
  }
  document.querySelectorAll("#ex .actions").forEach((e) => (e.hidden = true));
  const inp = $("#ans"); if (inp) inp.readOnly = true;
  setTimeout(() => sheet.scrollIntoView({ behavior: "smooth", block: "end" }), 30);
}

async function finishPlay() {
  const p = S.play; if (!p || p.finishing) return;
  p.finishing = true; stopTimer();
  const results = p.results.filter(Boolean);
  const duration = Math.round((Date.now() - p.startedAt) / 1000);
  const right = results.filter((r) => r.correct).length;
  try {
    if (p.kind === "compito") {
      await api(`/api/my/assignments/${p.meta.id}/finish`, { method: "POST", body: { answers: results, duration_sec: duration } });
    } else {
      const passed = results.length > 0 && right / results.length >= 0.7;
      const r = await api("/api/my/practice/finish", { method: "POST", body: { unit_id: p.meta.unit, answers: results, duration_sec: duration, passed } });
      p.xp = r.xp; p.passed = passed; S.stats = { ...S.stats, ...r.stats };
    }
    if (p.key) ls.del(p.key);
    S.done = { ...p, results, duration, right };
    S.play = null;
    go("#/fine");
  } catch (e) {
    p.finishing = false;
    toast(e.message + ". Riprova tra poco: le risposte restano salvate sul telefono.");
    $("#ex").insertAdjacentHTML("beforeend", `<div class="actions"><button class="btn block big" data-act="retry-finish">Riprova a consegnare</button></div>`);
  }
}

function renderDone(root) {
  const d = S.done; if (!d) return go("#/");
  if (!d.played) { d.played = true; if (d.kind === "compito" || d.passed) sfx("win"); }
  const wrong = d.results.filter((r) => !r.correct).slice(0, 4);
  if (d.kind === "compito") {
    root.innerHTML = `<div class="phone"><div class="full-blue">${I.star}
      <span class="eyebrow" style="opacity:.85">Compito finito · settimana ${d.meta.week}</span>
      <div><div class="huge tnum">${d.right}/${d.results.length}</div>
      <h1 class="display d-l" style="margin-top:8px">${d.right >= d.results.length * 0.7 ? "Brava" : "Ci sei quasi"} ${esc(S.me.name)}!</h1>
      <p class="hand" style="margin:6px 0 0">finito in ${fmtMin(d.duration)} · Nad lo vede subito</p></div>
      ${wrong.length ? `<div class="card" style="border-color:var(--cream);color:var(--ink);margin-top:auto;padding:6px 18px"><div class="eyebrow blue" style="padding:12px 0 4px">Da ricordare</div>${wrong.map((r) => `<div style="padding:10px 0;border-top:1.5px dashed var(--line)"><span class="wrong" style="font-size:16px">${esc(r.given)}</span> → <span class="right">${esc(r.expected)}</span></div>`).join("")}</div>` : `<p class="hand" style="margin-top:auto;font-size:30px">tutto giusto!</p>`}
      <a class="btn outline-light block big" href="#/">Torna alla home</a></div></div>`;
  } else {
    root.innerHTML = `<div class="phone"><div class="full-blue">${I.star}
      <span class="hand">${d.passed ? "evviva!" : "quasi!"}</span>
      <h1 class="display" style="font-size:72px">${d.passed ? "Livello<br>finito" : "Riprova<br>il livello"}</h1>
      <div class="stat3" style="margin-top:14px"><div><b>+${d.xp || 0}</b><span class="small">XP</span></div><div><b>${d.right}/${d.results.length}</b><span class="small">giuste</span></div><div style="background:var(--cream);color:var(--cobalt)"><b>${S.stats?.streak || 1}</b><span class="small">giorni di fila</span></div></div>
      ${wrong.length ? `<div class="card" style="border-color:var(--cream);color:var(--ink)"><span class="eyebrow blue">Torneranno nel ripasso</span><div style="margin-top:6px">${wrong.map((r) => `<b>${esc(r.expected)}</b>`).join(" · ")}</div></div>` : ""}
      ${!d.passed ? '<p style="margin:0">Serve il 70% di risposte giuste per passare al livello dopo.</p>' : ""}
      <a class="btn light block big" style="margin-top:auto" href="#/palestra">Continua</a></div></div>`;
  }
}

/* ================= student screens ================= */
function tabbar(cur) {
  const t = (h, icon, lbl, k) => `<a href="${h}" ${cur === k ? 'aria-current="page"' : ""}>${icon}${lbl}</a>`;
  return `<nav class="tabbar" aria-label="Sezioni">${t("#/", I.tabTasks, "Compiti", "home")}${t("#/palestra", I.tabGym, "Palestra", "gym")}${t("#/io", I.tabMe, "Io", "me")}</nav>`;
}

async function viewStudentHome(root) {
  const [list, review] = await Promise.all([api("/api/my/assignments"), api("/api/my/review")]);
  S.cache.review = review;
  const todo = list.filter((a) => a.status !== "fatto");
  const done = list.filter((a) => a.status === "fatto");
  const first = todo[0];
  const W = (n) => WEEKS[n - 1];
  root.innerHTML = `<div class="phone"><main>
    <div class="spread"><div><div class="hand blue">ciao</div><h1 class="display d-l blue" style="font-size:54px">${esc(S.me.name)}</h1></div>
      <span class="row" style="gap:6px;font-weight:700;color:var(--cobalt)">${I.flame}${S.stats?.streak || 0}</span></div>
    ${first ? `<div class="task">${I.clock}
        <div class="eyebrow" style="opacity:.85">Da fare · settimana ${first.week}</div>
        <div class="spread" style="align-items:flex-end"><div class="display" style="font-size:44px">${esc(W(first.week).t)}</div>
          <div style="text-align:right"><div class="display" style="font-size:44px">${first.minutes}′</div><span class="small" style="opacity:.85">${first.minutes === 10 ? 6 : 12} esercizi</span></div></div>
        ${first.note ? `<p class="hand" style="margin:0">«${esc(first.note)}» Nad</p>` : ""}
        <div class="row"><button class="btn light grow big" data-act="start-compito" data-id="${first.id}">${ls.get("play-" + first.id, null) ? "Continua" : "Inizia"}</button>${first.due_date ? `<span class="small" style="font-weight:600">entro ${esc(fmtDate(first.due_date))}</span>` : ""}</div>
      </div>` : `<div class="empty"><span class="hand">nessun compito da fare</span>Quando Nad te ne dà uno, lo trovi qui. Intanto puoi allenarti in Palestra.</div>`}
    ${todo.slice(1).map((a) => `<button class="list-item big" style="text-align:left;cursor:pointer;width:100%" data-act="start-compito" data-id="${a.id}"><div class="grow"><b>Settimana ${a.week} · ${esc(W(a.week).t)}</b><div class="small muted">${a.minutes} min${a.due_date ? " · entro " + esc(fmtDate(a.due_date)) : ""}</div></div><span class="pill blue">Da fare</span></button>`).join("")}
    ${review.length ? `<a class="list-item big" href="#/palestra"><div class="grow"><b class="display" style="font-size:20px;font-stretch:85%;text-transform:none">Errori da rivedere</b><div class="small muted">Li trovi nel ripasso della Palestra</div></div><span class="badge">${Math.min(review.length, 99)}</span></a>` : ""}
    ${done.length ? `<div class="stack" style="gap:8px"><span class="eyebrow blue">Già fatti</span>${done.slice(0, 8).map((a) => `<div class="list-item"><div class="grow"><b>${esc(W(a.week).t)}</b><div class="small muted">Settimana ${a.week} · ${esc(fmtDate(a.completed_at))}</div></div><span class="score" style="color:var(--${a.score >= a.total * 0.6 ? "green" : "red"})">${a.score}/${a.total}</span></div>`).join("")}</div>` : ""}
  </main>${tabbar("home")}</div>`;
  S.cache.assignments = list;
}

async function startCompito(id) {
  const a = (S.cache.assignments || []).find((x) => x.id === id);
  if (!a) return;
  const key = "play-" + id;
  const saved = ls.get(key, null);
  const ids = saved?.ids || buildCompito(a, (S.cache.review || []).map((r) => r.exercise_id));
  api(`/api/my/assignments/${id}/start`, { method: "POST" }).catch(() => {});
  startPlay({ kind: "compito", key, ids, minutes: a.minutes, meta: { id: a.id, week: a.week } });
}

async function viewPalestra(root) {
  const [prog, review] = await Promise.all([api("/api/my/practice"), api("/api/my/review")]);
  S.stats = { ...S.stats, ...prog.stats };
  S.cache.review = review;
  const lv = (id) => prog.units[id] || 0;
  const unlocked = (k) => k < 2 || lv(UNITS[k - 1].id) >= 1;
  const current = UNITS.findIndex((u, k) => unlocked(k) && lv(u.id) < 5);
  const offs = [-60, 30, 80, 20, -50, -80, 10, 70];
  const reviewIds = review.map((r) => r.exercise_id).filter((id) => EX[id]);
  root.innerHTML = `<div class="phone"><main>
    <div class="spread"><h1 class="display d-l blue">Palestra</h1>
      <div class="row" style="gap:8px"><span class="pill blue row" style="gap:4px;font-size:15px;padding:6px 12px">${I.flame}${prog.stats.streak || 0}</span><span class="pill" style="background:var(--cobalt);color:var(--cream);font-size:15px;padding:6px 12px">${prog.stats.xp || 0} XP</span></div></div>
    <div class="path">
      ${reviewIds.length ? `<div class="node-wrap"><button class="node review" data-act="start-review" aria-label="Ripasso">${I.redo}</button><span class="node-label">Ripasso · ${reviewIds.length} errori</span></div>` : ""}
      ${UNITS.map((u, k) => {
        const l = lv(u.id), open = unlocked(k), now = k === current;
        const cls = !open ? "locked" : now ? "now" : l > 0 ? "done" : "now";
        const icon = !open ? I.lock : cls === "done" ? I.check : I.play;
        return `<div class="node-wrap" style="transform:translateX(${offs[k % offs.length]}px)">
          ${now ? `<span class="pill" style="background:var(--ink);color:var(--cream);padding:6px 12px">${l ? "Livello " + (l + 1) : "Inizia"}</span>` : ""}
          <button class="node ${cls}" ${open ? `data-act="start-unit" data-unit="${u.id}"` : "disabled"} aria-label="${esc(u.title)}${open ? "" : ", bloccato"}">${icon}</button>
          <span class="node-label">${esc(u.title)}</span><span class="levels" aria-label="livello ${l} di 5">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= l ? "on" : ""}"></i>`).join("")}</span></div>`;
      }).join("")}
    </div>
  </main>${tabbar("gym")}</div>`;
  S.cache.reviewIds = reviewIds;
}

function startUnit(unitId) {
  const u = UNITS.find((x) => x.id === unitId);
  const ids = shuffle(u.items).slice(0, 10).map((x) => x.id);
  startPlay({ kind: "palestra", ids, meta: { unit: u.id } });
}

function viewMe(root) {
  const s = S.stats || {};
  root.innerHTML = `<div class="phone"><main>
    <div><div class="hand blue">sono</div><h1 class="display d-l blue" style="font-size:54px">${esc(S.me.name)}</h1></div>
    <div class="kpis"><div class="kpi solid"><span class="small">Punti</span><b>${s.xp || 0} XP</b></div><div class="kpi"><span class="small muted">Giorni di fila</span><b>${s.streak || 0}</b></div></div>
    <label class="card thin check" style="justify-content:space-between"><b>Suoni giusto / sbagliato</b><input type="checkbox" id="snd" ${soundOn() ? "checked" : ""}></label>
    <div class="card dashed stack"><b>Avere l'app sul telefono</b><span class="small">iPhone: Condividi › Aggiungi a schermata Home. Android: menu ⋮ › Installa app o Aggiungi a schermata Home.</span></div>
    <button class="btn ghost block" data-act="logout" style="margin-top:auto">Esci</button>
  </main>${tabbar("me")}</div>`;
}

/* ================= auth screens ================= */
function viewLogin(root, setup) {
  root.innerHTML = `<div class="phone">
    <div class="login-top"><div class="hand" style="font-size:26px">ciao! · ¡hola!</div>
      <h1 class="display d-xl">Compiti<br>di Italiano</h1>${I.notebook}
      <div class="hand" style="font-size:22px;margin-top:10px;max-width:170px">piano piano<br>si va lontano</div></div>
    <form class="login-form" id="loginForm">
      ${setup ? `<p style="margin:0;font-weight:600">Primo avvio: crea il tuo account da insegnante. Le ragazze le aggiungi dopo, dal pannello.</p>
        <label class="field">Il tuo nome<input class="input" id="f-name" autocomplete="name" required></label>` : `<p style="margin:0;font-weight:600">Entra con il nome e il PIN che ti ha dato Nad.</p>`}
      <label class="field">Nome utente<input class="input" id="f-user" autocomplete="username" autocapitalize="off" spellcheck="false" required></label>
      <label class="field">${setup ? "Password (almeno 8 caratteri)" : "PIN o password"}<input class="input ${setup ? "" : "pin"}" id="f-pass" type="password" ${setup ? 'autocomplete="new-password" minlength="8"' : 'autocomplete="current-password"'} required></label>
      <button class="btn block big" type="submit">${setup ? "Crea account" : "Entra"}</button>
      <p class="small muted" id="f-err" role="alert" style="margin:0;color:var(--red);font-weight:700"></p>
    </form></div>`;
  const preU = new URLSearchParams(location.search).get("u");
  if (preU && !setup) { $("#f-user").value = preU; setTimeout(() => $("#f-pass").focus(), 50); }
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = { username: $("#f-user").value, password: $("#f-pass").value };
    if (setup) body.name = $("#f-name").value;
    try { await api(setup ? "/api/setup" : "/api/login", { method: "POST", body }); await loadMe(); if (location.search) history.replaceState(null, "", "/" + "#/"); go("#/"); }
    catch (err) { $("#f-err").textContent = err.message; }
  });
}

async function loadMe() {
  try { const r = await api("/api/me"); S.me = r.user; S.stats = r.stats; } catch { S.me = null; }
}

/* ================= teacher screens ================= */
const TNAV = [["#/t/compiti", "Compiti"], ["#/t/oggi", "Prossima lezione"], ["#/t/lezione", "Lezione guidata"], ["#/t/programma", "Programma"], ["#/t/registro", "Registro"], ["#/t/errori", "Dove sbagliano"], ["#/t/alunne", "Alunne"]];
function shell(root, cur, inner) {
  root.innerHTML = `<div class="desk"><nav class="side" aria-label="Sezioni">
    <div class="brand"><div class="hand" style="font-size:22px">ripetizioni</div><div class="display" style="font-size:34px">Quaderno<br>di Italiano</div></div>
    ${TNAV.map(([h, l]) => `<a class="nav" href="${h}" ${h === cur ? 'aria-current="page"' : ""}>${l}</a>`).join("")}
    <div class="me"><b>${esc(S.me.name)}</b><div style="opacity:.8">insegnante</div><button class="link" style="color:var(--cream);padding:8px 0" data-act="logout">Esci</button></div>
  </nav><div class="content" id="tc">${inner}</div></div>`;
}
async function students() { S.cache.students = await api("/api/t/students"); return S.cache.students; }
const stName = (id) => (S.cache.students || []).find((s) => s.id === id)?.name || "";

/* ---- compiti ---- */
async function viewTCompiti(root) {
  const [st, list] = await Promise.all([students(), api("/api/t/assignments")]);
  await notebook();
  const f = S.cache.assignForm || (S.cache.assignForm = { ids: [], week: nextWeekN(), minutes: 20, review: true, due: "", note: "" });
  if (!f.ids.length) f.ids = st.filter((s) => s.active).map((s) => s.id);
  const sel = list.find((a) => a.id === S.cache.selA) || list.find((a) => a.status === "fatto");
  shell(root, "#/t/compiti", `<h1 class="display d-l blue">Compiti</h1>
    <div class="cols"><div class="col-narrow">
      ${st.length ? `<form class="card stack" id="assignForm">
        <h2 class="h">Assegna un compito</h2>
        <div class="chips">${st.filter((s) => s.active).map((s) => `<button type="button" class="chip" data-act="toggle-st" data-id="${s.id}" aria-pressed="${f.ids.includes(s.id)}">${esc(s.name)}</button>`).join("")}</div>
        <div class="row wrap" style="align-items:flex-end"><label class="field grow">Settimana<select class="input sm" id="a-week">${WEEKS.map((w) => `<option value="${w.n}" ${w.n === f.week ? "selected" : ""}>${w.n}. ${esc(w.t)}</option>`).join("")}</select></label>
          <label class="field grow">Entro<input class="input sm" type="date" id="a-due" value="${esc(f.due)}"></label></div>
        <div class="seg"><button type="button" data-act="minutes" data-m="10" aria-pressed="${f.minutes === 10}">10 min · 6 esercizi</button><button type="button" data-act="minutes" data-m="20" aria-pressed="${f.minutes === 20}">20 min · 12 esercizi</button></div>
        <label class="check"><input type="checkbox" id="a-rev" ${f.review ? "checked" : ""}> Più 3 errori da ripassare</label>
        <label class="field">Nota per loro<input class="input sm" id="a-note" maxlength="200" value="${esc(f.note)}" placeholder="Es. Attenta agli articoli!"></label>
        <button class="btn block" type="submit">Assegna</button></form>`
        : `<div class="empty"><span class="hand">prima crea gli account</span><a href="#/t/alunne">Vai su Alunne</a></div>`}
      <span class="eyebrow blue">Tutti i compiti</span>
      ${list.length ? list.map((a) => `<button class="akard ${sel && sel.id === a.id ? "sel" : ""}" data-act="sel-a" data-id="${a.id}">
          <b>${esc(a.student_name)} · Sett. ${a.week}</b>
          <span class="side-r">${a.status === "fatto" ? `<span class="hand" style="font-size:26px;${sel && sel.id === a.id ? "" : `color:var(--${a.score >= a.total * 0.6 ? "green" : "red"})`}">${a.score}/${a.total}</span>` : a.due_date && a.due_date < todayISO() ? '<span class="pill red">Scaduto</span>' : `<span class="pill blue" ${sel && sel.id === a.id ? 'style="border-color:var(--cream);color:var(--cream)"' : ""}>${a.status === "iniziato" ? "Iniziato" : "Da fare"}</span>`}</span>
          <span class="small muted">${a.status === "fatto" ? `Fatto in ${fmtMin(a.duration_sec)}${a.to_review ? ` · da controllare ${a.to_review}` : ""}` : `${a.minutes} min${a.due_date ? " · entro " + esc(fmtDate(a.due_date)) : ""}`}</span></button>`).join("")
        : '<div class="empty">Nessun compito ancora.</div>'}
    </div><div class="col-wide" id="adetail"></div></div>`);
  if (sel) renderAssignDetail(sel); else $("#adetail").innerHTML = '<div class="empty"><span class="hand">qui vedi le risposte</span>Scegli un compito fatto dalla lista.</div>';
  const form = $("#assignForm");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    f.week = +$("#a-week").value; f.due = $("#a-due").value; f.note = $("#a-note").value; f.review = $("#a-rev").checked;
    if (!f.ids.length) return toast("Scegli almeno un'alunna");
    try { await api("/api/t/assignments", { method: "POST", body: { student_ids: f.ids, week: f.week, minutes: f.minutes, include_review: f.review, due_date: f.due || null, note: f.note } }); f.note = ""; toast("Compito assegnato"); render(); }
    catch (err) { toast(err.message); }
  });
}
async function renderAssignDetail(a) {
  const box = $("#adetail");
  const W = WEEKS[a.week - 1];
  box.innerHTML = `<div class="card stack" style="padding:24px"><div class="spread wrap" style="align-items:flex-start">
      <div><span class="eyebrow muted">${esc(a.student_name)} · settimana ${a.week}${a.completed_at ? " · fatto " + esc(fmtDate(a.completed_at)) : ""}</span><h2 class="display d-m">${esc(W.t)}</h2></div>
      ${a.status === "fatto" ? `<span class="hand" style="font-size:54px;color:var(--${a.score >= a.total * 0.6 ? "green" : "red"});transform:rotate(-5deg)">${a.score}/${a.total}</span>` : ""}</div>
    ${a.status === "fatto" ? `<div class="kpis"><div class="kpi" style="border-color:var(--line)"><span class="small muted">Tempo</span><b style="font-size:26px">${fmtMin(a.duration_sec)} di ${a.minutes}</b></div><div class="kpi" style="border-color:var(--line)"><span class="small muted">Giuste</span><b style="font-size:26px;color:var(--green)">${a.score}</b></div><div class="kpi" style="border-color:var(--line)"><span class="small muted">Sbagliate</span><b style="font-size:26px;color:var(--red)">${a.total - a.score}</b></div></div>
      <span class="eyebrow blue">Risposte</span><div id="answers" class="small muted">Carico…</div>` : `<p class="muted" style="margin:0">Non ancora consegnato.${a.note ? ` Nota: «${esc(a.note)}»` : ""}</p>`}
    <div><button class="btn red sm" data-act="del-a" data-id="${a.id}">Elimina compito</button></div></div>`;
  if (a.status !== "fatto") return;
  const ans = await api(`/api/t/assignments/${a.id}/answers`);
  const order = [...ans].sort((x, y) => (x.correct - y.correct) || (y.needs_review - x.needs_review));
  $("#answers").outerHTML = `<div>${order.map((r) => `<div class="ans"><div class="stack" style="gap:2px"><span class="small muted">${esc(r.category)} · ${esc(r.prompt)}</span>
      <span style="font-size:17px">${r.correct ? `<span class="right">${esc(r.given)}</span>` : `<span class="wrong">${esc(r.given)}</span> → <b class="right">${esc(r.expected)}</b>`}</span></div>
      <div class="row wrap" style="gap:6px;justify-content:flex-end">${r.needs_review && !r.teacher_verdict ? `<button class="btn green sm" data-act="verdict" data-v="ok" data-id="${r.id}">Va bene</button><button class="btn red sm" data-act="verdict" data-v="wrong" data-id="${r.id}">Sbagliata</button>` : ""}
        ${!r.correct && (!r.needs_review || r.teacher_verdict) ? `<button class="btn red sm" data-act="add-err" data-id="${r.id}">Aggiungi agli errori</button>` : ""}
        ${r.teacher_verdict === "ok" ? '<span class="pill green">Accettata da te</span>' : ""}</div></div>`).join("")}</div>`;
  S.cache.answers = ans;
}

/* ---- alunne ---- */
async function viewTAlunne(root) {
  const st = await students();
  const shown = S.cache.shownPin || {};
  shell(root, "#/t/alunne", `<h1 class="display d-l blue">Alunne</h1>
    <div class="cols"><div class="col-wide"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">
      ${st.map((s, k) => `<div class="card stack ${k === 0 ? "solid" : ""}">
        <div class="spread"><h2 class="display d-m">${esc(s.name)}</h2>${s.active ? "" : '<span class="pill red">Sospesa</span>'}</div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
          ${[["Nome utente", s.username], ["Ultimo accesso", s.last_login ? fmtDate(s.last_login) : "mai"], ["Compiti fatti", `${s.done} di ${s.assigned}`], ["Giuste", s.accuracy != null ? s.accuracy + "%" : "–"], ["Palestra", fmtMin(s.practice_sec)], ["Giorni di fila", s.streak || 0]]
            .map(([l, v]) => `<div style="padding:9px 12px;border:1.5px solid ${k === 0 ? "var(--cobalt-soft)" : "var(--line)"};border-radius:14px"><div class="small" style="opacity:.8">${l}</div><b>${esc(v)}</b></div>`).join("")}</div>
        ${shown[s.id] ? `<div class="stack" style="gap:2px"><span class="small">Nuovo PIN, scrivilo e daglielo:</span><span class="pinshow">${shown[s.id]}</span></div>` : ""}
        <div class="row wrap" style="gap:8px"><button class="btn ${k === 0 ? "light" : ""} sm" data-act="card" data-id="${s.id}">Scheda con QR</button><button class="btn ${k === 0 ? "outline-light" : "ghost"} sm" data-act="new-pin" data-id="${s.id}">Nuovo PIN</button>
          <button class="btn ${k === 0 ? "outline-light" : "ghost"} sm" data-act="toggle-active" data-id="${s.id}" data-on="${s.active ? 0 : 1}">${s.active ? "Sospendi" : "Riattiva"}</button></div></div>`).join("")}
      ${st.length ? "" : '<div class="empty"><span class="hand">ancora nessuna alunna</span>Crea il primo account con il modulo.</div>'}
    </div></div>
    <form class="col-narrow card dashed stack" id="stForm"><div class="display d-s blue">Nuova alunna</div>
      <label class="field">Solo il nome<input class="input sm" id="s-name" maxlength="30" required placeholder="Es. Sofia"></label>
      <label class="field">Nome utente<input class="input sm" id="s-user" required autocapitalize="off" spellcheck="false" placeholder="Es. sofia"></label>
      <label class="field">PIN di 6 numeri<span class="row" style="gap:8px"><input class="input sm pin grow" id="s-pin" inputmode="numeric" maxlength="6" required value="${String(Math.floor(100000 + Math.random() * 900000))}"><button type="button" class="btn ghost sm" data-act="gen-pin">Genera</button></span></label>
      <p class="hand" style="margin:0;font-size:21px">niente email, cognome o data di nascita. scrivi il PIN su un foglietto: dopo non si vede più.</p>
      <button class="btn block" type="submit">Crea account</button></form></div>`);
  $("#s-name").addEventListener("input", (e) => { const u = $("#s-user"); if (!u.dataset.touched) u.value = e.target.value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, ""); });
  $("#s-user").addEventListener("input", (e) => (e.target.dataset.touched = "1"));
  $("#stForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const pin = $("#s-pin").value;
      const r = await api("/api/t/students", { method: "POST", body: { name: $("#s-name").value, username: $("#s-user").value, pin } });
      S.cache.shownPin = { ...(S.cache.shownPin || {}), [r.id]: pin };
      toast("Account creato"); await render(); showCard(r.id);
    }
    catch (err) { toast(err.message); }
  });
}

function loadQR() {
  if (window.qrcode) return Promise.resolve();
  return new Promise((ok, ko) => { const sc = document.createElement("script"); sc.src = "/qrcode.js"; sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc); });
}
async function showCard(id) {
  const s = (S.cache.students || []).find((x) => x.id === id); if (!s) return;
  const link = `${location.origin}/?k=${encodeURIComponent(s.login_key || "")}`;
  let svg = "";
  try { await loadQR(); const q = qrcode(0, "M"); q.addData(link); q.make(); svg = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }).replace(/fill="#000000"/g, 'fill="#1235a8"').replace(/fill="#ffffff"/g, 'fill="#fffdf7"'); }
  catch { svg = '<p class="muted">Non riesco a creare il QR: usa il link qui sotto.</p>'; }
  const pin = (S.cache.shownPin || {})[id];
  $("#cardModal")?.remove();
  document.body.insertAdjacentHTML("beforeend", `<div id="cardModal" style="position:fixed;inset:0;background:rgba(13,27,76,.55);z-index:40;display:flex;align-items:center;justify-content:center;padding:16px" data-act="close-card">
    <div class="card stack" style="max-width:380px;width:100%;text-align:center;cursor:default" onclick="event.stopPropagation()">
      <span class="eyebrow blue">Scheda di accesso</span><h2 class="display d-m blue">${esc(s.name)}</h2>
      <div style="width:220px;margin:0 auto">${svg}</div>
      <p style="margin:0"><b>Inquadra con la fotocamera ed entri subito.</b> Se un giorno esci, basta inquadrarlo di nuovo.</p>
      <div class="kpis" style="grid-template-columns:1fr 1fr"><div class="kpi" style="border-color:var(--line)"><span class="small muted">Nome utente</span><b style="font-size:24px">${esc(s.username)}</b></div>
        <div class="kpi" style="border-color:var(--line)"><span class="small muted">PIN</span><b style="font-size:24px">${pin ? esc(pin) : "quello dato"}</b></div></div>
      <p class="small muted" style="margin:0">Il PIN serve solo se entra a mano.${pin ? "" : " Non si può rivedere: se l'ha perso, premi «Nuovo PIN»."} Se il QR finisce in mani sbagliate, premi «Nuovo QR»: quello vecchio smette di funzionare.</p>
      <div class="row wrap" style="gap:8px"><button class="btn ghost sm grow" data-act="copy-link" data-link="${esc(link)}">Copia link</button><button class="btn red sm grow" data-act="new-key" data-id="${s.id}">Nuovo QR</button><button class="btn sm grow" data-act="close-card">Chiudi</button></div>
    </div></div>`);
}

/* ---- dove sbagliano ---- */
async function viewTErrori(root) {
  const st = await students();
  const who = S.cache.anWho || "";
  const [an, notes] = await Promise.all([api(`/api/t/analysis?days=30${who ? "&student=" + who : ""}`), api("/api/t/errors")]);
  const cats = {}; an.byCategory.forEach((r) => { (cats[r.category] ||= { total: 0, by: {} }); cats[r.category].total += r.n; cats[r.category].by[r.user_id] = r.n; });
  const sorted = Object.entries(cats).sort((a, b) => b[1].total - a[1].total);
  const max = Math.max(1, ...an.byCategory.map((r) => r.n));
  const colorOf = (id) => st.find((s) => s.id === id)?.color || "#1235a8";
  const shownSt = who ? st.filter((s) => s.id === who) : st;
  const pct = an.totals.answers ? Math.round((an.totals.right_n / an.totals.answers) * 100) : 0;
  const perStudentTop = shownSt.map((s) => { const c = an.byCategory.filter((r) => r.user_id === s.id).sort((a, b) => b.n - a.n).slice(0, 2).map((r) => r.category.toLowerCase()); return c.length ? `${s.name.toLowerCase()}: ${c.join(" e ")}` : null; }).filter(Boolean);
  shell(root, "#/t/errori", `<div class="spread wrap" style="align-items:flex-end"><div><h1 class="display d-l blue">Dove sbagliano</h1><span class="muted">Compiti e Palestra insieme · ultimi 30 giorni</span></div>
      <div class="seg" style="min-width:260px"><button data-act="an-who" data-id="" aria-pressed="${!who}">Tutte</button>${st.map((s) => `<button data-act="an-who" data-id="${s.id}" aria-pressed="${who === s.id}">${esc(s.name)}</button>`).join("")}</div></div>
    <div class="kpis"><div class="kpi solid"><span class="small">Risposte date</span><b>${an.totals.answers}</b></div><div class="kpi"><span class="small muted">Giuste</span><b style="color:var(--green)">${pct}%</b></div>
      <div class="kpi"><span class="small muted">Errori</span><b style="color:var(--red)">${an.totals.answers - an.totals.right_n}</b></div><div class="kpi"><span class="small muted">In Palestra</span><b>${Math.floor(an.practiceSec / 3600)}h ${Math.round((an.practiceSec % 3600) / 60)}′</b></div></div>
    <div class="cols"><div class="col-wide"><div class="card stack">
      <div class="spread wrap"><h2 class="h">Errori per tipo</h2><div class="legend">${shownSt.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join("")}</div></div>
      ${sorted.length ? `<div class="bars">${sorted.map(([c, v]) => `<span style="font-weight:700">${esc(c)}</span><span class="b">${shownSt.map((s) => `<span style="width:${((v.by[s.id] || 0) / max) * 100}%;background:${colorOf(s.id)}" title="${esc(s.name)}: ${v.by[s.id] || 0}"></span>`).join("")}</span><b class="tnum" style="text-align:right">${v.total}</b>`).join("")}</div>
        ${perStudentTop.length ? `<p class="hand blue" style="margin:4px 0 0">${esc(perStudentTop.join(" · "))}</p>` : ""}` : '<div class="empty">Ancora nessun errore registrato. Arriveranno con i primi compiti.</div>'}
    </div>
    <div class="card stack"><h2 class="h">Errori segnati da te</h2>
      ${notes.length ? notes.map((e) => `<div class="ans"><div><span style="font-size:17px"><span class="wrong">${esc(e.wrong)}</span> → <b class="right">${esc(e.right_form)}</b></span><div class="small muted">${esc(stName(e.student_id) || "Entrambe")} · ${esc(e.category)} · ${esc(fmtDate(e.date))}</div></div>
        <div class="row" style="gap:6px"><button class="btn ${e.solved ? "ghost" : ""} sm" data-act="err-solve" data-id="${e.id}" data-v="${e.solved ? 0 : 1}">${e.solved ? "Riapri" : "Risolto"}</button><button class="link small" data-act="err-del" data-id="${e.id}">Elimina</button></div></div>`).join("") : '<p class="muted" style="margin:0">Aggiungili dalle risposte dei compiti o qui sotto.</p>'}
      <form id="errForm" class="row wrap" style="gap:8px;align-items:flex-end">
        <label class="field grow">Ha detto<input class="input sm" id="e-wrong" required placeholder="Io tengo 14 anni"></label>
        <label class="field grow">Si dice<input class="input sm" id="e-right" required placeholder="Io ho 14 anni"></label>
        <label class="field">Chi<select class="input sm" id="e-who"><option value="">Entrambe</option>${st.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label>
        <label class="field">Tipo<select class="input sm" id="e-cat">${Object.keys(CAT_TIPS).map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
        <button class="btn sm" type="submit">Aggiungi</button></form></div></div>
    <div class="col-narrow">
      <div class="card stack"><h2 class="h">Sbagliano più spesso</h2>${an.top.length ? `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px 12px;font-size:14px;align-items:center">${an.top.map((t) => `<b>${esc(t.expected)} <span class="muted" style="font-weight:400">← «${esc(t.given)}»</span></b><span class="muted">${esc(t.name)}</span><span style="font-weight:700;color:var(--red)">${t.n}×</span>`).join("")}</div>` : '<p class="muted" style="margin:0">Niente per ora.</p>'}</div>
      ${sorted.length ? `<div class="card solid stack"><span class="eyebrow" style="opacity:.85">Per la prossima lezione</span>${sorted.slice(0, 2).map(([c]) => `<p style="margin:0"><b>${esc(c)}:</b> ${esc(CAT_TIPS[c] || CAT_TIPS.Altro)}</p>`).join("")}<a class="btn light" href="#/t/compiti">Assegna un compito</a></div>` : ""}
    </div></div>`);
  $("#errForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    try { await api("/api/t/errors", { method: "POST", body: { wrong: $("#e-wrong").value, right_form: $("#e-right").value, student_id: $("#e-who").value || null, category: $("#e-cat").value } }); toast("Errore aggiunto"); render(); }
    catch (err) { toast(err.message); }
  });
}

/* ---- quaderno: programma, oggi, lezione guidata, registro ---- */
async function notebook() { if (!S.cache.nb) S.cache.nb = await api("/api/t/settings"); return S.cache.nb; }
function nextWeekN() { const d = S.cache.nb?.done || {}; for (const w of WEEKS) if (!d[w.n]) return w.n; return 12; }
async function saveNotebook() { try { await api("/api/t/settings", { method: "PUT", body: S.cache.nb }); } catch (e) { toast(e.message); } }

function weekPlan(w, done) {
  return `<div class="spread wrap" style="align-items:flex-start"><div><span class="eyebrow blue">Settimana ${w.n} di 12</span><h2 class="display d-m">${esc(w.t)}</h2></div>
    <div class="row wrap" style="gap:6px"><button class="btn sm" data-act="open-lez" data-n="${w.n}">Lezione guidata</button><button class="btn ghost sm" data-act="week-done" data-n="${w.n}">${done ? "Segna da rifare" : "Segna completata"}</button></div></div>
    <dl class="plan"><dt>Grammatica</dt><dd>${esc(w.g)}</dd><dt>Lessico</dt><dd>${esc(w.l)}</dd><dt>Attività</dt><dd>${esc(w.a)}</dd></dl>
    <div class="tips"><span class="eyebrow blue">Consigli</span><ul>${w.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`;
}

async function viewTProgramma(root) {
  const nb = await notebook();
  const sel = WEEKS.find((w) => w.n === S.cache.selW) || WEEKS[nextWeekN() - 1];
  shell(root, "#/t/programma", `<h1 class="display d-l blue">Programma</h1>
    <div class="cols"><div class="col-wide">${[[1, 4, "Blocco 1 · Sopravvivenza"], [5, 8, "Blocco 2 · Vita quotidiana e scuola"], [9, 12, "Blocco 3 · Raccontare e studiare"]].map(([a, b, t]) => `<span class="eyebrow muted">${t}</span><div class="weeks">${WEEKS.filter((w) => w.n >= a && w.n <= b).map((w) => `<button class="wk ${nb.done[w.n] ? "done" : ""} ${sel.n === w.n ? "sel" : ""}" data-act="sel-w" data-n="${w.n}">${nb.done[w.n] ? '<span class="stamp">fatto</span>' : ""}<span class="eyebrow blue">Sett. ${w.n}</span><b>${esc(w.t)}</b></button>`).join("")}</div>`).join("")}
      <div class="card stack"><h2 class="h">Promemoria spagnolo / italiano</h2><div class="table-wrap"><table class="t"><thead><tr><th>Italiano</th><th>Español</th><th>Attenzione</th></tr></thead><tbody>
        ${[["burro", "mantequilla", "burro = asino"], ["guardare", "mirar", "guardar = mettere via"], ["salire", "subir", "salir = uscire"], ["caldo", "calor", "caldo = brodo"], ["aceto", "vinagre", "aceite = olio"], ["imbarazzata", "avergonzada", "embarazada = incinta"], ["subito", "enseguida", "súbito = improvviso"], ["largo", "ancho", "largo = lungo"], ["camera", "habitación", "cámara = fotocamera"]].map((r) => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td class="muted">${r[2]}</td></tr>`).join("")}</tbody></table></div></div></div>
    <div class="col-wide card stack" style="flex-basis:380px">${weekPlan(sel, nb.done[sel.n])}</div></div>`);
}

async function viewTOggi(root) {
  const [nb, lessons, errs] = await Promise.all([notebook(), api("/api/t/lessons"), api("/api/t/errors")]);
  await students();
  const w = WEEKS[nextWeekN() - 1];
  const last = lessons[0];
  const open = errs.filter((e) => !e.solved).slice(0, 5);
  shell(root, "#/t/oggi", `<h1 class="display d-l blue">Prossima lezione</h1>
    <div class="cols"><div class="col-wide card stack">${weekPlan(w, nb.done[w.n])}</div>
    <div class="col-narrow">
      <div class="card stack"><h2 class="h">Ultima lezione</h2>${last ? `<span class="muted small">${esc(fmtDate(last.date))} · settimana ${last.week} · ${last.duration} min</span><p style="margin:0">${esc(last.did)}</p>${last.homework ? `<p style="margin:0"><span class="pill green">Compiti</span> ${esc(last.homework)}</p>` : ""}` : '<p class="muted" style="margin:0">Ancora nessuna lezione nel registro.</p>'}</div>
      <div class="card stack"><h2 class="h">Errori da ripassare</h2>${open.length ? open.map((e) => `<div><span class="wrong">${esc(e.wrong)}</span> → <b class="right">${esc(e.right_form)}</b> <span class="small muted">${esc(stName(e.student_id) || "Entrambe")}</span></div>`).join("") : '<p class="muted" style="margin:0">Nessun errore aperto.</p>'}<a href="#/t/errori" class="small">Vedi dove sbagliano</a></div>
    </div></div>`);
}

function lessonSteps(n) {
  const L = LEZ[n], w = WEEKS[n - 1];
  const ex = (s) => { const m = s.match(/^(.*)\(([^)]*)\)\s*$/); return m ? { q: m[1].trim(), a: m[2].trim() } : { q: s, a: "" }; };
  const tr = (s) => { const [q, a] = s.split("|"); return { q, a }; };
  return [
    { min: 10, t: "Riscaldamento", how: "Solo in italiano. Lasciale parlare, correggi poco. Ripassa gli errori aperti.", say: L.warm, errs: true },
    { min: 15, t: "Compiti di scuola", how: "Aprite diario e quaderni. Chiarite le consegne del giorno, fate un esercizio insieme. Le parole nuove vanno nel glossario." },
    { min: 15, t: "Spiegazione: " + w.g.split(".")[0], how: "Spiega in italiano semplice, usa lo spagnolo solo per confrontare.", points: L.spieg },
    { min: 15, t: "Esercizio guidato", how: "Prima a voce, poi per scritto. Una risponde, l'altra controlla.", ex: L.eserc.map(ex) },
    { min: 10, t: "Traduzioni spagnolo ↔ italiano", how: "Prima ES → IT, poi IT → ES.", tr: L.trad.map(tr), trI: L.tradI.map(tr) },
    { min: 15, t: "Attività", how: L.gioco },
    { min: 5, t: "Dettato", how: "Detta lentamente, poi si correggono a vicenda.", dett: L.dett },
    { min: 5, t: "Chiusura", how: "5 parole nuove nel glossario e compito per la prossima volta. Assegna il compito sull'app.", gloss: L.gloss, hw: L.hw },
  ];
}
let lezTimer = null;
async function viewTLezione(root) {
  await notebook();
  if (!S.lez) S.lez = { week: nextWeekN(), step: 0, left: 600, running: false, show: {} };
  const z = S.lez, st = lessonSteps(z.week), cur = st[z.step];
  const errs = (await api("/api/t/errors")).filter((e) => !e.solved).slice(0, 4);
  const body = (s, i) => {
    const sol = !!z.show[i];
    let h = `<p style="margin:0 0 10px">${esc(s.how)}</p>`;
    if (s.say) h += `<span class="eyebrow muted">Domande</span><ul>${s.say.map((q) => `<li>«${esc(q)}»</li>`).join("")}</ul>`;
    if (s.errs && errs.length) h += `<span class="eyebrow muted">Errori da ripassare</span><ul>${errs.map((e) => `<li><span class="wrong">${esc(e.wrong)}</span> → <span class="right">${esc(e.right_form)}</span></li>`).join("")}</ul>`;
    if (s.points) h += `<ol>${s.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ol>`;
    const tog = `<button class="btn ghost sm" data-act="lez-sol" data-i="${i}">${sol ? "Nascondi soluzioni" : "Mostra soluzioni"}</button>`;
    if (s.ex) h += `<ol>${s.ex.map((e) => `<li>${esc(e.q)}${sol ? ` <span class="right">→ ${esc(e.a)}</span>` : ""}</li>`).join("")}</ol>${tog}`;
    if (s.tr) h += `<span class="eyebrow muted">ES → IT</span><ol>${s.tr.map((e) => `<li>${esc(e.q)}${sol ? ` <span class="right">→ ${esc(e.a)}</span>` : ""}</li>`).join("")}</ol><span class="eyebrow muted">IT → ES</span><ol>${s.trI.map((e) => `<li>${esc(e.q)}${sol ? ` <span class="right">→ ${esc(e.a)}</span>` : ""}</li>`).join("")}</ol>${tog}`;
    if (s.dett) h += `<div class="words">${s.dett.map((d) => `<span>${esc(d)}</span>`).join("")}</div>`;
    if (s.gloss) h += `<span class="eyebrow muted">Glossario</span><div class="words">${s.gloss.map((d) => `<span>${esc(d)}</span>`).join("")}</div><p style="margin:10px 0 0"><span class="pill green">Compito</span> ${esc(s.hw)}</p>`;
    return h;
  };
  shell(root, "#/t/lezione", `<h1 class="display d-l blue">Lezione guidata</h1>
    <div class="card lezbar"><label class="field grow" style="min-width:220px">Settimana<select class="input sm" id="lez-week">${WEEKS.map((w) => `<option value="${w.n}" ${w.n === z.week ? "selected" : ""}>${w.n}. ${esc(w.t)}</option>`).join("")}</select></label>
      <div><span class="eyebrow muted">Passo ${z.step + 1} di ${st.length} · ${esc(cur.t.split(":")[0])}</span><div class="bigtime ${z.left < 0 ? "over" : ""}" id="lez-time">${z.left < 0 ? "+" : ""}${fmtClock(Math.abs(z.left))}</div></div>
      <div class="row wrap" style="gap:6px"><button class="btn sm" data-act="lez-run">${z.running ? "Pausa" : "Avvia"}</button><button class="btn ghost sm" data-act="lez-next">${z.step < st.length - 1 ? "Passo successivo" : "Fine lezione"}</button><button class="link small" data-act="lez-reset">Ricomincia</button></div>
      <div class="tline">${st.map((s, i) => `<span style="flex:${s.min}" class="${i < z.step ? "done" : i === z.step ? "now" : ""}"></span>`).join("")}</div></div>
    <div class="steps">${st.map((s, i) => `<section class="step ${i === z.step ? "cur" : ""} ${i < z.step ? "fatto" : ""}"><button class="shead" data-act="lez-go" data-i="${i}"><span class="smin">${s.min}′</span><b class="grow">${i + 1}. ${esc(s.t)}</b>${i < z.step ? '<span class="hand" style="color:var(--green)">fatto</span>' : ""}</button>${i === z.step ? `<div class="sbody">${body(s, i)}</div>` : ""}</section>`).join("")}</div>
    ${z.step === st.length - 1 ? `<div class="card row wrap"><span class="grow">Finita la lezione?</span><a class="btn" href="#/t/registro" data-act="lez-log">Registra la lezione</a><a class="btn ghost" href="#/t/compiti">Assegna il compito</a></div>` : ""}`);
  $("#lez-week").addEventListener("change", (e) => { lezRun(false); S.lez = { week: +e.target.value, step: 0, left: 600, running: false, show: {} }; render(); });
}
function lezRun(on) {
  const z = S.lez; z.running = on; clearInterval(lezTimer);
  if (on) lezTimer = setInterval(() => { z.left -= 1; const el = $("#lez-time"); if (el) { el.textContent = (z.left < 0 ? "+" : "") + fmtClock(Math.abs(z.left)); el.classList.toggle("over", z.left < 0); } if (z.left === 0) toast("Tempo finito per questo passo"); }, 1000);
}

async function viewTRegistro(root) {
  const [st, list] = await Promise.all([students(), api("/api/t/lessons")]);
  await notebook();
  const pre = S.cache.lezPrefill || {};
  shell(root, "#/t/registro", `<h1 class="display d-l blue">Registro</h1>
    <div class="cols"><div class="col-wide card stack"><h2 class="h">Lezioni fatte</h2>
      ${list.length ? list.map((l) => { let notes = {}; try { notes = JSON.parse(l.note_a || "{}"); } catch {} return `<div class="ans"><div class="stack" style="gap:4px"><span class="small muted">${esc(fmtDate(l.date))} · ${l.duration} min · <span class="pill blue">Sett. ${l.week}</span></span><span>${esc(l.did)}</span>
        ${Object.entries(notes).filter(([, v]) => v).map(([id, v]) => `<span class="small"><b>${esc(stName(id) || "Nota")}:</b> ${esc(v)}</span>`).join("")}${l.homework ? `<span class="small"><span class="pill green">Compiti</span> ${esc(l.homework)}</span>` : ""}</div>
        <button class="link small" data-act="del-lesson" data-id="${l.id}">Elimina</button></div>`; }).join("") : '<div class="empty"><span class="hand">il registro è vuoto</span>Registra la prima lezione con il modulo.</div>'}</div>
    <form class="col-narrow card stack" id="lesForm"><h2 class="h">Nuova lezione</h2>
      <div class="row wrap" style="gap:8px"><label class="field grow">Data<input class="input sm" type="date" id="l-date" value="${todayISO()}" required></label><label class="field" style="width:100px">Minuti<input class="input sm" type="number" id="l-dur" value="90" min="15" step="15"></label></div>
      <label class="field">Settimana<select class="input sm" id="l-week">${WEEKS.map((w) => `<option value="${w.n}" ${w.n === (pre.week || nextWeekN()) ? "selected" : ""}>${w.n}. ${esc(w.t)}</option>`).join("")}</select></label>
      <label class="field">Cosa abbiamo fatto<textarea class="input" id="l-did" required>${esc(pre.did || "")}</textarea></label>
      ${st.map((s) => `<label class="field">Note su ${esc(s.name)}<input class="input sm" data-note="${s.id}"></label>`).join("")}
      <label class="field">Compiti dati<input class="input sm" id="l-hw" value="${esc(pre.hw || "")}"></label>
      <label class="check"><input type="checkbox" id="l-close"> Settimana completata</label>
      <button class="btn block" type="submit">Registra lezione</button></form></div>`);
  S.cache.lezPrefill = null;
  $("#lesForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const notes = {}; document.querySelectorAll("[data-note]").forEach((i) => (notes[i.dataset.note] = i.value.trim()));
    const week = +$("#l-week").value;
    try {
      await api("/api/t/lessons", { method: "POST", body: { date: $("#l-date").value, duration: +$("#l-dur").value, week, did: $("#l-did").value, notes, homework: $("#l-hw").value } });
      if ($("#l-close").checked) { S.cache.nb.done[week] = true; await saveNotebook(); }
      toast("Lezione registrata"); render();
    } catch (err) { toast(err.message); }
  });
}

/* ================= router ================= */
async function render() {
  stopTimer();
  const root = $("#app");
  const h = location.hash || "#/";
  try {
    const key = new URLSearchParams(location.search).get("k");
    if (key) {
      history.replaceState(null, "", "/#/");
      try { await api("/api/login-key", { method: "POST", body: { key } }); S.me = null; } catch (e) { toast(e.message); }
    }
    if (!S.me) {
      const st = await api("/api/setup-status").catch(() => ({ needsSetup: false }));
      await loadMe();
      if (!S.me) return viewLogin(root, st.needsSetup);
    }
    if (h === "#/play") return renderPlay(root);
    if (h === "#/fine") return renderDone(root);
    if (S.me.role === "teacher") {
      const views = { "#/t/compiti": viewTCompiti, "#/t/alunne": viewTAlunne, "#/t/errori": viewTErrori, "#/t/programma": viewTProgramma, "#/t/oggi": viewTOggi, "#/t/lezione": viewTLezione, "#/t/registro": viewTRegistro };
      return await (views[h] || viewTCompiti)(root);
    }
    if (h === "#/palestra") return await viewPalestra(root);
    if (h === "#/io") return viewMe(root);
    return await viewStudentHome(root);
  } catch (e) {
    if (S.me) root.innerHTML = `<div class="phone"><main><div class="empty"><span class="hand">ops</span>${esc(e.message)}<br><button class="btn sm" style="margin-top:12px" data-act="reload">Riprova</button></div></main></div>`;
  }
}

/* ================= events ================= */
document.addEventListener("click", async (ev) => {
  const t = ev.target.closest("[data-act]"); if (!t) return;
  const act = t.dataset.act, id = t.dataset.id;
  const p = S.play;
  try {
    switch (act) {
      case "reload": render(); break;
      case "logout": await api("/api/logout", { method: "POST" }).catch(() => {}); S.me = null; S.cache = {}; go("#/"); break;
      /* student */
      case "start-compito": await startCompito(id); break;
      case "start-unit": startUnit(t.dataset.unit); break;
      case "start-review": startPlay({ kind: "palestra", ids: shuffle(S.cache.reviewIds).slice(0, 10), meta: { unit: "ripasso" } }); break;
      case "quit":
        if (t.dataset.confirm) { stopTimer(); S.play = null; go(p?.kind === "palestra" ? "#/palestra" : "#/"); }
        else { t.dataset.confirm = "1"; toast(p?.kind === "compito" ? "Premi ancora per uscire: il compito resta salvato e il tempo continua" : "Premi ancora per uscire dal livello"); setTimeout(() => delete t.dataset.confirm, 3000); }
        break;
      case "check": answer($("#ans").value); break;
      case "skip": answer("", { skip: true }); break;
      case "say": say(EX[p.ids[p.i]].a, 0.85); break;
      case "say-slow": say(EX[p.ids[p.i]].a, 0.5); break;
      case "say-text": say(t.dataset.text, 0.85); break;
      case "choose": {
        if (p.phase !== "answer") break;
        const it = EX[p.ids[p.i]]; const val = p.optOrder[+t.dataset.k];
        document.querySelectorAll(".opt").forEach((b) => { b.disabled = true; const v = p.optOrder[+b.dataset.k]; if (v === p.cv.correct) b.classList.add("ok"); else if (b === t) b.classList.add("ko"); });
        answer(val); break;
      }
      case "mleft": p.match.sel = t.dataset.w; renderItem($("#ex"), EX[p.ids[p.i]]); break;
      case "mright": {
        const M = p.match, it = EX[p.ids[p.i]];
        if (!M.sel) { toast("Prima scegli una parola italiana"); break; }
        const pair = it.pairs.find((x) => x[0] === M.sel);
        if (pair[1] === t.dataset.w) { if (M.done.length + 1 < it.pairs.length) sfx("ok"); M.done.push(M.sel); M.sel = null; renderItem($("#ex"), it); if (M.done.length === it.pairs.length) answer("", { mistakes: M.mistakes.length, wrongs: M.mistakes }); }
        else { sfx("ko"); M.mistakes.push(`${M.sel}≠${t.dataset.w}`); t.classList.add("ko"); const n = $("#mnote"); if (n) n.textContent = `no! ${M.sel} = ${pair[1]}`; setTimeout(() => t.classList.remove("ko"), 700); }
        break;
      }
      case "next": p.phase = "answer"; p.i += 1; p.match = null; persistPlay(); if (p.i >= p.ids.length) finishPlay(); else renderPlay($("#app")); window.scrollTo(0, 0); break;
      case "retry-finish": finishPlay(); break;
      /* teacher */
      case "toggle-st": { const f = S.cache.assignForm; f.ids = f.ids.includes(id) ? f.ids.filter((x) => x !== id) : [...f.ids, id]; t.setAttribute("aria-pressed", f.ids.includes(id)); break; }
      case "minutes": S.cache.assignForm.minutes = +t.dataset.m; t.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b === t)); break;
      case "sel-a": S.cache.selA = id; render(); break;
      case "del-a": if (t.dataset.confirm) { await api(`/api/t/assignments/${id}`, { method: "DELETE" }); S.cache.selA = null; toast("Compito eliminato"); render(); } else { t.dataset.confirm = "1"; t.textContent = "Conferma eliminazione"; } break;
      case "verdict": await api(`/api/t/answers/${id}/verdict`, { method: "POST", body: { verdict: t.dataset.v } }); toast(t.dataset.v === "ok" ? "Risposta accettata" : "Segnata come sbagliata"); render(); break;
      case "add-err": {
        const r = (S.cache.answers || []).find((x) => x.id === id);
        await api("/api/t/errors", { method: "POST", body: { wrong: r.given, right_form: r.expected, student_id: r.user_id, category: r.category, note: r.prompt } });
        t.replaceWith(Object.assign(document.createElement("span"), { className: "pill redsoft", textContent: "Negli errori" })); toast("Aggiunto agli errori"); break;
      }
      case "gen-pin": $("#s-pin").value = String(Math.floor(100000 + Math.random() * 900000)); break;
      case "new-pin": {
        const pin = String(Math.floor(100000 + Math.random() * 900000));
        await api(`/api/t/students/${id}/pin`, { method: "POST", body: { pin } });
        S.cache.shownPin = { ...(S.cache.shownPin || {}), [id]: pin }; await render(); showCard(id); break;
      }
      case "card": showCard(id); break;
      case "new-key":
        if (!t.dataset.confirm) { t.dataset.confirm = "1"; t.textContent = "Sicuro? Il vecchio non va più"; break; }
        { const r = await api(`/api/t/students/${id}/key`, { method: "POST" }); const st = (S.cache.students || []).find((x) => x.id === id); if (st) st.login_key = r.login_key; showCard(id); toast("Nuovo QR creato"); }
        break;
      case "close-card": $("#cardModal")?.remove(); break;
      case "copy-link": navigator.clipboard?.writeText(t.dataset.link).then(() => toast("Link copiato"), () => toast(t.dataset.link)); break;
      case "toggle-active": await api(`/api/t/students/${id}/active`, { method: "POST", body: { active: t.dataset.on === "1" } }); render(); break;
      case "an-who": S.cache.anWho = id || ""; render(); break;
      case "err-solve": await api(`/api/t/errors/${id}`, { method: "PATCH", body: { solved: t.dataset.v === "1" } }); render(); break;
      case "err-del": if (t.dataset.confirm) { await api(`/api/t/errors/${id}`, { method: "DELETE" }); render(); } else { t.dataset.confirm = "1"; t.textContent = "Conferma"; } break;
      case "sel-w": S.cache.selW = +t.dataset.n; render(); break;
      case "week-done": { const n = +t.dataset.n; S.cache.nb.done[n] = !S.cache.nb.done[n]; await saveNotebook(); toast(S.cache.nb.done[n] ? `Settimana ${n} completata` : `Settimana ${n} riaperta`); render(); break; }
      case "open-lez": lezRun(false); S.lez = { week: +t.dataset.n, step: 0, left: 600, running: false, show: {} }; go("#/t/lezione"); break;
      case "lez-run": lezRun(!S.lez.running); t.textContent = S.lez.running ? "Pausa" : "Avvia"; break;
      case "lez-next": { const st = lessonSteps(S.lez.week); if (S.lez.step < st.length - 1) { S.lez.step++; S.lez.left = st[S.lez.step].min * 60; toast(st[S.lez.step].t); } else { lezRun(false); toast("Lezione finita"); } render(); break; }
      case "lez-go": { const i = +t.dataset.i; if (i !== S.lez.step) { S.lez.step = i; S.lez.left = lessonSteps(S.lez.week)[i].min * 60; render(); } break; }
      case "lez-reset": lezRun(false); S.lez = { week: S.lez.week, step: 0, left: 600, running: false, show: {} }; render(); break;
      case "lez-sol": S.lez.show[+t.dataset.i] = !S.lez.show[+t.dataset.i]; render(); break;
      case "lez-log": { lezRun(false); const w = WEEKS[S.lez.week - 1]; S.cache.lezPrefill = { week: w.n, did: `Lezione guidata settimana ${w.n}: ${w.t}. ${w.g}`, hw: LEZ[w.n].hw }; break; }
      case "del-lesson": if (t.dataset.confirm) { await api(`/api/t/lessons/${id}`, { method: "DELETE" }); render(); } else { t.dataset.confirm = "1"; t.textContent = "Conferma"; } break;
    }
  } catch (e) { toast(e.message); }
});

document.addEventListener("change", (e) => { if (e.target.id === "snd") { ls.set("sounds", e.target.checked); if (e.target.checked) sfx("ok"); } });
window.addEventListener("hashchange", render);
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
if (window.speechSynthesis) window.speechSynthesis.getVoices();
render();
