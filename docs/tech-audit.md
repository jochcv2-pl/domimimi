# Audit Technique — Domipack

**Date** : 2026-07-19
**Auditeur** : Max (Lead Dev Senior)
**Scope** : Architecture, qualite de code, dette technique, performance, coverage tests, conventions
**Methode** : Revue statique complete + metriques compile/lint + analyse de structure
**Projet** : Next.js 16.2.10 + TypeScript + Tailwind v4 + Prisma v7 + PostgreSQL + NextAuth v5

---

## Synthese executive

- **Score technique global** : **74 / 100**
- **Sante globale** : VERT (code fonctionnel, type-safe, archi propre) avec dette technique moyenne
- **Bilan** :
  - TypeScript : 0 erreur (excellent)
  - ESLint : 87 erreurs + 4 warnings (essentiellement apostrophes JSX)
  - Tests : 0% coverage (AUCUN runner configure)
  - CI/CD : absent
  - Pre-commit hooks : absents
- **Top 3 priorites** :
  1. **Mettre en place une strategy de tests** (Vitest unit + Playwright e2e) — coverage critique
  2. **Configurer CI/CD GitHub Actions** + pre-commit hooks (husky + lint-staged)
  3. **Nettoyer ESLint** (fix auto des 80 apostrophes + corriger les 6 `set-state-in-effect`)

L'architecture est saine, les patterns Next.js 16 App Router sont respectes, la separation des couches est propre. La dette est concentratee sur le tooling (tests, CI, hooks) et quelques details (deps mal classées, code mort, mock data).

---

## 1. Architecture

### 1.1 Structure des dossiers

```
domipack/
+-- app/                      # Next.js App Router
|   +-- (public)/             # Pages publiques (implicite via groupes)
|   +-- admin/page.tsx        # CRM admin (protege par proxy.ts)
|   +-- login/page.tsx        # Authentification
|   +-- api/                  # 18 routes API
|       +-- auth/[...nextauth]/   # NextAuth handler
|       +-- cron/process-emails/ # Cron endpoint (x-cron-secret)
|       +-- admin/            # 12 routes admin (requireAdmin local)
|       +-- applications/     # POST candidature publique
|       +-- contact-links/    # GET public
|       +-- pay-rates/        # GET public
+-- components/
|   +-- sections/             # 11 composants landing (Navbar, Hero, TrustBar, Benefits, Steps, ProfilePay, Testimonials, Faq, ApplyForm, ContactForm, Footer)
|   +-- admin/                # 13 vues CRM + Sidebar + Topbar + Modal + Pipeline
|   +-- ui/                   # RevealObserver, Reveal (animations)
|   +-- providers/            # Providers.tsx (wrapper client)
+-- lib/                      # Business logic
|   +-- prisma.ts             # Singleton (driver adapter PrismaPg)
|   +-- store.ts              # Zustand store (AdminView)
|   +-- validations.ts        # Schemas Zod
|   +-- mappers.ts            # Mappers Prisma -> API
|   +-- api.ts                # Helpers apiSuccess/apiError/apiZodError
|   +-- email.ts              # Notification admin
|   +-- email/                # Pipeline email modulaire
|       +-- engine.ts         # FLOW_STEPS, runEmailCycle
|       +-- providers.ts      # Resend/Brevo/SMTP
|       +-- render.ts         # Template rendering
+-- prisma/                   # Schema + seed + migrations
+-- scripts/                  # create-admin.mjs, reset-admin-password.mjs
+-- docs/                     # Documentation (audit, README client)
+-- types/                    # Types TypeScript globaux
+-- public/                   # Assets statiques
```

**Constat** : structure PROPRE, conforme aux conventions Next.js 16. Separation claire : routing (app/) / UI (components/) / business (lib/). Module email decoupe en sous-modules (engine + providers + render) — bonne cohesion.

### 1.2 Patterns identifies

- **App Router** : utilise correctement (page.tsx, route.ts, layout.tsx)
- **Server vs Client Components** : la majorite des vues admin sont client components (Zustand), ce qui est acceptable pour un CRM interactif mais limite le SSR. A documenter.
- **Singleton Prisma** : pattern standard Next.js (globalThis cache dev) — OK
- **Driver adapter Prisma v7** : pattern moderne `PrismaPg(databaseUrl)` — OK (cf. memoire projet)
- **Zustand store** : propre, typesafe, centralise dans `lib/store.ts` — OK
- **Zod validation** : utilise cote API (apiZodError) — OK
- **Helper API** : `apiSuccess`/`apiError`/`apiZodError` — cohesion reponse — OK

