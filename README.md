# Needly — local rent / hire / services marketplace

Needly is a complete local marketplace where people rent items, hire things, and
book services from people around them. It started as a pixel-faithful homepage
and is now a full-stack application with authentication, listings, search,
bookings, reviews, notifications, owner tooling and an admin panel.

---

## Quick start

```bash
npm install
npm run dev        # development server
npm run build      # production build → dist/
npm run preview    # serve the production build
```

Open the app and everything works immediately — the database seeds itself on
first run.

### Demo accounts (seeded)

| Role   | Email             | Password   | Notes                          |
|--------|-------------------|------------|--------------------------------|
| Renter | `demo@needly.in`  | `demo1234` | has bookings + a written review |
| Owner  | `arjun@needly.in` | `owner123` | 7 listings, pending request     |
| Owner  | `meera@needly.in` | `owner123` | listings incl. 2 services       |
| Admin  | `admin@needly.in` | `admin123` | full admin panel                |

You can also register a fresh account and switch to an owner from
**For Owners → Become an owner**.

---

## Architecture

The deliverable for this environment is a **static bundle** (`dist/index.html`),
so the backend is implemented as a complete, production-shaped service layer
inside the app rather than as a separate network process. Every API call goes
through one dispatcher with the same validation, authorization and error
conventions a hosted REST API would use, and the frontend talks to it through a
single client module:

```
src/
├─ server/                 ← the "backend" (framework-agnostic business logic)
│  ├─ types.ts             ← relational entity model (users, listings, bookings…)
│  ├─ db.ts                ← persistence layer (versioned store, query helpers,
│  │                         id/date utilities) persisted to localStorage
│  ├─ seed.ts              ← centralised, realistic seed data only
│  ├─ auth.ts              ← bcrypt hashing, sessions, lockout, password reset
│  ├─ api.ts               ← route dispatcher: validation, authorization,
│  │                         pricing, availability, notifications, admin ops
│  ├─ config.ts            ← ALL business constants (fee rate, limits, TTLs)
│  └─ smoke.ts             ← executable end-to-end API test suite (see Testing)
├─ lib/
│  ├─ client.ts            ← fetch-shaped API client (swap point for hosted API)
│  ├─ router.tsx           ← hash router (deep-linkable, static-host friendly)
│  └─ auth-context.tsx     ← session state provider
├─ components/             ← Header, Hero, Popular, ListingCard, UI kit…
├─ pages/                  ← one file per route
└─ data/site.ts            ← static UI constants (nav categories, city list)
```

### Swapping in a hosted backend later

1. Move `src/server/*` into a Node service (Express/Fastify) — every handler is
   already request/response shaped.
2. Replace `src/server/db.ts` with a real driver (Postgres via Drizzle/Prisma,
   or MongoDB). Entity shapes in `types.ts` map 1:1 onto tables/collections.
3. Change `src/lib/client.ts` to call `fetch(BASE_URL + path, …)`; keep the
   `Authorization: Bearer <token>` from `needly.session.v2`. No UI changes.

## Database schema (entities)

- **User** — id, name, email (unique), phone, city/area, `roles: [user|owner|admin]`,
  bcrypt `passwordHash`, status (active/suspended), avatarColor, createdAt
- **Category** — slug id, label, icon, enabled, order *(dynamic — admins CRUD them)*
- **Listing** — id, ownerId→User, title, description, categoryId→Category,
  `kind: rent|hire|service`, price, `unit: day|job`, city, area, `images[]`,
  `blockedDates[]`, `status: active|paused|removed`, ratingAvg/ratingCount
  (denormalised from reviews), timestamps
- **Booking** — id, listingId, renterId, ownerId, start/end (inclusive day
  range), days, subtotal/fee/total *(server-computed)*, `status:
  pending→confirmed/rejected/cancelled/completed`, paymentStatus, note,
  reviewedByRenter, timestamps
- **Review** — bookingId (unique per booking via guard), listingId, authorId,
  rating 1–5, text
- **AppNotification** — userId, type, text, link, read, createdAt
- **Session** — opaque token, userId, expiry (7 d) — the only credential the
  browser stores
- **Favorite** — (userId, listingId) unique pair
- **PasswordReset** — token, userId, 30-min expiry

Integrity rules enforced by the service layer: no overlapping *confirmed*
bookings on a listing (re-checked inside the accept step itself), no owners
booking their own listings, no reviews without a completed booking, no duplicate
reviews, no deleting listings with upcoming bookings, deleted listings/users
keep referential consistency (soft-delete + DTO joins).

## API reference (consistent conventions)

All calls return data directly, `{ items, total, page, pageSize }` for pages,
or `{ error, field? }` with a proper status on failure.

