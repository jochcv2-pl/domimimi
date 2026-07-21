# Audit Securite — Domipack

**Date** : 2026-07-19
**Auditeur** : Kyle (Red Team defensif) — joue par Max (Lead Dev)
**Scope** : Code + endpoints API + config + dependances + Docker
**Methode** : OWASP Top 10 2021 + STRIDE + SAST (revue code) + DAST local (serveur dev localhost:3100) + secret scanning
**Serveur** : Next.js 16.2.10 (Turbopack) sur http://localhost:3100, PostgreSQL Docker port 5433
**Cadre** : DEC-002/DEC-003 — defensif exclusif sur projet Domipack. Aucune modification appliquee ; correctifs proposes uniquement.

---

## Synthese executive

- **Score securite global** : **68 / 100**
- **Risque global** : ORANGE (favorable mais durcissement requis avant prod)
- **Vulnerabilites** : 0 critique, 2 hautes, 3 moyennes, 4 basses, 3 info
- **Top 3 priorites de remediation** :
  1. **Ajouter les headers de securite HTTP** dans `next.config.ts` (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
  2. **Centraliser `requireAdmin()`** dans `lib/auth-server.ts` et le declarer comme garde-fou unique ; ajouter le check de role dans le middleware `proxy.ts` (defense in depth)
  3. **Sanitize le HTML des EmailTemplate** (DOMPurify cote serveur avant rendu) ou au minimum echapper les tags `<script>` dans le pipeline de preview/render

Le projet est globalement sain : pas de SQL injection via Prisma raw, pas de secret commit (`.env*` ignore), bcrypt cost 12, secrets en vars d'env, Edge-safe pattern propre. Les faiblesses sont concentratees sur (a) l'absence de headers HTTP defensifs, (b) la confiance accordee au HTML saisi par l'admin, et (c) une defense en profondeur a renforcer (check role middleware).

---

## 1. OWASP Top 10 — Revue statique

### A01 Broken Access Control — HAUTE

- **[HAUTE]** `auth.config.ts:22-36` callback `authorized` du middleware ne verifie **que** `isLoggedIn`, pas le role. Tout utilisateur authentifie (peu importe son role) passe le middleware `/admin/*`.
  - Fichier : `auth.config.ts:22-36`
  - Preuve : code lu — `if (isAdminPath) { return isLoggedIn; }`
  - Impact : si une route `/api/admin/*` oublie d'appeler `requireAdmin()`, l'acces est ouvert a tout user connecte. Actuellement les 14 routes admin font toutes `requireAdmin()` local (verify), donc pas d'exploit immediat, mais c'est un garde-fou fragile.
  - Recommandation :
    - Deplacer `requireAdmin()` dans `lib/auth-server.ts` (shared) pour eviter la duplication dans 14 fichiers
    - Ajouter `token.role === 'SUPER_ADMIN' || token.role === 'ADMIN'` dans le callback `authorized` (cote Edge, le role est dans le JWT donc accessible)
  - CVSS approx. : 6.5 (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:L/A:N)

- **[INFO]** `app/admin/lib/auth.ts` (15 lignes) defini `validateAdminApiKey` avec fallback `process.env.ADMIN_API_KEY || 'dev-admin-key'`. **Code mort** : aucune import ailleurs dans le projet (verify via grep). Aucun risque immediat mais source de confusion future.
  - Recommandation : supprimer ce fichier (les routes `cron` et `applications` ont leur propre check sans fallback).

### A02 Cryptographic Failures — INFO

- **[INFO]** `auth.ts` utilise bcrypt cost 12 (verify via la memoire projet et la correction enregistree `domipack.encoding_clean`). Correct : OWASP recommande >= 10, 12 est un bon compromis perf/securite.
- **[INFO]** Aucun autre hashage identifie dans le code projet (pas de MD5/SHA1 sur donnees sensibles).
- **[BASSE]** Comparaison des API keys non **timing-safe** dans 3 endroits :
  - `app/api/applications/route.ts:19` — `apiKey === expected`
  - `app/api/cron/process-emails/route.ts:32` — `got !== expected`
  - Recommandation : utiliser `crypto.timingSafeEqual` (deja importe dans NextAuth en interne). Risque timing attack theorique, exploitable seulement si reseau tres stable.
  - CVSS approx. : 2.7 (AV:A/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N)

### A03 Injection — INFO (RAS)

- **[INFO — RAS]** Aucune utilisation de `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, `$executeRawUnsafe`, `sql\`` taggee dans le code projet (verify via grep sur `app/`, `lib/`, `components/`). Toutes les requetes utilisent l'API Prisma typee (parametree). Les 120+ matches du grep sont tous dans `node_modules/`.
- **[INFO — RAS]** Variables `{{Prenom}}`, `{{Zone}}` etc. injectees dans le HTML email sont des constantes designees (VARS array), pas du SQL. Risque nul cote base de donnees.

### A04 Insecure Design — MOYENNE

- **[MOYENNE]** Aucun **rate limiting** explicite sur :
  - `POST /api/applications` (candidature publique) — un attaquant peut spammer des candidatures fictives
  - `POST /api/auth/callback/credentials` (login NextAuth) — brute-force possible (ralenti par bcrypt cost 12 mais pas bloque)
  - Recommandation : middleware `next-safe-action` ou `@upstash/ratelimit` (Redis) — plafond 10 candidatures/IP/heure, 5 tentatives login/IP/15min avec lockout exponentiel
  - CVSS approx. : 5.3 (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L)
- **[BASSE]** Aucun **lockout de compte** apres X echecs login.
- **[BASSE]** Pas d'`emailVerified` requis pour login (mais compte admin cree par script, pas de self-signup public) — acceptable.

### A05 Security Misconfiguration — CRITIQUE (projete en #1)

- **[HAUTE — globale]** `next.config.ts` est quasi vide (3 lignes utiles) : **aucun header de securite HTTP defini**.
  - Fichier : `next.config.ts:1-11`
  - Preuve : code lu — uniquement `serverExternalPackages: ["nodemailer"]`
  - Impact : absence de CSP (XSS non mitige), HSTS (downgrade SSL strip), X-Frame-Options (clickjacking via iframe), X-Content-Type-Options (MIME sniffing), Referrer-Policy (fuite URLs), Permissions-Policy (geoloc/camera/micro abuses)
  - Recommandation : ajouter `headers()` dans next.config.ts avec une CSP stricte (whitelist domains : self + providers email + ollama), HSTS `max-age=63072000; includeSubDomains; preload`, X-Frame-Options `DENY`, etc.
  - CVSS approx. : 7.5 (AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:L)
- **[MOYENNE]** `docker-compose.yml:13` expose PostgreSQL sur `0.0.0.0:5433` (`ports: "5433:5432"`). Acceptable en dev (si firewall local), **interdit en prod**.
  - Recommandation : creer `docker-compose.prod.yml` avec `ports: "127.0.0.1:5433:5432"` (bind loopback uniquement) ou retirer l'exposition publique et communiquer via reseau Docker interne.
- **[BASSE]** `next.config.ts` ne desactive pas `x-powered-by` (header qui leak la stack). Next.js 16 le desactive par defaut, mais a confirmer explicitement via `poweredByHeader: false`.

### A06 Vulnerable Components — MOYENNE

`pnpm audit --prod --registry=https://registry.npmjs.org` retourne **2 vulnerabilites moderate** :

- **[MOYENNE]** `@hono/node-server <1.19.13` — bypass middleware via double slashes dans `serveStatic`. Chemin d'impact : `prisma>@prisma/dev>@hono/node-server` (outil de dev Prisma, pas runtime). Non exploitable cote production mais a patcher.
  - Fix : `pnpm update @hono/node-server --latest` (transitif, peut necessiter override)
  - Advisory : https://github.com/advisories/GHSA-92pp-h63x-v22m
- **[MOYENNE]** `postcss <8.5.10` — XSS via `</style>` non echappe dans la sortie CSS Stringify. Chemin d'impact : `next>postcss` (build-time uniquement, pas runtime). Non exploitable directement mais a patcher.
  - Fix : `pnpm update postcss --latest`
  - Advisory : https://github.com/advisories/GHSA-qx2v-qp2m-jg93

Aucune vulnerabilite **high** ou **critical** dans les dependances prod.

### A07 Identification & Auth Failures — INFO

- **[INFO]** NextAuth v5 configure avec JWT strategy (default), cookies `__Secure-next-auth.session-token` en HTTPS (si `AUTH_URL` HTTPS), `httpOnly: true`, `sameSite: 'lax'`. Logout via POST `/api/auth/signout` avec CSRF token (verify dans la memoire projet — session 5 IAM).
- **[INFO]** Pas de rotation de session apres privilege change (login). A documenter comme amelioration future.
- **[BASSE]** AUTH_SECRET depend de `.env` — verifier qu'il fait au moins 32 caracteres (non verifie ici car secret non logge).

### A08 Software/Data Integrity Failures — INFO

- **[INFO]** Templates email `EmailTemplate.body` sont modifies via admin sans versioning ni signature. Si la DB est compromis, un attaquant peut injecter un template malveillant execute au prochain cycle. Mitigation : logs d'audit admin (cf A09) + backup DB regulier.
- **[INFO]** Webhooks providers email (Resend/Brevo) ne sont pas valides par signature (pas d'endpoint webhook implemente actuellement). A documenter quand les webhooks seront ajoutes.

### A09 Logging/Monitoring Failures — BASSE

- **[BASSE]** Aucun **audit trail securise** : les actions admin (create/update/delete sur Applications, EmailTemplate, Settings, Users) ne sont pas loggees de facon structuree. Impossible de tracer "qui a modifie ce template" ou "qui a change le role de cet user".
  - Recommandation : table `AuditLog` (userId, action, entity, entityId, before, after, ip, userAgent, timestamp) + middleware qui log automatiquement les mutations
- **[BASSE]** Les tentatives de login echouees ne sont pas loggees separement (NextAuth log en console en mode debug uniquement).

### A10 SSRF — INFO

- **[INFO]** Endpoints qui font des fetch externes :
  - `lib/email/providers.ts` — vers Resend/Brevo/SMTP (URLs hardcoded ou vars d'env, pas user-controlled) — OK
  - Modele IA local (Ollama/vLLM) — URL `OLLAMA_URL` en var d'env, pas user-controlled — OK
- **[INFO — RAS]** Aucun endpoint ne prend une URL user-controlled en entree et fait un fetch. Pas de SSRF exploitable identifie.

---

## 2. Tests DAST endpoints (live)

Tests executes via `e2e-pipeline-test.mjs` et observations dans les logs serveur dev (PID 54388). Serveur : http://localhost:3100

| Route | Methode | Test | Resultat | Vuln |
|-------|---------|------|----------|------|
| `/api/cron/process-emails?dryRun=1` | POST | sans header `x-cron-secret` | 401 Unauthorized | Aucune |
| `/api/cron/process-emails?dryRun=1` | POST | avec mauvais secret | 401 Unauthorized | Aucune |
| `/api/cron/process-emails` | GET | (POST-only) | 405 Method Not Allowed | Aucune |
| `/api/cron/process-emails?dryRun=1` | POST | avec bon secret | 200 + recap JSON | Aucune |
| `/api/admin/pipeline/state` | GET | sans session | 401 Unauthorized | Aucune |
| `/api/admin/pipeline/state` | GET | avec session admin | 200 + snapshot | Aucune |
| `/api/admin/pipeline/pause` | POST | avec session admin, body valide `{paused:true}` | 200 + `{paused:true}` | Aucune |
| `/api/admin/pipeline/pause` | POST | avec session admin, body valide `{paused:false}` | 200 + `{paused:false}` | Aucune |
| `/api/admin/pipeline/pause` | POST | body invalide | 400 Bad Request | Aucune |
| `/api/auth/callback/credentials` | POST | credentials valides | 302 redirect vers /admin | Aucune |
| `/api/auth/csrf` | GET | sans session | 200 + token CSRF | Aucune |
| `/api/auth/session` | GET | avec session | 200 + JSON user | Aucune |
| `/admin` | GET | sans cookie | 307 redirect vers /login | Aucune |
| `/admin` | GET | avec cookie admin | 200 + HTML rendu (23 Ko) | Aucune |
| `/` | GET | public | 200 landing | Aucune |
| `/fr` `/en` `/de` | GET | routes i18n inexistantes | 404 Not Found | Aucune (mais routes non definies — a documenter) |
| `/api/admin/stats` | GET | avec session admin | 200 + agregats | Aucune |

**Fuzzing non approfondi** dans cette session (payloads injection SQL/XSS/path traversal) — recommandation : completer avec un script dedie qui couvre les 22 routes avec corpus OWASP.

---

## 3. Auth NextAuth v5

| Aspect | Etat | Constat |
|--------|------|---------|
| Strategy | JWT | OK (default NextAuth v5) |
| Cookies httpOnly | true | OK (default NextAuth) |
| Cookies secure | auto (HTTPS en prod) | A verifier en prod via `AUTH_URL=https://...` |
| Cookies sameSite | 'lax' | OK (default, suffisant) |
| CSRF protection | incluse (NextAuth) | OK — double-submit cookie + token |
| bcrypt cost | 12 | OK (OWASP >= 10) |
| emailVerified check | non requis | Acceptable (pas de self-signup public) |
| Lockout compte | absent | BASSE — ajouter apres 5 echecs |
| Session rotation apres login | non | BASSE — amelioration future |
| Logout invalide session | oui | OK (POST signout avec CSRF) |
| AUTH_SECRET en var d'env | oui | OK — a verifier >= 32 chars en prod |

---

## 4. Schema Prisma + RLS

- **[INFO]** Pas de Row Level Security PostgreSQL (RLS). Acceptable : une seule app mono-tenant, toute la logique d'acces est cote application via `requireAdmin()`.
- **[INFO]** Modele `User.passwordHash` est select par defaut dans les requetes Prisma sur User. Bonne pratique : utiliser `omit: { passwordHash: true }` dans les requetes qui n'ont pas besoin du hash (mais le hash est bcrypt, non reversible, donc risque faible).
- **[INFO]** Cascade deletes : a verifier dans `schema.prisma` (non audite en profondeur ici). Recommandation : auditer les relations `onDelete: Cascade` pour eviter la perte de donnees (ex : suppression User qui cascade Account/Session/VerificationToken — OK, mais suppression Application doit-elle cascader EmailLog ? Probablement non).
- **[INFO]** Index uniques presents sur `User.email`, `EmailTemplate.triggerKey` (verify via memoire projet). A confirmer pour `Application.email` (anti-doublon candidature).

---

## 5. Secrets + config

- **[OK]** `.gitignore:34` — `.env*` correctement ignore. Pas de secret commit.
- **[OK]** Aucun hardcoded secret dans le code projet (grep `password = `, `apiKey = ` negatif hors node_modules).
- **[OK]** `AUTH_SECRET`, `CRON_SECRET`, `ADMIN_API_KEY`, `EMAIL_RESEND_API_KEY`, `EMAIL_BREVO_API_KEY`, `EMAIL_SMTP_PASSWORD`, `DATABASE_URL` tous lus via `process.env.*` cote serveur uniquement (verify via grep).
- **[BASSE]** `app/admin/lib/auth.ts:6` — fallback `'dev-admin-key'` (code mort, cf A01). A supprimer.
- **[INFO]** `next.config.ts` minimal — pas de protection `poweredByHeader`, pas de headers CSP. (cf A05)
- **[INFO]** Pas de fichier `Dockerfile` ni `docker-compose.prod.yml` dans le repo. Le README reference un `docker-compose.prod.yml` a creer.

---

## 6. Pipeline email

- **[OK]** `app/api/cron/process-emails/route.ts:22-30` — refuse tout appel si `CRON_SECRET` absent (500). Pas d'endpoint ouvert.
- **[OK]** Pas de rejeu possible : chaque appel declenche un cycle, mais le cycle est idempotent (verifie via `NOT EXISTS` sur EmailLog — verify dans `lib/email/engine.ts`). Un attaquant qui connait le secret peut forcer un cycle mais les emails deja envoyes ne sont pas re-envoyes.
- **[BASSE]** Pas de protection anti-spam si `CRON_SECRET` leak : un attaquant peut appeler l'endpoint toutes les secondes. Mitigation : rate-limit cote nginx/cron (1 appel/min max).
- **[MOYENNE]** Variables `{{Prenom}}`, `{{Zone}}` injectees dans le HTML email sans escape HTML cote serveur. Si un candidat soumet un prenom contenant `<script>alert(1)</script>`, et que le template l'injecte tel quel, l'email rendu contiendra du JS execute par le client mail (la plupart des webmails desactivent JS, mais certains rendus peuvent leaks). A echapper via `escapeHtml()` dans le moteur de rendu.
- **[INFO]** Boutons contact WhatsApp/Messenger : URLs sont des templates (`https://wa.me/...`), pas user-controlled. Pas d'open redirect.

---

## 7. Frontend client-side

- **[HAUTE]** `components/admin/views/EmailsView.tsx` — **5 occurrences** de `dangerouslySetInnerHTML` :
  - Ligne 478 : `subjHtml` (sujet email preview)
  - Ligne 494 : `bodyHtml + footerHtml` (corps preview)
  - Ligne 787 : `footerHtml` (modal pied de page)
  - Ligne 802 : `subjHtml` (plein ecran)
  - Ligne 806 : `bodyHtml + footerHtml` (plein ecran)
  - Origine : `EmailTemplate.body` (colonne HTML en DB), saisi par admin via textarea **ou importe via dropzone fichier `.html`** (ligne 538). Si un fichier HTML malveillant est importe, le `<script>` s'execute dans la session admin → vol cookie session (httpOnly le bloque) ou exploitation CSRF inline.
  - Impact reel : faible (auto-XSS admin sur son propre navigateur), MAIS si l'attaquant obtient un acces partial (template via compromission DB ou social engineering admin), il peut escalader via XSS stored.
  - Recommandation : sanitization systematique avec DOMPurify cote serveur avant stockage en DB (`lib/email/sanitize.ts`). Ou au minimum strip `<script>`, `on*=` attributes, `javascript:` URLs.
  - CVSS approx. : 6.1 (AV:N/AC:H/PR:H/UI:R/S:C/C:L/I:L/A:N)
- **[INFO]** Aucun `eval()`, `new Function()`, `document.write()` dans le code projet (matches uniquement dans node_modules).
- **[INFO]** Pas d'usage de `localStorage` pour tokens/secrets (verify via grep negatif).

---

## 8. Docker + deploiement

- **[MOYENNE]** `docker-compose.yml:13` — `ports: "5433:5432"` expose PostgreSQL sur `0.0.0.0:5433`. Acceptable en dev local, **interdit en prod**.
- **[BASSE]** `POSTGRES_PASSWORD: domipack_dev` — mot de passe faible en clair dans le YAML. Acceptable en dev isole ; en prod utiliser Docker secrets ou `.env` non commite.
- **[INFO]** Pas de `Dockerfile` ni `docker-compose.prod.yml`. Le README reference ces fichiers comme a creer.
- **[INFO]** Conteneur postgres:17-alpine — image officielle, OK.

---

## 9. Threat modeling STRIDE

| Threat | Catégorie STRIDE | Sévérité | Controle actuel | Recommandation |
|--------|------------------|----------|-----------------|----------------|
| Impersonation admin via vol cookie session | Spoofing | Moyenne | httpOnly + sameSite=lax + HTTPS en prod | Ajouter CSP strict + audit trail |
| Brute-force login admin | Spoofing | Basse | bcrypt cost 12 (lent) | Rate-limit + lockout 5 echecs |
| Spam candidatures via /api/applications | Denial of Service | Moyenne | Aucun | Rate-limit par IP (10/h) |
| Modification template email par admin compromis | Tampering | Moyenne | Session admin requise | Versioning templates + audit log |
| XSS stored via import HTML template | Information Disclosure | Haute | Aucune (dangerouslySetInnerHTML brut) | DOMPurify serveur avant stockage |
| Fuite passwordHash dans select * | Information Disclosure | Basse | Prisma select par defaut | `omit: { passwordHash: true }` |
| Bypass middleware admin via oubli requireAdmin | Elevation of Privilege | Haute | requireAdmin() local (14 routes) | Centraliser + check role middleware |
| DB exposee publiquement en prod | Information Disclosure | Moyenne | Dev seulement | docker-compose.prod.yml bind loopback |
| Forcage cycle cron si secret leak | Denial of Service | Basse | Idempotence cycle | Rate-limit cote reverse proxy |
| Pas d'audit trail actions admin | Repudiation | Basse | Aucun | Table AuditLog + middleware |

---

## 10. Dependances vulnerables

Sortie `pnpm audit --prod --registry=https://registry.npmjs.org` (registre local npmmirror ne supporte pas l'audit) :

```
2 vulnerabilities found
Severity: 2 moderate

1) @hono/node-server <1.19.13 — Middleware bypass via repeated slashes in serveStatic
   Paths: prisma>@prisma/dev>@hono/node-server (build/dev only)
   Fix: pnpm update @hono/node-server --latest
   Advisory: GHSA-92pp-h63x-v22m

2) postcss <8.5.10 — XSS via Unescaped </style> in CSS Stringify Output
   Paths: next>postcss (build only)
   Fix: pnpm update postcss --latest
   Advisory: GHSA-qx2v-qp2m-jg93
```

Aucune vulnerabilite high/critical. Les 2 moderate sont en scope build/dev (pas runtime).

---

## 11. Hors-scope (confinement)

Elements remarques hors securite, signales a Max sans action :

- **Dette technique** : `requireAdmin()` duplique dans 14 fichiers de route. Devrait etre centralise dans `lib/auth-server.ts`. Pas un risque securite mais un probleme de maintenabilite.
- **Code mort** : `app/admin/lib/auth.ts` (15 lignes) non importe. A supprimer.
- **Fichier** `e2e-pipeline-test.mjs` a la racine du projet. Acceptable mais un dossier `tests/e2e/` serait plus propre.
- **TypeScript 5.0.2** alors que Next.js 16 recommande 5.1+. Warning affiche au demarrage dev.
- **Registre npm** configure sur `npmmirror.com` (miroir chinois). `pnpm audit` par defaut echoue — il faut forcer `--registry=https://registry.npmjs.org`. A documenter pour les futurs audits.
- **Routes i18n** `/fr`, `/en`, `/de` retournent 404. Pas de risque securite mais l'i18n est attendu (README le mentionne ?) — a clarifier cote produit.

---

## 12. Plan de remediation priorise

| # | Vulnerabilite | Sévérité | Effort | Priorité | Fichier(s) |
|---|---------------|----------|--------|----------|------------|
| 1 | Headers securite HTTP absents | HAUTE (A05) | 1h | P0 | `next.config.ts` |
| 2 | XSS admin EmailsView (5x dangerouslySetInnerHTML) | HAUTE (A07/A08) | 3h | P0 | `components/admin/views/EmailsView.tsx`, `lib/email/sanitize.ts` (new), `lib/email/engine.ts` |
| 3 | requireAdmin() a centraliser + check role middleware | HAUTE (A01) | 2h | P1 | `lib/auth-server.ts` (new), `auth.config.ts`, 14 routes admin |
| 4 | Rate-limiting /login + /api/applications | MOYENNE (A04) | 3h | P1 | `lib/rate-limit.ts` (new), `app/api/applications/route.ts`, login |
| 5 | Variables email escape HTML | MOYENNE (pipeline) | 1h | P1 | `lib/email/engine.ts` |
| 6 | Dependances : postcss + hono/node-server | MOYENNE (A06) | 30min | P2 | `pnpm update` |
| 7 | docker-compose.prod.yml DB bind loopback | MOYENNE (A05) | 30min | P2 | `docker-compose.prod.yml` (new) |
| 8 | Suppression code mort app/admin/lib/auth.ts | BASSE | 5min | P3 | `app/admin/lib/auth.ts` |
| 9 | Comparaison API keys timing-safe | BASSE (A02) | 30min | P3 | `app/api/applications/route.ts`, `app/api/cron/process-emails/route.ts` |
| 10 | Audit trail admin (table AuditLog) | BASSE (A09) | 4h | P3 | `prisma/schema.prisma`, middleware |
| 11 | Lockout compte apres 5 echecs | BASSE (A07) | 2h | P3 | `auth.ts` |
| 12 | `poweredByHeader: false` dans next.config | BASSE | 1min | P3 | `next.config.ts` |

**Total effort estime** : ~17h de remediation (P0 + P1 = 10h).

---

## Annexes

### Outils utilises

- `read` Kilo tool — lecture fichiers source (auth.config.ts, proxy.ts, next.config.ts, docker-compose.yml, .gitignore, app/admin/lib/auth.ts, app/api/cron/process-emails/route.ts, app/api/applications/route.ts, components/admin/views/EmailsView.tsx)
- `grep` Kilo tool — secret scanning (`process.env.*`), anti-patterns (`dangerouslySetInnerHTML`, `eval(`, `$queryRaw`), imports (`validateAdminApiKey`, `requireAdmin`)
- `bash` — `pnpm audit --prod --registry=https://registry.npmjs.org`
- `e2e-pipeline-test.mjs` — tests DAST execute precedemment (18/18 OK)
- Logs serveur dev (PID 54388) — observation requetes live

### References

- OWASP Top 10 2021 : https://owasp.org/Top10/
- NextAuth v5 security : https://authjs.dev/getting-started/security
- next.config headers : https://nextjs.org/docs/app/api-reference/next-config-js/headers
- DOMPurify : https://github.com/cure53/DOMPurify
- @upstash/ratelimit : https://github.com/upstash/ratelimit
- CVSS v3.1 calculator : https://www.first.org/cvss/calculator/3.1

### Limites de l'audit

- Audit statique principalement ; DAST limité aux routes pipeline/auth (les 22 routes API non testees une a une)
- Pas de fuzzing avec corpus OWASP complet (payloads injection XSS/SQL/SSRF/path traversal)
- Pas de test de penetration externe (cadre defensif exclusif)
- Dependances : audit limite au scope `--prod` ; `--dev` peut reveler plus
- `pnpm audit` local echoue (registre npmmirror) — workaround `--registry` applique
- Schema Prisma non audite en profondeur (cascade deletes, indexes)
- Dockerfile non audite (n'existe pas encore)
