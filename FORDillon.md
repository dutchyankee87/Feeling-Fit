# Feeling Fit: the story behind the dashboard

> Explained for Dillon. No textbook, just how this thing works, why it's built this way, and where the landmines are.

## What is it, really?

Feeling Fit is a gym in Utrecht. The gym runs its day-to-day in **Trainin**, the booking/CRM system where members, subscriptions ("credit products") and sessions live. Trainin is good at *recording* things, but bad at *answering questions* like:

- "Which members are quietly drifting away?"
- "How many trial visitors actually convert?"
- "Do we have enough trainers for all the PT credits people have paid for?"

This app is the **translator** between Trainin's raw data and those management questions. Think of Trainin as the gym's filing cabinet and this dashboard as the analyst who opens every drawer every five minutes and writes a one-page summary.

## The architecture in one picture

```
Trainin API ──► src/lib/services/trainin-sync.ts ──► /api/insights ──► /inzichten page
 (clients,        (fetch + calculate everything,       (JSON:            (cards, tables,
  sessions,        cache in memory for 5 min)           {success,data})   charts)
  orders)
```

- **Next.js 16 App Router**: pages in `src/app/*`, API routes in `src/app/api/*`.
- **No database for insights.** Surprise: the MT insights never touch Postgres. Every metric is computed live from the Trainin API and held in an in-memory cache (`insightsCache`, 5 minutes). There *is* a Drizzle schema (`src/lib/db/schema.ts`) but it's used by the older risk-engine/actions flow, not by the insights page.
- **Staff are filtered out** everywhere via `STAFF_KLANT_REFS` in `src/lib/constants.ts`. Trainers who also have a "membership" would otherwise pollute every metric.

Why no database? Because the source of truth is Trainin, and copying data means keeping two copies in sync, which is a whole second job. Computing on the fly is slower (~8 seconds for a cold `/api/insights`) but always correct. The 5-minute cache makes it feel fast after the first hit.

## The pages

| Page | What it answers |
|---|---|
| `/dashboard` | Who is at risk of churning right now? |
| `/leden` | Member list with filters/sorting |
| `/inzichten` | Management metrics: kennismaking funnel, PT capacity, active subscriptions per month, churn per product, check-in patterns, bezoekdichtheid |

## Recent addition: PT-capaciteit & abonnementen per maand (Sept 2026)

This came out of a 45-minute conversation with Marvin (one of the owners/trainers). His ask, in his own words: *"the number of PT credits that can still be spent this month, versus the number of available PT slots of our colleagues."*

### PT credits vs PT slots

The idea: if 400 credits are floating around but trainers only have 120 free slots, members *can't* use what they paid for. That leads to frustration and, eventually, churn. It doesn't need to be 1:1 (not everybody uses every credit), but the ratio tells you when to hire or open extra hours.

**The detective work.** The obvious plan was "just read `creditsLeft` from Trainin". Before writing any code we poked the live API (read-only) and found:

1. `creditsLeft` is **always 0** for PT subscriptions. Trainin doesn't expose the per-period balance. So we compute it ourselves: a "Personal Training 4x per 4 weken" subscription entitles you to `4 × remainingDays / 28` credits for the rest of the month, minus the PT sessions you've already booked.
2. There is **no API for trainer availability** (`/employees`, `/availability` → 404). Only 6 open PT slots existed in the next 4 weeks, because trainers book clients directly instead of publishing open slots. So capacity is **configured manually** per trainer in `PT_TRAINER_WEEKLY_CAPACITY` (`src/lib/constants.ts`). Until Marvin gives the numbers, the UI shows a friendly orange warning instead of fake data.

**Lesson:** always look at the real data before designing the feature. Ten minutes of probing saved us from building a metric on a field that is always zero.

### Active subscriptions per month

For each 1st of the month (last 12 months) we count subscriptions where `validFrom ≤ date ≤ validUntil`. Then:

- "Fitness onbeperkt (add-on)" is excluded (it's an add-on, not a membership).
- "Check-up" (€0, ~200 of them) is shown as its own row *outside* the total, so it doesn't drown out real growth.
- A growth-% row compares each month with the previous one.

We verified that expired/terminated products always carry a `validUntil`, so historic months are trustworthy.

## Bugs we hit (and what they teach)

### 1. The invisible sections (Framer Motion)

After adding the new sections, the screenshot showed... nothing. Blank space. Digging into computed styles revealed `opacity: 0` on the wrappers. And not only on the new ones: the existing "PT vs Fitness" and "Kennismaking" sections were invisible too!

**Why:** the page uses a parent `motion.main` with `staggerChildren`. Children that inherit variants animate when the *parent* animates. But these sections only mount *after* the data loads (~8 seconds later). By then the parent's animation is long over, so they stay stuck in the `hidden` state forever.

**Fix:** give every section that mounts late its own `initial="hidden" animate="visible"`.

**Lesson:** animation libraries have state. Anything conditionally rendered after the first paint needs to own its animation.

### 2. "Show-up rate is always 100%" (earlier)

Trainin's `/sessions` endpoint only returned *attended* bookings for past sessions, so "booked vs showed up" was meaningless. The funnel was redefined as Kennismakingen → % Geboekt → % Conversie. **Lesson:** when a metric looks too good, suspect the data source before celebrating.

### 3. Scrolling tables hide the most important column

With 12 months side by side, the *current* month fell off the right edge, which is exactly the column Marvin cares about. A one-line fix (`ref={el => el.scrollLeft = el.scrollWidth}`) opens the table scrolled to the newest month.

## Pitfalls to remember

- **Product names are logic.** PT detection is a regex on names (`/personal training/i`, `(\d+)x per 4 weken`). If the gym renames a product in Trainin, metrics silently shift. When numbers look weird, check product names first.
- **The Trainin `to` query param is ignored on `/sessions`**; you get everything from `from` onwards (months into the future). Always filter by date yourself.
- **Server timezone.** Trainin returns local time strings (`"2026-09-25 08:00:00"`). On Vercel (UTC) date boundaries can be off by a couple of hours around midnight. That's fine for monthly metrics, but worth remembering for anything per-day.

## What's next (from the Marvin conversation)

1. **Fill in trainer capacity** (slots per week for Kelly, Marvin, Mireille, Hugo, Joanna, Sander). Later: make it editable in the UI instead of in code.
2. **Coaching / training-plan tool (MVP)**: a separate internal web app (iPad-friendly) where a trainer enters an intake and an LLM drafts a periodized plan (year → 4–12-week blocks → weeks → sessions → exercises) using Feeling Fit's exercise library. The trainer always reviews and adjusts it. Phase 1: the trainer copies it into Trainin by hand. Later, it's pushed automatically once Trainin's API supports programs.
3. **Later ideas**: nutrition add-on (calorie needs + recipes), and AI coaching tips about *why* a member stops showing up.

## How good engineers think (as seen in this project)

- **Probe first, build second.** Read-only API calls answered three design questions before a single line of feature code.
- **Don't fake numbers.** When capacity data didn't exist, the UI says so instead of showing a made-up "0 free slots".
- **Verify in the real app.** Type-checks passed and the API returned correct numbers, and the page was still visually broken. Only a screenshot caught it.
