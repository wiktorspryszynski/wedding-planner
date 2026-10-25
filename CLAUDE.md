# Wedding Planner — developer guide

Private app for two people to plan a wedding: guests + RSVP, budget + payments, vendors, tasks,
seating chart. Hosted on the VPS next to `nom-nom` at `slub.spryszynski.pl` (planned).
UI language is **Polish**; code, comments and docs are English.

## Stack

Next.js 16 (App Router, `cacheComponents` on) · React 19 · TypeScript · Tailwind v4 ·
SQLite via `better-sqlite3` + Drizzle ORM · `iron-session` cookies · `@dnd-kit/core` (seating) ·
`papaparse` (CSV). One container, no separate API.

> Next 16 differs from older versions (`middleware` → `src/proxy.ts`, Cache Components, `refresh()`,
> typed `PageProps`/`LayoutProps`). Read `node_modules/next/dist/docs/` before changing framework-level code.

## Run locally

```bash
npm install
cp .env.example .env.local          # set SESSION_SECRET (min. 32 chars)
npm run user:set -- nick "Nick"     # prompts for password; repeat for the second person
npm run dev                         # http://localhost:3000
```

Checks: `npm run build` (includes `tsc`) and `npm run lint`. There is **no test suite**.

## Architecture

- `src/db/schema.ts` — whole data model. Money is **integer grosze**; dates are `YYYY-MM-DD` text.
- `src/db/index.ts` — `db()` opens SQLite lazily, runs pending Drizzle migrations from `drizzle/`
  and seeds defaults (settings row, budget categories). Lazy on purpose: `next build` never touches the DB.
- `src/lib/auth.ts` — `requireUser()` is the data-access entry point. **Every page component and every
  server action calls it first.** `src/proxy.ts` only does an optimistic cookie-presence redirect.
- `src/actions/*.ts` — server actions per module. Each ends with `done()` from `src/lib/mutate.ts`,
  which writes the activity log and `revalidatePath("/", "layout")` (dashboard aggregates everything).
- Pages: `src/app/(app)/<module>/page.tsx`. Static header + a `<Suspense>` child that reads the
  session and DB — required by Cache Components (request data outside Suspense is a build error).
- Forms are plain `<form action={serverAction}>` with `<details>` disclosures for add/edit — almost
  no client JS. Client components live in `src/components/client.tsx` and `seating/canvas.tsx`.
- Users live in the `users` table (bcrypt hashes), managed only by `scripts/set-user.mjs`. No registration.
- `households.rsvp_token` is reserved for the public RSVP page (v2).
- Guests are added per invitation (`addHousehold` + `guests/household-form.tsx`). Households are
  matched **by name**: adding to an existing name appends people to it. An unnamed +1 is stored as
  `firstName = "+1"`, type `plus_one`; always render names through `guestName()` in `src/lib/guests.ts`.
  Inherited last names are gender-adapted (`adaptLastName`: Kowalski → Kowalska for "Anna").

## Schema changes

```bash
# edit src/db/schema.ts, then:
npm run db:generate -- --name <what_changed>   # writes drizzle/NNNN_*.sql — commit it
```
Migrations apply automatically on the next app start (first request).

## Deploy (VPS)

```bash
git clone … && cd wedding_planning
cp .env.example .env && nano .env        # SESSION_SECRET
mkdir -p data && sudo chown 1000:1000 data  # container runs as uid 1000 (node)
docker compose up -d --build              # listens on 127.0.0.1:3010
docker compose exec -it app node scripts/set-user.mjs <login> "<Name>"
```
Reverse proxy: `deploy/nginx.conf` (needs `proxy_buffering off` for streaming) + certbot.
Backups: `deploy/backup.sh` via cron — consistent `sqlite3 .backup`, 14-day rotation into `backups/`.
Restore: stop the container, copy a backup over `data/wedding.db`, delete `data/wedding.db-wal`/`-shm`, start.

## Non-obvious decisions

- `getSession()` calls `await connection()` before `unsealData` — iron-session reads `Date.now()`,
  which Cache Components rejects during prerendering.
- The Docker image copies `bcryptjs` and `drizzle-orm` into `node_modules` explicitly: the app bundles
  them into chunks, so standalone output lacks them, but `scripts/set-user.mjs` needs them.
- `DndContext` has a fixed `id` — without it dnd-kit's generated ids cause a hydration mismatch.
- `INSECURE_COOKIES=1` exists only to test the production build over plain http.
