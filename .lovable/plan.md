

## Plan: Filter Out Expired Equipment from AMC Page

### Problem
The AMC page shows **all** AMC contracts from the database, including 6 old records (AMC-001 through AMC-008) whose warranties expired years ago. The AMC page should only show equipment with warranties that are **expiring soon** (within 180 days) or still active — not already expired.

### Solution

**File: `src/pages/AMCContracts.tsx`**

Filter the displayed AMC data to exclude contracts where the warranty has already expired, unless they have progressed in the workflow (to preserve completed AMC history if needed). Two options:

**Option A (Recommended)**: Add a default filter that hides expired-warranty AMCs but keeps them accessible via a filter toggle. The warranty filter dropdown already exists — just default to hiding expired entries from the main view while keeping "Expired" as a viewable filter option.

**Option B**: Hard-filter out any AMC where `warranty_end_date < today` from the display entirely.

### Implementation (Option A)

1. In the `filtered` memo that computes displayed contracts, add logic so that when `warrantyFilter === 'all'`, contracts with `daysLeft < 0` (expired warranty) are excluded
2. Add an explicit "Expired" option in the warranty filter dropdown so coordinators can still view old records when needed
3. Update the dashboard stat cards to reflect only non-expired contracts by default

### Changes
- **`src/pages/AMCContracts.tsx`** — Update the filtering logic in the `useMemo` that computes `filtered` to exclude expired-warranty AMCs unless the user explicitly selects "Expired" in the warranty filter

