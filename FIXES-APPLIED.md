# Fixes applied against the QA audit

Branch `claude/confident-goldberg-oorfxc`. Finding IDs refer to the audit
(`qa-audit/QA-REPORT.md` and `QA-FINDINGS.csv` on branch `qa/audit`).

The audit itself changed nothing — it was report-only, as instructed. These fixes were made
afterwards, on explicit instruction to correct what was found.

## Verification after the fixes

| Gate | Result |
|---|---|
| `tsc --noEmit` | clean |
| `eslint` | **0 problems** (was 45) |
| `vitest` | 27 passed |
| `playwright` | 13 passed |
| Authorization suite (`npm run test:rls`) | **44 assertions, 0 failed** |
| Production build | clean |
| Migrations | all 21 apply cleanly to a fresh database |

The equipment → AMC → PM chain was re-tested end to end in a real browser: dates captured and
persisted, duplicate serial refused case-insensitively with a readable message, new equipment
selectable for a contract, a bad contract refused with the reason shown, and **Payment Received
generating exactly four quarterly visits** (2026-10-01, 2027-01-01, 2027-04-01, 2027-07-01).

## Fixed — 24 findings

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

## Two defects found while verifying these fixes

Neither was in the audit; both were found by testing the fixes rather than assuming they worked.

| Defect | What was wrong |
|---|---|
| Database errors never reached the user | `errorMessage` read only `err instanceof Error`, but supabase-js rejects with a plain `PostgrestError` object. Every database error fell through to a generic fallback — including the new constraint violations. Now reads `message`/`details`/`hint`, and `friendlyError` translates constraint names into operator-readable text |
| A new AMC vanished from the list | The default filter is labelled "Active & Expiring" but was implemented as `0..180 days` — expiring only, excluding the "Active (>180d)" category its own label promises. A contract on equipment with a longer warranty disappeared the moment it was saved. Now means everything not already expired |

## Still outstanding

**Not fixed — defects (11).** F-07 technician read scope · F-08 no password reset · F-20 blank
screen when the backend is unreachable · F-24 past-date warning · F-27 non-transactional rename
cascade · F-28 lost update under concurrent edits · F-29 no pagination · F-33 no audit trail ·
F-35 AMC has no coverage type / visit frequency / billing schedule · F-45 SPA refresh fallback
(needs the real hosting to confirm) · F-50 nothing is "posted", so any admin can edit anything.

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
