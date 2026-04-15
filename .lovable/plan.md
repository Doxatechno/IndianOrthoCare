

## Plan: Fix AMC Auto-Creation Duplicate ID Bug

### Problem
The `addAMCContract` function calculates the next AMC ID from the in-memory state array. When auto-creating multiple AMCs in a rapid loop, React state doesn't update between iterations, so every insert attempts the same ID (e.g., `AMC-012` repeatedly), causing primary key constraint violations. Only the first insert per page load succeeds.

### Solution

**File: `src/pages/AMCContracts.tsx`** — Rewrite `autoCreateAMCForExpiringEquipment` to:

1. Query the current max AMC ID directly from Supabase (`SELECT id FROM amc_contracts ORDER BY id DESC LIMIT 1`)
2. Also query all existing `equipment_id` values from `amc_contracts` to check duplicates server-side (not from stale React state)
3. Build all new AMC rows with incrementing IDs in-memory, then batch insert them in a single `.insert()` call
4. After successful insert, reload the data (or append to state)

This eliminates the race condition entirely — one query, one batch insert, unique IDs guaranteed.

**File: `src/context/DataContext.tsx`** — No changes needed if we handle the batch insert directly in the AMC page. Alternatively, add a `batchAddAMCContracts` method.

### Technical Details

```text
Current flow (broken):
  for each equipment:
    nextId(stale state) → same ID every time → insert → 409 conflict

Fixed flow:
  1. SELECT max(id) FROM amc_contracts          → e.g. "AMC-014"
  2. SELECT equipment_id FROM amc_contracts      → set of covered equipment
  3. Filter expiring equipment not in that set
  4. Assign AMC-015, AMC-016, AMC-017... incrementally
  5. Single batch INSERT of all rows
  6. Update React state with all new rows
```

### Steps
1. Rewrite `autoCreateAMCForExpiringEquipment` in `AMCContracts.tsx` with the batch approach described above
2. Remove the per-item `addAMCContract` call and replace with direct Supabase batch insert
3. Update local state after successful batch insert

