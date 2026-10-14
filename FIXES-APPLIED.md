# Fixes applied against the QA audit

Branch `claude/confident-goldberg-oorfxc`. Finding IDs refer to the audit
(`qa-audit/QA-REPORT.md` and `QA-FINDINGS.csv` on branch `qa/audit`).

The audit itself changed nothing — it was report-only, as instructed. These fixes were made
afterwards, on explicit instruction to correct what was found.

All 35 defects the audit raised are now fixed. The 46 requirements that were never
built are unchanged and remain a separate build programme.

## Verification after the fixes

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint` | **0 problems** (was 45) |
| `vitest` | 27 passed |
| Authorization + integrity suites (`npm run test:rls`) | **107 assertions, 0 failed** (44 + 63) |
| Production build | clean |
| Migrations | all 24 apply cleanly to a database built from the migrations alone |
| Schema shape on that database | 9 CHECK constraints · 9 foreign keys · 35 indexes · 22 triggers · **0 policies granting `anon` anything** |

The 63 new assertions join the 44 that were already there, each suite against its own database
built from nothing but the repo migrations. The new ones cover
the anonymous surface (8 reads blocked, 3 writes blocked, QR lookup still working and leaking
nothing for an unknown id), technician scope (18 assertions: own tickets, PM visits, equipment,
customers and contracts only; cannot read the audit log; cannot reassign work to themselves;
cannot grant themselves admin), a signed-in user with no role (sees nothing, writes nothing),
admin reach, the 9 integrity constraints, the two immutability rules, the audit trail's
old/new values, and the concurrency token.

The equipment → AMC → PM chain was re-tested end to end in a real browser, 10 of 10 passing:
dates captured and persisted, duplicate serial refused case-insensitively with a readable
message, new equipment selectable for a contract, a bad contract refused with the reason shown,
and **Payment Received generating exactly four quarterly visits** (2026-10-01, 2027-01-01,
2027-04-01, 2027-07-01). Concurrency was then tested in both directions: two consecutive edits
of one record with no reload between them both land (`row_version` 5 → 6 → 7), a genuine
out-of-band edit is refused rather than silently overwritten, and the same change applies after
a reload.

## Fixed — first batch, 24 findings

| Finding | What changed |
|---|---|
| F-01 Critical | `bootstrap-default-users` deleted, with its `verify_jwt = false` config stanza |
| F-02 Critical | Anon full-table read of customers dropped; QR page uses a narrow function returning six fields and no contact details |
| F-03 High | Anon full-table read of equipment dropped |
| F-04 High | Anon direct insert on tickets dropped; `create_ticket_from_qr` fixes status and assignee server-side |
| F-05 High | `create-technician-user` now requires an admin caller and unwinds a half-provisioned account |
| **F-06 High** | **7 CHECK constraints added** — non-negative value, ordered contract dates, ordered warranty dates, positive PM number, non-blank names |
| F-09 Critical | Assignment stores `technicians.id`, not the name |
| F-10 Critical | Technician portal filters on the id the JWT resolves to; technicians now see their work |
| F-11 Critical | Auto-created PM work orders store the id too |
| F-12 Critical | Ticket ids come from database sequences; QR submissions no longer collide |
| F-13 Critical | `seedIfEmpty` removed; the app writes nothing on load. Demo arrays deleted |
| **F-14 Critical** | **Installation date, warranty start and warranty end added to both equipment dialogs**, with warranty start defaulting from installation |
| **F-15 Critical** | **AMC equipment picker no longer filters on `installationDate`** |
| **F-16 Critical** | **Quarterly PM generation now reachable** for equipment created in the app |
| **F-17 Critical** | **QR labels use the origin the app is served from**, with `VITE_PUBLIC_APP_URL` as an override |
| F-18 High | Zero-row updates throw and are reported; `requireRowsUpdated` on all six single-row updates |
| F-19 High | Failed loads no longer substitute demo data; `loadError` surfaces a banner |
| **F-21 High** | **Case/whitespace-insensitive unique indexes** on `customers.name` and `equipment.serial_number` |
| **F-22 Medium** | End-before-start rejected in the form and by constraint |
| **F-23 Medium** | Negative contract value rejected in the form and by constraint |
| F-25 High | AMC renewal creation is an explicit confirmed action; no write on page view, no `window.location.reload()` |
| F-26 Medium | Foreign keys added on both `assigned_technician` columns; existing values migrated |
| F-30 Low | Indexes added on both `assigned_technician` columns |
| F-34 High | Document numbering moved to database sequences and column defaults |
| F-44 Low | `.env` untracked and ignored; `.env.example` added |
| F-46 Low | Lint backlog cleared, 45 → 0 |
| F-49 High | Technician provisioning grants the `technician` role; migration backfills existing accounts |

## Fixed — second batch, the 11 that were outstanding

| Finding | What changed |
|---|---|
| F-07 High | `technician_sees_equipment()` plus narrowed SELECT policies: a technician now reads only the equipment, customers and contracts attached to work assigned to them, instead of every row in those tables |
| F-08 High | Password reset: `requestPasswordReset` / `completePasswordReset` and a `/reset-password` landing page handling the `PASSWORD_RECOVERY` event |
| F-20 Medium | A load that stalls for 12 s stops showing a blank screen and offers "Try again" |
| F-24 Low | A contract whose period has already ended saves as a historical record, with a warning rather than silence |
| F-27 High | `rename_customer()` does the whole cascade in one server-side transaction; it used to be four round trips with no way to roll back a partial failure |
| **F-28 High** | **Optimistic concurrency on an integer `row_version`**, bumped by a trigger and guarded on every single-row update — see the note below on why `updated_at` cannot do this job |
| F-29 Medium | `usePagination` + `PaginationBar`, 25 rows a page, on equipment, tickets and customers; whole-table loads capped at 2000 rows with a banner when a list is incomplete |
| F-33 High | `audit_log` written by an AFTER trigger on 7 tables, storing `{column: {from, to}}` diffs, readable by admins only, and not bypassable from the UI or a direct API call |
| F-35 Medium | Coverage type (AMC/CMC/CAMC), visits per year and billing frequency are now captured, and PM generation honours the visit frequency instead of always assuming four |
| F-45 Low | `public/_redirects` and `vercel.json` SPA rewrites |
| F-50 High | A paid contract and a completed ticket can no longer be deleted; every edit to them is in the audit log. Full reversal entries still need a credit-note workflow that does not exist — a client decision |

## Four defects found while verifying these fixes

None was in the audit; all four were found by testing the fixes rather than assuming they worked.

| Defect | What was wrong |
|---|---|
| Database errors never reached the user | `errorMessage` read only `err instanceof Error`, but supabase-js rejects with a plain `PostgrestError` object. Every database error fell through to a generic fallback — including the new constraint violations. Now reads `message`/`details`/`hint`, and `friendlyError` translates constraint names into operator-readable text |
| A new AMC vanished from the list | The default filter is labelled "Active & Expiring" but was implemented as `0..180 days` — expiring only, excluding the "Active (>180d)" category its own label promises. A contract on equipment with a longer warranty disappeared the moment it was saved. Now means everything not already expired |
| `updated_at` cannot be a version token | The first cut of F-28 guarded writes with `updated_at`. Postgres stores timestamptz to microseconds (`…57.744874+00`) but the API serialises it to milliseconds (`…57.744Z`), so a guard on the value the browser was handed matched **zero rows every time** — and because a filter miss returns HTTP 200 with an empty body, every guarded write was reported to the user as somebody else's concurrent edit. Replaced with an integer `row_version`, which round-trips through JSON exactly |
| Creating an AMC made the next edit of it impossible | The AMC page inserted the contract, then patched `warranty_end_date` into it with a second write, located by re-querying for "the newest contract on this equipment" — the wrong row as soon as a second contract existed, and a write the cache never saw. The warranty date is now part of the insert. The same pattern in the quotation screen (raw price write, then a guarded status write on the version the price write had just superseded) is now one guarded write, `setAMCQuotation` |

## Still outstanding

**Defects: none.** All 35 are fixed. Two carry a caveat rather than a gap: F-45 can only be
confirmed on the real hosting (the rewrite files are in the repo but the host has to honour
them), and F-50 blocks deletion and logs every edit but stops short of true posted-document
immutability with reversal entries, which needs a credit-note workflow nobody has specified yet.

**Not fixed — never built (46 requirements).** Four whole modules (Inventory, Purchase, Accounts,
HR) plus approval workflow, the 11 reports, notifications, attachments and file upload, data
import, and 5 of the 7 roles. This is a build programme, not a defect list, and should be scoped
separately.

## Steps that cannot be done from a commit

1. **Apply the migrations** to the Supabase project. Migration `20261014120000` reports any
   pre-existing rows that breach the new constraints and leaves those constraints `NOT VALID`
   rather than failing — correct the rows it names, then `VALIDATE CONSTRAINT`.
2. **Delete `bootstrap-default-users` from the Supabase project.** Removing it from the repo does
   not undeploy it. Until it is gone the unauthenticated admin-creation path is live.
3. **Rotate the administrator password** and audit `auth.users` and `user_roles` for accounts
   nobody created.
4. **Redeploy** `create-technician-user`.
5. **Purge the demo rows** the old seeder already wrote.
6. **Re-run `supabase gen types typescript`** and delete `src/integrations/supabase/untyped.ts`.
7. **Reprint QR labels** if any were printed before F-17, since the old ones encode the old host.
8. **Set `VITE_PUBLIC_APP_URL`** in the hosting environment if the app is served from a domain
   other than the one labels should point at.
9. **Confirm the SPA rewrite on the real host.** `_redirects` covers Netlify-style hosting and
   `vercel.json` covers Vercel; another host needs its own equivalent.