### 1.3 Conventions de nommage

- **Files** : PascalCase pour composants (`PipelineView.tsx`), kebab-case pour routes (rare), camelCase pour lib — acceptable mais mix
- **Routes API** : REST-ish (GET/POST/PUT/DELETE), pas parfaitement RESTful (ex `pipeline/pause` est un verbe)
- **Variables Francais/Anglais** : mix (`setCurrentView` vs `candidats` vs `markAllRead`). A standardiser.

---

## 2. Qualite de code

### 2.1 TypeScript

**0 erreur** (`tsc --noEmit` exit 0). Excellent.

- TypeScript 5.0.2 installé (warning Next.js 16 recommande ≥5.1)
- `strict` mode : a verifier dans `tsconfig.json` (assume active)
- Types Prisma generes — OK

### 2.2 ESLint

**87 erreurs + 4 warnings** via `eslint . --max-warnings=9999`.

| Categorie | Count | Severity | Fichiers | Action |
|-----------|-------|----------|----------|--------|
| `react/no-unescaped-entities` | ~80 | error | Benefits, Faq, Steps, Testimonials, TrustBar, SeoView | Fix auto `--fix` ou escape apostrophes |
| `react-hooks/set-state-in-effect` | 6 | error | SeoView (l.80), autres vues admin | Refactor useEffect |
| `react-hooks/static-components` | ~5 | error | vues admin | Refactor |
| `@typescript-eslint/no-unused-vars` | 4 | warning | lib/store.ts:60 (`get`), autres | Prefix `_` ou supprimer |

**Detail** :
- `lib/store.ts:60` `export const useAdminStore = create<AdminState>((set, get) => ({` — `get` inutilise. Faux positif partiel (Zustand API), mais dans ce store `get` n'est jamais appele. Remplacer par `(_set, _get)` ou supprimer `get`.
- `SeoView.tsx:80` `useEffect(() => { load(); }, [load]);` — anti-pattern React 19 qui cause des cascading renders. Refactor recommande.
- Les 80 apostrophes : trivial a fixer avec `eslint --fix` ou en remplacant `'` par `&apos;` dans le JSX text.

### 2.3 Anti-patterns identifies

