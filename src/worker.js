// Compiti di Italiano: API on Cloudflare Workers + D1.
// Static files (public/) are served by the assets binding; only /api/* reaches this code.

const SESSION_DAYS = 60;
const enc = new TextEncoder();

/* ---------------- helpers ---------------- */
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const fail = (status, message) => json({ error: message }, status);
const uid = () => crypto.randomUUID();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const now = () => new Date().toISOString();
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" }); // YYYY-MM-DD

async function hashSecret(secret, saltB64) {
  const salt = saltB64 ? Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0)) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  return { hash: b64(bits), salt: b64(salt) };
}
async function sha256(text) { return b64(await crypto.subtle.digest("SHA-256", enc.encode(text))); }
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function cookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}
async function body(req) { try { return await req.json(); } catch { return {}; } }
const cleanUser = (s) => String(s || "").trim().toLowerCase();
const newKey = () => b64(crypto.getRandomValues(new Uint8Array(18))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const validUsername = (s) => /^[a-z0-9._-]{3,24}$/.test(s);

/* ---------------- auth ---------------- */
async function currentUser(req, env) {
  const token = cookie(req, "sid");
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT u.id, u.role, u.name, u.username, u.color, u.active, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?"
  ).bind(await sha256(token)).first();
  if (!row || !row.active || row.expires_at < now()) return null;
  return row;
}
async function startSession(env, userId) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, "");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now()),
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(token), userId, expires),
    env.DB.prepare("UPDATE users SET last_login = ? WHERE id = ?").bind(now(), userId),
  ]);
  return `sid=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

/* ---------------- voice ---------------- */
let voiceId = null;
async function pickVoice(env) {
  if (env.ELEVENLABS_VOICE_ID) return env.ELEVENLABS_VOICE_ID;
  if (voiceId) return voiceId;
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": env.ELEVENLABS_API_KEY } });
    const { voices = [] } = await r.json();
    const it = voices.find((v) => (v.verified_languages || []).some((l) => l.language === "it") || /ital/i.test(JSON.stringify(v.labels || {})));
    voiceId = (it || voices.find((v) => v.category === "premade") || voices[0])?.voice_id;
  } catch (e) { console.error("voices", e); }
  return voiceId || "21m00Tcm4TlvDq8ikWAM";
}

/* ---------------- stats (streak / xp) ---------------- */
async function bumpStats(env, userId, xp, seconds) {
  const s = await env.DB.prepare("SELECT * FROM stats WHERE user_id = ?").bind(userId).first();
  const d = today();
  const y = new Date(Date.now() - 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  let streak = 1;
  if (s) streak = s.last_day === d ? s.streak : s.last_day === y ? s.streak + 1 : 1;
  await env.DB.prepare(
    `INSERT INTO stats (user_id, xp, streak, last_day, practice_sec) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET xp = xp + excluded.xp, streak = excluded.streak, last_day = excluded.last_day, practice_sec = practice_sec + excluded.practice_sec`
  ).bind(userId, xp, streak, d, seconds).run();
}

function answerStatements(env, userId, source, assignmentId, answers) {
  return (answers || []).slice(0, 60).map((a) =>
    env.DB.prepare(
      "INSERT INTO answers (id, user_id, source, assignment_id, exercise_id, category, prompt, given, expected, correct, needs_review) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(uid(), userId, source, assignmentId, String(a.exercise_id || "").slice(0, 80), String(a.category || "Altro").slice(0, 40),
      String(a.prompt || "").slice(0, 300), String(a.given || "").slice(0, 300), String(a.expected || "").slice(0, 300),
      a.correct ? 1 : 0, a.needs_review ? 1 : 0)
  );
}

/* ---------------- routes ---------------- */
async function api(req, env, url) {
  const path = url.pathname.replace(/\/+$/, "");
  const method = req.method;
  const DB = env.DB;

  // Same-origin check for state-changing requests.
  if (method !== "GET") {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== url.host) return fail(403, "Richiesta non permessa");
  }

  /* --- public --- */
  if (path === "/api/setup-status" && method === "GET") {
    const t = await DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'teacher'").first();
    return json({ needsSetup: t.n === 0 });
  }
  if (path === "/api/setup" && method === "POST") {
    const t = await DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'teacher'").first();
    if (t.n > 0) return fail(403, "L'insegnante esiste già");
    const b = await body(req);
    const username = cleanUser(b.username);
    if (!validUsername(username)) return fail(400, "Nome utente: 3-24 caratteri, lettere minuscole, numeri, punto o trattino");
    if (String(b.password || "").length < 8) return fail(400, "La password deve avere almeno 8 caratteri");
    const name = String(b.name || "").trim().slice(0, 40) || "Insegnante";
    const { hash, salt } = await hashSecret(String(b.password));
    const id = uid();
    await DB.prepare("INSERT INTO users (id, role, name, username, pass_hash, pass_salt) VALUES (?, 'teacher', ?, ?, ?, ?)").bind(id, name, username, hash, salt).run();
    return json({ ok: true }, 200, { "set-cookie": await startSession(env, id) });
  }
  if (path === "/api/login" && method === "POST") {
    const b = await body(req);
    const username = cleanUser(b.username);
    const u = await DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
    const secret = String(b.password || "");
    if (!u) { await hashSecret(secret); return fail(401, "Nome utente o PIN sbagliato"); }
    const { hash } = await hashSecret(secret, u.pass_salt);
    if (!safeEqual(hash, u.pass_hash)) return fail(401, "Nome utente o PIN sbagliato");
    if (!u.active) return fail(403, "Accesso sospeso: chiedi a chi ti segue");
    return json({ ok: true, role: u.role }, 200, { "set-cookie": await startSession(env, u.id) });
  }
  if (path === "/api/login-key" && method === "POST") {
    const b = await body(req);
    const key = String(b.key || "");
    const u = key.length >= 20 ? await DB.prepare("SELECT id, active FROM users WHERE login_key = ? AND role = 'student'").bind(key).first() : null;
    if (!u) return fail(401, "Questo QR non funziona più: chiedi a Nad quello nuovo");
    if (!u.active) return fail(403, "Accesso sospeso: chiedi a chi ti segue");
    return json({ ok: true, role: "student" }, 200, { "set-cookie": await startSession(env, u.id) });
  }
  if (path === "/api/voice-status" && method === "GET") {
    const out = { key: !!env.ELEVENLABS_API_KEY, voice: env.ELEVENLABS_VOICE_ID || null, model: env.ELEVENLABS_MODEL || null };
    if (out.key) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(await pickVoice(env))}?output_format=mp3_22050_32`, {
        method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({ text: "ciao", model_id: env.ELEVENLABS_MODEL || "eleven_multilingual_v2" }),
      });
      out.ttsCheck = r.status;
      if (!r.ok) { try { const j = await r.json(); out.detail = (j.detail && (j.detail.status || j.detail.message)) || null; } catch {} }
      else out.bytes = (await r.arrayBuffer()).byteLength;
    }
    return json(out);
  }
  if (path === "/api/logout" && method === "POST") {
    const token = cookie(req, "sid");
    if (token) await DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
    return json({ ok: true }, 200, { "set-cookie": "sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
  }

  const me = await currentUser(req, env);
  if (!me) return fail(401, "Devi entrare di nuovo");

  if (path === "/api/me" && method === "GET") {
    const stats = await DB.prepare("SELECT xp, streak, last_day, practice_sec FROM stats WHERE user_id = ?").bind(me.id).first();
    return json({ user: { id: me.id, role: me.role, name: me.name, username: me.username, color: me.color }, stats: stats || { xp: 0, streak: 0, last_day: null, practice_sec: 0 } });
  }

  /* --- voice (ElevenLabs), any logged-in user --- */
  if (path === "/api/tts" && method === "GET") {
    const text = String(url.searchParams.get("t") || "").trim().slice(0, 160);
    const slow = url.searchParams.get("slow") === "1";
    if (!text) return fail(400, "Testo mancante");
    if (!env.ELEVENLABS_API_KEY) return fail(503, "Voce non configurata");
    const cacheKey = new Request(`https://tts.cache/${slow ? "s" : "n"}/${encodeURIComponent(text)}`);
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
    const voice = await pickVoice(env);
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
        ...(/flash|turbo/.test(env.ELEVENLABS_MODEL || "") ? { language_code: "it" } : {}),
        voice_settings: { stability: 0.6, similarity_boost: 0.8, speed: slow ? 0.75 : 0.95 } }),
    });
    if (!r.ok) { console.error("tts", r.status, await r.text()); return fail(502, "La voce non risponde"); }
    const res = new Response(r.body, { headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=31536000" } });
    await cache.put(cacheKey, res.clone());
    return res;
  }

  /* --- student --- */
  if (path === "/api/my/assignments" && method === "GET") {
    const r = await DB.prepare("SELECT * FROM assignments WHERE student_id = ? ORDER BY created_at DESC LIMIT 60").bind(me.id).all();
    return json(r.results);
  }
  let m = path.match(/^\/api\/my\/assignments\/([\w-]+)\/(start|finish)$/);
  if (m && method === "POST") {
    const a = await DB.prepare("SELECT * FROM assignments WHERE id = ? AND student_id = ?").bind(m[1], me.id).first();
    if (!a) return fail(404, "Compito non trovato");
    if (m[2] === "start") {
      if (!a.started_at) await DB.prepare("UPDATE assignments SET started_at = ?, status = 'iniziato' WHERE id = ?").bind(now(), a.id).run();
      return json({ ok: true });
    }
    if (a.status === "fatto") return fail(409, "Compito già consegnato");
    const b = await body(req);
    const answers = Array.isArray(b.answers) ? b.answers : [];
    const score = answers.filter((x) => x.correct).length;
    await DB.batch([
      ...answerStatements(env, me.id, "compito", a.id, answers),
      DB.prepare("UPDATE assignments SET status = 'fatto', completed_at = ?, score = ?, total = ?, duration_sec = ? WHERE id = ?")
        .bind(now(), score, answers.length, Math.max(0, Math.min(7200, Number(b.duration_sec) || 0)), a.id),
    ]);
    await bumpStats(env, me.id, score * 5, 0);
    return json({ ok: true, score, total: answers.length });
  }
  if (path === "/api/my/review" && method === "GET") {
    // Exercises answered wrong whose latest attempt is still wrong.
    const r = await DB.prepare(
      `SELECT exercise_id, category, prompt, expected, given, MAX(created_at) AS last FROM answers a WHERE user_id = ?
       AND correct = 0 AND NOT EXISTS (SELECT 1 FROM answers b WHERE b.user_id = a.user_id AND b.exercise_id = a.exercise_id AND b.correct = 1 AND b.created_at > a.created_at)
       GROUP BY exercise_id ORDER BY last DESC LIMIT 30`
    ).bind(me.id).all();
    return json(r.results);
  }
  if (path === "/api/my/practice" && method === "GET") {
    const p = await DB.prepare("SELECT unit_id, level FROM practice WHERE user_id = ?").bind(me.id).all();
    const s = await DB.prepare("SELECT xp, streak, last_day FROM stats WHERE user_id = ?").bind(me.id).first();
    return json({ units: Object.fromEntries(p.results.map((r) => [r.unit_id, r.level])), stats: s || { xp: 0, streak: 0 } });
  }
  if (path === "/api/my/practice/finish" && method === "POST") {
    const b = await body(req);
    const unit = String(b.unit_id || "").slice(0, 40);
    const answers = Array.isArray(b.answers) ? b.answers : [];
    const right = answers.filter((x) => x.correct).length;
    const stmts = answerStatements(env, me.id, "palestra", null, answers);
    if (unit && unit !== "ripasso" && b.passed) {
      stmts.push(DB.prepare(
        "INSERT INTO practice (user_id, unit_id, level) VALUES (?, ?, 1) ON CONFLICT(user_id, unit_id) DO UPDATE SET level = MIN(level + 1, 5)"
      ).bind(me.id, unit));
    }
    if (stmts.length) await DB.batch(stmts);
    const xp = right * 10;
    await bumpStats(env, me.id, xp, Math.max(0, Math.min(3600, Number(b.duration_sec) || 0)));
    const s = await DB.prepare("SELECT xp, streak FROM stats WHERE user_id = ?").bind(me.id).first();
    return json({ ok: true, xp, stats: s });
  }

  /* --- teacher only below --- */
  if (!path.startsWith("/api/t/")) return fail(404, "Non trovato");
  if (me.role !== "teacher") return fail(403, "Solo per l'insegnante");

  if (path === "/api/t/students" && method === "GET") {
    const missing = await DB.prepare("SELECT id FROM users WHERE role = 'student' AND login_key IS NULL").all();
    if (missing.results.length) await DB.batch(missing.results.map((m) => DB.prepare("UPDATE users SET login_key = ? WHERE id = ?").bind(newKey(), m.id)));
    const r = await DB.prepare(
      `SELECT u.id, u.name, u.username, u.color, u.active, u.last_login, u.created_at, u.login_key,
        (SELECT COUNT(*) FROM assignments a WHERE a.student_id = u.id) AS assigned,
        (SELECT COUNT(*) FROM assignments a WHERE a.student_id = u.id AND a.status = 'fatto') AS done,
        (SELECT ROUND(100.0 * SUM(correct) / COUNT(*)) FROM answers x WHERE x.user_id = u.id) AS accuracy,
        s.xp, s.streak, s.practice_sec
       FROM users u LEFT JOIN stats s ON s.user_id = u.id WHERE u.role = 'student' ORDER BY u.created_at`
    ).all();
    return json(r.results);
  }
  if (path === "/api/t/students" && method === "POST") {
    const b = await body(req);
    const username = cleanUser(b.username);
    const pin = String(b.pin || "");
    if (!validUsername(username)) return fail(400, "Nome utente: 3-24 caratteri, lettere minuscole, numeri, punto o trattino");
    if (!/^\d{6}$/.test(pin)) return fail(400, "Il PIN deve avere 6 numeri");
    const name = String(b.name || "").trim().slice(0, 30);
    if (!name) return fail(400, "Scrivi il nome");
    const exists = await DB.prepare("SELECT 1 FROM users WHERE username = ?").bind(username).first();
    if (exists) return fail(409, "Questo nome utente esiste già");
    const { hash, salt } = await hashSecret(pin);
    const colors = ["#1235a8", "#e39a3b", "#2b7a4b", "#8a3fb0"];
    const n = await DB.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'student'").first();
    const newId = uid();
    await DB.prepare("INSERT INTO users (id, role, name, username, pass_hash, pass_salt, color, login_key) VALUES (?, 'student', ?, ?, ?, ?, ?, ?)")
      .bind(newId, name, username, hash, salt, colors[n.n % colors.length], newKey()).run();
    return json({ ok: true, id: newId });
  }
  m = path.match(/^\/api\/t\/students\/([\w-]+)\/key$/);
  if (m && method === "POST") {
    const st = await DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'student'").bind(m[1]).first();
    if (!st) return fail(404, "Alunna non trovata");
    const key = newKey();
    await DB.prepare("UPDATE users SET login_key = ? WHERE id = ?").bind(key, st.id).run();
    return json({ ok: true, login_key: key });
  }
  m = path.match(/^\/api\/t\/students\/([\w-]+)\/(pin|active)$/);
  if (m && method === "POST") {
    const b = await body(req);
    const st = await DB.prepare("SELECT id FROM users WHERE id = ? AND role = 'student'").bind(m[1]).first();
    if (!st) return fail(404, "Alunna non trovata");
    if (m[2] === "pin") {
      const pin = String(b.pin || "");
      if (!/^\d{6}$/.test(pin)) return fail(400, "Il PIN deve avere 6 numeri");
      const { hash, salt } = await hashSecret(pin);
      await DB.batch([
        DB.prepare("UPDATE users SET pass_hash = ?, pass_salt = ? WHERE id = ?").bind(hash, salt, st.id),
        DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(st.id),
      ]);
    } else {
      const active = b.active ? 1 : 0;
      const stmts = [DB.prepare("UPDATE users SET active = ? WHERE id = ?").bind(active, st.id)];
      if (!active) stmts.push(DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(st.id));
      await DB.batch(stmts);
    }
    return json({ ok: true });
  }

  if (path === "/api/t/assignments" && method === "GET") {
    const r = await DB.prepare(
      `SELECT a.*, u.name AS student_name, u.color AS student_color,
        (SELECT COUNT(*) FROM answers x WHERE x.assignment_id = a.id AND x.needs_review = 1 AND x.teacher_verdict IS NULL) AS to_review
       FROM assignments a JOIN users u ON u.id = a.student_id ORDER BY a.created_at DESC LIMIT 200`
    ).all();
    return json(r.results);
  }
  if (path === "/api/t/assignments" && method === "POST") {
    const b = await body(req);
    const ids = Array.isArray(b.student_ids) ? b.student_ids : [];
    const week = Math.max(1, Math.min(12, Number(b.week) || 1));
    const minutes = Number(b.minutes) === 10 ? 10 : 20;
    if (!ids.length) return fail(400, "Scegli almeno un'alunna");
    const stmts = ids.slice(0, 10).map((sid) =>
      DB.prepare("INSERT INTO assignments (id, student_id, week, minutes, include_review, due_date, note) SELECT ?, id, ?, ?, ?, ?, ? FROM users WHERE id = ? AND role = 'student'")
        .bind(uid(), week, minutes, b.include_review ? 1 : 0, b.due_date || null, String(b.note || "").slice(0, 200) || null, sid)
    );
    await DB.batch(stmts);
    return json({ ok: true });
  }
  m = path.match(/^\/api\/t\/assignments\/([\w-]+)$/);
  if (m && method === "DELETE") {
    await DB.batch([
      DB.prepare("DELETE FROM answers WHERE assignment_id = ?").bind(m[1]),
      DB.prepare("DELETE FROM assignments WHERE id = ?").bind(m[1]),
    ]);
    return json({ ok: true });
  }
  m = path.match(/^\/api\/t\/assignments\/([\w-]+)\/answers$/);
  if (m && method === "GET") {
    const r = await DB.prepare("SELECT * FROM answers WHERE assignment_id = ? ORDER BY created_at").bind(m[1]).all();
    return json(r.results);
  }
  m = path.match(/^\/api\/t\/answers\/([\w-]+)\/verdict$/);
  if (m && method === "POST") {
    const b = await body(req);
    const ok = b.verdict === "ok";
    const ans = await DB.prepare("SELECT assignment_id FROM answers WHERE id = ?").bind(m[1]).first();
    if (!ans) return fail(404, "Risposta non trovata");
    const stmts = [DB.prepare("UPDATE answers SET teacher_verdict = ?, correct = ? WHERE id = ?").bind(ok ? "ok" : "wrong", ok ? 1 : 0, m[1])];
    if (ans.assignment_id) stmts.push(DB.prepare("UPDATE assignments SET score = (SELECT SUM(correct) FROM answers WHERE assignment_id = ?) WHERE id = ?").bind(ans.assignment_id, ans.assignment_id));
    await DB.batch(stmts);
    return json({ ok: true });
  }

  if (path === "/api/t/analysis" && method === "GET") {
    const days = Math.max(1, Math.min(365, Number(url.searchParams.get("days")) || 30));
    const since = new Date(Date.now() - days * 864e5).toISOString().replace("T", " ").slice(0, 19);
    const student = url.searchParams.get("student");
    const filt = student ? " AND a.user_id = ?" : "";
    const bind = (q) => (student ? q.bind(since, student) : q.bind(since));
    const totals = await bind(DB.prepare(`SELECT COUNT(*) AS answers, COALESCE(SUM(correct),0) AS right_n FROM answers a WHERE created_at >= ?${filt}`)).first();
    const byCat = await bind(DB.prepare(`SELECT a.category, a.user_id, u.name, COUNT(*) AS n FROM answers a JOIN users u ON u.id = a.user_id WHERE a.correct = 0 AND a.created_at >= ?${filt} GROUP BY a.category, a.user_id`)).all();
    const top = await bind(DB.prepare(`SELECT a.expected, a.given, a.category, u.name, COUNT(*) AS n FROM answers a JOIN users u ON u.id = a.user_id WHERE a.correct = 0 AND a.created_at >= ?${filt} GROUP BY a.expected, a.user_id ORDER BY n DESC LIMIT 12`)).all();
    const practice = await DB.prepare(student ? "SELECT COALESCE(SUM(practice_sec),0) AS s FROM stats WHERE user_id = ?" : "SELECT COALESCE(SUM(practice_sec),0) AS s FROM stats").bind(...(student ? [student] : [])).first();
    return json({ days, totals, byCategory: byCat.results, top: top.results, practiceSec: practice.s });
  }

  /* --- quaderno (teacher notebook) --- */
  if (path === "/api/t/lessons" && method === "GET") return json((await DB.prepare("SELECT * FROM lessons ORDER BY date DESC, created_at DESC").all()).results);
  if (path === "/api/t/lessons" && method === "POST") {
    const b = await body(req);
    await DB.prepare("INSERT INTO lessons (id, date, week, duration, did, note_a, homework) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(uid(), b.date || today(), Number(b.week) || 1, Number(b.duration) || 90, String(b.did || "").slice(0, 2000), JSON.stringify(b.notes || {}), String(b.homework || "").slice(0, 500)).run();
    return json({ ok: true });
  }
  m = path.match(/^\/api\/t\/lessons\/([\w-]+)$/);
  if (m && method === "DELETE") { await DB.prepare("DELETE FROM lessons WHERE id = ?").bind(m[1]).run(); return json({ ok: true }); }

  if (path === "/api/t/errors" && method === "GET") return json((await DB.prepare("SELECT * FROM teacher_errors ORDER BY date DESC").all()).results);
  if (path === "/api/t/errors" && method === "POST") {
    const b = await body(req);
    if (!b.wrong || !b.right_form) return fail(400, "Scrivi l'errore e la forma corretta");
    await DB.prepare("INSERT INTO teacher_errors (id, student_id, category, wrong, right_form, note) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(uid(), b.student_id || null, String(b.category || "Altro").slice(0, 40), String(b.wrong).slice(0, 300), String(b.right_form).slice(0, 300), String(b.note || "").slice(0, 300) || null).run();
    return json({ ok: true });
  }
  m = path.match(/^\/api\/t\/errors\/([\w-]+)$/);
  if (m && method === "PATCH") { const b = await body(req); await DB.prepare("UPDATE teacher_errors SET solved = ? WHERE id = ?").bind(b.solved ? 1 : 0, m[1]).run(); return json({ ok: true }); }
  if (m && method === "DELETE") { await DB.prepare("DELETE FROM teacher_errors WHERE id = ?").bind(m[1]).run(); return json({ ok: true }); }

  if (path === "/api/t/settings" && method === "GET") {
    const r = await DB.prepare("SELECT value FROM settings WHERE key = 'notebook'").first();
    return json(r ? JSON.parse(r.value) : { done: {} });
  }
  if (path === "/api/t/settings" && method === "PUT") {
    const b = await body(req);
    await DB.prepare("INSERT INTO settings (key, value) VALUES ('notebook', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(JSON.stringify({ done: b.done || {} })).run();
    return json({ ok: true });
  }

  return fail(404, "Non trovato");
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      try { return await api(req, env, url); }
      catch (e) { console.error(e); return fail(500, "Errore del server, riprova"); }
    }
    return env.ASSETS.fetch(req);
  },
};
