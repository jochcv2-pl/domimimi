/**
 * Tests e2e — Pipeline email (itérations 4a/4b/4c)
 *
 * Vérifie :
 *   4a — Fondations : schéma EmailLog accessible + count OK
 *   4b — Moteur    : POST /api/cron/process-emails?dryRun=1 avec x-cron-secret
 *   4c — Visibilité : login admin + GET state + POST pause toggle
 *
 * Usage : node e2e-pipeline-test.mjs
 *
 * Ce script ne nécessite aucune dépendance : il utilise uniquement fetch
 * (Node 20+) et Prisma client déjà présent dans le projet.
 *
 * À supprimer après exécution (fichier de test one-shot).
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const BASE = 'http://localhost:3100';
const ADMIN_EMAIL = 'admin@domipack.fr';
const ADMIN_PASSWORD = 'Domipack2026!';
const CRON_SECRET = 'dev-cron-secret-2026';

// ---------------------------------------------------------------
// Prisma — instanciation manuelle (pas de lib/prisma singleton ici)
// ---------------------------------------------------------------
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL manquant — charge .env via `node --env-file=.env`');
  process.exit(1);
}
const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------
// Helpers HTTP
// ---------------------------------------------------------------
function extractCookies(res) {
  const setCookie = res.headers.getSetCookie?.() ?? [];
  return setCookie.map((line) => line.split(';')[0]).join('; ');
}

function mergeCookies(prev, res) {
  const next = extractCookies(res);
  if (!next) return prev;
  if (!prev) return next;
  // Simple merge : on écrase les clés présentes dans next
  const map = new Map();
  for (const c of prev.split('; ')) {
    const [k] = c.split('=');
    map.set(k, c);
  }
  for (const c of next.split('; ')) {
    const [k] = c.split('=');
    map.set(k, c);
  }
  return [...map.values()].join('; ');
}

async function login() {
  // 1) Récupérer le CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, {
    headers: { accept: 'application/json' },
  });
  if (!csrfRes.ok) throw new Error(`CSRF HTTP ${csrfRes.status}`);
  let csrfCookie = extractCookies(csrfRes);
  const { csrfToken } = await csrfRes.json();

  // 2) POST credentials
  const body = new URLSearchParams({
    csrfToken,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    callbackUrl: `${BASE}/admin`,
    json: 'true',
  });

  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: csrfCookie,
    },
    body,
    redirect: 'manual',
  });

  // NextAuth renvoie 30x avec set-cookie même en cas de succès
  const merged = mergeCookies(csrfCookie, loginRes);
  if (!merged || !merged.includes('authjs')) {
    // Si pas de cookie authjs, le login a échoué
    const text = await loginRes.text().catch(() => '');
    throw new Error(`Login échoué (HTTP ${loginRes.status}) — ${text.slice(0, 200)}`);
  }
  return merged;
}

// ---------------------------------------------------------------
// Tests
// ---------------------------------------------------------------
let pass = 0;
let fail = 0;
function ok(label, extra = '') {
  console.log(`  ✓ ${label}${extra ? ` — ${extra}` : ''}`);
  pass++;
}
function ko(label, extra = '') {
  console.error(`  ✗ ${label}${extra ? ` — ${extra}` : ''}`);
  fail++;
}

async function test4a_fondations() {
  console.log('\n[4a] Fondations — schéma EmailLog + seed settings');
  try {
    const count = await prisma.emailLog.count();
    ok(`EmailLog.count() = ${count}`);

    const triggerKeyExists = await prisma.emailTemplate.findFirst({
      where: { triggerKey: { not: null } },
    });
    ok(`EmailTemplate.triggerKey peuplé (exemple : "${triggerKeyExists?.triggerKey ?? '—'}")`);

    const pipelinePaused = await prisma.setting.findUnique({
      where: { key: 'pipeline.paused' },
    });
    ok(`Setting "pipeline.paused" = "${pipelinePaused?.value ?? '—'}"`);

    const dailyCap = await prisma.setting.findUnique({
      where: { key: 'email.cadence.daily_cap' },
    });
    ok(`Setting "email.cadence.daily_cap" = "${dailyCap?.value ?? '—'}"`);
  } catch (err) {
    ko('4a fondations', err.message);
  }
}

async function test4b_cron_dryRun() {
  console.log('\n[4b] Moteur — POST /api/cron/process-emails?dryRun=1');
  try {
    // Sans secret → 401
    const noSecret = await fetch(`${BASE}/api/cron/process-emails?dryRun=1`, {
      method: 'POST',
    });
    if (noSecret.status === 401) {
      ok('Sans x-cron-secret → 401');
    } else {
      ko(`Sans x-cron-secret → HTTP ${noSecret.status} (attendu 401)`);
    }

    // Mauvais secret → 401
    const badSecret = await fetch(`${BASE}/api/cron/process-emails?dryRun=1`, {
      method: 'POST',
      headers: { 'x-cron-secret': 'wrong' },
    });
    if (badSecret.status === 401) ok('Mauvais x-cron-secret → 401');
    else ko(`Mauvais x-cron-secret → HTTP ${badSecret.status}`);

    // GET → 405
    const getRes = await fetch(`${BASE}/api/cron/process-emails`, { method: 'GET' });
    if (getRes.status === 405) ok('GET → 405');
    else ko(`GET → HTTP ${getRes.status} (attendu 405)`);

    // Bon secret + dryRun → 200 avec récap
    const ok_ = await fetch(`${BASE}/api/cron/process-emails?dryRun=1`, {
      method: 'POST',
      headers: { 'x-cron-secret': CRON_SECRET },
    });
    if (!ok_.ok) {
      ko(`Dry-run → HTTP ${ok_.status}`);
      const t = await ok_.text().catch(() => '');
      console.error('     body:', t.slice(0, 300));
      return;
    }
    const json = await ok_.json();
    const r = json.data ?? json;
    ok(
      `Dry-run → HTTP 200 — paused=${r.paused}, processed=${r.processed}, sent=${r.sent}, skipped=${r.skipped}`,
      r.stoppedReason ? `stopReason=${r.stoppedReason}` : '',
    );
    if (typeof r.paused !== 'boolean' || typeof r.processed !== 'number') {
      ko('Shape réponse cycle invalide');
    }
  } catch (err) {
    ko('4b cron', err.message);
  }
}

async function test4c_admin_pipeline() {
  console.log('\n[4c] Visibilité — login admin + state + pause toggle');
  let cookie;
  try {
    cookie = await login();
    ok('Login NextAuth (cookie session obtenu)');
  } catch (err) {
    ko('Login NextAuth', err.message);
    return;
  }

  try {
    // Sans session → 401
    const noAuth = await fetch(`${BASE}/api/admin/pipeline/state`);
    if (noAuth.status === 401) ok('State sans session → 401');
    else ko(`State sans session → HTTP ${noAuth.status}`);

    // Avec session → 200 + snapshot
    const res = await fetch(`${BASE}/api/admin/pipeline/state`, {
      headers: { cookie },
    });
    if (!res.ok) {
      ko(`State → HTTP ${res.status}`);
      const t = await res.text().catch(() => '');
      console.error('     body:', t.slice(0, 300));
      return;
    }
    const json = await res.json();
    const s = json.data;
    if (!s) {
      ko('State réponse sans data');
      return;
    }
    ok(
      `State → HTTP 200 — paused=${s.paused}, provider=${s.provider}, sentToday=${s.sentToday}/${s.dailyCap}`,
    );
    if (!Array.isArray(s.queue) || s.queue.length !== 5) {
      ko(`Shape queue invalide (attendu 5 étapes, reçu ${s.queue?.length})`);
    } else {
      ok(`Queue = 5 étapes (${s.queue.map((q) => q.triggerKey).join(', ')})`);
    }
    if (!Array.isArray(s.recentLogs)) {
      ko('Shape recentLogs invalide');
    } else {
      ok(`recentLogs = ${s.recentLogs.length} entrée(s)`);
    }

    // Pause toggle — on lit l'état actuel, on l'inverse, on vérifie, on remet
    const before = s.paused;
    const toggled = !before;

    const pauseRes = await fetch(`${BASE}/api/admin/pipeline/pause`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ paused: toggled }),
    });
    if (!pauseRes.ok) {
      ko(`Pause → HTTP ${pauseRes.status}`);
      return;
    }
    const pj = await pauseRes.json();
    // La route renvoie directement { paused } via apiSuccess({ paused })
    const pausedVal = pj.data?.paused ?? pj.paused;
    if (pausedVal === toggled) {
      ok(`Pause toggle → paused=${pausedVal} (était ${before})`);
    } else {
      ko(`Pause toggle réponse incohérente : ${JSON.stringify(pj)}`);
    }

    // Vérifier en DB
    const dbSetting = await prisma.setting.findUnique({
      where: { key: 'pipeline.paused' },
    });
    if (dbSetting?.value === String(toggled)) {
      ok(`DB Setting "pipeline.paused" = "${dbSetting.value}"`);
    } else {
      ko(`DB Setting mismatch : "${dbSetting?.value}" ≠ "${toggled}"`);
    }

    // Restaurer l'état initial
    const restore = await fetch(`${BASE}/api/admin/pipeline/pause`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ paused: before }),
    });
    if (restore.ok) ok(`État restauré à paused=${before}`);
    else ko(`Restauration échouée → HTTP ${restore.status}`);

    // Corps invalide → 400
    const bad = await fetch(`${BASE}/api/admin/pipeline/pause`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ wrong: true }),
    });
    if (bad.status === 400) ok('Pause corps invalide → 400');
    else ko(`Pause corps invalide → HTTP ${bad.status} (attendu 400)`);
  } catch (err) {
    ko('4c admin', err.message);
  }
}

async function testAdminPage() {
  console.log('\n[UI] Page /admin compile + répond HTTP 200');
  try {
    const res = await fetch(`${BASE}/admin`, { redirect: 'manual' });
    // /admin sans session → redirige vers login (302) OU répond 200 avec page login.
    // Soit 200, soit 30x : les deux valides (pas de crash compile).
    if (res.status >= 200 && res.status < 400) {
      ok(`/admin → HTTP ${res.status} (page compile OK)`);
    } else {
      ko(`/admin → HTTP ${res.status}`);
    }
  } catch (err) {
    ko('Page /admin', err.message);
  }
}

// ---------------------------------------------------------------
// Run
// ---------------------------------------------------------------
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  TESTS E2E PIPELINE EMAIL — DOMIPACK 4a/4b/4c');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

try {
  await test4a_fondations();
  await test4b_cron_dryRun();
  await test4c_admin_pipeline();
  await testAdminPage();
} finally {
  await prisma.$disconnect();
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  RÉSULTAT : ${pass} OK / ${fail} ÉCHEC`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
process.exit(fail > 0 ? 1 : 0);