- **`dangerouslySetInnerHTML`** : 5 occurrences dans `EmailsView.tsx` (cf. security-audit.md #7). A sanitiser.
- **`useEffect` avec setState** : 6 occurrences. Risque cascading renders React 19. Pattern recommande : `useSyncExternalStore` ou refactor.
- **Mock data dans store** : `INITIAL_NOTIFICATIONS` (3 entries hardcoded) dans `lib/store.ts:41-45`. Devrait etre alimente par l'API.
- **Code mort** :
  - `app/admin/lib/auth.ts` (15 lignes, non importe — cf. security-audit.md #11)
  - Potentiels doublons entre `ParametresView.tsx`, `ProfilView.tsx`, `ConfigurationView.tsx` (3 vues qui se chevauchent conceptuellement) — a clarifier

---

## 3. Performance

### 3.1 Requetes Prisma (N+1)

Analyse grep `findMany|findUnique|findFirst|aggregate|groupBy` dans `lib/` :

- `lib/email/render.ts:145` — `prisma.emailTemplate.findFirst({ where: { triggerKey } })` — single query, OK
- `lib/email/render.ts:152` — `prisma.emailTemplate.findFirst({ where: { isDefault: true } })` — fallback single query, OK
- `lib/email/engine.ts:100` — `prisma.setting.findMany()` — OK (charge tous settings en cache)
- `lib/email/engine.ts:193` — `prisma.application.findMany(...)` avec ensuite possibles sous-queries par application. **A verifier** : le cycle fetch-tous-puis-loop peut generer N+1 sur EmailLog par application. Pattern recommande : `include: { logs: true }` ou batch query.

**Constat** : 4 points de query, 1 suspect N+1 dans engine.ts. A instrumenter en dev (`log: ["query"]` deja actif dans `lib/prisma.ts:25`) pour confirmer.

### 3.2 Caching

- **Pas de cache** identifie :
  - Pas de `unstable_cache` Next.js
  - Pas de `revalidate` / `revalidateTag`
  - Pas de Redis
- Pour un CRM admin temps-reel, c'est acceptable. Pour la landing publique (`/`), il faudrait du `revalidate: 60` sur les `page.tsx` pour soulager le serveur.

### 3.3 Bundle size

- `@faker-js/faker` (10.5.0) en **dependencies** au lieu de `devDependencies` — alourdit inutilement le bundle serveur (utilise uniquement dans `prisma/seed.mjs`).
- `nodemailer` en deps — justifie uniquement si SMTP utilise, sinon alourdit. Deja declare dans `serverExternalPackages` donc pas bundle cote client.
- Tailwind v4 avec @tailwindcss/postcss — build CSS optimise.

### 3.4 Logs

- `lib/prisma.ts:24-26` — Prisma log `["query", "error", "warn"]` en dev, `["error"]` en prod. Correct.
- `next-dev.log` et `next-err.log` a la racine du projet (fichiers non gitignes). A deplacer vers `logs/` ou supprimer.

---

## 4. Coverage tests

### 4.1 Runner de tests

**AUCUN runner configure** :

- Pas de Vitest, Jest, Mocha, node:test
- Pas de Playwright, Cypress
- `package.json` : aucun script `test`, `test:e2e`, `test:unit`
- Aucun fichier `*.test.ts` ou `*.spec.ts` dans le projet (matches uniquement dans `node_modules/`)

### 4.2 Tests existants

- `e2e-pipeline-test.mjs` (a la racine) — script ad-hoc Node qui teste le pipeline via fetch HTTP. 18 tests OK. Non structure, non integre a un runner.

### 4.3 Coverage estime

**~5%** (couverture du pipeline email via `e2e-pipeline-test.mjs` seulement).

| Module | Coverage estimee |
|--------|------------------|
| `lib/email/engine.ts` | ~30% (cycle basic) |
| `lib/email/providers.ts` | ~10% (SMTP fallback non teste) |
| `lib/email/render.ts` | ~20% |
| `lib/prisma.ts` | 0% |
| `lib/validations.ts` | 0% |
| `lib/api.ts` | 0% |
| `lib/mappers.ts` | 0% |
| `auth.ts` / `auth.config.ts` | 0% |
| `app/api/**` (18 routes) | ~10% (cron + applications via e2e) |
| `components/**` (30 composants) | 0% |
| **TOTAL** | **~5%** |

### 4.4 Recommandation

- **Vitest** pour unit tests (compatible Next.js 16, rapide, ESM-native)
  - Coverage cible : `lib/email/*`, `lib/validations.ts`, `lib/mappers.ts`, `lib/api.ts`
- **Playwright** pour e2e (multi-navigateur, attendu pour une prod)
  - Scenarios : candidature complete, login admin, CRUD template, pause pipeline
- **Testing Library** pour composants React
- Objectif phase prochaine : **50% coverage sur lib/** avant mise en prod

---

## 5. Tooling & DevOps

### 5.1 Tooling manquant

| Outil | Etat | Impact | Priorite |
|-------|------|--------|----------|
| Vitest | Absent | 0% unit tests | P0 |
| Playwright | Absent | 0% e2e structure | P1 |
| Husky + lint-staged | Absent | Pas de pre-commit | P1 |
| GitHub Actions CI | Absent | Pas de quality gate | P1 |
| Prettier | Absent | Formatage non standardise | P2 |
| Renovate/Dependabot | Absent | Deps non suives | P2 |
| Commitlint | Absent | Convention commit non enforcee | P3 |
| `eslint-plugin-jsx-a11y` | Absent | Pas de check accessibilite | P2 |

### 5.2 Scripts package.json

Scripts actuels :
- `dev`, `build`, `start`, `lint` (de base Next.js)
- `db:push`, `db:seed`, `db:seed-admin`, `db:studio`, `db:migrate` (Prisma)

**Manquants recommandes** :
- `typecheck` : `tsc --noEmit`
- `test` : `vitest run`
- `test:watch` : `vitest`
- `test:e2e` : `playwright test`
- `format` : `prettier --write .`
- `audit:security` : `pnpm audit --prod --registry=https://registry.npmjs.org`
- `prepare` : `husky` (pre-commit)

---

## 6. Deps et versions

### 6.1 Versions cles

| Dep | Version | Statut | Commentaire |
|-----|---------|--------|-------------|
| next | 16.2.10 | OK | Stable |
| react / react-dom | 19.2.4 | OK | Stable |
| @prisma/client | 7.8.0 | OK | Stable recent |
| prisma | 7.8.0 | OK | Stable recent |
| @prisma/adapter-pg | 7.8.0 | OK | Driver adapter moderne |
| next-auth | **5.0.0-beta.31** | ⚠️ | **Version beta** — risque API change |
| zod | 4.4.3 | OK | Stable recent (v4) |
| zustand | 5.0.14 | OK | Stable recent (v5) |
| bcryptjs | 3.0.3 | OK | Stable |
| nodemailer | 9.0.3 | OK | Stable recent |
| @faker-js/faker | 10.5.0 | ⚠️ | **Devrait etre en devDependencies** |
| typescript | ^5 (5.0.2) | ⚠️ | Next.js 16 recommande ≥5.1 |

### 6.2 Vulnérabilités deps (cf security-audit.md §10)

2 moderate : `@hono/node-server <1.19.13`, `postcss <8.5.10`. Build/dev uniquement.

### 6.3 Recommandations

- Migrer `@faker-js/faker` vers `devDependencies`
- Surveiller passage next-auth v5 beta -> stable (sortie prochaine)
- Upgrade TypeScript vers 5.1+ (warning Next.js 16)
- Ajouter `engines` field dans package.json (`"node": ">=20"`, `"pnpm": ">=9"`)

---

## 7. Dette technique identifiee

| # | Element | Localisation | Effort | Priorite |
|---|---------|--------------|--------|----------|
| 1 | Aucun test runner configure | `package.json` | 4h setup + 16h ecrire | P0 |
| 2 | ESLint : 87 erreurs | components/sections/* + admin/views/* | 1h | P1 |
| 3 | `requireAdmin()` duplique dans 14 routes | `app/api/admin/**/route.ts` | 2h | P1 |
| 4 | Pas de CI/CD | - | 3h | P1 |
| 5 | Mock data dans store | `lib/store.ts:41-45` | 1h | P2 |
| 6 | `@faker-js/faker` en prod deps | `package.json:18` | 5min | P2 |
| 7 | Code mort `app/admin/lib/auth.ts` | 15 lignes | 5min | P2 |
| 8 | `next-dev.log` / `next-err.log` a la racine | racine projet | 5min | P2 |
| 9 | Pas de cache landing publique | `app/page.tsx` | 2h | P2 |
| 10 | N+1 potentiel dans engine.ts | `lib/email/engine.ts:193` | 2h | P2 |
| 11 | 3 vues admin qui se chevauchent (Parametres/Profil/Configuration) | `components/admin/views/*` | a clarifier produit | P3 |
| 12 | Mix Francais/Anglais dans naming | global | 3h | P3 |
| 13 | TypeScript 5.0.2 (recommande ≥5.1) | `package.json` | 30min | P3 |
| 14 | Pas d'`engines` field dans package.json | `package.json` | 5min | P3 |
| 15 | `get` inutilise dans store | `lib/store.ts:60` | 1min | P3 |

**Total dette estimee** : ~35h (P0+P1 = 26h).

---

## 8. Plan d'action priorise

### P0 (semaine 1) — Fondations qualité

1. **Setup Vitest** + config + 1er test (4h)
   - `pnpm add -D vitest @vitest/coverage-v8`
   - `vitest.config.ts`
   - Tests unitaires sur `lib/email/render.ts`, `lib/validations.ts`
   - Script `test` + `test:watch` dans package.json

2. **Setup Husky + lint-staged** (1h)
   - Pre-commit : `lint-staged` + `tsc --noEmit`
   - Bloque commit si ESLint error

3. **Fix ESLint 87 erreurs** (1h)
   - `eslint --fix` pour les apostrophes (80% des erreurs)
   - Refactor 6 `set-state-in-effect` + `static-components`
   - Supprimer 4 unused vars

### P1 (semaine 2) — CI/CD + structure

4. **GitHub Actions CI** (3h)
   - Workflow `.github/workflows/ci.yml` : install, lint, typecheck, test, build
   - Matrix Node 20/22

5. **Centraliser requireAdmin** (2h) — cf security-audit.md #3
   - Extraire dans `lib/auth-server.ts`
   - Refactor 14 routes pour utiliser le shared

6. **Setup Playwright** (4h)
   - `pnpm add -D @playwright/test`
   - `playwright.config.ts`
   - 3 scenarios : candidature, login admin, pause pipeline

### P2 (semaine 3) — Nettoyage dette

7. Nettoyer mock data dans store (1h)
8. Déplacer `@faker-js/faker` en devDeps (5min)
9. Supprimer `app/admin/lib/auth.ts` (5min)
10. Cache landing `app/page.tsx` avec `revalidate: 60` (2h)
11. Investigate N+1 engine.ts (2h)
12. Deplacer logs vers `logs/` ou supprimer (5min)

### P3 (backlog)

13. Clarifier produit : Parametres vs Profil vs Configuration
14. Standardiser naming (FR ou EN)
15. Upgrade TypeScript 5.1+
16. Ajouter `engines` field
17. Renovate/Dependabot
18. Commitlint + convention Commits

---

## 9. Points forts du codebase

A retenir pour le modele :

- **Architecture propre** : App Router respecte, separation lib/components/app
- **Type-safe** : 0 erreur TypeScript
- **Prisma v7 moderne** : driver adapter `PrismaPg` (pattern post-deprecation)
- **Edge-safe auth** : pattern propre `auth.config.ts` (proxy) + `auth.ts` (server)
- **Cohesion API** : `apiSuccess/apiError/apiZodError` centralises
- **Module email decoupe** : engine + providers + render (single responsibility)
- **Validation Zod** cote API
- **Variables d'environnement** : tous les secrets en `process.env.*`
- **README client complet** (10 sections)
- **Scripts utility** : `create-admin.mjs`, `reset-admin-password.mjs`
- **Seed extended** : 13 candidatures pipeline + EmailLogs varies
- **Documentation** : `docs/security-audit.md` + `docs/tech-audit.md` (ce rapport)

---

## 10. Metriques globales

| Metrique | Valeur | Cible | Statut |
|----------|--------|-------|--------|
| Lignes de code (app/lib/components) | ~8000 (estimé) | - | - |
| Composants React | 30 | - | - |
| Routes API | 18 | - | - |
| Pages | 6 | - | - |
| Modeles Prisma | 12 | - | - |
| Erreurs TypeScript | 0 | 0 | OK |
| Erreurs ESLint | 87 | <10 | KO |
| Coverage tests | ~5% | 50% | KO |
| Score securite | 68/100 | 85+ | ORANGE |
| Score technique | 74/100 | 85+ | VERT |
| Deps vulnerabilites (prod) | 2 moderate | 0 | OK- |

---

## Annexes

### Commandes executees

- `npx tsc --noEmit` → exit 0
- `npx eslint . --max-warnings=9999` → 87 errors + 4 warnings
- `glob app/**/page.tsx` → 6 pages
- `glob app/**/route.ts` → 18 routes
- `glob lib/**/*.ts` → 9 modules
- `glob components/**/*.tsx` → 30 composants
- `grep findMany|findUnique|findFirst|aggregate|groupBy` dans lib → 4 points de query

### Limites de l'audit

- Pas de mesure de temps de reponse (DAST perf non realise)
- Pas d'analyse de la taille du bundle client (Next.js build report non exploite)
- Code coverage non mesure faute de runner
- Audit `lib/email/engine.ts` realise via grep uniquement (lecture profonde non exhaustive)
- Pas de Lighthouse audit (landing publique)

### References

- Next.js 16 docs : https://nextjs.org/docs
- Vitest : https://vitest.dev/
- Playwright : https://playwright.dev/
- Husky : https://typicode.github.io/husky/
- lint-staged : https://github.com/lint-staged/lint-staged
- Prisma v7 driver adapter : https://www.prisma.io/docs/orm/overview/databases/database-drivers