| Method + path | Auth | Purpose |
|---|---|---|
| `POST /auth/register` · `/auth/login` · `/auth/logout` · `/auth/forgot` · `/auth/reset` | open | accounts, 401/409/429 handled |
| `GET /auth/me` | user | current session |
| `PATCH /users/me` · `POST /users/me/password` · `POST /users/me/become-owner` | user | profile & roles |
| `GET /categories` | open | enabled categories |
| `GET /listings?q=&category=&kind=&city=&min=&max=&sort=&page=` | open | search/filter/sort/paginate |
| `GET /listings/popular?city=` | open | homepage rail |
| `GET /listings/:id` · `GET /listings/:id/calendar` · `GET /listings/:id/reviews` | open\* | detail (paused only visible to owner/admin) |
| `POST /listings` · `PATCH /listings/:id` · `POST /listings/:id/status` · `DELETE /listings/:id` | owner/admin (self) | listing CRUD |
| `POST /listings/:id/reviews` | renter w/ completed booking | create review |
| `POST /bookings` | user | request (server availability + pricing) |
| `GET /bookings/mine` · `GET /bookings/:id` | self | renter history |
| `POST /bookings/:id/accept\|reject\|cancel\|complete` | renter/owner rules | lifecycle |
| `GET /owner/bookings` · `GET /owner/stats` | owner | dashboard (real aggregates) |
| `GET /favorites` · `POST /favorites/:listingId` | user | saved listings (toggle) |
| `GET /notifications` · `POST /notifications/read` | user | bell + unread count |
| `GET /admin/stats` · `GET /admin/users` · `PATCH /admin/users/:id` · `PATCH /admin/listings/:id` · `GET /admin/bookings` · `POST/PATCH /admin/categories(/:id)` | admin | moderation |

## App routes

`#/` home · `#/search` · `#/listing/:id` · `#/login` · `#/register` ·
`#/forgot` · `#/reset?token=` · `#/profile` · `#/bookings` · `#/saved` ·
`#/owner` · `#/owner/new` · `#/owner/edit/:id` · `#/admin` · 404 fallback.

Protected pages redirect to `#/login?next=…`; the API independently rejects
unauthenticated calls (defence in depth — the frontend gate is convenience, the
backend gate is truth).

## Pricing & payments

- Rent totals = `price × days`, services = fixed price. Platform fee
  (`PLATFORM_FEE_RATE`, default 8%) is computed **server-side only** and stored
  on the booking; the client shows a preview for UX but never submits a total.
- Default payment model is **pay-on-pickup** (common for local rentals): the
  booking records `paymentStatus: pay_on_pickup → collected` at completion. No
  card data exists anywhere in the system.
- To enable online payments: set `VITE_PAYMENT_PROVIDER=razorpay` (recommended
  for INR) or `stripe`, add the checkout call in `src/lib/client.ts` behind a
  `/payments/intent` route, store provider order ids on the booking, and verify
  via **server-side webhooks** — never trust the frontend's "paid" flag. Keys
  belong in `.env` (see `.env.example`), never in `src/`.

## Security checklist (implemented)

- bcrypt password hashing (cost 10), sessions as opaque expiring tokens
- login brute-force lockout (5 tries → 60 s per email)
- server-side authorization on every protected route (role + resource owner)
- server-side validation for every write (`src/server/api.ts`) mirroring client UX
- length limits, control-character stripping, image type/size restrictions
  (downscaled to ≤960 px JPEG before storage)
- soft deletes + reference-safe DTO joins
- suspended users: sessions revoked server-side, login blocked
- no secrets in the bundle (`config.ts` reads `import.meta.env` with safe defaults only)

## Image handling

Uploads accept JPG/PNG/WebP ≤ 5 MB, are validated, downscaled via canvas and
stored as data URLs attached to the listing (max 6 per listing; first is the
cover). For hosted object storage (S3/Cloudinary), swap `fileToDataUrl` in
`ListingFormPage` for a signed-URL upload and store the returned URL instead —
the API already validates URL shape.

## Testing

Two layers:

1. **Automated smoke suite** (28 API-level checks): registration, duplicate
   email, short password, wrong password, 401s, 403s, search/filter
   composition, owner CRUD, self-booking block, past-date block, server pricing
   (₹150×2+8% = ₹324), overlapping accept blocked (409), reject flow,
   early-complete blocked (409), cancel flow, illegitimate review blocked,
   duplicate review blocked, notifications, admin stats/categories/user
   suspension + suspended-login block.

   ```js
   // open the app, then in the browser console:
   await window.__needlySmoke()
   ```

   It runs against a scratch database and **restores your data afterwards**.

2. **Manual QA checklist** (the end-to-end journeys) — performs these once per
   release:
   - Discover → search "camera" → open listing → pick dates → request →
     (owner tab) accept → (renter) complete on/after start → write review →
     rating appears on listing + search sort
   - Overlap rule: two renters request the same window; accepting the second
     after the first is confirmed must 409
   - Owner: become owner → create listing w/ uploaded photo → pause it →
     verify it disappears from public search → publish → delete blocked while
     upcoming booking exists
   - Auth: register → log out → log in → wrong password lockout message →
     forgot → reset via dev link → log in with new password → change password
     in profile
   - Admin: suspend a user → user can't log in → re-activate → remove a
     listing → owner notified → create/disable a category → category list
     updates in search filters
   - Responsive: 390 × 844, 768 × 1024, 1536 × 1024 (homepage must remain
     identical to the reference at the desktop viewport)

## Environment variables

See `.env.example`. Everything has a working default; nothing is required for
`npm run dev` today.

## Deployment

`npm run build` emits a self-contained static bundle. Deploy `dist/` to any
static host (Netlify, Vercel, GitHub Pages, S3 + CDN). Because the router is
hash-based, no SPA rewrite rules are needed.

### Intentionally configurable vs. hardcoded

- Fee rate, session TTL, lockout thresholds, image limits → `src/server/config.ts`
- Payment provider, SMTP, hosted DB/API credentials → env only (` .env.example`)
- Seed demo data → `src/server/seed.ts` (single source; nothing mocked inside components)
